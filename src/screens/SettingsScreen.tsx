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
import { COLORS, SPACING, RADIUS } from '../components/theme';
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
import { resetDailyBlocks, runChecks } from '../engine/ruleEngine';
import { storage } from '../store/storage';
import { getLogs, clearLogs, LogEntry } from '../services/logger';

const AUTO_RESET_KEY = 'auto_reset_enabled';
const PIN_KEY = 'guardian_pin';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [profileId, setProfileId] = useState('');
  const [hasPerm, setHasPerm] = useState(false);
  const [autoReset, setAutoReset] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const [shieldActive, setShieldActive] = useState<boolean | null>(null);

  // PIN settings
  const [hasPin, setHasPin] = useState(!!storage.getString(PIN_KEY));
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsVisible, setLogsVisible] = useState(false);
  const shieldHealthy = !!connectionOk && !!shieldActive;

  useFocusEffect(
    useCallback(() => {
      const cfg = getConfig();
      if (cfg) {
        setApiKey(cfg.apiKey);
        setProfileId(cfg.profileId);
      }
      hasUsagePermission().then(setHasPerm);
      setAutoReset(storage.getBoolean(AUTO_RESET_KEY) ?? false);
      setHasPin(!!storage.getString(PIN_KEY));

      if (isConfigured()) {
        setTesting(true);
        testConnection().then((api) => {
          setConnectionOk(api);
          setShieldActive(api); // Focus on API health
          setTesting(false);
        });
      }
      setLogs(getLogs());
    }, []),
  );

  const saveSettings = async () => {
    if (!apiKey.trim() || !profileId.trim()) {
      Alert.alert(
        'Missing Fields',
        'Both API key and Profile ID are required.',
      );
      return;
    }
    setTesting(true);
    saveConfig({ apiKey: apiKey.trim(), profileId: profileId.trim() });
    await runChecks().catch(() => {});
    const api = await testConnection();
    setConnectionOk(api);
    setShieldActive(api); // Sync status with API health
    setTesting(false);
    Alert.alert('Success', 'Configuration saved.');
  };

  const handleGrantPerm = async () => {
    await requestUsagePermission();
    setTimeout(() => hasUsagePermission().then(setHasPerm), 2000);
  };

  const handleResetBlocks = async () => {
    Alert.alert(
      'Reset All Blocks',
      'This will unblock everything immediately. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDailyBlocks();
            Alert.alert('Done', 'All blocks have been cleared.');
          },
        },
      ],
    );
  };

  const savePin = () => {
    if (pinInput.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter exactly 4 digits.');
      return;
    }
    storage.set(PIN_KEY, pinInput);
    setHasPin(true);
    setPinModalVisible(false);
    setPinInput('');
  };

  const clearPin = () => {
    storage.delete(PIN_KEY);
    setHasPin(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusIconBox,
              shieldHealthy ? styles.statusOk : styles.statusError,
            ]}
          >
            <Icon
              name={shieldHealthy ? 'shield-check' : 'shield-alert'}
              size={28}
              color={shieldHealthy ? COLORS.green : COLORS.red}
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {shieldHealthy ? 'Shield Active' : 'System Notice'}
            </Text>
            <Text style={styles.statusSub}>
              {!connectionOk
                ? 'Check your NextDNS credentials'
                : !shieldActive
                ? 'Blocks are currently inactive'
                : 'Your connection is protected'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NEXTDNS ENGINE</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>API KEY</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry
                placeholder="NextDNS API Key"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PROFILE ID</Text>
              <TextInput
                style={styles.input}
                value={profileId}
                onChangeText={setProfileId}
                placeholder="ID (e.g. abc123)"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              style={[styles.saveBtn, testing && styles.dimmed]}
              onPress={saveSettings}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnTxt}>Save configuration</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROTECTION</Text>

          <SettingRow
            icon="lock-smart"
            label="Guardian PIN"
            sub={hasPin ? 'PIN is active' : 'Protect settings with a PIN'}
          >
            {hasPin ? (
              <TouchableOpacity onPress={clearPin}>
                <Text style={[styles.rowStatus, styles.dangerText]}>
                  REMOVE
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setPinModalVisible(true)}>
                <Text style={[styles.rowStatus, styles.accentText]}>SETUP</Text>
              </TouchableOpacity>
            )}
          </SettingRow>

          <SettingRow
            icon="timetable"
            label="App Statistics"
            sub={hasPerm ? 'Access granted' : 'Required to track usage'}
            onPress={hasPerm ? undefined : handleGrantPerm}
          >
            <Text
              style={[
                styles.rowStatus,
                hasPerm ? styles.successText : styles.dangerText,
              ]}
            >
              {hasPerm ? 'ACTIVE' : 'GRANT'}
            </Text>
          </SettingRow>

          <SettingRow
            icon="restore"
            label="Daily Auto-Reset"
            sub="Clear block limits at midnight"
          >
            <Switch
              value={autoReset}
              onValueChange={(v) => {
                setAutoReset(v);
                storage.set(AUTO_RESET_KEY, v);
              }}
              trackColor={{ false: COLORS.border, true: COLORS.accent }}
              thumbColor="#fff"
            />
          </SettingRow>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, styles.dangerText]}>
            MAINTENANCE
          </Text>
          <TouchableOpacity
            style={[styles.cardRow, styles.maintenanceCard]}
            onPress={handleResetBlocks}
          >
            <View style={[styles.rowIconBox, styles.maintenanceIconBox]}>
              <Icon name="refresh-circle" size={22} color={COLORS.red} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowLabel, styles.dangerText]}>
                Force All Unblock
              </Text>
              <Text style={styles.rowSub}>
                Immediately clear all active blocks
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DIAGNOSTICS</Text>
          <SettingRow
            icon="text-box-search-outline"
            label="System Logs"
            sub="Check background sync events"
            onPress={() => {
              setLogs(getLogs());
              setLogsVisible(true);
            }}
          >
            <Icon name="chevron-right" size={20} color={COLORS.muted} />
          </SettingRow>
        </View>

        <Text style={styles.version}>FocusGate v1.0.0 (Production Build)</Text>
      </ScrollView>

      {/* Logs Modal */}
      <Modal visible={logsVisible} animationType="slide">
        <SafeAreaView style={[styles.container, styles.noPadding]}>
          <View style={[styles.header, styles.logsHeader]}>
            <View style={styles.logsHeaderRow}>
              <Text style={styles.headerTitle}>System Logs</Text>
              <TouchableOpacity onPress={() => setLogsVisible(false)}>
                <Icon name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.logsScroll}>
            {logs.length === 0 ? (
              <Text style={styles.emptyLogsText}>No logs available</Text>
            ) : (
              logs.map((log, idx) => (
                <View key={idx} style={styles.logItem}>
                  <View style={styles.logHeader}>
                    <View
                      style={[
                        styles.levelBadge,
                        {
                          backgroundColor:
                            log.level === 'error'
                              ? COLORS.red
                              : log.level === 'sync'
                              ? COLORS.accent
                              : COLORS.muted,
                        },
                      ]}
                    />
                    <Text style={styles.logTime}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.logMsg}>{log.message}</Text>
                  {log.details && (
                    <Text style={styles.logDetail}>{log.details}</Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.logsFooter}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.dangerBorder]}
              onPress={() => {
                clearLogs();
                setLogs([]);
              }}
            >
              <Text style={[styles.modalBtnTxt, styles.dangerText]}>
                Clear All Logs
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.pinModal}>
            <Text style={styles.modalTitle}>Set Guardian PIN</Text>
            <Text style={styles.modalSub}>
              Enter a 4-digit PIN to lock settings and app list.
            </Text>
            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={setPinInput}
              maxLength={4}
              keyboardType="number-pad"
              autoFocus
              textAlign="center"
              secureTextEntry
              placeholder="XXXX"
              placeholderTextColor={COLORS.muted}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setPinModalVisible(false)}
              >
                <Text style={styles.modalBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={savePin}
              >
                <Text style={[styles.modalBtnTxt, styles.modalBtnTxtPrimary]}>
                  Save PIN
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg },
  header: {
    paddingVertical: 10,
    marginBottom: 20,
  },
  headerTitle: { color: COLORS.text, fontSize: 32, fontWeight: 'bold' },
  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOk: { backgroundColor: 'rgba(0,196,140,0.1)' },
  statusError: { backgroundColor: 'rgba(255,71,87,0.1)' },
  statusInfo: { flex: 1, marginLeft: 16 },
  statusTitle: { color: COLORS.text, fontSize: 17, fontWeight: 'bold' },
  statusSub: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  section: { marginBottom: 32 },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.md,
    padding: 12,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dimmed: { opacity: 0.7 },
  saveBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cardRow: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rowLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  rowStatus: { fontSize: 12, fontWeight: 'bold' },
  accentText: { color: COLORS.accent },
  successText: { color: COLORS.green },
  dangerText: { color: COLORS.red },
  dangerBtn: { padding: 4 },
  dangerBtnTxt: {
    color: COLORS.red,
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },
  version: {
    color: '#333',
    textAlign: 'center',
    marginVertical: 30,
    fontSize: 12,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinModal: {
    backgroundColor: COLORS.card,
    width: '85%',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSub: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  pinInput: {
    color: COLORS.text,
    fontSize: 32,
    letterSpacing: 20,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnTxt: { color: COLORS.text, fontWeight: 'bold' },
  modalBtnPrimary: { backgroundColor: COLORS.accent },
  modalBtnTxtPrimary: { color: '#fff' },
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  levelBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logTime: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: 'bold',
  },
  logMsg: {
    color: COLORS.text,
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  logDetail: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 8,
    borderRadius: 4,
  },
  maintenanceCard: { borderColor: 'rgba(255,71,87,0.2)' },
  maintenanceIconBox: { backgroundColor: 'rgba(255,71,87,0.05)' },
  noPadding: { padding: 0 },
  logsHeader: { paddingHorizontal: 20 },
  logsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logsScroll: { padding: 20 },
  emptyLogsText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 50,
  },
  logHeader: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  logsFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  dangerBorder: { borderColor: COLORS.red },
});
const SettingRow = ({
  icon,
  label,
  sub,
  children,
  onPress,
}: {
  icon: string;
  label: string;
  sub?: string;
  children?: React.ReactNode;
  onPress?: () => void;
}) => {
  const Content = (
    <View style={styles.cardRow}>
      <View style={styles.rowIconBox}>
        <Icon name={icon} size={22} color={COLORS.muted} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {Content}
      </TouchableOpacity>
    );
  }
  return Content;
};
