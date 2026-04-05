import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  NativeModules,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, RADIUS } from '../../components/theme';
import { storageAdapter } from '../../store/storageAdapter';
import { getLogs, LogEntry } from '../../services/logger';
import { AppRule, SyncState } from '@focusgate/types';
import { orchestrator } from '../../engine/nativeEngine';

export default function DiagnosticsSettingsScreen({ navigation }: any) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsVisible, setLogsVisible] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const { RuleEngine } = NativeModules;

  useFocusEffect(
    useCallback(() => {
      storageAdapter.getSyncState().then(setSyncState);
    }, []),
  );

  const handleManualSync = async () => {
    if (cooldown > 0) {
      return;
    }
    setCooldown(15);
    const sync = orchestrator.getSync();
    if (sync) {
      await sync.performSync(true);
    }
    setSyncState(await storageAdapter.getSyncState());
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleResetBlocks = async () => {
    Alert.alert(
      'Protocol Zero',
      'This will wipe all active rules and history. Proceed with caution.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe All',
          style: 'destructive',
          onPress: async () => {
            const state = await storageAdapter.loadGlobalState();
            const reset = state.rules.map((r: AppRule) => ({
              ...r,
              usedMinutesToday: 0,
              blockedToday: r.mode === 'block',
            }));
            await storageAdapter.saveRules(reset);
            Alert.alert(
              'Reset Complete',
              'Local enforcements have been restored to defaults.',
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Status</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>NETWORK SYNCHRONIZATION</Text>
          <Text style={styles.sectionDesc}>
            Monitor the heartbeat of your focus engine.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.diagRow}>
            <View style={styles.diagLabelGroup}>
              <Icon name="history" size={18} color={COLORS.muted} />
              <Text style={styles.diagLabel}>Last Success</Text>
            </View>
            <Text style={styles.diagValue}>
              {syncState?.lastSuccess
                ? new Date(syncState.lastSuccess).toLocaleTimeString()
                : 'Never'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.diagRow}>
            <View style={styles.diagLabelGroup}>
              <Icon
                name="shield-check-outline"
                size={18}
                color={COLORS.muted}
              />
              <Text style={styles.diagLabel}>Active Filters</Text>
            </View>
            <Text style={styles.diagValue}>
              {syncState?.telemetry?.changedCount || 0} Layers
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionRow, cooldown > 0 && styles.disabledOpacity]}
          onPress={handleManualSync}
          disabled={cooldown > 0}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconBox}>
            <Icon name="sync" size={20} color={COLORS.accent} />
          </View>
          <Text style={styles.actionRowTxt}>
            {cooldown > 0
              ? `Rate Limited (${cooldown}s)`
              : 'Force Configuration Sync'}
          </Text>
          {cooldown > 0 ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Icon name="chevron-right" size={20} color={COLORS.muted} />
          )}
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>DEBUGGING TOOLS</Text>
          <Text style={styles.sectionDesc}>
            Inspect the runtime behavior of FocusGate.
          </Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => {
              setLogs(getLogs());
              setLogsVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.itemIconBox}>
              <Icon name="console-line" size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.itemLabel}>Audit Runtime Logs</Text>
            <Icon name="chevron-right" size={20} color={COLORS.muted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => {
              Alert.prompt(
                'Subdomain Verification',
                'Enter a domain to test interception logic.',
                async (domain) => {
                  if (!domain) {
                    return;
                  }
                  const nativeBlock =
                    RuleEngine && typeof RuleEngine.testBlock === 'function'
                      ? await RuleEngine.testBlock(domain)
                      : false;
                  const state = await storageAdapter.loadGlobalState();
                  const match = state.rules.find(
                    (r: AppRule) =>
                      r.customDomain === domain || r.packageName === domain,
                  );
                  Alert.alert(
                    'Inspection Result',
                    nativeBlock
                      ? `✓ PROTECTED\nInterception active for: ${
                          match?.appName || 'System Engine'
                        }`
                      : '✗ BYPASSED\nDomain is not currently matched by any rules.',
                  );
                },
              );
            }}
            activeOpacity={0.7}
          >
            <View style={styles.itemIconBox}>
              <Icon name="radar" size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.itemLabel}>Domain Interception Test</Text>
            <Icon name="chevron-right" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        </View>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleResetBlocks}>
          <Icon name="trash-can-outline" size={20} color={COLORS.red} />
          <Text style={styles.dangerBtnTxt}>Wipe Local Engine State</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logs Modal */}
      <Modal visible={logsVisible} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Icon name="console" size={24} color={COLORS.accent} />
              <Text style={styles.modalTitle}>Runtime Audit</Text>
            </View>
            <TouchableOpacity
              onPress={() => setLogsVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.logsList}
            showsVerticalScrollIndicator={false}
          >
            {logs.length === 0 ? (
              <View style={styles.emptyLogs}>
                <Icon
                  name="text-box-remove-outline"
                  size={48}
                  color={COLORS.border}
                />
                <Text style={styles.emptyLogsTxt}>
                  No logs recorded for this session.
                </Text>
              </View>
            ) : (
              logs.map((l, i) => (
                <View key={i} style={styles.logItem}>
                  <View style={styles.logMeta}>
                    <View
                      style={[
                        styles.levelBadge,
                        {
                          backgroundColor:
                            l.level === 'error'
                              ? COLORS.red + '15'
                              : l.level === 'warn'
                              ? COLORS.yellow + '15'
                              : l.level === 'update'
                              ? COLORS.accent + '15'
                              : COLORS.green + '15',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelBadgeTxt,
                          {
                            color:
                              l.level === 'error'
                                ? COLORS.red
                                : l.level === 'warn'
                                ? COLORS.yellow
                                : l.level === 'update'
                                ? COLORS.accent
                                : COLORS.green,
                          },
                        ]}
                      >
                        {l.level.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.logTime}>
                      {new Date(l.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.logMsg}>{l.message}</Text>
                  {l.details && (
                    <View style={styles.logDetailsBox}>
                      <Text style={styles.logDetailsText}>{l.details}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  modalContainer: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backBtn: { marginRight: 16 },
  headerTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  scroll: { padding: 20, paddingBottom: 100 },
  sectionHeader: { marginBottom: 16, marginTop: 12 },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  sectionDesc: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.7,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
  },
  diagLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  diagLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  diagValue: { color: COLORS.text, fontSize: 14, fontWeight: '900' },
  divider: { height: 1, backgroundColor: COLORS.border, opacity: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLabel: { flex: 1, color: COLORS.text, fontSize: 15, fontWeight: '700' },
  actionRow: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accent + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionRowTxt: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  dangerBtn: {
    backgroundColor: COLORS.red + '08',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.red + '20',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dangerBtnTxt: {
    color: COLORS.red,
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modalCloseBtn: { padding: 4 },
  logsList: { padding: 20, paddingBottom: 60 },
  logItem: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  levelBadgeTxt: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logTime: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    opacity: 0.6,
  },
  logMsg: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  logDetailsBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.08)',
  },
  logDetailsText: {
    color: COLORS.muted,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
  },
  disabledOpacity: { opacity: 0.4 },
  emptyLogs: { alignItems: 'center', marginTop: 100, opacity: 0.3 },
  emptyLogsTxt: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
});
