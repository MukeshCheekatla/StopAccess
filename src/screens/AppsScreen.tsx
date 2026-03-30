import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { getRules, updateRule, deleteRule } from '@focusgate/state/rules';
import { storageAdapter } from '../store/storageAdapter';
import { AppRule, RuleMode } from '../types';
import * as nextDNS from '../api/nextdns';
import { AppPickerModal } from '../components/AppPickerModal';
import { AppIconImage } from '../components/AppIconImage';
import { formatDuration } from '../utils/time';
import { getWeeklyAverage } from '../modules/usageStats';
import { PinGate } from '../components/PinGate';
import { storage } from '../store/storageAdapter';
import { formatAppName } from '../utils/text';
import { getInstalledApps, InstalledApp } from '../modules/installedApps';
import {
  isStrictMode,
  startCooldown,
  clearCooldown,
  STRICT_COOLDOWN_MS,
} from '../store/strictMode';
import { addLog } from '../services/logger';
import { getDomainForRule } from '@focusgate/core/domains';

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

  // Strict mode cooldown
  const [cooldownVisible, setCooldownVisible] = useState(false);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [pendingStrictAction, setPendingStrictAction] = useState<
    (() => void) | null
  >(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Custom Domain Fallback logic
  const [domainModalVisible, setDomainModalVisible] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [pendingDomainRule, setPendingDomainRule] = useState<AppRule | null>(
    null,
  );
  const [pendingDomainMode, setPendingDomainMode] = useState<RuleMode | null>(
    null,
  );

  // Protection warning
  const [configured, setConfigured] = useState(false);

  const load = useCallback(async () => {
    const r = await getRules(storageAdapter);
    setRules(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      nextDNS.isConfigured().then(setConfigured);
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

  /** Strict-mode aware downgrade: PIN → cooldown → execute */
  const checkStrictDowngrade = (action: () => void) => {
    const strict = isStrictMode();
    if (!strict) {
      checkPin(action);
      return;
    }
    addLog('warn', 'Strict mode override attempted', 'Cooldown required');
    startCooldown();
    setPendingStrictAction(() => action);
    const remaining = Math.ceil(STRICT_COOLDOWN_MS / 1000);
    setCooldownSecs(remaining);
    setCooldownVisible(true);
    cooldownTimer.current = setInterval(() => {
      setCooldownSecs((s) => {
        if (s <= 1) {
          clearInterval(cooldownTimer.current!);
          cooldownTimer.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
      }
    };
  }, []);

  const onAddApp = async (app: any) => {
    const newRule: AppRule = {
      appName: app.appName,
      packageName: app.packageName,
      type: 'service',
      scope: 'profile',
      mode: 'allow',
      dailyLimitMinutes: 0,
      blockedToday: false,
      usedMinutesToday: 0,
      iconBase64: app.iconBase64,
      addedByUser: true,
    };
    await updateRule(storageAdapter, newRule);
    setPickerVisible(false);
    load();
  };

  const onRemoveApp = (pkg: string) => {
    // Always PIN-gate deletions
    checkPin(async () => {
      await deleteRule(storageAdapter, pkg);
      nextDNS.unblockApp(pkg).catch(() => {});
      load();
    });
  };

  const setMode = async (rule: AppRule, mode: RuleMode) => {
    // Check if we can resolve the domain. If not, prompt.
    if ((mode === 'block' || mode === 'limit') && !getDomainForRule(rule)) {
      setPendingDomainRule(rule);
      setPendingDomainMode(mode);
      setDomainInput('');
      setDomainModalVisible(true);
      return;
    }

    // Downgrading a blocked/limited app requires PIN + strict cooldown
    const isDowngrade =
      (rule.mode === 'block' && (mode === 'allow' || mode === 'limit')) ||
      (rule.mode === 'limit' && mode === 'allow');

    if (isDowngrade) {
      checkStrictDowngrade(() => performSetMode(rule, mode));
      return;
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

    await updateRule(storageAdapter, updated);
    load();
  };

  useFocusEffect(
    useCallback(() => {
      // Background fix for existing rules that might be missing icons or have old ones
      const fixIcons = async () => {
        const currentRules = await getRules(storageAdapter);
        let changed = false;
        const updatedRules = [...currentRules];

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
          for (const r of updatedRules) {
            await updateRule(storageAdapter, r);
          }
          const final = await getRules(storageAdapter);
          setRules(final);
        }
      };

      fixIcons();
    }, []),
  );

  const saveLimit = async () => {
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
    await updateRule(storageAdapter, updated);
    setLimitModalVisible(false);
    load();
  };

  const saveCustomDomain = async () => {
    if (!pendingDomainRule || !pendingDomainMode) {
      return;
    }
    const trimmed = domainInput.trim().toLowerCase();
    if (trimmed.length < 4 || !trimmed.includes('.')) {
      Alert.alert(
        'Invalid Domain',
        'Please enter a valid domain (e.g. instagram.com)',
      );
      return;
    }

    const updatedRule = { ...pendingDomainRule, customDomain: trimmed };
    await updateRule(storageAdapter, updatedRule);
    const final = await getRules(storageAdapter);
    setRules(final);
    setDomainModalVisible(false);

    // Call setMode again so downgrade checks run if needed
    const modeToPass = pendingDomainMode;
    setPendingDomainRule(null);
    setPendingDomainMode(null);
    setMode(updatedRule, modeToPass);
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
          <Text style={styles.pkg}>
            {getDomainForRule(item) || item.packageName}
          </Text>
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
      {/* Degraded protection banner */}
      {!configured && (
        <View style={styles.warnBanner}>
          <Icon name="shield-alert" size={16} color={COLORS.yellow} />
          <Text style={styles.warnBannerTxt}>
            NextDNS not configured — blocks are inactive
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Controlled Apps</Text>
        {isStrictMode() && (
          <View style={styles.strictBadge}>
            <Icon name="lock" size={13} color={COLORS.red} />
            <Text style={styles.strictBadgeTxt}>STRICT</Text>
          </View>
        )}
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
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>Quick Add Recommended</Text>
            <View style={styles.quickAddGrid}>
              {[
                { name: 'Facebook', id: 'com.facebook.katana' },
                { name: 'Instagram', id: 'com.instagram.android' },
                { name: 'TikTok', id: 'com.zhiliaoapp.musically' },
                { name: 'YouTube', id: 'com.google.android.youtube' },
                { name: 'X / Twitter', id: 'com.twitter.android' },
                { name: 'Reddit', id: 'com.reddit.frontpage' },
                { name: 'Netflix', id: 'com.netflix.mediaclient' },
              ]
                .filter((rec) => !rules.some((r) => r.packageName === rec.id))
                .map((rec) => (
                  <TouchableOpacity
                    key={rec.id}
                    style={styles.quickAddBtn}
                    onPress={() =>
                      onAddApp({ appName: rec.name, packageName: rec.id })
                    }
                  >
                    <Text style={styles.quickAddBtnTxt}>+ {rec.name}</Text>
                  </TouchableOpacity>
                ))}
            </View>
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

      {/* Strict mode cooldown modal (emergency override) */}
      <Modal visible={cooldownVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Icon
              name="shield-lock"
              size={40}
              color={COLORS.red}
              style={styles.strictIcon}
            />
            <Text style={styles.modalTitle}>Strict Mode Override</Text>
            <Text style={styles.overrideDesc}>
              You enabled Strict Mode to prevent impulsive bypasses. Please wait
              for the confirmation timer before proceeding.
            </Text>
            <View style={styles.countdownBox}>
              <Text style={styles.countdownNum}>{cooldownSecs}</Text>
              <Text style={styles.countdownLabel}>seconds remaining</Text>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  addLog('warn', 'Strict mode override cancelled');
                  clearCooldown();
                  if (cooldownTimer.current) {
                    clearInterval(cooldownTimer.current);
                    cooldownTimer.current = null;
                  }
                  setCooldownVisible(false);
                  setPendingStrictAction(null);
                }}
              >
                <Text style={styles.modalBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnDanger,
                  cooldownSecs > 0 && styles.dimmed,
                ]}
                disabled={cooldownSecs > 0}
                onPress={() => {
                  addLog('warn', 'Strict mode override confirmed and executed');
                  clearCooldown();
                  setCooldownVisible(false);
                  // Still require PIN after cooldown
                  checkPin(() => {
                    if (pendingStrictAction) {
                      pendingStrictAction();
                      setPendingStrictAction(null);
                    }
                  });
                }}
              >
                <Text style={[styles.modalBtnTxt, { color: COLORS.red }]}>
                  {cooldownSecs > 0 ? `Wait ${cooldownSecs}s…` : 'Override Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

      <Modal visible={domainModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>App Domain Required</Text>
            <Text style={styles.overrideDesc}>
              We couldn't automatically determine the network domain for{' '}
              {pendingDomainRule
                ? formatAppName(pendingDomainRule.appName)
                : 'this app'}
              . Please enter it manually to enable blocking.
            </Text>

            <TextInput
              style={styles.textInput}
              value={domainInput}
              onChangeText={setDomainInput}
              placeholder="e.g. reddit.com"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setDomainModalVisible(false);
                  setPendingDomainRule(null);
                  setPendingDomainMode(null);
                }}
              >
                <Text style={styles.modalBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={saveCustomDomain}
              >
                <Text style={[styles.modalBtnTxt, styles.modalBtnTxtPrimary]}>
                  Save & Block
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
  textInput: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontSize: 16,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    textAlign: 'center',
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
  // Strict mode & warn banner
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,184,0,0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,184,0,0.2)',
  },
  warnBannerTxt: { color: COLORS.yellow, fontSize: 13, flex: 1 },
  strictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,71,87,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.2)',
  },
  strictBadgeTxt: { color: COLORS.red, fontSize: 11, fontWeight: 'bold' },
  strictIcon: { alignSelf: 'center', marginBottom: 12 },
  overrideDesc: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  countdownBox: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(255,71,87,0.06)',
    borderRadius: RADIUS.md,
  },
  countdownNum: { color: COLORS.red, fontSize: 48, fontWeight: 'bold' },
  countdownLabel: { color: COLORS.muted, fontSize: 12 },
  modalBtnDanger: {
    borderColor: 'rgba(255,71,87,0.4)',
  },
  dimmed: { opacity: 0.45 },
  footer: {
    padding: SPACING.lg,
    paddingBottom: 120,
    alignItems: 'center',
  },
  footerTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  quickAddBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickAddBtnTxt: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
});
