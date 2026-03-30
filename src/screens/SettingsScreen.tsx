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

export default function SettingsScreen() {
  const [profileId, setProfileId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasPerm, setHasPerm] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsVisible, setLogsVisible] = useState(false);
  const [strictMode, setStrictModeLocal] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
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
            sub="60s cooldown for downgrades"
          >
            <Switch
              value={strictMode}
              onValueChange={(v) => {
                setStrictModeLocal(v);
                storage.set(STRICT_MODE_KEY, v);
              }}
            />
          </SettingRow>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MAINTENANCE</Text>
          <TouchableOpacity style={styles.card} onPress={handleResetBlocks}>
            <Text style={styles.resetText}>Force Daily Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DIAGNOSTICS</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setLogs(getLogs());
              setLogsVisible(true);
            }}
          >
            <Text style={styles.logLinkText}>View System Logs</Text>
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
});
