import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS } from '../components/theme';
import { getRules, updateRule, deleteRule } from '../store/rules';
import { AppRule, RuleMode } from '../types';
import * as nextDNS from '../api/nextdns';
import { AppPickerModal } from '../components/AppPickerModal';
import { AppIconImage } from '../components/AppIconImage';
import { formatDuration } from '../utils/time';
import { getWeeklyAverage } from '../modules/usageStats';
import { PinGate } from '../components/PinGate';
import { storage } from '../store/storage';
import { formatAppName } from '../utils/text';
import { getInstalledApps, InstalledApp } from '../modules/installedApps';

export default function AppsScreen() {
  const [rules, setRules] = useState<AppRule[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AppRule | null>(null);
  const [weeklyAvg, setWeeklyAvg] = useState<number | null>(null);

  const [hrInput, setHrInput] = useState('1');
  const [minInput, setMinInput] = useState('0');

  // PIN Logic
  const [pinGateVisible, setPinGateVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const load = useCallback(() => {
    setRules(getRules());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const checkPin = (action: () => void) => {
    const hasPin = !!storage.getString('guardian_pin');
    if (hasPin) {
      setPendingAction(() => action);
      setPinGateVisible(true);
    } else {
      action();
    }
  };

  const onAddApp = (app: any) => {
    const newRule: AppRule = {
      appName: app.appName,
      packageName: app.packageName,
      mode: 'allow',
      dailyLimitMinutes: 0,
      blockedToday: false,
      usedMinutesToday: 0,
      iconBase64: app.iconBase64,
      addedByUser: true,
    };
    updateRule(newRule);
    setPickerVisible(false);
    load();
  };

  const onRemoveApp = (pkg: string) => {
    deleteRule(pkg);
    load();
  };

  const setMode = async (rule: AppRule, mode: RuleMode) => {
    // If trying to unblock or relax rules, check PIN
    if (rule.mode === 'block' || rule.mode === 'limit') {
      if (mode === 'allow' || (mode === 'limit' && rule.mode === 'block')) {
        checkPin(() => performSetMode(rule, mode));
        return;
      }
    }

    performSetMode(rule, mode);
  };

  const performSetMode = async (rule: AppRule, mode: RuleMode) => {
    if (mode === 'limit') {
      setSelectedRule(rule);
      setWeeklyAvg(null);
      getWeeklyAverage(rule.packageName).then(setWeeklyAvg);

      const totalMins = rule.dailyLimitMinutes || 60;
      setHrInput(String(Math.floor(totalMins / 60)));
      setMinInput(String(totalMins % 60));
      setLimitModalVisible(true);
      return;
    }

    const updated = { ...rule, mode };
    if (mode === 'block') {
      await nextDNS.blockApp(rule.appName).catch(() => {});
      updated.blockedToday = true;
    } else {
      await nextDNS.unblockApp(rule.appName).catch(() => {});
      updated.blockedToday = false;
    }

    updateRule(updated);
    load();
  };

  useFocusEffect(
    useCallback(() => {
      // Background fix for existing rules that might be missing icons or have old ones
      const currentRules = getRules();
      let changed = false;
      const updatedRules = [...currentRules];

      const fetchMissingIcons = async () => {
        const installed = await getInstalledApps();
        for (let i = 0; i < updatedRules.length; i++) {
          const rule = updatedRules[i];
          const match = installed.find(
            (a: InstalledApp) => a.packageName === rule.packageName,
          );
          if (match && (!rule.iconBase64 || rule.iconBase64.length < 10)) {
            updatedRules[i] = {
              ...rule,
              iconBase64: match.iconBase64,
              appName: match.appName,
            };
            changed = true;
          }
        }
        if (changed) {
          updatedRules.forEach((r) => updateRule(r));
          setRules(getRules());
        }
      };

      fetchMissingIcons();
    }, []),
  );

  const saveLimit = () => {
    if (!selectedRule) {
      return;
    }
    const h = parseInt(hrInput, 10) || 0;
    const m = parseInt(minInput, 10) || 0;
    const total = h * 60 + m;

    if (total <= 0) {
      Alert.alert('Invalid', 'Please set a limit greater than 0');
      return;
    }

    const updated = {
      ...selectedRule,
      mode: 'limit' as RuleMode,
      dailyLimitMinutes: total,
    };
    updateRule(updated);
    setLimitModalVisible(false);
    load();
  };

  const renderItem = ({ item }: { item: AppRule }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <AppIconImage
          packageName={item.packageName}
          iconBase64={item.iconBase64}
          appName={item.appName}
          size={40}
        />
        <View style={styles.info}>
          <Text style={styles.appName}>{formatAppName(item.appName)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onRemoveApp(item.packageName)}
          style={styles.deleteBtn}
          activeOpacity={0.7}
        >
          <Icon name="trash-can-outline" size={20} color={COLORS.muted} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.modes}>
          {(['allow', 'limit', 'block'] as RuleMode[]).map((m) => {
            const isActive = item.mode === m;
            const color =
              m === 'block'
                ? COLORS.red
                : m === 'limit'
                ? COLORS.yellow
                : COLORS.green;
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.modeBtn,
                  isActive && { backgroundColor: color, borderColor: color },
                ]}
                onPress={() => setMode(item, m)}
              >
                <Text
                  style={[styles.modeTxt, isActive && styles.modeTxtActive]}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {item.mode === 'limit' && (
          <View style={styles.limitBadge}>
            <Icon name="clock-outline" size={14} color={COLORS.yellow} />
            <Text style={styles.limitText}>
              {formatDuration(item.dailyLimitMinutes)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Controlled Apps</Text>
      </View>

      <FlatList
        data={rules}
        keyExtractor={(r) => r.packageName}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="application-cog" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Apps Controlled</Text>
            <Text style={styles.emptyText}>
              Tap the 'Add' button to select apps from your phone to start
              blocking.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setPickerVisible(true)}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      <AppPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={onAddApp}
        alreadySelectedPackages={rules.map((r) => r.packageName)}
      />

      <Modal visible={limitModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Daily Limit: {formatAppName(selectedRule?.appName || '')}
            </Text>

            {weeklyAvg !== null && (
              <View style={styles.avgBox}>
                <Icon name="chart-bar" size={16} color={COLORS.muted} />
                <Text style={styles.avgText}>
                  Weekly average: {Math.floor(weeklyAvg / 60)}h {weeklyAvg % 60}
                  m
                </Text>
              </View>
            )}

            <View style={styles.timeInputs}>
              <View style={styles.timeField}>
                <TextInput
                  style={styles.input}
                  value={hrInput}
                  onChangeText={setHrInput}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.timeLabel}>Hours</Text>
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timeField}>
                <TextInput
                  style={styles.input}
                  value={minInput}
                  onChangeText={setMinInput}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.timeLabel}>Minutes</Text>
              </View>
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setLimitModalVisible(false)}
              >
                <Text style={styles.modalBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={saveLimit}
              >
                <Text style={[styles.modalBtnTxt, styles.modalBtnTxtPrimary]}>
                  Set Limit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PinGate
        visible={pinGateVisible}
        onSuccess={() => {
          setPinGateVisible(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
        onCancel={() => {
          setPinGateVisible(false);
          setPendingAction(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },
  avgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 20,
    gap: 8,
  },
  avgText: { color: COLORS.muted, fontSize: 13 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  list: { padding: SPACING.md, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: SPACING.md },
  appName: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  pkg: { color: COLORS.muted, fontSize: 11 },
  deleteBtn: { padding: SPACING.sm },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modes: { flexDirection: 'row', gap: 6 },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeTxt: { color: COLORS.muted, fontSize: 12 },
  modeTxtActive: { color: '#000', fontWeight: 'bold' },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,184,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  limitText: { color: COLORS.yellow, fontSize: 12, fontWeight: 'bold' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    padding: SPACING.xl,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: SPACING.md,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '85%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  timeField: { alignItems: 'center' },
  input: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeLabel: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  timeColon: {
    color: COLORS.text,
    fontSize: 24,
    marginHorizontal: 12,
    marginBottom: 20,
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
  modalBtnPrimary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modalBtnTxtPrimary: { color: '#fff' },
});
