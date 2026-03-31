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
  NativeModules,
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
import { notifyBlocked } from '../services/notifications';
import { UI_EXAMPLES, runFullEngineCycle } from '@focusgate/core';
import { orchestrator } from '../engine';
import { storageAdapter, storage } from '../store/storageAdapter';
import { getLogs, LogEntry, addLog } from '../services/logger';
import { AppRule, SyncState } from '@focusgate/types';

const STRICT_MODE_KEY = 'strict_mode_enabled';

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
  const [protectionLevel, setProtectionLevel] = useState('NONE');
  const [protectionWarning, setProtectionWarning] = useState<string | null>(
    null,
  );
  const [dnsLayerEnabled, setDnsLayerEnabled] = useState(false);
  const [a11yEnabled, setA11yEnabled] = useState(false);

  const { RuleEngine } = NativeModules;

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

        if (RuleEngine) {
          const level = await RuleEngine.getProtectionLevel();
          const warning = await RuleEngine.getProtectionWarning();
          const dnsOn = await RuleEngine.isDnsEnabled();
          const a11yOn = await RuleEngine.isAccessibilityEnabled();
          setProtectionLevel(level);
          setProtectionWarning(warning);
          setDnsLayerEnabled(dnsOn);
          setA11yEnabled(a11yOn);
        }
      };
      load();
    }, [RuleEngine]),
  );

  const triggerEngineCycle = async () => {
    const cfg = await getConfig();
    const ctx = {
      storage: storageAdapter,
      api: { isConfigured, config: cfg },
      logger: { add: addLog },
      notifications: { notifyBlocked },
      enforcements: {
        applyBlockedPackages: async (pkgs: string[]) => {
          if (RuleEngine) {
            RuleEngine.setBlockedPackages(pkgs);
          }
        },
      },
    };
    await runFullEngineCycle(ctx);
    setSyncState(await storageAdapter.getSyncState());

    // Refresh health status after engine cycle
    if (RuleEngine) {
      setProtectionLevel(await RuleEngine.getProtectionLevel());
      setProtectionWarning(await RuleEngine.getProtectionWarning());
    }
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
    const sync = orchestrator.getSync();
    if (sync) {
      await sync.performSync(true); // force push
    }
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

        {protectionWarning && (
          <View style={styles.warningBanner}>
            <Icon name="alert-decagram" color={COLORS.red} size={20} />
            <Text style={styles.warningBannerText}>{protectionWarning}</Text>
            <TouchableOpacity
              onPress={() => RuleEngine?.openAccessibilitySettings()}
              style={styles.warningAction}
            >
              <Text style={styles.warningActionText}>Fix Now</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROTECTION LEVEL</Text>
          <View style={[styles.card, styles.protectionMainCard]}>
            <View style={styles.protectionLevelRow}>
              <View>
                <Text style={styles.protectionLevelTitle}>
                  {protectionLevel === 'STRONG'
                    ? 'Strong Protection'
                    : protectionLevel === 'STANDARD'
                    ? 'Standard Protection'
                    : 'Weak Protection'}
                </Text>
                <Text style={styles.protectionLevelSub}>
                  {protectionLevel === 'STRONG'
                    ? 'Dual-layer enforcement Active'
                    : protectionLevel === 'STANDARD'
                    ? 'App blocking Active'
                    : 'Accessibility required'}
                </Text>
              </View>
              <View
                style={[
                  styles.levelBadge,
                  protectionLevel === 'STRONG'
                    ? styles.levelStrong
                    : protectionLevel === 'STANDARD'
                    ? styles.levelStandard
                    : styles.levelWeak,
                ]}
              >
                <Icon
                  name={
                    protectionLevel === 'STRONG' ? 'shield-check' : 'shield'
                  }
                  color="#fff"
                  size={16}
                />
                <Text style={styles.levelBadgeText}>{protectionLevel}</Text>
              </View>
            </View>

            <View style={styles.diagDivider} />

            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Accessibility Service</Text>
              <Text
                style={[
                  styles.diagValue,
                  { color: a11yEnabled ? COLORS.green : COLORS.red },
                ]}
              >
                {a11yEnabled ? '✓ Connected' : '✗ Disabled'}
              </Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>DNS Enforcement</Text>
              <Text
                style={[
                  styles.diagValue,
                  { color: dnsLayerEnabled ? COLORS.green : COLORS.muted },
                ]}
              >
                {dnsLayerEnabled ? '✓ Reinforced' : '○ Standby'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ENFORCEMENT OPTIONS</Text>
          <SettingRow
            icon="shield-plus"
            label="Strong Protection"
            sub="NextDNS reinforcement (Recommended)"
          >
            <Switch
              value={dnsLayerEnabled}
              onValueChange={async (v) => {
                const configOk = await isConfigured();
                if (v && !configOk) {
                  Alert.alert(
                    'Configuration Required',
                    'Please set your NextDNS credentials first.',
                  );
                  return;
                }

                if (!v && dnsLayerEnabled) {
                  // Friction: 5s countdown for downgrades
                  setCooldown(5);
                  const timer = setInterval(() => {
                    setCooldown((prev) => {
                      if (prev <= 1) {
                        clearInterval(timer);
                        RuleEngine.setDnsEnabled(false);
                        setDnsLayerEnabled(false);
                        RuleEngine.getProtectionLevel().then(
                          setProtectionLevel,
                        );
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1000);
                } else {
                  RuleEngine?.setDnsEnabled(v);
                  setDnsLayerEnabled(v);
                  const newLevel = await RuleEngine.getProtectionLevel();
                  setProtectionLevel(newLevel);
                }
              }}
            />
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
          <Text style={styles.sectionLabel}>NEXTDNS ENGINE</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Profile ID</Text>
            <TextInput
              style={styles.input}
              value={profileId}
              onChangeText={setProfileId}
              placeholder={`e.g. ${UI_EXAMPLES.PROFILE_ID}`}
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
          <Text style={styles.sectionLabel}>PERMISSIONS</Text>
          <SettingRow
            icon="timetable"
            label="App Statistics"
            sub={hasPerm ? 'Active' : 'Missing'}
          >
            <Switch value={hasPerm} onValueChange={requestUsagePermission} />
          </SettingRow>
          <SettingRow
            icon="gesture-tap"
            label="Accessibility Service"
            sub={a11yEnabled ? 'Enforcing' : 'Grant required'}
          >
            <Switch
              value={a11yEnabled}
              onValueChange={() => RuleEngine?.openAccessibilitySettings()}
            />
          </SettingRow>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEST-BLOCK TOOL</Text>
          <View style={styles.card}>
            <View style={styles.testBlockRow}>
              <TextInput
                style={[styles.input, styles.testBlockInput]}
                placeholder={UI_EXAMPLES.GENERIC_DOMAIN}
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
  scroll: { padding: 20, paddingBottom: 60 },
  header: { marginBottom: 32, marginTop: 10 },
  headerTitle: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  section: { marginBottom: 32 },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
    borderRadius: 16,
    color: '#fff',
    marginBottom: 20,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnTxt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  rowInfo: { flex: 1, marginLeft: 16 },
  rowLabel: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
  rowSub: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },

  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  diagLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  diagValue: { fontSize: 13, fontWeight: '800' },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.2)',
  },
  warningBannerText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginLeft: 12,
  },
  warningAction: {
    backgroundColor: COLORS.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  warningActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  protectionMainCard: {
    backgroundColor: 'rgba(108, 71, 255, 0.03)',
    borderColor: 'rgba(108, 71, 255, 0.1)',
  },
  protectionLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  protectionLevelTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  protectionLevelSub: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  levelStrong: {
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  levelStandard: {
    backgroundColor: COLORS.accent,
  },
  levelWeak: {
    backgroundColor: COLORS.red,
  },
  levelBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  diagDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },

  pinRow: { flexDirection: 'row', gap: 12 },
  pinInput: {
    flex: 1,
    marginBottom: 0,
    letterSpacing: 8,
    fontSize: 20,
    textAlign: 'center',
  },
  saveBtnSmall: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    borderRadius: 16,
    justifyContent: 'center',
  },
  clearPinBtn: { marginTop: 16, alignItems: 'center' },
  clearPinBtnTxt: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  testBlockRow: { flexDirection: 'row', gap: 12 },
  testBlockInput: { flex: 1, marginBottom: 0 },
  testBlockButton: { paddingVertical: 14, paddingHorizontal: 24 },
  testResult: {
    fontSize: 11,
    marginTop: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  testResultSuccess: { color: COLORS.green },
  testResultWarning: { color: COLORS.yellow },

  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  syncBtnTxt: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  resetText: {
    color: COLORS.red,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  logLinkText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.08)',
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.15)',
  },
  errorText: {
    color: COLORS.red,
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
    fontWeight: '600',
  },

  modalHeader: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  logItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  logTime: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  logMsg: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
});
