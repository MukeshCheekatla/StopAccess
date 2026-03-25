import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS } from '../components/theme';
import {
  refreshTodayUsage,
  getCachedUsage,
  hasUsagePermission,
  requestUsagePermission,
} from '../modules/usageStats';
import { getRules, updateRule } from '../store/rules';
import { isConfigured } from '../api/nextdns';
import { AppUsageStat, AppRule } from '../types';
import { AppIconImage } from '../components/AppIconImage';
import { formatDuration } from '../utils/time';
import { formatAppName } from '../utils/text';

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

// --- Main Screen ---

export default function DashboardScreen() {
  const [controlledUsage, setControlledUsage] = useState<AppUsageStat[]>([]);
  const [distractingApps, setDistractingApps] = useState<AppUsageStat[]>([]);
  const [rules, setRules] = useState<AppRule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPerm, setHasPerm] = useState(true);
  const [totalMins, setTotalMins] = useState(0);

  const load = useCallback(async (isAuto = false) => {
    if (!isAuto) {
      setRefreshing(true);
    }

    const [perm] = await Promise.all([
      hasUsagePermission(),
      Promise.resolve(isConfigured()),
    ]);

    setHasPerm(perm);

    if (perm) {
      const stats = await refreshTodayUsage().catch(
        () => getCachedUsage() as AppUsageStat[],
      );
      const currentRules = getRules();

      const total = stats.reduce((sum, a) => sum + a.totalMinutes, 0);
      setTotalMins(total);

      // Filter
      const controlled = stats.filter((s) =>
        currentRules.some((r) => r.packageName === s.packageName),
      );
      const distracting = stats
        .filter(
          (s) => !currentRules.some((r) => r.packageName === s.packageName),
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

  const onQuickAdd = (app: any) => {
    const newRule: AppRule = {
      appName: app.appName,
      packageName: app.packageName,
      mode: 'allow',
      dailyLimitMinutes: 60,
      blockedToday: false,
      usedMinutesToday: app.totalMinutes,
      addedByUser: true,
    };
    updateRule(newRule);
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
