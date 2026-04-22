/**
 * Smart Notifications
 *
 * 1. Daily usage milestones — nudge when total screen time hits 2h / 4h / 6h
 * 2. Focus session complete — notify when the timer finishes
 * 3. Focus session reminder — if user hasn't started focus by target time
 *
 * All notifications are throttled: no more than one per category per day.
 */

import { formatMinutes } from '@stopaccess/core';

declare var chrome: any;

const NOTIF_STORE_KEY = 'fg_notif_sent_today';
const USAGE_HISTORY_KEY = 'fg_usage_history'; // Map of date -> totalMinutes

// Thresholds in milliseconds
const USAGE_MILESTONES_MS = [
  2 * 60 * 60 * 1000, // 2 hours
  4 * 60 * 60 * 1000, // 4 hours
  6 * 60 * 60 * 1000, // 6 hours
];

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function _getComparison(): Promise<{
  delta: number;
  isHigher: boolean;
} | null> {
  try {
    const res = await chrome.storage.local.get([USAGE_HISTORY_KEY]);
    const history = res[USAGE_HISTORY_KEY] || {};
    const dates = Object.keys(history).sort();
    if (dates.length < 1) {
      return null;
    }

    // Get last recorded day's total
    const lastDate = dates[dates.length - 1];
    const yesterdayUsage = history[lastDate] || {};
    const yesterdayTotalMs = Object.values(yesterdayUsage).reduce(
      (a: any, b: any) => a + (b.time || 0),
      0,
    ) as number;

    if (yesterdayTotalMs === 0) {
      return null;
    }

    const currentUsageRes = await chrome.storage.local.get(['fg_usage']);
    const currentUsage = currentUsageRes.fg_usage || {};
    const currentTotalMs = Object.values(currentUsage).reduce(
      (a: any, b: any) => a + (b.time || 0),
      0,
    ) as number;

    const delta =
      Math.abs((currentTotalMs - yesterdayTotalMs) / yesterdayTotalMs) * 100;
    return {
      delta,
      isHigher: currentTotalMs > yesterdayTotalMs,
    };
  } catch {
    return null;
  }
}

async function _getToday(): Promise<string> {
  return new Date().toLocaleDateString('en-CA');
}

async function _hasSent(key: string): Promise<boolean> {
  const res = await chrome.storage.local.get([NOTIF_STORE_KEY]);
  const store: Record<string, any> = res[NOTIF_STORE_KEY] || {};
  const today = await _getToday();
  if (store._day && store._day !== today) {
    await chrome.storage.local.set({ [NOTIF_STORE_KEY]: { _day: today } });
    return false;
  }
  const sent: string[] = Array.isArray(store[today]) ? store[today] : [];
  return sent.includes(key);
}

async function _markSent(key: string): Promise<void> {
  const res = await chrome.storage.local.get([NOTIF_STORE_KEY]);
  const store: Record<string, any> = res[NOTIF_STORE_KEY] || {};
  const today = await _getToday();
  if (!Array.isArray(store[today])) {
    store[today] = [];
  }
  if (!store[today].includes(key)) {
    store[today].push(key);
  }
  store._day = today;
  await chrome.storage.local.set({ [NOTIF_STORE_KEY]: store });
}

// ─── Notify ───────────────────────────────────────────────────────────────────

function _notify(
  id: string,
  title: string,
  message: string,
  priority = 0,
): void {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon-128.png'),
    title,
    message,
    priority,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function checkUsageMilestones(
  totalUsageMs: number,
): Promise<void> {
  const messages: Record<string, string> = {
    usage_2h: "You've been online for 2 hours. Time for a short break?",
    usage_4h: '4 hours of screen time today. Your focus deserves protection.',
    usage_6h: '6 hours online — consider wrapping up and stepping away.',
  };

  for (const ms of USAGE_MILESTONES_MS) {
    if (totalUsageMs < ms) {
      continue;
    }

    const hours = ms / 3600000;
    const key = `usage_${hours}h`;
    if (await _hasSent(key)) {
      continue;
    }

    await _markSent(key);

    const comparison = await _getComparison();
    let compText = '';
    if (comparison) {
      compText = `\n(${comparison.delta.toFixed(1)}% ${
        comparison.isHigher ? 'higher' : 'lower'
      } than yesterday)`;
    }

    _notify(
      key,
      `${hours}h Screen Time`,
      (messages[key] ?? `You've hit ${hours} hours of usage today.`) + compText,
      1,
    );
  }
}

export function notifyFocusComplete(durationMinutes: number): void {
  _notify(
    'focus_complete',
    'Focus Session Complete!',
    `You stayed focused for ${formatMinutes(
      durationMinutes,
    )}. Great work — take a break.`,
    1,
  );
}

export function notifyFocusStopped(minutesDone: number): void {
  _notify(
    'focus_stopped',
    'Focus Session Ended',
    `Session stopped after ${formatMinutes(
      minutesDone,
    )}. Still, any progress counts!`,
  );
}

export async function notifyLimitApproaching(
  appName: string,
  remainingMins: number,
  limitMins?: number,
): Promise<void> {
  const key = `limit_near_${appName}_${Math.floor(remainingMins)}`;
  if (await _hasSent(key)) {
    return;
  }

  await _markSent(key);
  _notify(
    key,
    `${appName}: Limit Approaching`,
    `You have ${formatMinutes(remainingMins)} left (Limit: ${formatMinutes(
      limitMins || 0,
    )}) for ${appName} today. Mind your focus!`,
    1,
  );
}

export async function notifyServiceDistraction(
  appName: string,
  sessionMins: number,
): Promise<void> {
  const key = `distraction_${appName}_${Math.floor(sessionMins / 30)}`;
  if (await _hasSent(key)) {
    return;
  }

  await _markSent(key);
  _notify(
    key,
    'Time for a break?',
    `You've been on ${appName} for over ${formatMinutes(
      sessionMins,
    )}. A short walk might help your focus.`,
  );
}
