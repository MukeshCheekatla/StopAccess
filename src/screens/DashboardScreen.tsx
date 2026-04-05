import React, {
  useMemo,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  NativeModules,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isShort,
  HORIZONTAL_PADDING,
  CARD_RADIUS,
} from '../constants/layout';
import { refreshTodayUsage, getCachedUsage } from '../modules/usageStats';
import { DailySnapshot, AppRule, AppUsageStat } from '@focusgate/types';
import AppIcon from '../components/AppIcon';
import { formatDuration } from '../utils/time';
import { formatAppName } from '../utils/text';
import { getRules, updateRule } from '@focusgate/state/rules';
import { getSnapshots } from '@focusgate/state/insights';
import { storageAdapter } from '../store/storageAdapter';
import { isConfigured } from '../api/nextdns';
const { RuleEngine } = NativeModules;
import { getFocusStreak } from '@focusgate/core/insights';
import { getLogs, LogEntry } from '../services/logger';

// --- State Management ---

interface DashboardState {
  controlledUsage: AppUsageStat[];
  distractingApps: AppUsageStat[];
  rules: AppRule[];
  refreshing: boolean;
  totalMins: number;
  configured: boolean;
  weeklySnapshots: DailySnapshot[];
  focusStreak: number;
  recentLogs: LogEntry[];
  protectionLevel: string;
  a11yEnabled: boolean;
}

type DashboardAction =
  | { type: 'START_REFRESH' }
  | { type: 'SET_DATA'; payload: Partial<DashboardState> }
  | { type: 'END_REFRESH' };

const initialState: DashboardState = {
  controlledUsage: [],
  distractingApps: [],
  rules: [],
  refreshing: true,
  totalMins: 0,
  configured: false,
  weeklySnapshots: [],
  focusStreak: 0,
  recentLogs: [],
  protectionLevel: 'NONE',
  a11yEnabled: true,
};

function dashboardReducer(
  state: DashboardState,
  action: DashboardAction,
): DashboardState {
  switch (action.type) {
    case 'START_REFRESH':
      return { ...state, refreshing: true };
    case 'SET_DATA':
      return { ...state, ...action.payload };
    case 'END_REFRESH':
      return { ...state, refreshing: false };
    default:
      return state;
  }
}

// --- Sub-components ---

function UsageProgressBar({
  current,
  limit,
}: {
  current: number;
  limit: number;
}) {
  const hasLimit = limit > 0;
  const progress = hasLimit ? Math.min(1, current / limit) : 0;

  let barColor = COLORS.green;
  if (hasLimit) {
    if (progress >= 1) {
      barColor = COLORS.red;
    } else if (progress >= 0.7) {
      barColor = COLORS.yellow;
    }
  }

  return (
    <View className="mt-2 h-1.5 w-full">
      <View className="absolute inset-0 rounded-full bg-border" />
      <View
        className="h-1.5 rounded-full"
        style={{ width: `${progress * 100}%`, backgroundColor: barColor }}
      />
    </View>
  );
}

function WeeklyInsights({
  snapshots,
  streak,
}: {
  snapshots: DailySnapshot[];
  streak: number;
}) {
  const hasData = useMemo(
    () => snapshots.some((s) => s.screenTimeMinutes > 0 || s.focusSessions > 0),
    [snapshots],
  );

  const stats = useMemo(() => {
    if (!hasData) {
      return null;
    }

    const weeklyBlocks = snapshots.reduce((s, d) => s + d.blockedAppsCount, 0);
    const weeklyFocusMins = snapshots.reduce((s, d) => s + d.focusMinutes, 0);
    const maxBar = Math.max(...snapshots.map((s) => s.screenTimeMinutes), 1);

    const dayLabels = snapshots
      .map((s) =>
        new Date(s.date + 'T12:00:00').toLocaleDateString(undefined, {
          weekday: 'short',
        }),
      )
      .reverse();

    const barValues = [...snapshots].reverse().map((s) => s.screenTimeMinutes);

    return { weeklyBlocks, weeklyFocusMins, maxBar, dayLabels, barValues };
  }, [snapshots, hasData]);

  if (!hasData || !stats) {
    return null;
  }

  const { weeklyBlocks, weeklyFocusMins, maxBar, dayLabels, barValues } = stats;

  return (
    <View style={styles.appCard}>
      <Text className="mb-4 text-xs font-bold tracking-wide text-muted">
        Activity Insights
      </Text>

      <View className="mb-4 h-[60px] flex-row items-end gap-2">
        {barValues.map((val, i) => (
          <View key={i} className="h-full flex-1 items-center justify-end">
            <View className="w-full flex-1 justify-end rounded bg-[#FFFFFF08]">
              <View
                className={`min-h-[2px] w-full rounded ${
                  i === barValues.length - 1 ? 'bg-accent' : 'bg-border'
                }`}
                style={{ height: `${Math.round((val / maxBar) * 100)}%` }}
              />
            </View>
            <Text className="mt-1.5 text-[10px] text-muted">
              {dayLabels[i]}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row items-center border-t border-border pt-4">
        <View className="flex-1 items-center">
          <Icon name="fire" size={16} color={COLORS.accent} />
          <Text className="text-[15px] font-bold text-text">{streak}</Text>
          <Text className="text-[10px] uppercase text-muted">streak</Text>
        </View>
        <View className="h-6 w-px bg-border" />
        <View className="flex-1 items-center">
          <Icon name="shield-check" size={16} color={COLORS.green} />
          <Text className="text-[15px] font-bold text-text">
            {weeklyBlocks}
          </Text>
          <Text className="text-[10px] uppercase text-muted">blocks</Text>
        </View>
        <View className="h-6 w-px bg-border" />
        <View className="flex-1 items-center">
          <Icon name="brain" size={16} color={COLORS.blue} />
          <Text className="text-[15px] font-bold text-text">
            {weeklyFocusMins >= 60
              ? `${Math.floor(weeklyFocusMins / 60)}h ${weeklyFocusMins % 60}m`
              : `${weeklyFocusMins}m`}
          </Text>
          <Text className="text-[10px] uppercase text-muted">focus</Text>
        </View>
      </View>
    </View>
  );
}

function SetupNudge({
  configured,
  hasRules,
  refreshing,
}: {
  configured: boolean;
  hasRules: boolean;
  refreshing: boolean;
}) {
  const nav = useNavigation<any>();
  if (refreshing || (configured && hasRules)) {
    return null;
  }

  const title = !configured
    ? 'Connect NextDNS Profile'
    : 'Start controlling apps';
  const sub = !configured
    ? 'Blocking requires an active NextDNS profile ID.'
    : 'Add your first app rule to start saving time.';
  const btnLabel = !configured ? 'Open Settings' : 'Add Apps';
  const tabName = !configured ? 'Settings' : 'Apps';

  return (
    <View
      style={[
        styles.appCard,
        styles.nudgeRow,
        {
          backgroundColor: COLORS.accent + '15',
          borderColor: COLORS.accent + '33',
        },
      ]}
    >
      <Icon
        name={!configured ? 'dns' : 'plus-circle'}
        size={24}
        color={COLORS.accent}
      />
      <View className="flex-1">
        <Text className="mb-1 text-base font-bold text-text">{title}</Text>
        <Text className="mb-3 text-[13px] leading-[18px] text-muted">
          {sub}
        </Text>
        <TouchableOpacity
          className="self-start rounded-lg bg-accent px-4 py-2"
          onPress={() => nav.navigate(tabName)}
        >
          <Text className="text-[13px] font-bold text-white">{btnLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FeatureShortcutGrid({ onOpen }: { onOpen: (route: string) => void }) {
  const shortcuts = [
    {
      key: 'apps',
      label: 'Block List',
      icon: 'apps',
      tint: COLORS.accent,
      route: 'Apps',
    },
    {
      key: 'focus',
      label: 'Focus',
      icon: 'target',
      tint: COLORS.green,
      route: 'Focus',
    },
    {
      key: 'privacy',
      label: 'Privacy',
      icon: 'incognito',
      tint: COLORS.yellow,
      route: 'PrivacySettings',
    },
    {
      key: 'diag',
      label: 'Diagnostics',
      icon: 'application-braces-outline',
      tint: COLORS.red,
      route: 'DiagnosticsSettings',
    },
  ];

  return (
    <View style={styles.section}>
      <Text className="mb-3 text-lg font-extrabold tracking-tighter text-white">
        Control Center
      </Text>
      <View style={styles.shortcutGrid}>
        {shortcuts.map((shortcut) => (
          <TouchableOpacity
            key={shortcut.key}
            style={styles.shortcutCard}
            onPress={() => onOpen(shortcut.route)}
          >
            <View
              style={[
                styles.shortcutIconBox,
                { backgroundColor: shortcut.tint + '14' },
              ]}
            >
              <Icon name={shortcut.icon} size={18} color={shortcut.tint} />
            </View>
            <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// --- Main Screen ---

export default function DashboardScreen() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const isCancelled = useRef(false);
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();

  const heroContentStyle = useMemo(
    () => ({
      paddingTop: insets.top + 20,
    }),
    [insets.top],
  );

  const scrollStyle = useMemo(
    () => ({
      paddingBottom: insets.bottom + 100,
    }),
    [insets.bottom],
  );

  const loadData = useCallback(async (isAuto = false) => {
    isCancelled.current = false;
    if (!isAuto) {
      dispatch({ type: 'START_REFRESH' });
    }

    try {
      const isConfig = await isConfigured();
      if (isCancelled.current) {
        return;
      }

      const snapshots = await getSnapshots(storageAdapter);
      const streak = await getFocusStreak(storageAdapter);
      const logs = getLogs().slice(0, 5);
      let level = 'NONE';
      let a11y = true;

      if (RuleEngine) {
        try {
          if (typeof RuleEngine.getProtectionLevel === 'function') {
            const rawLevel = await RuleEngine.getProtectionLevel();
            level = String(rawLevel || 'NONE');
          }
          if (typeof RuleEngine.isAccessibilityServiceEnabled === 'function') {
            a11y = await RuleEngine.isAccessibilityServiceEnabled();
          }
        } catch (e: any) {
          console.warn('[Dashboard] RuleEngine call failed:', e.message);
        }
      }

      if (isCancelled.current) {
        return;
      }

      const updateData: Partial<DashboardState> = {
        configured: isConfig,
        weeklySnapshots: snapshots,
        focusStreak: streak,
        recentLogs: logs,
        protectionLevel: level,
        a11yEnabled: a11y,
      };

      const stats = await refreshTodayUsage().catch(
        () => getCachedUsage() as AppUsageStat[],
      );
      const currentRules = await getRules(storageAdapter);

      if (isCancelled.current) {
        return;
      }

      const total = stats.reduce((sum, a) => sum + a.totalMinutes, 0);
      const controlled = stats
        .filter((s) =>
          currentRules.some((r: AppRule) => r.packageName === s.packageName),
        )
        .sort((a, b) => b.totalMinutes - a.totalMinutes);

      const distracting = stats
        .filter(
          (s) =>
            !currentRules.some((r: AppRule) => r.packageName === s.packageName),
        )
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
        .slice(0, 5);

      Object.assign(updateData, {
        totalMins: total,
        controlledUsage: controlled,
        distractingApps: distracting,
        rules: currentRules,
      });

      dispatch({ type: 'SET_DATA', payload: updateData });
    } catch (err) {
      console.error('[Dashboard] Load failed', err);
    } finally {
      dispatch({ type: 'END_REFRESH' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        isCancelled.current = true;
      };
    }, [loadData]),
  );

  useEffect(() => {
    const timer = setInterval(() => loadData(true), 30000);
    return () => {
      clearInterval(timer);
      isCancelled.current = true;
    };
  }, [loadData]);

  const onQuickAdd = async (app: any) => {
    const newRule: AppRule = {
      appName: app.appName,
      packageName: app.packageName,
      type: 'service',
      scope: 'profile',
      mode: 'allow',
      dailyLimitMinutes: 60,
      blockedToday: false,
      usedMinutesToday: app.totalMinutes,
      addedByUser: true,
    };
    await updateRule(storageAdapter, newRule);
    loadData();
  };

  const {
    rules,
    protectionLevel,
    a11yEnabled,
    totalMins,
    configured,
    weeklySnapshots,
    focusStreak,
    controlledUsage,
    distractingApps,
    recentLogs,
    refreshing,
  } = state;

  const blockedCount = rules.filter((r) => r.blockedToday).length;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Hero Header Section */}
      <View style={styles.heroWrapper}>
        <View style={styles.heroGradientPlaceholder}>
          <View style={[styles.heroContent, heroContentStyle]}>
            <View>
              <Text style={styles.heroGreeting}>Focus State</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusIndicator,
                    {
                      backgroundColor:
                        protectionLevel === 'NONE' ? COLORS.red : COLORS.green,
                    },
                  ]}
                />
                <Text style={styles.heroStatusText}>
                  {protectionLevel === 'STRONG'
                    ? 'Shield Active'
                    : protectionLevel === 'NONE'
                    ? 'Unprotected'
                    : 'Standard Protection'}
                </Text>
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>
                  {formatDuration(totalMins)}
                </Text>
                <Text style={styles.heroStatLbl}>Usage Today</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatVal}>{blockedCount}</Text>
                <Text style={styles.heroStatLbl}>Blocked</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, scrollStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Protection Alert */}
        {!a11yEnabled && (
          <TouchableOpacity
            style={styles.warningBanner}
            onPress={() => RuleEngine?.openAccessibilitySettings()}
          >
            <Icon name="shield-off-outline" size={20} color={COLORS.red} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-red">
                Accessibility Disabled
              </Text>
              <Text className="text-xs text-[#CF6679CC]">
                Enforcement layer is inactive. Tap to fix.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <SetupNudge
          configured={configured}
          hasRules={rules.length > 0}
          refreshing={refreshing}
        />

        <FeatureShortcutGrid onOpen={(route) => nav.navigate(route)} />

        <WeeklyInsights snapshots={weeklySnapshots} streak={focusStreak} />

        {/* Controlled Apps Section */}
        {controlledUsage.length > 0 && (
          <View style={styles.section}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-extrabold tracking-tighter text-white">
                Controlled Apps
              </Text>
              <TouchableOpacity onPress={() => nav.navigate('Apps')}>
                <Text className="text-sm font-semibold text-accent">
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            {controlledUsage.map((item, _idx) => {
              const rule = rules.find(
                (r) => r.packageName === item.packageName,
              );
              const limit = rule?.dailyLimitMinutes || 0;
              const isBlocked = rule?.blockedToday;

              return (
                <View key={item.packageName} style={styles.appCard}>
                  <View style={styles.appRow}>
                    <AppIcon
                      packageName={item.packageName}
                      size={42}
                      iconBase64={rule?.iconBase64}
                    />
                    <View style={styles.appInfo}>
                      <Text style={styles.appName} numberOfLines={1}>
                        {formatAppName(item.appName)}
                      </Text>
                      <Text style={styles.appStatus}>
                        {isBlocked
                          ? 'Blocked'
                          : limit > 0
                          ? `${formatDuration(
                              Math.max(0, limit - item.totalMinutes),
                            )} left`
                          : 'Monitoring'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.usageText,
                        isBlocked && { color: COLORS.red },
                      ]}
                    >
                      {formatDuration(item.totalMinutes)}
                    </Text>
                  </View>
                  {limit > 0 && (
                    <UsageProgressBar
                      current={item.totalMinutes}
                      limit={limit}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Distracting Apps (Suggestions) */}
        {distractingApps.length > 0 && (
          <View style={styles.section}>
            <Text className="mb-3 text-lg font-extrabold tracking-tighter text-white">
              Suggestions
            </Text>
            <View style={styles.suggestionsGrid}>
              {distractingApps.slice(0, 4).map((item) => (
                <TouchableOpacity
                  key={item.packageName}
                  style={styles.suggestionItem}
                  onPress={() => onQuickAdd(item)}
                >
                  <AppIcon packageName={item.packageName} size={32} />
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {formatAppName(item.appName)}
                  </Text>
                  <Text style={styles.suggestionUsage}>
                    {formatDuration(item.totalMinutes)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Activity Feed */}
        {recentLogs.length > 0 && (
          <View style={styles.section}>
            <Text className="mb-3 text-lg font-extrabold tracking-tighter text-white">
              Recent Activity
            </Text>
            <View style={styles.logsCard}>
              {recentLogs.map((log, i) => (
                <View
                  key={i}
                  style={[styles.logRow, i > 0 && styles.logBorder]}
                >
                  <Icon
                    name={
                      log.level === 'error' ? 'alert-circle' : 'shield-check'
                    }
                    size={14}
                    color={log.level === 'error' ? COLORS.red : COLORS.accent}
                  />
                  <Text style={styles.logMsg} numberOfLines={1}>
                    {log.message}
                  </Text>
                  <Text style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  heroWrapper: {
    height: isShort ? SCREEN_HEIGHT * 0.35 : SCREEN_HEIGHT * 0.3,
    width: '100%',
  },
  heroGradientPlaceholder: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  heroContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  heroGreeting: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroStatusText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: CARD_RADIUS,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroStatVal: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  heroStatLbl: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.red + '15',
    padding: 16,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.red + '33',
    gap: 12,
    marginBottom: 20,
  },
  warningFlex: { flex: 1 },
  warningTitle: { color: COLORS.red, fontWeight: 'bold', fontSize: 14 },
  warningSub: { color: COLORS.red + 'CC', fontSize: 12 },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  viewAllText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  appCard: {
    backgroundColor: COLORS.card,
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nudgeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  appStatus: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 2,
  },
  usageText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutCard: {
    width: (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 10) / 2,
    backgroundColor: COLORS.card,
    borderRadius: CARD_RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shortcutIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  suggestionItem: {
    width: (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 30) / 4,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionName: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  suggestionUsage: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 2,
  },
  logsCard: {
    backgroundColor: COLORS.card,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  logBorder: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  logMsg: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  logTime: {
    color: COLORS.muted,
    fontSize: 12,
  },
});
