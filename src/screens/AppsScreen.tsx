import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import {
  SCREEN_WIDTH,
  HORIZONTAL_PADDING,
  CARD_RADIUS,
  isTablet,
} from '../constants/layout';
import { getRules, updateRule, deleteRule } from '@stopaccess/state/rules';
import { storageAdapter } from '../store/storageAdapter';
import { AppRule, RuleMode } from '@stopaccess/types';
import * as nextDNS from '../api/nextdns';
import { AppPickerModal } from '../components/AppPickerModal';
import AppIcon from '../components/AppIcon';
import { formatDuration } from '../utils/time';
import { getWeeklyAverage } from '../modules/usageStats';
import { PinGate } from '../components/PinGate';
import { storage } from '../store/storageAdapter';
import { orchestrator } from '../engine/nativeEngine';
import { formatAppName } from '../utils/text';
import { getInstalledApps, InstalledApp } from '../modules/installedApps';
import {
  isStrictMode,
  startCooldown,
  STRICT_COOLDOWN_MS,
} from '../store/strictMode';
import { addLog } from '../services/logger';
import {
  getDomainForRule,
  getNextDNSServiceId,
  POPULAR_DISTRACTIONS,
  UI_EXAMPLES,
} from '@stopaccess/core';
import {
  IconChip,
  PrimaryButton,
  ScreenHeader,
  SectionEyebrow,
  SurfaceCard,
} from '../ui/mobile';

export default function AppsScreen() {
  const insets = useSafeAreaInsets();
  const [rules, setRules] = useState<AppRule[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [limitModalVisible, setLimitModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AppRule | null>(null);

  const [hrInput, setHrInput] = useState('1');
  const [minInput, setMinInput] = useState('0');

  const [pinGateVisible, setPinGateVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [cooldownVisible, setCooldownVisible] = useState(false);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [pendingStrictAction, setPendingStrictAction] = useState<
    (() => void) | null
  >(null);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [domainModalVisible, setDomainModalVisible] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [pendingDomainRule, setPendingDomainRule] = useState<AppRule | null>(
    null,
  );
  const [pendingDomainMode, setPendingDomainMode] = useState<RuleMode | null>(
    null,
  );

  const [configured, setConfigured] = useState(false);

  const load = useCallback(async () => {
    const r = await getRules(storageAdapter);
    setRules(r || []);
  }, []);

  // Precompute filtered rules to prevent redundant filtering on every render
  const serviceRules = useMemo(
    () => rules.filter((r) => r.type === 'service'),
    [rules],
  );

  const domainRules = useMemo(
    () => rules.filter((r) => r.type === 'domain'),
    [rules],
  );

  const listPaddingStyle = useMemo(
    () => ({
      paddingTop: !configured ? 10 : insets.top + (isTablet ? 30 : 20),
    }),
    [configured, insets.top],
  );

  const fabStyle = useMemo(
    () => ({
      bottom: 30 + insets.bottom,
    }),
    [insets.bottom],
  );

  useFocusEffect(
    useCallback(() => {
      load();
      nextDNS.isConfigured().then(setConfigured);
    }, [load]),
  );

  const checkPin = useCallback((action: () => void) => {
    const hasPin = !!storage.getString('guardian_pin');
    if (hasPin) {
      setPendingAction(() => action);
      setPinGateVisible(true);
    } else {
      action();
    }
  }, []);

  const checkStrictDowngrade = useCallback(
    (action: () => void) => {
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
    },
    [checkPin],
  );

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) {
        clearInterval(cooldownTimer.current);
      }
    };
  }, []);

  const onAddApp = async (app: any) => {
    const serviceId = getNextDNSServiceId({ packageName: app.packageName });
    const isService = !!serviceId;

    const newRule: AppRule = {
      appName: app.appName,
      packageName: app.packageName,
      type: isService ? 'service' : 'domain',
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
    orchestrator.runCycle();
  };

  const onRemoveApp = useCallback(
    (pkg: string) => {
      checkPin(async () => {
        await deleteRule(storageAdapter, pkg);
        nextDNS.unblockApp(pkg).catch(() => {});
        load();
        orchestrator.runCycle();
      });
    },
    [checkPin, load],
  );

  const performSetMode = useCallback(
    async (rule: AppRule, mode: RuleMode) => {
      if (mode === 'limit') {
        setSelectedRule(rule);
        getWeeklyAverage(rule.packageName);

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
      orchestrator.runCycle();
    },
    [load],
  );

  const setMode = useCallback(
    async (rule: AppRule, mode: RuleMode) => {
      if ((mode === 'block' || mode === 'limit') && !getDomainForRule(rule)) {
        setPendingDomainRule(rule);
        setPendingDomainMode(mode);
        setDomainInput('');
        setDomainModalVisible(true);
        return;
      }

      const isDowngrade =
        (rule.mode === 'block' && (mode === 'allow' || mode === 'limit')) ||
        (rule.mode === 'limit' && mode === 'allow');

      if (isDowngrade) {
        checkStrictDowngrade(() => performSetMode(rule, mode));
        return;
      }

      performSetMode(rule, mode);
    },
    [checkStrictDowngrade, performSetMode],
  );

  useFocusEffect(
    useCallback(() => {
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
        `Please enter a valid domain (e.g. ${UI_EXAMPLES.DOMAIN})`,
      );
      return;
    }

    const updatedRule = { ...pendingDomainRule, customDomain: trimmed };
    await updateRule(storageAdapter, updatedRule);
    const final = await getRules(storageAdapter);
    setRules(final);
    setDomainModalVisible(false);

    const modeToPass = pendingDomainMode;
    setPendingDomainRule(null);
    setPendingDomainMode(null);
    setMode(updatedRule, modeToPass);
  };

  // Optimization: Memoize renderItem to prevent recreate on status changes
  const renderItem = useCallback(
    ({ item }: { item: AppRule; index: number }) => (
      <View>
        <SurfaceCard className="mb-4 rounded-card p-4">
          <View style={styles.cardTop}>
            <AppIcon
              packageName={item.packageName}
              iconBase64={item.iconBase64}
              appName={item.appName}
              size={44}
            />
            <View style={styles.info}>
              <Text style={styles.appName} numberOfLines={1}>
                {formatAppName(item.appName)}
              </Text>
              <Text style={styles.pkg} numberOfLines={1}>
                {getDomainForRule(item) || item.packageName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => onRemoveApp(item.packageName)}
              style={styles.deleteBtn}
            >
              <Icon name="trash-can-outline" size={20} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.cardBottom}>
            <View style={styles.modes}>
              {(['allow', 'limit', 'block'] as RuleMode[]).map((m) => {
                const isActive = item.mode === m;
                const activeColor =
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
                      isActive && {
                        backgroundColor: activeColor + '20',
                        borderColor: activeColor + '40',
                      },
                    ]}
                    onPress={() => setMode(item, m)}
                  >
                    <Text
                      style={[
                        styles.modeTxt,
                        { color: isActive ? activeColor : COLORS.muted },
                      ]}
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
        </SurfaceCard>
      </View>
    ),
    [onRemoveApp, setMode],
  );

  const columns = isTablet ? 4 : 3;
  const gridGap = 10;
  const recItemWidth = useMemo(() => {
    return (
      (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - gridGap * (columns - 1)) /
      columns
    );
  }, [columns]);

  return (
    <View className="flex-1 bg-[#0A0A0A]">
      <StatusBar barStyle="light-content" />

      {!configured && (
        <View
          className="mx-5 flex-row items-center gap-2 rounded-xl border border-[#FFB74D4D] bg-[#FFB74D26] p-3"
          style={{ marginTop: insets.top + (isTablet ? 20 : 10) }}
        >
          <Icon name="shield-alert" size={18} color={COLORS.yellow} />
          <Text className="text-xs font-bold text-yellow">
            Config Required: DNS layer is inactive
          </Text>
        </View>
      )}

      <FlatList
        data={serviceRules}
        keyExtractor={(r) => r.packageName}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, listPaddingStyle]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <ScreenHeader title="App Controls" />
              {isStrictMode() && (
                <IconChip
                  icon="shield-lock"
                  label="STRICT"
                  color={COLORS.red}
                />
              )}
            </View>
            {serviceRules.length === 0 && (
              <SurfaceCard className="items-center rounded-card px-6 py-14">
                <Icon
                  name="shield-check-outline"
                  size={64}
                  color={COLORS.border}
                />
                <Text style={styles.emptyTitle}>No apps controlled yet</Text>
                <Text style={styles.emptySub}>
                  Pick apps from your phone to limit or block.
                </Text>
              </SurfaceCard>
            )}
          </>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {domainRules.length > 0 && (
              <>
                <SectionEyebrow
                  label="CUSTOM DOMAINS"
                  style={styles.sectionHeader}
                />
                {domainRules.map((r, i) => renderItem({ item: r, index: i }))}
              </>
            )}

            <SectionEyebrow
              label="SUGGESTED"
              style={styles.sectionHeaderSuggested}
            />
            <View style={[styles.recursionGrid, { gap: gridGap }]}>
              {POPULAR_DISTRACTIONS.map((rec) => ({
                name: rec.name,
                id: rec.packageId || rec.id,
              }))
                .filter((rec) => !rules.some((r) => r.packageName === rec.id))
                .slice(0, isTablet ? 8 : 6)
                .map((rec) => (
                  <TouchableOpacity
                    key={rec.id}
                    style={[styles.recommendationItem, { width: recItemWidth }]}
                    onPress={() =>
                      onAddApp({ appName: rec.name, packageName: rec.id })
                    }
                  >
                    <AppIcon packageName={rec.id} size={32} />
                    <Text style={styles.recName} numberOfLines={1}>
                      {rec.name}
                    </Text>
                    <Icon
                      name="plus-circle-outline"
                      size={18}
                      color={COLORS.accent}
                      style={styles.recPlusIcon}
                    />
                  </TouchableOpacity>
                ))}
            </View>
            <View style={styles.footerSpacing} />
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, fabStyle]}
        onPress={() => setPickerVisible(true)}
      >
        <Icon name="plus" size={32} color="#FFF" />
      </TouchableOpacity>

      <AppPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={onAddApp}
        alreadySelectedPackages={rules.map((r) => r.packageName)}
      />

      <Modal visible={cooldownVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <SurfaceCard className="w-[85%] items-center rounded-3xl p-6">
            <Icon name="shield-lock" size={32} color={COLORS.red} />
            <Text style={styles.modalTitle}>Strict Mode Warning</Text>
            <Text style={styles.modalSub}>
              Impulse protection is active. Wait for the timer.
            </Text>
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{cooldownSecs}</Text>
              <Text style={styles.timerLbl}>Sec</Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCooldownVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  cooldownSecs > 0 && styles.btnDisabled,
                ]}
                disabled={cooldownSecs > 0}
                onPress={() => {
                  setCooldownVisible(false);
                  checkPin(() => pendingStrictAction?.());
                }}
              >
                <Text style={styles.actionBtnText}>Proceed</Text>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        </View>
      </Modal>

      <Modal visible={limitModalVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <SurfaceCard className="absolute bottom-0 w-full rounded-t-[32px] rounded-b-none p-6 pb-10">
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Set Daily Limit</Text>
              <Text style={styles.modalSubtitle}>
                {formatAppName(selectedRule?.appName || '')}
              </Text>
            </View>

            <View style={styles.timePicker}>
              <View style={styles.timeItem}>
                <TextInput
                  style={styles.timeInput}
                  value={hrInput}
                  onChangeText={setHrInput}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.timeLabel}>Hours</Text>
              </View>
              <Text style={styles.timeDiv}>:</Text>
              <View style={styles.timeItem}>
                <TextInput
                  style={styles.timeInput}
                  value={minInput}
                  onChangeText={setMinInput}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.timeLabel}>Mins</Text>
              </View>
            </View>

            <PrimaryButton
              label="Save Limit"
              onPress={saveLimit}
              style={styles.saveBtn}
            />
            <TouchableOpacity
              style={styles.cancelLink}
              onPress={() => setLimitModalVisible(false)}
            >
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </SurfaceCard>
        </View>
      </Modal>

      <Modal visible={domainModalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <SurfaceCard className="w-[85%] items-center rounded-3xl p-6">
            <Icon name="web" size={32} color={COLORS.accent} />
            <Text style={styles.modalTitle}>Domain Required</Text>
            <Text style={styles.modalSub}>
              Linking a domain allows the engine to track this app reliably.
            </Text>
            <TextInput
              style={styles.nuvioTextInput}
              value={domainInput}
              onChangeText={setDomainInput}
              placeholder={`e.g. ${UI_EXAMPLES.DOMAIN}`}
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDomainModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.accent }]}
                onPress={saveCustomDomain}
              >
                <Text style={styles.actionBtnText}>Link App</Text>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        </View>
      </Modal>

      <PinGate
        visible={pinGateVisible}
        onSuccess={() => {
          setPinGateVisible(false);
          pendingAction?.();
        }}
        onCancel={() => setPinGateVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: HORIZONTAL_PADDING },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  appName: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  pkg: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 8, opacity: 0.6 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modes: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeTxt: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  limitBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  limitText: { color: COLORS.yellow, fontSize: 13, fontWeight: '700' },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  emptySub: { color: COLORS.muted, fontSize: 14, textAlign: 'center' },
  footer: { marginTop: 12 },
  sectionHeader: { marginBottom: 16, marginTop: 16 },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    opacity: 0.6,
  },
  recursionGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  recommendationItem: {
    backgroundColor: COLORS.card,
    borderRadius: CARD_RADIUS,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recName: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  recPlusIcon: { marginTop: 6 },
  footerSpacing: { height: 120 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sectionHeaderSuggested: { marginBottom: 16, marginTop: 32 },
  btnDisabled: { opacity: 0.5 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 16 },
  modalSub: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  timerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
  },
  timerText: { color: COLORS.red, fontSize: 24, fontWeight: '900' },
  timerLbl: { color: COLORS.red, fontSize: 10, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 24 },
  cancelBtn: { flex: 1, padding: 16, alignItems: 'center' },
  cancelBtnText: { color: COLORS.muted, fontWeight: '700' },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionBtnText: { color: '#FFF', fontWeight: '900' },
  modalHeaderContent: { marginBottom: 12 },
  modalSubtitle: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  timePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 32,
    gap: 20,
  },
  timeItem: { alignItems: 'center' },
  timeInput: {
    color: '#FFF',
    fontSize: 44,
    fontWeight: '900',
    textAlign: 'center',
  },
  timeLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeDiv: { color: 'rgba(255,255,255,0.2)', fontSize: 44, fontWeight: '300' },
  saveBtn: { borderRadius: 16 },
  cancelLink: { marginTop: 20, alignItems: 'center' },
  cancelLinkText: { color: COLORS.muted, fontSize: 14, fontWeight: '700' },
  nuvioTextInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
