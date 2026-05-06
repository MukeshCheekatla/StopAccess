import { STORAGE_KEYS } from '@stopaccess/state';
import { AppRule, FocusSessionRecord } from '@stopaccess/types';

/**
 * Byte's Companion Data Aggregator
 *
 * Computes lean, pre-calculated storage keys to prevent sending large objects
 * (like entire usage history or rules list) over the bridge.
 */

export function initCompanionDataAggregator() {
  chrome.storage.onChanged.addListener((changes) => {
    let updateStats = false;
    let updateUsage = false;
    let updateRules = false;
    let updateSession = false;

    if (STORAGE_KEYS.RULES in changes) {
      updateRules = true;
    }
    if (STORAGE_KEYS.USAGE in changes) {
      updateUsage = true;
    }
    if (STORAGE_KEYS.SESSION in changes) {
      updateSession = true;
    }
    if (STORAGE_KEYS.SESSION_HISTORY in changes) {
      updateStats = true;
    }
    if (STORAGE_KEYS.TOTAL_FOCUS_XP in changes) {
      updateStats = true;
    }

    if (updateRules) {
      syncUserRules();
    }
    if (updateUsage) {
      syncUsageToday();
    }
    if (updateSession) {
      syncFocusSession();
    }
    if (updateStats) {
      syncUserStats();
    }
  });

  // Initial sync
  syncUserRules();
  syncUsageToday();
  syncFocusSession();
  syncUserStats();
}

async function syncUserRules() {
  const res = await chrome.storage.local.get([STORAGE_KEYS.RULES]);
  const rules: AppRule[] = JSON.parse(
    (res[STORAGE_KEYS.RULES] as string) || '[]',
  );

  const activeCount = rules.filter(
    (r) => r.type !== 'category' && (r.mode !== 'allow' || r.blockedToday),
  ).length;
  let maxStreak = 0;
  rules.forEach((r) => {
    if ((r.streakDays || 0) > maxStreak) {
      maxStreak = r.streakDays || 0;
    }
  });

  await chrome.storage.local.set({
    user_rules: {
      count: rules.length,
      activeCount,
      maxStreak,
    },
  });
}

async function syncUsageToday() {
  const res = await chrome.storage.local.get([STORAGE_KEYS.USAGE]);
  const usage = (res[STORAGE_KEYS.USAGE] || {}) as Record<
    string,
    { time: number }
  >;

  let totalMs = 0;
  const sites = Object.entries(usage)
    .map(([domain, data]) => ({
      domain,
      time: data.time || 0,
    }))
    .sort((a, b) => b.time - a.time);

  sites.forEach((s) => (totalMs += s.time));

  await chrome.storage.local.set({
    usage_today: {
      totalMinutes: Math.round(totalMs / 60000),
      topSites: sites.slice(0, 5),
    },
  });
}

async function syncFocusSession() {
  const res = await chrome.storage.local.get([STORAGE_KEYS.SESSION]);
  const session = res[STORAGE_KEYS.SESSION] as FocusSessionRecord | undefined;

  await chrome.storage.local.set({
    focus_session: {
      active: session?.status === 'focusing',
      remaining: 0, // Calculated in UI
      elapsedTime: session?.elapsed || 0,
      status: session?.status || 'idle',
    },
  });
}

async function syncUserStats() {
  const res = await chrome.storage.local.get([
    STORAGE_KEYS.SESSION_HISTORY,
    STORAGE_KEYS.TOTAL_FOCUS_XP,
    STORAGE_KEYS.RULES,
  ]);

  const history = (res[STORAGE_KEYS.SESSION_HISTORY] ||
    []) as FocusSessionRecord[];
  const totalXp = (res[STORAGE_KEYS.TOTAL_FOCUS_XP] || 0) as number;
  const rules: AppRule[] = JSON.parse(
    (res[STORAGE_KEYS.RULES] as string) || '[]',
  );

  const today = new Date().toLocaleDateString('en-CA');
  const sessionsToday = history.filter(
    (s) =>
      s.startedAt &&
      new Date(s.startedAt).toLocaleDateString('en-CA') === today,
  ).length;

  let maxStreak = 0;
  rules.forEach((r) => {
    if ((r.streakDays || 0) > maxStreak) {
      maxStreak = r.streakDays || 0;
    }
  });

  await chrome.storage.local.set({
    user_stats: {
      totalFocusMins: totalXp,
      lifeReclaimed: totalXp, // Simplified: XP is minutes focused
      sessionsToday,
      currentStreak: maxStreak,
    },
    usage_history: {
      sessionsCount: history.length,
    },
  });
}
