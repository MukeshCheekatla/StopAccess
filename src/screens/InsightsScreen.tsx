import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, RADIUS } from '../components/theme';
import { getSnapshots } from '@focusgate/state/insights';
import { getFocusStreak } from '@focusgate/core/insights';
import { storageAdapter } from '../store/storageAdapter';
import { DailySnapshot } from '@focusgate/types';
import { formatDuration } from '../utils/time';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const CHART_HEIGHT = 140;
const BAR_GAP = 6;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const diff = Math.round(
    (today.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / 86400000,
  );
  if (diff === 0) {
    return 'Today';
  }
  if (diff === 1) {
    return 'Yest.';
  }
  return DAY_LABELS[d.getDay()];
}

// ---------------------------------------------------------------------------
// Mini bar chart (no library needed)
// ---------------------------------------------------------------------------
function BarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const barW = (CHART_WIDTH - BAR_GAP * (data.length - 1)) / data.length;

  return (
    <View
      style={[
        styles.chartContainer,
        { width: CHART_WIDTH, height: CHART_HEIGHT },
      ]}
    >
      {data.map((val, i) => {
        const barH = Math.max((val / max) * (CHART_HEIGHT - 20), 4);
        return (
          <View
            key={i}
            style={[styles.barWrapper, i > 0 && styles.barGap, { width: barW }]}
          >
            <Text style={styles.barValue}>
              {val > 0 ? Math.round(val) : ''}
            </Text>
            <View
              style={[
                styles.bar,
                {
                  height: barH,
                  backgroundColor: color,
                },
                i === 0 ? styles.barCurrent : styles.barPrevious,
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Icon name={icon} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function InsightsScreen() {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [streak, setStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getSnapshots(storageAdapter).then((data: DailySnapshot[]) =>
        setSnapshots([...data].reverse()),
      );
      getFocusStreak(storageAdapter).then(setStreak);
    }, []),
  );

  const hasData = snapshots.some(
    (s) => s.screenTimeMinutes > 0 || s.focusMinutes > 0,
  );

  const totalScreenMins = snapshots.reduce(
    (s, d) => s + d.screenTimeMinutes,
    0,
  );
  const totalFocusMins = snapshots.reduce((s, d) => s + d.focusMinutes, 0);
  const totalSessions = snapshots.reduce((s, d) => s + d.focusSessions, 0);

  const screenData = snapshots.map((d) => d.screenTimeMinutes);
  const focusData = snapshots.map((d) => d.focusMinutes);
  const labels = snapshots.map((d) => getLabel(d.date));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary cards */}
        <View style={styles.statsRow}>
          <StatCard
            icon="clock-outline"
            label="Screen Time"
            value={formatDuration(Math.round(totalScreenMins / 7))}
            color={COLORS.muted}
          />
          <StatCard
            icon="target"
            label="Focus Time"
            value={formatDuration(totalFocusMins)}
            color={COLORS.accent}
          />
          <StatCard
            icon="fire"
            label="Streak"
            value={`${streak}d`}
            color="#f97316"
          />
          <StatCard
            icon="check-circle"
            label="Sessions"
            value={String(totalSessions)}
            color={COLORS.green}
          />
        </View>

        {!hasData && (
          <View style={styles.emptyState}>
            <Icon
              name="chart-timeline-variant"
              size={56}
              color={COLORS.border}
            />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyDesc}>
              Complete your first Focus Session or let the daily reset run to
              start seeing insights.
            </Text>
          </View>
        )}

        {hasData && (
          <>
            {/* Screen Time chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📱 Daily Screen Time (min)</Text>
              <BarChart data={screenData} color={COLORS.muted} />
              <View style={styles.labelsRow}>
                {labels.map((l, i) => (
                  <Text
                    key={i}
                    style={[styles.chartLabel, { width: CHART_WIDTH / 7 }]}
                  >
                    {l}
                  </Text>
                ))}
              </View>
            </View>

            {/* Focus Time chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🎯 Daily Focus Time (min)</Text>
              <BarChart data={focusData} color={COLORS.accent} />
              <View style={styles.labelsRow}>
                {labels.map((l, i) => (
                  <Text
                    key={i}
                    style={[styles.chartLabel, { width: CHART_WIDTH / 7 }]}
                  >
                    {l}
                  </Text>
                ))}
              </View>
            </View>

            {/* Daily breakdown list */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 Daily Breakdown</Text>
              {[...snapshots].reverse().map((s) => (
                <View key={s.date} style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{getLabel(s.date)}</Text>
                  <View style={styles.dayStats}>
                    <Icon name="clock-outline" size={13} color={COLORS.muted} />
                    <Text style={styles.dayStat}>
                      {formatDuration(s.screenTimeMinutes)}
                    </Text>
                    <Icon name="target" size={13} color={COLORS.accent} />
                    <Text style={styles.dayStat}>
                      {formatDuration(s.focusMinutes)}
                    </Text>
                    {s.blockedAppsCount > 0 && (
                      <>
                        <Icon
                          name="shield-check"
                          size={13}
                          color={COLORS.green}
                        />
                        <Text style={styles.dayStat}>
                          {s.blockedAppsCount} blocked
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg, paddingBottom: 32 },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barGap: { marginLeft: BAR_GAP },
  bar: {
    borderRadius: 4,
    width: '100%',
  },
  barCurrent: { opacity: 1 },
  barPrevious: { opacity: 0.55 },
  barValue: {
    color: COLORS.muted,
    fontSize: 9,
    marginBottom: 2,
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  chartLabel: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayLabel: {
    color: COLORS.text,
    fontWeight: 'bold',
    width: 50,
    fontSize: 13,
  },
  dayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  dayStat: {
    color: COLORS.muted,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyDesc: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
