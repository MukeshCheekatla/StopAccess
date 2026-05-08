/**
 * background/usageTracker.ts
 * All usage persistence: save, sanitize, sync, tab switching, and initActiveTab.
 * tabTracker.ts imports from here — this file has zero awareness of engine cycles or daily reset.
 */
import { recordDailySnapshot, getDomainForRule } from '@stopaccess/core';
import { getRules, saveRules } from '@stopaccess/state/rules';
import { extensionAdapter, extensionLogger } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
import { notifyServiceDistraction } from './notifications';
import { performDailyReset } from './dailyReset';

export const SAFETY_MAX_DURATION = 15 * 60 * 1000;
const ACTIVE_TAB_KEY = 'active_tab_state';

// ── Active Tab State ───────────────────────────────────────────────────────

export async function getActiveTabState(): Promise<{
  domain: string | null;
  start: number;
  tabId: number;
} | null> {
  const res = await chrome.storage.local.get([ACTIVE_TAB_KEY]);
  return (
    (res[ACTIVE_TAB_KEY] as {
      domain: string | null;
      start: number;
      tabId: number;
    } | null) ?? null
  );
}

export async function setActiveTabState(state: any) {
  if (state) {
    await chrome.storage.local.set({ [ACTIVE_TAB_KEY]: state });
  } else {
    await chrome.storage.local.remove(ACTIVE_TAB_KEY);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function getDomain(url: string): string | null {
  try {
    if (
      !url ||
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:')
    ) {
      return null;
    }
    const hostname = new URL(url).hostname.replace('www.', '');
    const ignored = ['newtab', 'extensions', 'localhost'];
    if (ignored.some((d) => hostname === d || hostname.endsWith('.' + d))) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
}

function matchesDomain(domain: string, ruleDomain: string): boolean {
  if (!domain || !ruleDomain) {
    return false;
  }
  return domain === ruleDomain || domain.endsWith('.' + ruleDomain);
}

// ── Usage Persistence ──────────────────────────────────────────────────────

export async function sanitizeUsageData() {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timeSinceMidnight = now - today.getTime();

  const res = await chrome.storage.local.get([
    STORAGE_KEYS.USAGE,
    STORAGE_KEYS.USAGE_HISTORY,
  ]);
  const u = res[STORAGE_KEYS.USAGE] || {};
  let usageChanged = false;

  let totalDayUsage = 0;
  for (const dom of Object.keys(u)) {
    if (u[dom].time > timeSinceMidnight + 30000) {
      u[dom].time = timeSinceMidnight;
      usageChanged = true;
    }
    totalDayUsage += u[dom].time || 0;
  }
  if (totalDayUsage > timeSinceMidnight + 60000) {
    const scale = timeSinceMidnight / totalDayUsage;
    for (const dom of Object.keys(u)) {
      u[dom].time = Math.floor(u[dom].time * scale);
    }
    usageChanged = true;
  }

  const history = res[STORAGE_KEYS.USAGE_HISTORY] || {};
  let historyChanged = false;
  const MAX_DAY_MS = 24 * 60 * 60 * 1000;
  for (const day of Object.keys(history)) {
    const dayUsage = history[day];
    let dayTotal = 0;
    for (const d of Object.keys(dayUsage)) {
      if (dayUsage[d].time > MAX_DAY_MS) {
        dayUsage[d].time = MAX_DAY_MS;
        historyChanged = true;
      }
      dayTotal += dayUsage[d].time || 0;
    }
    if (dayTotal > MAX_DAY_MS + 60000) {
      const scale = MAX_DAY_MS / dayTotal;
      for (const d of Object.keys(dayUsage)) {
        dayUsage[d].time = Math.floor(dayUsage[d].time * scale);
      }
      historyChanged = true;
    }
  }

  if (usageChanged) {
    await chrome.storage.local.set({ [STORAGE_KEYS.USAGE]: u });
  }
  if (historyChanged) {
    await chrome.storage.local.set({ [STORAGE_KEYS.USAGE_HISTORY]: history });
  }
}

export async function saveUsage(domain: string, durationMs: number) {
  if (!domain || durationMs < 50) {
    return;
  }
  const dayChanged = await performDailyReset();
  if (dayChanged) {
    return;
  }

  const res = await chrome.storage.local.get([STORAGE_KEYS.USAGE]);
  const u = res[STORAGE_KEYS.USAGE] || {};
  if (!u[domain]) {
    u[domain] = { time: 0, sessions: 0 };
  }

  const cappedDuration = Math.min(durationMs, SAFETY_MAX_DURATION);
  u[domain].time += cappedDuration;
  await chrome.storage.local.set({ [STORAGE_KEYS.USAGE]: u });

  const totalMs = Object.values(u).reduce(
    (a: any, b: any) => a + (b.time || 0),
    0,
  );
  const totalMins = Math.round(totalMs / 60000);
  const rules = await getRules(extensionAdapter);
  const blockedCount = rules.filter((r) => r.blockedToday).length;
  await recordDailySnapshot(extensionAdapter, totalMins, blockedCount);
}

export async function syncRulesWithUsage() {
  const res = await chrome.storage.local.get([STORAGE_KEYS.USAGE]);
  const u = res[STORAGE_KEYS.USAGE] || {};
  const rules = await getRules(extensionAdapter);
  let rulesChanged = false;

  for (let i = 0; i < rules.length; i++) {
    let matchedTimeMs = 0;
    for (const dom of Object.keys(u)) {
      const mapped = getDomainForRule(rules[i]);
      if (
        (mapped && matchesDomain(dom, mapped)) ||
        matchesDomain(dom, rules[i].packageName) ||
        (rules[i].customDomain && matchesDomain(dom, rules[i].customDomain))
      ) {
        matchedTimeMs += u[dom].time || 0;
      }
    }
    const exactMins = matchedTimeMs / 60000;
    if (Math.abs((rules[i].usedMinutesToday || 0) - exactMins) > 0.01) {
      rules[i].usedMinutesToday = exactMins;
      rulesChanged = true;
    }

    if (rules[i].mode === 'limit') {
      const used = rules[i].usedMinutesToday || 0;
      const limit = rules[i].dailyLimitMinutes || 0;
      const isOverLimit = used >= limit;
      if (isOverLimit && !rules[i].blockedToday) {
        rules[i].blockedToday = true;
        rulesChanged = true;
        extensionLogger.add(
          'info',
          `Limit reached for ${rules[i].packageName}. Blocking.`,
        );
      } else if (!isOverLimit && rules[i].blockedToday) {
        rules[i].blockedToday = false;
        rulesChanged = true;
        extensionLogger.add(
          'info',
          `Limit increased for ${rules[i].packageName}. Releasing block.`,
        );
      } else if (!isOverLimit && limit > 0 && limit - used <= 5) {
        // Logic kept for background state awareness as requested.
        // (Notification call removed to prevent OS alerts).
      }
    }
  }

  if (rulesChanged) {
    await saveRules(extensionAdapter, rules);
  }
}

async function incrementSession(domain: string) {
  if (!domain) {
    return;
  }
  await performDailyReset();
  const res = await chrome.storage.local.get([STORAGE_KEYS.USAGE]);
  const usage = res[STORAGE_KEYS.USAGE] || {};
  if (!usage[domain]) {
    usage[domain] = { time: 0, sessions: 0 };
  }
  usage[domain].sessions += 1;
  await chrome.storage.local.set({ [STORAGE_KEYS.USAGE]: usage });
}

export async function flushActiveTabUsage() {
  const current = await getActiveTabState();
  if (current && current.domain) {
    const now = Date.now();

    // 🔍 DEFENSIVE CHECK: Is the browser actually being used?
    const focusedWindows = await chrome.windows.getAll({
      windowTypes: ['normal'],
    });
    const chromeHasFocus = focusedWindows.some((w) => w.focused);

    let isAudible = false;
    try {
      const tab = await chrome.tabs.get(current.tabId);
      isAudible = tab.audible;
    } catch {
      // Tab may have been closed
    }

    const duration = now - current.start;
    if (duration > 1000) {
      try {
        // Only record usage if browser is focused OR site is playing audio (e.g. music/video)
        if (chromeHasFocus || isAudible) {
          await saveUsage(current.domain, duration);
        }

        // Always update the start marker so "stale" time doesn't accumulate for later
        current.start = now;
        await setActiveTabState(current);
      } catch (error) {
        console.error('[StopAccess] flush_active_tab', error);
      }
    }
  }
}

// ── Tab Switch ─────────────────────────────────────────────────────────────

export async function checkSessionDistraction(
  activeState: { domain: string; start: number } | null,
) {
  if (activeState?.domain) {
    const sessionMins = (Date.now() - activeState.start) / 60000;
    if (sessionMins >= 30) {
      notifyServiceDistraction(activeState.domain, sessionMins).catch(() => {});
    }
  }
}

export async function switchTab(
  tabId: number,
  withStorageLock: <T>(task: () => Promise<T>) => Promise<T>,
) {
  const now = Date.now();
  await withStorageLock(async () => {
    const current = await getActiveTabState();

    if (tabId === -1) {
      if (current && current.domain) {
        const duration = now - current.start;
        if (duration > 50) {
          await saveUsage(current.domain, duration);
        }
      }
      await setActiveTabState(null);
      return;
    }

    try {
      const tab = await chrome.tabs.get(tabId);
      const domain = getDomain(tab.url);

      if (current && current.domain === domain) {
        if (current.tabId !== tabId) {
          current.tabId = tabId;
          await setActiveTabState(current);
        }
        return;
      }

      if (current && current.domain) {
        const duration = now - current.start;
        if (duration > 50) {
          await saveUsage(current.domain, duration);
        }
      }

      const nextState = { domain, start: now, tabId };
      await setActiveTabState(nextState);
      if (domain) {
        await incrementSession(domain);
      }
    } catch (e) {
      await setActiveTabState(null);
    }
  });
}

export async function initActiveTab() {
  try {
    const focusedWindows = await chrome.windows.getAll({
      windowTypes: ['normal'],
    });
    const chromeHasFocus = focusedWindows.some((w) => w.focused);

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      await setActiveTabState(null);
      return;
    }

    const domain = getDomain(tabs[0].url);
    const existing = await getActiveTabState();
    const now = Date.now();
    const todayStr = new Date().toLocaleDateString('en-CA');
    const lastReset = await extensionAdapter.getString(STORAGE_KEYS.LAST_RESET);

    if (
      existing &&
      existing.tabId === tabs[0].id &&
      existing.domain === domain &&
      lastReset === todayStr
    ) {
      if (chromeHasFocus) {
        const duration = now - existing.start;
        if (duration > 50 && duration < SAFETY_MAX_DURATION) {
          await saveUsage(existing.domain, duration);
        }
      }
      existing.start = now;
      await setActiveTabState(existing);
      return;
    }

    if (existing && existing.domain && chromeHasFocus) {
      const duration = now - existing.start;
      if (duration > 50 && duration < SAFETY_MAX_DURATION) {
        await saveUsage(existing.domain, duration);
      }
    }

    const nextState = { domain, start: now, tabId: tabs[0].id };
    await setActiveTabState(nextState);
    if (domain && domain !== existing?.domain) {
      await incrementSession(domain);
    }
  } catch {
    await setActiveTabState(null);
  }
}
