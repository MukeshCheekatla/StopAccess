declare var chrome: any;
import { loadAppsData } from './useAppsVM';
import {
  extensionAdapter as storage,
  STORAGE_KEYS,
  nextDNSApi,
} from '../../../extension/src/background/platformAdapter';
import type { FocusSessionRecord } from '@stopaccess/types';

type UsageEntry = {
  time?: number;
  sessions?: number;
};

type UsageMap = Record<string, UsageEntry>;

function getTodayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function sumUsage(usage: UsageMap) {
  let totalMs = 0;
  let totalSessions = 0;

  for (const value of Object.values(usage || {})) {
    totalMs += value?.time || 0;
    totalSessions += value?.sessions || 0;
  }

  return { totalMs, totalSessions };
}

function addDays(dateKey: string, delta: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return date.toLocaleDateString('en-CA');
}

function percentDelta(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function buildMonthCalendar(
  targetDate: string,
  usageHistory: Record<string, UsageMap>,
  todayUsage: UsageMap,
) {
  const selected = new Date(`${targetDate}T00:00:00`);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = getTodayKey();

  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day).toLocaleDateString('en-CA');
    const usage = date === todayKey ? todayUsage : usageHistory[date] || {};
    const summary = sumUsage(usage);
    days.push({
      date,
      day,
      totalMs: summary.totalMs,
      sessions: summary.totalSessions,
      isSelected: date === targetDate,
      isToday: date === todayKey,
    });
  }

  return days;
}

function buildDailySeries(
  targetDate: string,
  usageHistory: Record<string, UsageMap>,
  todayUsage: UsageMap,
  days = 7,
) {
  const series = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addDays(targetDate, -offset);
    const usage =
      date === getTodayKey() ? todayUsage : usageHistory[date] || {};
    const summary = sumUsage(usage);
    series.push({
      date,
      totalMs: summary.totalMs,
      sessions: summary.totalSessions,
    });
  }
  return series;
}

function summarizeFocusSessions(
  sessions: FocusSessionRecord[],
  targetDate: string,
) {
  const matching = sessions.filter((session) => {
    if (!session.startedAt) {
      return false;
    }
    const day = new Date(session.startedAt).toLocaleDateString('en-CA');
    return day === targetDate;
  });

  const completed = matching.filter(
    (session) => session.status === 'completed',
  );
  const cancelled = matching.filter(
    (session) => session.status === 'cancelled',
  );
  const totalMinutes = completed.reduce(
    (sum, session) =>
      sum +
      Math.min(
        session.actualMinutes ?? session.duration ?? 0,
        session.duration ?? 0,
      ),
    0,
  );

  return {
    totalSessions: matching.length,
    completedSessions: completed.length,
    cancelledSessions: cancelled.length,
    totalMinutes,
    averageMinutes:
      completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0,
  };
}

export async function loadDashboardData(selectedDate?: string) {
  let rules: any[] = [];
  try {
    rules = (await loadAppsData()).rules;
  } catch {}

  const today = getTodayKey();
  const targetDate = selectedDate || today;
  const isToday = targetDate === today;

  const storageData = (await chrome.storage.local.get([
    STORAGE_KEYS.USAGE,
    'fg_logs',
    STORAGE_KEYS.USAGE_HISTORY,
    STORAGE_KEYS.SESSION_HISTORY,
  ])) as any;

  const fgLogs = ((storageData.fg_logs || []) as any[]).slice(-3).reverse();
  const usageHistory = (storageData[STORAGE_KEYS.USAGE_HISTORY] ||
    {}) as Record<string, UsageMap>;
  const todayUsage = (storageData[STORAGE_KEYS.USAGE] || {}) as UsageMap;
  const sessionHistory =
    (storageData[STORAGE_KEYS.SESSION_HISTORY] as FocusSessionRecord[]) || [];

  const usage = isToday ? todayUsage : usageHistory[targetDate] || {};
  const { totalMs: allTotalMs, totalSessions } = sumUsage(usage);

  const previousDate = addDays(targetDate, -1);
  const previousUsage =
    previousDate === today ? todayUsage : usageHistory[previousDate] || {};
  const previousSummary = sumUsage(previousUsage);

  const domainList = Object.entries(usage as UsageMap)
    .map(([domain, d]: [string, UsageEntry]) => ({
      domain,
      timeMs: d.time || 0,
      sessions: d.sessions || 0,
      sharePct:
        allTotalMs > 0 ? Math.round(((d.time || 0) / allTotalMs) * 100) : 0,
    }))
    .filter((d) => d.timeMs > 0)
    .sort((a, b) => b.timeMs - a.timeMs)
    .slice(0, 8);

  const syncStatus = await storage.getString('nextdns_connection_status');
  const lastSync = await storage.getString('fg_last_sync_at');
  const isNew = rules.length === 0 && !syncStatus;

  const allKnownDays = Array.from(
    new Set([...Object.keys(usageHistory), today]),
  ).sort();
  const grandTotals = allKnownDays.reduce(
    (acc, dayKey) => {
      const dayUsage =
        dayKey === today ? todayUsage : usageHistory[dayKey] || {};
      const summary = sumUsage(dayUsage);
      acc.totalMs += summary.totalMs;
      acc.totalSessions += summary.totalSessions;
      return acc;
    },
    { totalMs: 0, totalSessions: 0 },
  );
  const totalDays = Math.max(allKnownDays.length, 1);
  const globalAvgMs = grandTotals.totalMs / totalDays;
  const globalAvgSessions = grandTotals.totalSessions / totalDays;

  let cloudBlockedQueries = 0;
  if (syncStatus === 'connected') {
    // Background refresh: fetch and save to storage.
    // This will trigger the storage listener in DashboardPage to re-render.
    nextDNSApi
      .getAnalyticsCounters()
      .then((res: any) => {
        if (res && res.ok) {
          const data = res.data;
          let blocked = 0;
          if (Array.isArray(data)) {
            const bObj = data.find((i: any) => i.status === 'blocked');
            blocked = Number(bObj?.queries) || 0;
          } else if (data && typeof data === 'object') {
            blocked =
              Number(data.blocked || data.blockedQueries || data.queries) || 0;
          }
          storage.set('fg_cloud_blocked_queries', blocked);
        }
      })
      .catch((e) => console.warn('[Dashboard] Sync fail', e));
  }

  cloudBlockedQueries =
    (await storage.getNumber('fg_cloud_blocked_queries', 0)) ?? 0;

  const focusSummary = summarizeFocusSessions(sessionHistory, targetDate);
  const focusEnd = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);

  return {
    rules,
    fgLogs,
    allTotalMs,
    totalSessions,
    averageSessionMs:
      totalSessions > 0 ? Math.round(allTotalMs / totalSessions) : 0,
    previousTotalMs: previousSummary.totalMs,
    previousTotalSessions: previousSummary.totalSessions,
    usageDeltaPct: percentDelta(allTotalMs, previousSummary.totalMs),
    sessionsDeltaPct: percentDelta(
      totalSessions,
      previousSummary.totalSessions,
    ),
    domainList,
    syncStatus,
    lastSync,
    isNew,
    cloudBlockedQueries,
    globalAvgMs,
    globalAvgSessions,
    focusEnd,
    focusSummary,
    targetDate,
    isToday,
    calendarDays: buildMonthCalendar(targetDate, usageHistory, todayUsage),
    dailySeries: buildDailySeries(targetDate, usageHistory, todayUsage, 7),
    comparisonLabel: previousDate,
    activeRuleCount: rules.filter(
      (rule: any) =>
        rule.desiredBlockingState ?? rule.blockedToday ?? rule.mode !== 'allow',
    ).length,
  };
}
