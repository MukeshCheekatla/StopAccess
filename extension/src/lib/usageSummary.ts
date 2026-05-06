import { STORAGE_KEYS } from '@stopaccess/state';
import { formatMinutes } from '@stopaccess/core';

export interface UsageSummary {
  topApp: string;
  topTime: string;
  totalTime: string;
  totalSessions: number;
  avgWpm: number;
  weeklyTime: string;
  weeklyAvg: string;
  diffPercent: number; // Positive means today > average, Negative means today < average
  activeRules: number;
  activeCategories: number;
  focusTimeToday: string;
  maxStreak: number;
  maxStreakApp?: string;
  nextDnsStatus: 'active' | 'inactive';
  isCloudConnected: boolean;
  isStrictModeEnabled: boolean;
  isPinEnabled: boolean;
  syncStatus: string;
  randomApp?: string;
  randomAppTime?: string;
}

function isSameDay(ts: number): boolean {
  const date = new Date(ts);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Aggregates raw storage data into displayable summaries.
 * Can be reused by the companion bot, dashboard widgets, or reports.
 */
export async function getUsageSummary(): Promise<UsageSummary> {
  if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
    return {
      topApp: '',
      topTime: '0m',
      totalTime: '0m',
      totalSessions: 0,
      avgWpm: 0,
      weeklyTime: '0m',
      weeklyAvg: '0m',
      diffPercent: 0,
      activeRules: 0,
      activeCategories: 0,
      focusTimeToday: '0m',
      maxStreak: 0,
      nextDnsStatus: 'inactive',
      isCloudConnected: false,
      isStrictModeEnabled: false,
      isPinEnabled: false,
      syncStatus: 'idle',
    };
  }

  const res = await chrome.storage.local.get([
    STORAGE_KEYS.USAGE,
    STORAGE_KEYS.USAGE_HISTORY,
    STORAGE_KEYS.TYPING_MASTERY_LOG,
    STORAGE_KEYS.RULES,
    STORAGE_KEYS.SESSION_HISTORY,
    'fg_active_session',
    STORAGE_KEYS.PROFILE_ID,
    STORAGE_KEYS.SYNC_STATE,
    STORAGE_KEYS.CACHED_METADATA,
    STORAGE_KEYS.STRICT_MODE,
    'fg_lock_pin',
  ]);

  const usage = res[STORAGE_KEYS.USAGE] || {};
  const history = res[STORAGE_KEYS.USAGE_HISTORY] || {};
  const typingRaw = res[STORAGE_KEYS.TYPING_MASTERY_LOG];
  const rulesRaw = res[STORAGE_KEYS.RULES];
  const rules = Array.isArray(rulesRaw)
    ? rulesRaw
    : typeof rulesRaw === 'string'
    ? JSON.parse(rulesRaw)
    : [];
  const rawSessions = res[STORAGE_KEYS.SESSION_HISTORY];
  const sessionHistoryArr: any[] = Array.isArray(rawSessions)
    ? rawSessions
    : [];
  const activeSession: any = res.fg_active_session;
  const syncStateRaw = res[STORAGE_KEYS.SYNC_STATE];
  const syncState =
    typeof syncStateRaw === 'string' ? JSON.parse(syncStateRaw) : syncStateRaw;
  const metadata: any = res[STORAGE_KEYS.CACHED_METADATA] || {};

  // 1. Daily Stats
  let totalMs = 0;
  let topApp = '';
  let topMs = 0;
  let totalSessions = 0;
  const apps = Object.keys(usage);

  apps.forEach((domain) => {
    const data = usage[domain];
    totalMs += data.time || 0;
    totalSessions += data.sessions || 0;
    if (data.time > topMs) {
      topMs = data.time;
      topApp = domain;
    }
  });

  // 2. Weekly Stats (Today + last 6 days)
  let weeklyMs = totalMs;
  const historyDays = Object.keys(history).sort().reverse().slice(0, 6);
  historyDays.forEach((date) => {
    const dayUsage = history[date] || {};
    Object.values(dayUsage).forEach((v: any) => {
      weeklyMs += v.time || 0;
    });
  });

  const dayCount = historyDays.length + 1;
  const weeklyAvgMs = weeklyMs / dayCount;

  // 3. Diff Calculation
  let diffPercent = 0;
  if (weeklyAvgMs > 0) {
    diffPercent = Math.round(((totalMs - weeklyAvgMs) / weeklyAvgMs) * 100);
  }

  // 4. Rule & Category Stats
  const activeRules = Array.isArray(rules)
    ? rules.filter((r: any) => r.type !== 'category').length
    : 0;

  let activeCategories = 0;
  if (metadata && metadata.services) {
    activeCategories += metadata.services.filter((s: any) => s.active).length;
  }
  if (metadata && metadata.categories) {
    activeCategories += metadata.categories.filter((c: any) => c.active).length;
  }

  // 5. Focus Stats
  let focusMsToday = 0;
  sessionHistoryArr.forEach((s) => {
    if (s.startedAt && isSameDay(s.startedAt)) {
      const mins =
        s.actualMinutes !== undefined
          ? s.actualMinutes
          : s.status === 'completed'
          ? s.duration
          : 0;
      focusMsToday += (mins || 0) * 60000;
    }
  });
  if (
    activeSession &&
    (activeSession.status === 'focusing' || activeSession.status === 'paused')
  ) {
    const elapsed = Date.now() - activeSession.startedAt;
    focusMsToday += Math.max(0, elapsed);
  }
  const focusTimeToday = formatMinutes(focusMsToday / 60000);

  let maxStreak = 0;
  let maxStreakApp = '';
  if (Array.isArray(rules)) {
    rules.forEach((r: any) => {
      if (r.streakDays > maxStreak) {
        maxStreak = r.streakDays;
        maxStreakApp = r.id || r.domain || '';
      }
    });
  }

  // 6. Status Info
  const nextDnsStatus = res[STORAGE_KEYS.PROFILE_ID] ? 'active' : 'inactive';
  const syncStatus = syncState?.status || 'idle';
  const isCloudConnected =
    syncStatus === 'synced' || !!res[STORAGE_KEYS.SYNC_STATE];
  const isStrictModeEnabled = !!res[STORAGE_KEYS.STRICT_MODE];
  const isPinEnabled = !!res.fg_lock_pin;

  // 7. WPM Stats
  let avgWpm = 0;
  if (typingRaw) {
    try {
      const typing =
        typeof typingRaw === 'string' ? JSON.parse(typingRaw) : typingRaw;
      if (Array.isArray(typing) && typing.length > 0) {
        const totalWpm = typing.reduce((sum, s) => sum + (s.wpm || 0), 0);
        avgWpm = Math.round(totalWpm / typing.length);
      }
    } catch {}
  }

  // 8. Random App Detail
  let randomApp = '';
  let randomAppTime = '';
  if (apps.length > 0) {
    const rDomain = apps[Math.floor(Math.random() * apps.length)];
    randomApp = rDomain;
    randomAppTime = formatMinutes((usage[rDomain].time || 0) / 60000);
  }

  return {
    topApp,
    topTime: formatMinutes(topMs / 60000),
    totalTime: formatMinutes(totalMs / 60000),
    totalSessions,
    avgWpm,
    weeklyTime: formatMinutes(weeklyMs / 60000),
    weeklyAvg: formatMinutes(weeklyAvgMs / 60000),
    diffPercent,
    activeRules,
    activeCategories,
    focusTimeToday,
    maxStreak,
    maxStreakApp,
    nextDnsStatus,
    isCloudConnected,
    isStrictModeEnabled,
    isPinEnabled,
    syncStatus,
    randomApp,
    randomAppTime,
  };
}
