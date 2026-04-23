/**
 * Tab Tracker — Usage accumulation, daily reset, and the runCycle engine.
 * Extracted from lifecycle.ts for maintainability.
 */
import {
  runFullEngineCycle,
  recordDailySnapshot,
  NextDNSClient,
  SyncOrchestrator,
  getDomainForRule,
  formatMinutes,
} from '@stopaccess/core';
import { NextDNSConfig } from '@stopaccess/types';
import { getRules, saveRules } from '@stopaccess/state/rules';
import { extensionAdapter, extensionLogger } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
import { syncDNRRules } from './dnrAdapter';
import {
  checkUsageMilestones,
  notifyLimitApproaching,
  notifyServiceDistraction,
} from './notifications';

// ── State ──────────────────────────────────────────────────────────────────

let sync = null;
export let isRunningCycle = false;
let isResetting = false;
let isCyclePending = false;
// Async mutex to prevent usage storage clobbering during rapid tab switching
let isStorageLocked = false;
const storageQueue: (() => void)[] = [];

export async function withStorageLock<T>(task: () => Promise<T>): Promise<T> {
  if (isStorageLocked) {
    await new Promise<void>((resolve) => storageQueue.push(resolve));
  }
  isStorageLocked = true;
  try {
    return await task();
  } finally {
    if (storageQueue.length > 0) {
      const next = storageQueue.shift();
      if (next) {
        next();
      }
    } else {
      isStorageLocked = false;
    }
  }
}

const SAFETY_MAX_DURATION = 15 * 60 * 1000;
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

export function recordRuntimeError(source: string, error: any) {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[StopAccess] ${source}`, error);
  chrome.storage.local
    .set({
      [STORAGE_KEYS.RUNTIME_ERROR]: JSON.stringify({
        at: new Date().toISOString(),
        source,
        error: message,
      }),
    })
    .catch(() => {});
}

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

async function sanitizeUsageData() {
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

async function saveUsage(domain: string, durationMs: number) {
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

async function syncRulesWithUsage() {
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
        notifyLimitApproaching(
          rules[i].appName || rules[i].packageName,
          limit - used,
          limit,
        ).catch(() => {});
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

async function flushActiveTabUsage() {
  const current = await getActiveTabState();
  if (current && current.domain) {
    const now = Date.now();
    const duration = now - current.start;
    if (duration > 1000) {
      try {
        await saveUsage(current.domain, duration);
        current.start = now;
        await setActiveTabState(current);
      } catch (error) {
        recordRuntimeError('flush_active_tab', error);
      }
    }
  }
}

// ── Tab Switch ─────────────────────────────────────────────────────────────

export async function switchTab(tabId: number) {
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

    // If same tab & domain is still active, just reset the start time to now
    // so we don't accumulate phantom time during service worker restarts.
    if (
      existing &&
      existing.tabId === tabs[0].id &&
      existing.domain === domain &&
      lastReset === todayStr
    ) {
      // Flush whatever real time has passed, then restart the clock.
      const duration = now - existing.start;
      if (duration > 50 && duration < SAFETY_MAX_DURATION) {
        await saveUsage(existing.domain, duration);
      }
      existing.start = now;
      await setActiveTabState(existing);
      // Do NOT increment session — this is a restart, not a new visit.
      return;
    }

    // Genuine domain change (e.g. browser restarted on a different tab).
    // Flush old time if valid.
    if (existing && existing.domain) {
      const duration = now - existing.start;
      if (duration > 50 && duration < SAFETY_MAX_DURATION) {
        await saveUsage(existing.domain, duration);
      }
    }

    const nextState = { domain, start: now, tabId: tabs[0].id };
    await setActiveTabState(nextState);
    // Only count a session here if the domain actually changed.
    if (domain && domain !== existing?.domain) {
      await incrementSession(domain);
    }
  } catch {
    await setActiveTabState(null);
  }
}

// ── Daily Reset ────────────────────────────────────────────────────────────

export async function performDailyReset(): Promise<boolean> {
  if (isResetting) {
    return false;
  }
  try {
    const lastReset = await extensionAdapter.getString(STORAGE_KEYS.LAST_RESET);
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (lastReset === todayStr) {
      return false;
    }

    isResetting = true;
    extensionLogger.add('info', `Resetting day: ${lastReset} -> ${todayStr}`);

    const archiveRes = await chrome.storage.local.get([
      STORAGE_KEYS.USAGE,
      STORAGE_KEYS.USAGE_HISTORY,
    ]);
    const oldUsage = archiveRes[STORAGE_KEYS.USAGE] || {};
    const usageHistory = archiveRes[STORAGE_KEYS.USAGE_HISTORY] || {};
    usageHistory[lastReset] = oldUsage;

    const historyKeys = Object.keys(usageHistory).sort();
    if (historyKeys.length > 30) {
      delete usageHistory[historyKeys[0]];
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.USAGE]: {},
      [STORAGE_KEYS.USAGE_HISTORY]: usageHistory,
      [STORAGE_KEYS.TEMP_PASSES]: {},
      [STORAGE_KEYS.EXTENSION_COUNTS]: {},
    });

    const current = await getActiveTabState();
    if (current) {
      current.start = Date.now();
      await setActiveTabState(current);
    }

    const currentRules = await getRules(extensionAdapter);
    const resetRules = currentRules.map((r) => {
      let nextStreak = r.streakDays || 0;
      if (r.desiredBlockingState !== false) {
        if (r.streakUpdatedOn !== todayStr) {
          if (
            !r.streakStartedAt ||
            Date.now() - r.streakStartedAt >= 86400000
          ) {
            nextStreak += 1;
          }
        }
      } else {
        nextStreak = 0;
      }
      return {
        ...r,
        usedMinutesToday: 0,
        blockedToday: false,
        extensionCountToday: 0,
        streakDays: nextStreak,
        streakUpdatedOn: todayStr,
        desiredBlockingState:
          r.mode === 'limit' ? true : r.desiredBlockingState,
      };
    });

    await saveRules(extensionAdapter, resetRules);
    await extensionAdapter.set(STORAGE_KEYS.LAST_RESET, todayStr);
    extensionLogger.add('info', `Daily reset complete for ${todayStr}`);
    return true;
  } catch (err) {
    recordRuntimeError('daily_reset', err);
    return false;
  } finally {
    isResetting = false;
  }
}

// ── Run Cycle ──────────────────────────────────────────────────────────────

export async function runCycle(forceSync = false) {
  if (isRunningCycle) {
    isCyclePending = true;
    return;
  }
  isRunningCycle = true;

  try {
    await withStorageLock(async () => {
      const shouldForceSync = forceSync || isCyclePending;
      isCyclePending = false;

      await performDailyReset();
      await sanitizeUsageData();
      await flushActiveTabUsage();
      await syncRulesWithUsage();

      await chrome.storage.local.set({
        [STORAGE_KEYS.ENGINE_HEARTBEAT]: Date.now(),
      });

      const usageRes = await chrome.storage.local.get([STORAGE_KEYS.USAGE]);
      const usageMap = usageRes[STORAGE_KEYS.USAGE] || {};
      const totalUsageMs = Object.values(usageMap).reduce(
        (sum: number, v: any) => sum + (v?.time || 0),
        0,
      ) as number;
      checkUsageMilestones(totalUsageMs).catch(() => {});

      const activeState = await getActiveTabState();
      if (activeState && activeState.domain) {
        const sessionMins = (Date.now() - activeState.start) / 60000;
        if (sessionMins >= 30) {
          notifyServiceDistraction(activeState.domain, sessionMins).catch(
            () => {},
          );
        }
      }

      const cfg = await chrome.storage.local.get([
        STORAGE_KEYS.PROFILE_ID,
        STORAGE_KEYS.API_KEY,
      ]);
      const nextdns_cfg: NextDNSConfig = {
        profileId: (cfg[STORAGE_KEYS.PROFILE_ID] as string) || '',
        apiKey: (cfg[STORAGE_KEYS.API_KEY] as string) || '',
      };
      const client = new NextDNSClient(nextdns_cfg, extensionLogger.add);
      const ctx = {
        storage: extensionAdapter,
        api: client,
        logger: extensionLogger,
        notifications: {
          notifyBlocked: (name: string, limit: number, used: number) => {
            const limitText = limit ? formatMinutes(limit) : 'your';
            const usedText = used ? formatMinutes(used) : 'your focus time';
            chrome.notifications.create({
              type: 'basic',
              iconUrl: chrome.runtime.getURL('assets/icon-128.png'),
              title: `Limit Reached: ${name}`,
              message: `You've used ${usedText} (Limit: ${limitText}) for ${name} today. We're keeping you on track!`,
            });
          },
        },
      };

      if (nextdns_cfg.profileId && nextdns_cfg.apiKey) {
        if (!sync) {
          sync = new SyncOrchestrator(ctx);
          await sync.onLaunch();
        } else {
          sync.ctx = ctx;
          sync.adapter.client = client;
        }
        if (shouldForceSync) {
          await sync.onStateChange(true);
        }
        try {
          const connectedRes = await client.testConnection();
          await extensionAdapter.set(
            STORAGE_KEYS.CONNECTION_STATUS,
            connectedRes.ok ? 'connected' : 'error',
          );
        } catch (e) {
          await extensionAdapter.set(STORAGE_KEYS.CONNECTION_STATUS, 'error');
        }
      } else if (nextdns_cfg.profileId) {
        await extensionAdapter.set(
          STORAGE_KEYS.CONNECTION_STATUS,
          'browser_mode',
        );
      } else {
        await extensionAdapter.set(
          STORAGE_KEYS.CONNECTION_STATUS,
          'not_configured',
        );
      }

      const result = await runFullEngineCycle(ctx);
      let blockedDomains = result?.ok && result?.domains ? result.domains : [];

      const passRes = await chrome.storage.local.get([
        STORAGE_KEYS.TEMP_PASSES,
      ]);
      const passes = passRes[STORAGE_KEYS.TEMP_PASSES] || {};
      const domainsWithPasses = Object.keys(passes).filter((domain) => {
        const pass = passes[domain];
        return pass && Date.now() < pass.expiresAt;
      });

      if (domainsWithPasses.length > 0) {
        blockedDomains = blockedDomains.filter(
          (domain) =>
            !domainsWithPasses.some(
              (pd) => domain === pd || domain.endsWith('.' + pd),
            ),
        );
      }

      const dnrResult = await syncDNRRules(blockedDomains);
      await chrome.storage.local.set({
        [STORAGE_KEYS.BLOCKED_DOMAINS]: blockedDomains,
        [STORAGE_KEYS.BLOCK_DEBUG]: JSON.stringify({
          at: new Date().toISOString(),
          ok: result?.ok ?? false,
          blockedDomains,
          dnrResult,
        }),
      });
    });
  } catch (e) {
    extensionLogger.add('error', 'Lifecycle Engine Fail', String(e));
    await chrome.storage.local.set({
      [STORAGE_KEYS.BLOCK_DEBUG]: JSON.stringify({
        at: new Date().toISOString(),
        ok: false,
        error: String(e),
      }),
    });
  } finally {
    isRunningCycle = false;
    if (isCyclePending) {
      setTimeout(() => runCycle(true), 100);
    }
  }
}
