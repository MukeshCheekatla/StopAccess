import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import {
  saveConfig,
  getConfig,
  testConnection,
  isConfigured,
} from '../api/nextdns';
import {
  hasUsagePermission,
  requestUsagePermission,
} from '../modules/usageStats';
import { runFullEngineCycle } from '@focusgate/core/engine';
import { storageAdapter, storage } from '../store/storageAdapter';
import { getLogs, LogEntry, addLog } from '../services/logger';
import { notifyBlocked } from '../services/notifications';
import { AppRule } from '../types';

const STRICT_MODE_KEY = 'strict_mode_enabled';

import { SyncOrchestrator } from '@focusgate/sync';
import { NextDNSClient } from '@focusgate/core';
import { SyncState } from '@focusgate/types';

export default function SettingsScreen() {
  const [profileId, setProfileId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasPerm, setHasPerm] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsVisible, setLogsVisible] = useState(false);
  const [strictMode, setStrictModeLocal] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [testDomain, setTestDomain] = useState('');
  const [testResult, setTestResult] = useState('');
  const [newPin, setNewPin] = useState('');

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const cfg = await getConfig();
        if (cfg) {
          setProfileId(cfg.profileId);
          setApiKey(cfg.apiKey);
        }
        setHasPerm(await hasUsagePermission());
        setStrictModeLocal(
          (await storageAdapter.getBoolean(STRICT_MODE_KEY)) ?? false,
        );
        setSyncState(await storageAdapter.getSyncState());
      };
      load();
    }, []),
  );

  const triggerEngineCycle = async () => {
    const cfg = await getConfig();
    const ctx = {
      storage: storageAdapter,
      api: { isConfigured, config: cfg },
      logger: { add: addLog },
      notifications: { notifyBlocked },
    };
    await runFullEngineCycle(ctx);
    setSyncState(await storageAdapter.getSyncState());
  };

  const saveSettings = async (pid: string, key: string) => {
    setTesting(true);
    await saveConfig({ apiKey: key.trim(), profileId: pid.trim() });
    await triggerEngineCycle();
    await testConnection();
    setTesting(false);
  };

  const handleResetBlocks = async () => {
    Alert.alert('Reset Blocks', 'This will clear all daily limits. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          const state = await storageAdapter.loadGlobalState();
          const reset = state.rules.map((r: AppRule) => ({
            ...r,
            usedMinutesToday: 0,
            blockedToday: r.mode === 'block',
          }));
          await storageAdapter.saveRules(reset);
          await triggerEngineCycle();
          Alert.alert('Done', 'All blocks have been reset.');
        },
      },
    ]);
  };

  const handleManualSync = async () => {
    setTesting(true);
    const cfg = await getConfig();
    const orchestrator = new SyncOrchestrator({
      storage: storageAdapter,
      api: new NextDNSClient(cfg, addLog as any),
      logger: { add: addLog },
      notifications: { notifyBlocked },
    });
    await orchestrator.performSync(true); // force push
    setSyncState(await storageAdapter.getSyncState());
    setTesting(false);
  };

  const handleRemovePin = async () => {
    const current = storage.getString('guardian_pin');
    if (!current) {
      Alert.alert('No PIN', 'Guardian PIN is not set.');
      return;
    }
    Alert.prompt(
      'Confirm PIN',
      'Enter current PIN to remove protection:',
      (entered) => {
        if (entered === current) {
          storage.delete('guardian_pin');
          Alert.alert('Removed', 'Guardian PIN has been removed.');
        } else {
          Alert.alert('Error', 'Incorrect PIN.');
        }
      },
    );
  };

  const handleSavePin = async () => {
    if (newPin.length !== 4) {
      Alert.alert('Error', 'PIN must be exactly 4 digits.');
      return;
    }
    storage.set('guardian_pin', newPin);
    setNewPin('');
    Alert.alert('Success', 'Guardian PIN enabled.');
  };

  const handleTestBlock = async () => {
    if (!testDomain) {
      return;
    }
    setTestResult('Checking rule coverage...');
    const state = await storageAdapter.loadGlobalState();
    const domainMatch = state.rules.find(
      (r) =>
        r.customDomain?.toLowerCase() === testDomain.toLowerCase() ||
        r.packageName?.toLowerCase() === testDomain.toLowerCase(),
    );

    if (domainMatch) {
      setTestResult(
        `✓ Intercepted: ${domainMatch.appName} covers this domain.`,
      );
    } else {
      setTestResult(
        '⚠️ Not Found Locally: Check NextDNS for cloud-level blocks.',
      );
    }
  };

  const formatLastSync = (date: string | null | undefined) => {
    if (!date) {
      return 'Never';
    }
    return new Date(date).toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROTECTION HEALTH</Text>
          <View
            style={[
              styles.card,
              profileId && apiKey ? styles.healthGood : styles.healthWarning,
            ]}
          >
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>NextDNS Credentials</Text>
              <Text
                style={[
                  styles.diagValue,
                  { color: profileId && apiKey ? COLORS.green : COLORS.red },
                ]}
              >
                {profileId && apiKey ? '✓ Configured' : '✗ Missing'}
              </Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Stats Permission</Text>
              <Text
                style={[
                  styles.diagValue,
                  { color: hasPerm ? COLORS.green : COLORS.yellow },
                ]}
              >
                {hasPerm ? '✓ Granted' : '⚠️ Required'}
              </Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Service Status</Text>
              <Text style={[styles.diagValue, { color: COLORS.green }]}>
                ✓ Active
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NEXTDNS ENGINE</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Profile ID</Text>
            <TextInput
              style={styles.input}
              value={profileId}
              onChangeText={setProfileId}
              placeholder="e.g. abc123"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.fieldLabel}>API Key</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Your NextDNS API Key"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => saveSettings(profileId, apiKey)}
            >
              {testing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnTxt}>Save Config</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GUARDIAN PIN</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>4-Digit PIN</Text>
            <View style={styles.pinRow}>
              <TextInput
                style={[styles.input, styles.pinInput]}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="****"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
              />
              <TouchableOpacity
                style={styles.saveBtnSmall}
                onPress={handleSavePin}
              >
                <Text style={styles.saveBtnTxt}>Set PIN</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.clearPinBtn}
              onPress={handleRemovePin}
            >
              <Text style={styles.clearPinBtnTxt}>Remove Guardian PIN</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROTECTION</Text>
          <SettingRow
            icon="timetable"
            label="App Statistics"
            sub={hasPerm ? 'Granted' : 'Required'}
          >
            <Switch value={hasPerm} onValueChange={requestUsagePermission} />
          </SettingRow>
          <SettingRow
            icon="shield-lock"
            label="Strict Mode"
            sub={
              cooldown > 0 ? `Active: ${cooldown}s` : 'Cooldown for downgrades'
            }
          >
            <Switch
              value={strictMode}
              disabled={cooldown > 0}
              onValueChange={async (v) => {
                if (!v && strictMode) {
                  // Friction: 5s countdown
                  setCooldown(5);
                  const timer = setInterval(() => {
                    setCooldown((prev) => {
                      if (prev <= 1) {
                        clearInterval(timer);
                        setStrictModeLocal(false);
                        storage.set(STRICT_MODE_KEY, false);
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1000);
                } else {
                  setStrictModeLocal(v);
                  storage.set(STRICT_MODE_KEY, v);
                }
              }}
            />
          </SettingRow>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEST-BLOCK TOOL</Text>
          <View style={styles.card}>
            <View style={styles.testBlockRow}>
              <TextInput
                style={[styles.input, styles.testBlockInput]}
                placeholder="example.com"
                placeholderTextColor={COLORS.muted}
                value={testDomain}
                onChangeText={setTestDomain}
              />
              <TouchableOpacity
                style={[styles.saveBtn, styles.testBlockButton]}
                onPress={handleTestBlock}
              >
                <Text style={styles.saveBtnTxt}>Test</Text>
              </TouchableOpacity>
            </View>
            {testResult !== '' && (
              <Text
                style={[
                  styles.testResult,
                  testResult.includes('Intercepted')
                    ? styles.testResultSuccess
                    : styles.testResultWarning,
                ]}
              >
                {testResult}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SYNC DIAGNOSTICS</Text>
          <View style={styles.card}>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Status</Text>
              <Text
                style={[
                  styles.diagValue,
                  {
                    color:
                      syncState?.status === 'error'
                        ? COLORS.red
                        : syncState?.status === 'success' ||
                          syncState?.status === 'ok'
                        ? COLORS.green
                        : COLORS.text,
                  },
                ]}
              >
                {(syncState?.status || 'idle').toUpperCase()}
              </Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Last Success</Text>
              <Text style={styles.diagValue}>
                {formatLastSync(
                  syncState?.lastSuccess || syncState?.lastSyncAt,
                )}
              </Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Last Push</Text>
              <Text style={styles.diagValue}>
                {formatLastSync(syncState?.lastPush)}
              </Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Items Synced</Text>
              <Text style={styles.diagValue}>
                {syncState?.telemetry?.changedCount || 0}
              </Text>
            </View>

            {syncState?.lastError && (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" color={COLORS.red} size={16} />
                <Text style={styles.errorText}>{syncState.lastError}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.syncBtn} onPress={handleManualSync}>
              <Icon name="sync" color="#fff" size={16} />
              <Text style={styles.syncBtnTxt}>Manual Push</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MAINTENANCE</Text>
          <TouchableOpacity style={styles.card} onPress={handleResetBlocks}>
            <Text style={styles.resetText}>Force Daily Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LOGS</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setLogs(getLogs());
              setLogsVisible(true);
            }}
          >
            <Text style={styles.logLinkText}>View System Events</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={logsVisible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.modalHeader}>
            <Text style={styles.headerTitle}>Logs</Text>
            <TouchableOpacity onPress={() => setLogsVisible(false)}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {logs.map((l, i) => (
              <View key={i} style={styles.logItem}>
                <Text style={styles.logTime}>
                  {new Date(l.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.logMsg}>{l.message}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

interface SettingRowProps {
  icon: string;
  label: string;
  sub: string;
  children: React.ReactNode;
}

function SettingRow({ icon, label, sub, children }: SettingRowProps) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={24} color={COLORS.accent} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20 },
  header: { marginBottom: 30 },
  headerTitle: { color: COLORS.text, fontSize: 28, fontWeight: 'bold' },
  section: { marginBottom: 30 },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 10,
    color: '#fff',
    marginBottom: 15,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnTxt: { color: '#fff', fontWeight: 'bold' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 15,
  },
  rowInfo: { flex: 1, marginLeft: 15 },
  rowLabel: { color: COLORS.text, fontWeight: 'bold' },
  rowSub: { color: COLORS.muted, fontSize: 12 },
  resetText: { color: COLORS.red, fontWeight: 'bold' },
  logLinkText: { color: COLORS.text },
  modalHeader: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logItem: { padding: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  logTime: { color: COLORS.muted, fontSize: 10 },
  logMsg: { color: COLORS.text },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  diagLabel: { color: COLORS.muted, fontSize: 12 },
  diagValue: { color: COLORS.text, fontSize: 12, fontWeight: 'bold' },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  syncBtnTxt: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  healthGood: {
    borderColor: 'rgba(0,196,140,0.25)',
    backgroundColor: 'rgba(0,196,140,0.04)',
  },
  healthWarning: {
    borderColor: 'rgba(255,184,0,0.25)',
    backgroundColor: 'rgba(255,184,0,0.04)',
  },
  pinRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pinInput: {
    flex: 1,
    marginBottom: 0,
    letterSpacing: 4,
    textAlign: 'center',
  },
  saveBtnSmall: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 15,
    borderRadius: 10,
    justifyContent: 'center',
  },
  clearPinBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  clearPinBtnTxt: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: 'bold',
  },
  testBlockRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testBlockInput: {
    flex: 1,
    marginBottom: 0,
  },
  testBlockButton: {
    paddingVertical: 10,
  },
  testResult: {
    fontSize: 10,
    marginTop: 8,
    fontWeight: 'bold',
  },
  testResultSuccess: {
    color: COLORS.green,
  },
  testResultWarning: {
    color: COLORS.yellow,
  },
});
