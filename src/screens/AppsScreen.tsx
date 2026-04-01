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
import { COLORS } from '../components/theme';
import { getRules, updateRule, deleteRule } from '@focusgate/state/rules';
import { storageAdapter } from '../store/storageAdapter';
import { AppRule, RuleMode } from '@focusgate/types';
import * as nextDNS from '../api/nextdns';
import { AppPickerModal } from '../components/AppPickerModal';
import AppIcon from '../components/AppIcon';
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
import {
  getDomainForRule,
  getNextDNSServiceId,
  POPULAR_DISTRACTIONS,
  UI_EXAMPLES,
} from '@focusgate/core';

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
        `Please enter a valid domain (e.g. ${UI_EXAMPLES.DOMAIN})`,
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
        <AppIcon
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
        data={rules.filter((r) => r.type === 'service')}
        keyExtractor={(r) => r.packageName}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.sectionHeader}>App Controls</Text>
            {rules.filter((r) => r.type === 'service').length === 0 && (
              <View style={styles.empty}>
                <Icon name="application-cog" size={48} color={COLORS.border} />
                <Text style={styles.emptyTitle}>No Apps Added</Text>
              </View>
            )}
          </>
        }
        ListFooterComponent={
          <>
            <Text style={styles.sectionHeaderDomains}>Custom Domains</Text>
            {rules.filter((r) => r.type === 'domain').length === 0 ? (
              <View style={styles.emptyMini}>
                <Text style={styles.emptyTextMini}>No domains added</Text>
              </View>
            ) : (
              rules
                .filter((r) => r.type === 'domain')
                .map((r) => renderItem({ item: r }))
            )}

            <View style={styles.footer}>
              <Text style={styles.footerTitle}>Quick Add Recommended</Text>
              <View style={styles.quickAddGrid}>
                {POPULAR_DISTRACTIONS.map((rec) => ({
                  name: rec.name,
                  id: rec.packageId || rec.id, // Use packageId for mobile apps
                }))
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
          </>
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
              placeholder={`e.g. ${UI_EXAMPLES.SUBDOMAIN}`}
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.15)',
    gap: 10,
  },
  warnBannerTxt: {
    color: COLORS.yellow,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  strictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.2)',
    gap: 4,
  },
  strictBadgeTxt: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  list: {
    padding: 20,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  appName: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  pkg: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.7,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.03)',
  },
  modes: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeTxt: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modeTxtActive: {
    color: '#000',
  },
  limitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,184,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  limitText: {
    color: COLORS.yellow,
    fontSize: 12,
    fontWeight: '800',
  },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },

  empty: {
    alignItems: 'center',
    marginTop: 80,
    padding: 40,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 20,
    letterSpacing: -0.5,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    fontSize: 13,
    fontWeight: '500',
  },

  footer: {
    marginTop: 40,
    paddingHorizontal: 10,
  },
  footerTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 20,
    opacity: 0.8,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAddBtn: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  quickAddBtnTxt: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#0A0A0F',
    borderRadius: 32,
    padding: 32,
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  overrideDesc: {
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    fontSize: 14,
    fontWeight: '500',
  },
  countdownBox: {
    alignItems: 'center',
    marginVertical: 24,
  },
  countdownNum: {
    color: COLORS.red,
    fontSize: 48,
    fontWeight: '900',
  },
  countdownLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  avgBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 24,
    gap: 8,
  },
  avgText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  timeField: {
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    color: COLORS.text,
    fontSize: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '600',
  },
  timeLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  timeColon: {
    color: COLORS.text,
    fontSize: 32,
    marginHorizontal: 16,
    marginBottom: 24,
    fontWeight: '300',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  modalBtnTxt: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modalBtnTxtPrimary: {
    color: '#fff',
  },
  modalBtnDanger: {
    borderColor: 'rgba(255, 71, 87, 0.2)',
  },
  dimmed: {
    opacity: 0.3,
  },
  strictIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginTop: 10,
    opacity: 0.8,
  },
  sectionHeaderDomains: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginTop: 30, // Updated from 20 to 30 for better separation
    opacity: 0.8,
  },
  emptyMini: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTextMini: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.5,
  },
});
