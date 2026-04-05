import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../components/theme';
import { getSnapshots } from '@focusgate/state/insights';
import { getFocusStreak } from '@focusgate/core/insights';
import { storageAdapter } from '../store/storageAdapter';
import { DailySnapshot } from '@focusgate/types';
import { formatDuration } from '../utils/time';
import { SCREEN_WIDTH, HORIZONTAL_PADDING, isShort } from '../constants/layout';
import {
  AppScreen,
  ScreenHeader,
  SectionEyebrow,
  SurfaceCard,
} from '../ui/mobile';

const CHART_HEIGHT = 160;
const BAR_GAP = 6;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

function BarChart({
  data,
  color,
  chartWidth,
}: {
  data: number[];
  color: string;
  chartWidth: number;
}) {
  const max = Math.max(...data, 1);
  const barW = (chartWidth - BAR_GAP * (data.length - 1)) / data.length;

  return (
    <View
      style={[
        styles.chartContainer,
        { width: chartWidth, height: CHART_HEIGHT },
      ]}
    >
      <View style={styles.chartBackdrop}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.gridLine} />
        ))}
      </View>
      <View style={styles.barsContainer}>
        {data.map((val, i) => {
          const barH = Math.max((val / max) * (CHART_HEIGHT - 30), 4);
          return (
            <View key={i} style={[styles.barWrapper, { width: barW }]}>
              <Text style={styles.barValue}>
                {val > 0 ? Math.round(val) : ''}
              </Text>
              <View
                style={[
                  styles.bar,
                  { height: barH, backgroundColor: color },
                  i === data.length - 1 ? styles.barActive : styles.barInactive,
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

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
      <View style={[styles.statIconBox, { backgroundColor: color + '10' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const chartWidth = SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - 48; // Adjusted for padding & card internal padding

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

  const stats = useMemo(() => {
    const totalScreen = snapshots.reduce((s, d) => s + d.screenTimeMinutes, 0);
    const totalFocus = snapshots.reduce((s, d) => s + d.focusMinutes, 0);
    const totalSessions = snapshots.reduce((s, d) => s + d.focusSessions, 0);
    return {
      avgScreen: Math.round(totalScreen / 7),
      totalFocus,
      totalSessions,
      hasData: snapshots.some(
        (s) => s.screenTimeMinutes > 0 || s.focusMinutes > 0,
      ),
    };
  }, [snapshots]);

  const headerStyle = useMemo(
    () => ({
      marginTop: isShort ? 20 : 40,
    }),
    [],
  );

  const chartLabelStyle = useMemo(
    () => ({
      width: chartWidth / 7, // snapshots are usually 7 days
    }),
    [chartWidth],
  );

  const chartData = useMemo(
    () => ({
      screen: snapshots.map((d) => d.screenTimeMinutes),
      focus: snapshots.map((d) => d.focusMinutes),
      labels: snapshots.map((d) => getLabel(d.date)),
    }),
    [snapshots],
  );

  return (
    <AppScreen scroll>
      <StatusBar barStyle="light-content" />
      <View style={headerStyle}>
        <ScreenHeader
          title="Intelligence"
          subtitle="Analyzing your focus metrics"
        />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            icon="clock-outline"
            label="Avg Screen"
            value={formatDuration(stats.avgScreen)}
            color={COLORS.muted}
          />
          <StatCard
            icon="target"
            label="Flow Time"
            value={formatDuration(stats.totalFocus)}
            color={COLORS.accent}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="lightning-bolt"
            label="Focus Streak"
            value={`${streak} DAYS`}
            color={COLORS.yellow}
          />
          <StatCard
            icon="shield-check-outline"
            label="Sessions"
            value={String(stats.totalSessions)}
            color={COLORS.green}
          />
        </View>
      </View>

      {!stats.hasData ? (
        <View>
          <SurfaceCard className="mb-10 items-center px-10 py-10">
            <Icon name="chart-box-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No insights yet</Text>
            <Text style={styles.emptyDesc}>
              Complete a few focus sessions to build your productivity graph.
            </Text>
          </SurfaceCard>
        </View>
      ) : (
        <>
          <View>
            <SurfaceCard className="mb-5 px-6 py-6">
              <View style={styles.cardHeader}>
                <Icon name="monitor-dashboard" size={16} color={COLORS.muted} />
                <Text style={styles.cardTitle}>SCREEN ENGAGEMENT (MIN)</Text>
              </View>
              <BarChart
                data={chartData.screen}
                color={COLORS.muted}
                chartWidth={chartWidth}
              />
              <View style={styles.labelsRow}>
                {chartData.labels.map((l, i) => (
                  <Text key={i} style={[styles.chartLabel, chartLabelStyle]}>
                    {l}
                  </Text>
                ))}
              </View>
            </SurfaceCard>
          </View>

          <View>
            <SurfaceCard className="mb-5 px-6 py-6">
              <View style={styles.cardHeader}>
                <Icon name="target" size={16} color={COLORS.accent} />
                <Text style={[styles.cardTitle, { color: COLORS.accent }]}>
                  DEEP FOCUS TRENDS (MIN)
                </Text>
              </View>
              <BarChart
                data={chartData.focus}
                color={COLORS.accent}
                chartWidth={chartWidth}
              />
              <View style={styles.labelsRow}>
                {chartData.labels.map((l, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.chartLabel,
                      { width: chartWidth / chartData.labels.length },
                    ]}
                  >
                    {l}
                  </Text>
                ))}
              </View>
            </SurfaceCard>
          </View>

          <SectionEyebrow label="HISTORICAL RECORDS" />

          <SurfaceCard className="overflow-hidden">
            {[...snapshots].reverse().map((s, i) => (
              <View
                key={s.date}
                style={[
                  styles.historyRow,
                  i === snapshots.length - 1 && styles.noBorder,
                ]}
              >
                <View style={styles.rowLead}>
                  <Text style={styles.rowLabel}>{getLabel(s.date)}</Text>
                  <Text style={styles.rowSub}>
                    {s.date.split('-').slice(1).join('/')}
                  </Text>
                </View>
                <View style={styles.rowStats}>
                  <View style={styles.rowStat}>
                    <Icon name="clock-outline" size={12} color={COLORS.muted} />
                    <Text style={styles.rowStatText}>
                      {formatDuration(s.screenTimeMinutes)}
                    </Text>
                  </View>
                  <View style={styles.rowStat}>
                    <Icon name="target" size={12} color={COLORS.accent} />
                    <Text style={[styles.rowStatText, styles.accentText]}>
                      {formatDuration(s.focusMinutes)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </SurfaceCard>
        </>
      )}
      <View style={styles.footerSpacing} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  statsGrid: { gap: 12, marginBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 4,
    textTransform: 'uppercase',
    opacity: 0.6,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    opacity: 0.8,
  },
  cardTitle: {
    color: COLORS.muted,
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1.5,
  },

  chartContainer: { justifyContent: 'flex-end' },
  chartBackdrop: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    paddingBottom: 15,
  },
  gridLine: { height: 1, backgroundColor: COLORS.border, opacity: 0.3 },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
  },
  barWrapper: { alignItems: 'center', justifyContent: 'flex-end' },
  bar: { borderRadius: 12, width: '100%' },
  barActive: { opacity: 1 },
  barInactive: { opacity: 0.4 },
  barValue: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 6,
    opacity: 0.5,
  },

  labelsRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  chartLabel: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '900',
    opacity: 0.5,
  },

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLead: { width: 60 },
  rowLabel: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  rowSub: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    opacity: 0.5,
  },
  rowStats: { flexDirection: 'row', gap: 16 },
  rowStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowStatText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  accentText: { color: COLORS.accent },
  noBorder: { borderBottomWidth: 0 },
  footerSpacing: { height: 100 },

  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 20 },
  emptyDesc: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
});
