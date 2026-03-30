import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS } from '../components/theme';
import {
  refreshTodayUsage,
  getCachedUsage,
  hasUsagePermission,
  requestUsagePermission,
} from '../modules/usageStats';
import { DailySnapshot, AppRule, AppUsageStat } from '../types';
import { AppIconImage } from '../components/AppIconImage';
import { formatDuration } from '../utils/time';
import { formatAppName } from '../utils/text';
import { getRules, updateRule } from '@focusgate/state/rules';
import { getSnapshots } from '@focusgate/state/insights';
import { storageAdapter } from '../store/storageAdapter';
import { isConfigured } from '../api/nextdns';
import { getFocusStreak } from '@focusgate/core/insights';

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
    <View style={barStyles.container}>
      <View style={barStyles.bg} />
      <View
        style={[
          barStyles.fill,
          { width: `${progress * 100}%`, backgroundColor: barColor },
        ]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { height: 6, width: '100%', marginTop: 8 },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.border,
    borderRadius: 3,
  },
  fill: { height: 6, borderRadius: 3 },
});

// ---------------------------------------------------------------------------
// WeeklyInsights component
// ---------------------------------------------------------------------------

function WeeklyInsights({
  snapshots,
  streak,
}: {
  snapshots: DailySnapshot[];
  streak: number;
}) {
  if (
    snapshots.every((s) => s.screenTimeMinutes === 0 && s.focusSessions === 0)
  ) {
    return null; // No data yet — hide until there's something to show
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

  return (
    <View style={insightStyles.card}>
      <Text style={insightStyles.cardTitle}>This Week</Text>

      {/* 7-day bar chart */}
      <View style={insightStyles.chart}>
        {barValues.map((val, i) => (
          <View key={i} style={insightStyles.barCol}>
            <View style={insightStyles.barTrack}>
              <View
                style={[
                  insightStyles.bar,
                  { height: `${Math.round((val / maxBar) * 100)}%` },
                  i === barValues.length - 1 && insightStyles.barToday,
                ]}
              />
            </View>
            <Text style={insightStyles.barLabel}>{dayLabels[i]}</Text>
          </View>
        ))}
      </View>

      {/* Stat pills */}
      <View style={insightStyles.pills}>
        <View style={insightStyles.pill}>
          <Icon name="fire" size={16} color={COLORS.accent} />
          <Text style={insightStyles.pillVal}>{streak}</Text>
          <Text style={insightStyles.pillLabel}>day streak</Text>
        </View>
        <View style={insightStyles.pillDivider} />
        <View style={insightStyles.pill}>
          <Icon name="shield-check" size={16} color={COLORS.green} />
          <Text style={insightStyles.pillVal}>{weeklyBlocks}</Text>
          <Text style={insightStyles.pillLabel}>blocks</Text>
        </View>
        <View style={insightStyles.pillDivider} />
        <View style={insightStyles.pill}>
          <Icon name="brain" size={16} color="#7c6ff7" />
          <Text style={insightStyles.pillVal}>
            {weeklyFocusMins >= 60
              ? `${Math.floor(weeklyFocusMins / 60)}h ${weeklyFocusMins % 60}m`
              : `${weeklyFocusMins}m`}
          </Text>
          <Text style={insightStyles.pillLabel}>focused</Text>
        </View>
      </View>
    </View>
  );
}

const insightStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: SPACING.md,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: 3,
    minHeight: 3,
  },
  barToday: { backgroundColor: COLORS.accent },
  barLabel: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  pill: { flex: 1, alignItems: 'center', gap: 2 },
  pillDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  pillVal: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  pillLabel: { color: COLORS.muted, fontSize: 10, textTransform: 'uppercase' },
});

// SetupNudge — shown when NextDNS is not configured or no rules exist
function SetupNudge({
  configured,
  hasRules,
}: {
  configured: boolean;
  hasRules: boolean;
}) {
  const nav = useNavigation<any>();
  if (configured && hasRules) {
    return null;
  }
  const title = !configured
    ? 'Connect NextDNS to start blocking'
    : 'Add your first app to control';
  const sub = !configured
    ? 'Go to Settings and enter your Profile ID and API Key.'
    : 'Head to the Apps tab and pick an app to limit or block.';
  const btnLabel = !configured ? 'Open Settings' : 'Go to Apps';
  const tabName = !configured ? 'Settings' : 'Apps';
  return (
    <View style={nudgeStyles.card}>
      <View style={nudgeStyles.iconRow}>
        <Icon
          name={!configured ? 'dns-outline' : 'plus-circle-outline'}
          size={28}
          color={COLORS.accent}
        />
      </View>
      <Text style={nudgeStyles.title}>{title}</Text>
      <Text style={nudgeStyles.sub}>{sub}</Text>
      <TouchableOpacity
        style={nudgeStyles.btn}
        onPress={() => nav.navigate(tabName)}
      >
        <Text style={nudgeStyles.btnTxt}>{btnLabel}</Text>
        <Icon name="arrow-right" size={16} color={COLORS.accent} />
      </TouchableOpacity>
    </View>
  );
}

const nudgeStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.accent + '33',
  },
  iconRow: { marginBottom: SPACING.sm },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sub: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnTxt: { color: COLORS.accent, fontWeight: 'bold', fontSize: 14 },
});

// --- Main Screen ---

export default function DashboardScreen() {
  const [controlledUsage, setControlledUsage] = useState<AppUsageStat[]>([]);
  const [distractingApps, setDistractingApps] = useState<AppUsageStat[]>([]);
  const [rules, setRules] = useState<AppRule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPerm, setHasPerm] = useState(true);
  const [totalMins, setTotalMins] = useState(0);
  const [configured, setConfigured] = useState(false);
  const [weeklySnapshots, setWeeklySnapshots] = useState<DailySnapshot[]>([]);
  const [focusStreak, setFocusStreak] = useState(0);

  const load = useCallback(async (isAuto = false) => {
    if (!isAuto) {
      setRefreshing(true);
    }

    const isConfig = await isConfigured();
    const [perm] = await Promise.all([hasUsagePermission()]);

    setHasPerm(perm);
    setConfigured(isConfig);
    setWeeklySnapshots(await getSnapshots(storageAdapter));
    setFocusStreak(await getFocusStreak(storageAdapter));

    if (perm) {
      const stats = await refreshTodayUsage().catch(
        () => getCachedUsage() as AppUsageStat[],
      );
      const currentRules = await getRules(storageAdapter);

      const total = stats.reduce((sum, a) => sum + a.totalMinutes, 0);
      setTotalMins(total);

      // Filter
      const controlled = stats.filter((s) =>
        currentRules.some((r: AppRule) => r.packageName === s.packageName),
      );
      const distracting = stats
        .filter(
          (s) =>
            !currentRules.some((r: AppRule) => r.packageName === s.packageName),
        )
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
        .slice(0, 5);

      setControlledUsage(
        controlled.sort((a, b) => b.totalMinutes - a.totalMinutes),
      );
      setDistractingApps(distracting);
      setRules(currentRules);
    }

    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [load]);

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
    load();
  };

  const blockedCount = rules.filter((r) => r.blockedToday).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Focus Dashboard</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
        </View>

        {/* Global Summary Card */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{formatDuration(totalMins)}</Text>
            <Text style={styles.summaryLabel}>Screen Time</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: COLORS.red }]}>
              {blockedCount}
            </Text>
            <Text style={styles.summaryLabel}>Blocked</Text>
          </View>
        </View>

        {/* Setup nudge — shown when not configured or no rules yet */}
        <SetupNudge configured={configured} hasRules={rules.length > 0} />

        {/* Weekly insights */}
        <WeeklyInsights snapshots={weeklySnapshots} streak={focusStreak} />

        {!hasPerm && (
          <TouchableOpacity
            style={styles.banner}
            onPress={requestUsagePermission}
          >
            <Icon name="shield-alert" size={20} color={COLORS.red} />
            <Text style={[styles.bannerTxt, { color: COLORS.red }]}>
              Grant Usage Access permission
            </Text>
          </TouchableOpacity>
        )}

        {/* Controlled Section */}
        {controlledUsage.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Controlled Apps</Text>
            {controlledUsage.map((item) => {
              const rule = rules.find(
                (r) => r.packageName === item.packageName,
              );
              const limit = rule?.dailyLimitMinutes || 0;
              const isBlocked = rule?.blockedToday;

              return (
                <View key={item.packageName} style={styles.appCard}>
                  <View style={styles.appTop}>
                    <AppIconImage
                      packageName={item.packageName}
                      size={40}
                      iconBase64={rule?.iconBase64}
                    />
                    <View style={styles.infoCol}>
                      <Text style={styles.appName} numberOfLines={1}>
                        {formatAppName(item.appName)}
                      </Text>
                      <Text style={styles.appStatus}>
                        {isBlocked
                          ? 'Blocked'
                          : limit > 0
                          ? `${formatDuration(limit - item.totalMinutes)} left`
                          : 'Monitoring'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.usageVal,
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

        {/* Distracting Section */}
        {distractingApps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeaderTitle}>Distracting Apps</Text>
            {distractingApps.map((item) => (
              <TouchableOpacity
                key={item.packageName}
                style={[styles.appCard, styles.dashedCard]}
                onPress={() => onQuickAdd(item)}
              >
                <View style={styles.appTop}>
                  <AppIconImage packageName={item.packageName} size={40} />
                  <View style={styles.infoCol}>
                    <Text style={styles.appName} numberOfLines={1}>
                      {formatAppName(item.appName)}
                    </Text>
                    <Text style={styles.appStatus}>
                      Tap to start controlling
                    </Text>
                  </View>
                  <View style={styles.quickAddRow}>
                    <Text style={[styles.usageVal, styles.quickAddUsage]}>
                      {formatDuration(item.totalMinutes)}
                    </Text>
                    <Icon name="plus-circle" size={26} color={COLORS.accent} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {controlledUsage.length === 0 &&
          distractingApps.length === 0 &&
          !refreshing && (
            <View style={styles.emptyBox}>
              <Icon name="chart-donut" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No app usage detected today.</Text>
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.md, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  greeting: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },
  date: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  bannerTxt: { fontSize: 13, marginLeft: 8 },
  section: { marginBottom: SPACING.xl },
  sectionHeaderTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  appCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dashedCard: { borderStyle: 'dashed' },
  appTop: { flexDirection: 'row', alignItems: 'center' },
  infoCol: { flex: 1, marginLeft: 14 },
  appName: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  appStatus: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  usageVal: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  quickAddUsage: { marginRight: 8, fontSize: 13, color: COLORS.muted },
  quickAddRow: { flexDirection: 'row', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: COLORS.muted, marginTop: 12 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
