/**
 * Extension Service Worker Entry Point (Thin Lifecycle Wrapper)
 * Implementation of "Analytics-Grade Tab Tracking" Strategy.
 */
import {
  runFullEngineCycle,
  recordDailySnapshot,
  NextDNSClient,
  SyncOrchestrator,
  buildExtensionPagePath,
  getDomainForRule,
  formatMinutes,
} from '@stopaccess/core';
import { NextDNSConfig } from '@stopaccess/types';
import { getRules, saveRules } from '@stopaccess/state/rules';
import { extensionAdapter, extensionLogger } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
import { syncDNRRules } from './dnrAdapter';
import {
  handleAlarm,
  getActiveSession,
  endSession,
  updateBadge,
  startSession,
  pauseSession,
  resumeSession,
} from './sessionManager';
import { getEffectiveElapsed } from '../lib/sessionTimer';
// import { initPeerSync, broadcastDiff, getPeerSyncStatus } from './peerSync';
// import { broadcastDiff, getPeerSyncStatus } from './peerSync'; // initPeerSync remains disabled
import {
  checkUsageMilestones,
  notifyFocusComplete,
  notifyFocusStopped,
  notifyLimitApproaching,
  notifyServiceDistraction,
} from './notifications';
import {
  getCloudUser,
  // signInWithGoogle, // commented out
  signOut,
  // pushUsageToCloud,
} from './authManager';

// --- Local-First Tracking State ---
let sync = null;
let isRunningCycle = false;
let isResetting = false;

// Async Mutex to prevent usage storage clobbering during rapid tab switching
let isStorageLocked = false;
const storageQueue: (() => void)[] = [];

async function withStorageLock<T>(task: () => Promise<T>): Promise<T> {
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

const SAFETY_MAX_DURATION = 15 * 60 * 1000; // 15 minutes max per increment

async function sanitizeUsageData() {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const timeSinceMidnight = now - today.getTime();

  await withStorageLock(async () => {
    // 1. Sanitize Today's Usage
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

    if (usageChanged) {
      await chrome.storage.local.set({ [STORAGE_KEYS.USAGE]: u });
    }

    // 2. Sanitize Historical Usage (One-off fix for corrupted history)
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
  });
}

const ACTIVE_TAB_KEY = 'active_tab_state';

async function getActiveTabState(): Promise<{
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

async function setActiveTabState(state: any) {
  if (state) {
    await chrome.storage.local.set({ [ACTIVE_TAB_KEY]: state });
  } else {
    await chrome.storage.local.remove(ACTIVE_TAB_KEY);
  }
}

console.log('[StopAccess] TRACKER INITIALIZING');

function recordRuntimeError(source, error) {
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

function getDomain(url) {
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

    // Technical metadata pages to ignore
    const ignored = ['newtab', 'extensions', 'localhost'];

    if (ignored.some((d) => hostname === d || hostname.endsWith('.' + d))) {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}

/**
 * Robust Domain Comparison
 */
function matchesDomain(domain, ruleDomain) {
  if (!domain || !ruleDomain) {
    return false;
  }
  return domain === ruleDomain || domain.endsWith('.' + ruleDomain);
}

async function saveUsage(domain, durationMs) {
  if (!domain || durationMs < 50) {
    return;
  }

  // CRITICAL: Ensure day has not changed before saving usage
  const dayChanged = await performDailyReset();
  if (dayChanged) {
    // If the day just changed, we don't want to record a giant delta from the previous day here.
    return;
  }

  await withStorageLock(async () => {
    // 1. Raw Accumulated Usage
    const res = await chrome.storage.local.get([STORAGE_KEYS.USAGE]);
    const u = res[STORAGE_KEYS.USAGE] || {};

    if (!u[domain]) {
      u[domain] = { time: 0, sessions: 0 };
    }

    // Safety: Cap individual increment to prevent sleep/wake artifacts
    const cappedDuration = Math.min(durationMs, SAFETY_MAX_DURATION);
    u[domain].time += cappedDuration;
    await chrome.storage.local.set({ [STORAGE_KEYS.USAGE]: u });

    // 2. Aggregate Snapshots
    const totalMs = Object.values(u).reduce(
      (a: any, b: any) => a + (b.time || 0),
      0,
    );
    const totalMins = Math.round(totalMs / 60000);

    // 3. Update Dashboard Stats
    const rules = await getRules(extensionAdapter);
    const blockedCount = rules.filter((r) => r.blockedToday).length;

    await recordDailySnapshot(extensionAdapter, totalMins, blockedCount);
  });

  // Re-sync UI with new data
  runCycle().catch(() => {});
}

async function syncRulesWithUsage() {
  await withStorageLock(async () => {
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
          // Limit was likely increased — release the block
          rules[i].blockedToday = false;
          rulesChanged = true;
          extensionLogger.add(
            'info',
            `Limit increased for ${rules[i].packageName}. Releasing block.`,
          );
        } else if (!isOverLimit && limit > 0 && limit - used <= 5) {
          // Proximity warning: 5 minutes left
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
      // Notify peers of the rule change (debounced internally).
      // broadcastDiff({ rules });
    }
  });
}

async function incrementSession(domain) {
  if (!domain) {
    return;
  }
  await performDailyReset();

  await withStorageLock(async () => {
    const res = await chrome.storage.local.get([STORAGE_KEYS.USAGE]);
    const usage = res[STORAGE_KEYS.USAGE] || {};
    if (!usage[domain]) {
      usage[domain] = { time: 0, sessions: 0 };
    }
    usage[domain].sessions += 1;
    await chrome.storage.local.set({ [STORAGE_KEYS.USAGE]: usage });
  });
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

async function switchTab(tabId) {
  const now = Date.now();
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
}

async function initActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) {
      await setActiveTabState(null);
      return;
    }

    const domain = getDomain(tabs[0].url);
    const existing = await getActiveTabState();
    const now = Date.now();

    // If the service worker restarted, check if the "existing" state is still valid.
    // Validity check: session must have started TODAY and within a reasonable window.
    const todayStr = new Date().toLocaleDateString('en-CA');
    const lastReset = await extensionAdapter.getString(STORAGE_KEYS.LAST_RESET);
    const staleThreshold = 10 * 60 * 1000; // 10 minutes

    if (
      existing &&
      existing.tabId === tabs[0].id &&
      existing.domain === domain &&
      lastReset === todayStr &&
      now - existing.start < staleThreshold
    ) {
      // Still on same tab, same day, and not too long since last update — keep tracking.
      return;
    }

    // New tab, new day, or stale session — flush any previously tracked time first.
    if (existing && existing.domain) {
      const duration = now - existing.start;
      if (duration > 50 && duration < SAFETY_MAX_DURATION) {
        await saveUsage(existing.domain, duration);
      }
    }

    const nextState = { domain, start: now, tabId: tabs[0].id };
    await setActiveTabState(nextState);
    if (domain) {
      await incrementSession(domain);
    }
  } catch {
    await setActiveTabState(null);
  }
}

async function performDailyReset(): Promise<boolean> {
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

    await withStorageLock(async () => {
      // 1. Archive previous day usage before clearing
      const archiveRes = await chrome.storage.local.get([
        STORAGE_KEYS.USAGE,
        STORAGE_KEYS.USAGE_HISTORY,
      ]);
      const oldUsage = archiveRes[STORAGE_KEYS.USAGE] || {};
      const usageHistory = archiveRes[STORAGE_KEYS.USAGE_HISTORY] || {};

      usageHistory[lastReset] = oldUsage;

      // Prune history to keep only last 30 days
      const historyKeys = Object.keys(usageHistory).sort();
      if (historyKeys.length > 30) {
        delete usageHistory[historyKeys[0]];
      }

      // 2. Clear current day buckets
      await chrome.storage.local.set({
        [STORAGE_KEYS.USAGE]: {},
        [STORAGE_KEYS.USAGE_HISTORY]: usageHistory,
        [STORAGE_KEYS.TEMP_PASSES]: {},
        [STORAGE_KEYS.EXTENSION_COUNTS]: {},
      });
    });

    // 3. Reset Rule State & Update Streaks
    const currentRules = await getRules(extensionAdapter);
    const resetRules = currentRules.map((r) => {
      // Logic: Only increment streak if they kept the rule active (desiredBlockingState)
      let nextStreak = r.streakDays || 0;
      if (r.desiredBlockingState !== false) {
        // Did we already update today? (safeguard)
        if (r.streakUpdatedOn !== todayStr) {
          // Verify they actually survived 24 hours
          if (
            !r.streakStartedAt ||
            Date.now() - r.streakStartedAt >= 86400000
          ) {
            nextStreak += 1;
          }
        }
      } else {
        nextStreak = 0; // Reset streak if protection was disabled
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

// --- Sync & Engine Orchestration ---
let isCyclePending = false;

async function runCycle(forceSync = false) {
  if (isRunningCycle) {
    isCyclePending = true;
    return;
  }
  isRunningCycle = true;

  try {
    // If we were pending, force a full sync to catch up on all changes
    const shouldForceSync = forceSync || isCyclePending;
    isCyclePending = false;

    await performDailyReset();
    await sanitizeUsageData();
    await flushActiveTabUsage();
    await syncRulesWithUsage();

    await chrome.storage.local.set({
      [STORAGE_KEYS.ENGINE_HEARTBEAT]: Date.now(),
    });

    // Usage milestone notifications
    const usageRes = await chrome.storage.local.get([STORAGE_KEYS.USAGE]);
    const usageMap = usageRes[STORAGE_KEYS.USAGE] || {};

    // --- Disabled: Cloud Sync (Backend not implemented) ---
    /*
    const user = await getCloudUser();
    if (user) {
      // Push usage snapshots to Supabase
      await pushUsageToCloud(usageMap);
      extensionLogger.add('info', `Cloud Sync complete for ${user.email}`);
    }
    */
    const totalUsageMs = Object.values(usageMap).reduce(
      (sum: number, v: any) => sum + (v?.time || 0),
      0,
    ) as number;
    checkUsageMilestones(totalUsageMs).catch(() => {});

    // Final check for data consistency (ensure we aren't displaying yesterday's data as today's)
    const today = new Date().toLocaleDateString('en-CA');
    const lastReset = await extensionAdapter.getString(STORAGE_KEYS.LAST_RESET);
    if (lastReset !== today && lastReset !== '') {
      await performDailyReset();
    }

    // Distraction nudge for long uninterrupted sessions
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

    // Modern Client Context
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
        notifyBlocked: (name, limit, used) => {
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

    // NextDNS Cloud Sync (runs whenever credentials are present)
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

      // Heartbeat
      try {
        const connectedRes = await client.testConnection();
        const connected = connectedRes.ok;
        await extensionAdapter.set(
          STORAGE_KEYS.CONNECTION_STATUS,
          connected ? 'connected' : 'error',
        );
      } catch (e) {
        await extensionAdapter.set(STORAGE_KEYS.CONNECTION_STATUS, 'error');
      }
    } else if (nextdns_cfg.profileId) {
      // Profile ID exists but no API Key -> Browser Mode (Local Only)
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

    // 2. Engine Logic (DNR Sync - All Levels)
    const result = await runFullEngineCycle(ctx);

    let blockedDomains = result?.ok && result?.domains ? result.domains : [];

    // Filter out domains with active temporary passes
    const passRes = await chrome.storage.local.get([STORAGE_KEYS.TEMP_PASSES]);
    const passes = passRes[STORAGE_KEYS.TEMP_PASSES] || {};
    const domainsWithPasses = Object.keys(passes).filter((domain) => {
      const pass = passes[domain];
      if (pass && Date.now() < pass.expiresAt) {
        return true;
      }
      return false;
    });

    if (domainsWithPasses.length > 0) {
      blockedDomains = blockedDomains.filter((domain) => {
        // Matches exact or subdomains
        return !domainsWithPasses.some(
          (pd) => domain === pd || domain.endsWith('.' + pd),
        );
      });
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

// --- Event Handlers ---
chrome.tabs.onActivated.addListener(({ tabId }) => switchTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.status === 'complete' || changeInfo.url)) {
    switchTab(tabId);
  }
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Same bypass as idle handler: keep tracking if audio/video is actively playing.
    (async () => {
      try {
        const current = await getActiveTabState();
        if (current?.tabId) {
          const tab = await chrome.tabs.get(current.tabId);
          if (tab.audible) {
            // Browser lost focus but media is playing — keep accumulating time.
            return;
          }
        }
      } catch (e) {}
      switchTab(-1);
    })();
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs[0]) {
        switchTab(tabs[0].id);
      }
    });
  }
});

chrome.idle.setDetectionInterval(180);
chrome.idle.onStateChanged.addListener((state) => {
  if (state !== 'active') {
    (async () => {
      try {
        const current = await getActiveTabState();
        if (current && current.tabId) {
          const tab = await chrome.tabs.get(current.tabId);
          if (tab.audible) {
            // Do not pause tracking if the user is passively watching/listening
            return;
          }
        }
      } catch (e) {}
      switchTab(-1);
    })();
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        switchTab(tabs[0].id);
      }
    });
  }
});

// Bootstrapper
initActiveTab().catch((err) => recordRuntimeError('boot_init_tab', err));
setTimeout(
  () => runCycle().catch((err) => recordRuntimeError('boot_run_cycle', err)),
  100,
);

// Cross-device sync via Supabase (Disabled: Backend not implemented)
/*
initPeerSync(() => {
  // Remote state applied — re-run engine so DNR rules & UI stay current.
  runCycle().catch((err) => recordRuntimeError('peer_sync_run_cycle', err));
}).catch((err) => recordRuntimeError('peer_sync_init', err));
*/

self.addEventListener('error', (event) => {
  recordRuntimeError('service_worker_error', event.error || event.message);
});

self.addEventListener('unhandledrejection', (event) => {
  recordRuntimeError('service_worker_unhandled_rejection', event.reason);
});

// Chrome Lifecycle
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      [STORAGE_KEYS.RULES]: JSON.stringify([]),
      [STORAGE_KEYS.SCHEDULES]: JSON.stringify([]),
      [STORAGE_KEYS.FOCUS_END]: 0,
      [STORAGE_KEYS.LOGS]: JSON.stringify([]),
      [STORAGE_KEYS.USAGE]: {},
      [STORAGE_KEYS.LAST_RESET]: new Date().toLocaleDateString('en-CA'),
      [STORAGE_KEYS.CONNECTION_STATUS]: 'syncing',
    });
    // Open full-page dashboard on install
    const url = chrome.runtime.getURL(buildExtensionPagePath('dashboard.html'));
    chrome.tabs.create({ url });
  }
  await initActiveTab();
  chrome.alarms.create('StopAccess_engine', {
    periodInMinutes: 1,
    when: Date.now() + 500,
  });
  runCycle().catch((err) => recordRuntimeError('install_run_cycle', err));
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.storage.local.set({
    [STORAGE_KEYS.CONNECTION_STATUS]: 'syncing',
  });
  initActiveTab();
  chrome.alarms.create('StopAccess_engine', {
    periodInMinutes: 1,
    when: Date.now() + 500,
  });
  runCycle().catch((err) => recordRuntimeError('startup_run_cycle', err));

  const session = await getActiveSession();
  if (session && session.status === 'focusing') {
    const elapsed = (Date.now() - session.startedAt) / 60000;
    if (elapsed >= session.duration) {
      await endSession('completed');
      notifyFocusComplete(session.duration);
      await runCycle();
    } else {
      await updateBadge(session);
    }
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'StopAccess_engine') {
    runCycle().catch((err) => recordRuntimeError('alarm_run_cycle', err));
  }
  handleAlarm(alarm)
    .then((shouldRefresh) => {
      if (shouldRefresh) {
        runCycle().catch((err) =>
          recordRuntimeError('alarm_run_cycle_after_refresh', err),
        );
      }
    })
    .catch((err) => recordRuntimeError('alarm_handler_error', err));
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'NEXTDNS_ID_FOUND') {
    (async () => {
      await chrome.storage.local.set({
        [STORAGE_KEYS.PROFILE_ID]: msg.id,
      });

      if (_sender.tab?.id) {
        setTimeout(() => {
          chrome.tabs.remove(_sender.tab.id).catch(() => {});
        }, 800);
      }
      await runCycle(true);
    })();
    return true;
  }

  if (msg.action === 'openNextDNS') {
    chrome.tabs.create({ url: 'https://my.nextdns.io' });
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'manualSync') {
    runCycle(true)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.action === 'startFocus') {
    (async () => {
      try {
        const res = (await chrome.storage.local.get([
          STORAGE_KEYS.BLOCKED_DOMAINS,
        ])) as any;
        const blocked_domains = res[STORAGE_KEYS.BLOCKED_DOMAINS] || [];
        await startSession({
          duration: msg.minutes,
          blockedDomains: blocked_domains,
          enableBlockBypass: !!msg.enableBlockBypass,
        });
        await runCycle();
        // Broadcast focus end-time so other devices show the active session
        // const focusEnd = Date.now() + msg.minutes * 60_000;
        // broadcastDiff({ focusEndTime: focusEnd });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg.action === 'pauseFocus') {
    (async () => {
      try {
        await pauseSession();
        await runCycle();
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg.action === 'resumeFocus') {
    (async () => {
      try {
        await resumeSession();
        await runCycle();
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg.action === 'stopFocus') {
    (async () => {
      try {
        const res = await chrome.storage.local.get([STORAGE_KEYS.STRICT_MODE]);
        const strict_mode_enabled = res[STORAGE_KEYS.STRICT_MODE] || false;
        const session = await getActiveSession();
        const isFocusing = session && session.status === 'focusing';

        if (strict_mode_enabled && isFocusing) {
          extensionLogger.add(
            'warn',
            'Attempted to stop focus during active strict session. Blocked.',
          );
          sendResponse({ ok: false, error: 'Strict Mode Enforced' });
          return;
        }

        const minutesDone = Math.round(getEffectiveElapsed(session) / 60);
        await endSession('cancelled');
        await runCycle();
        notifyFocusStopped(minutesDone);
        // Broadcast cleared focus so other devices stop showing the session
        // broadcastDiff({ focusEndTime: 0 });
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  // ── Quick Block current site ─────────────────────────────────────────────
  if (msg.action === 'quickBlock') {
    (async () => {
      try {
        const { domain } = msg;
        if (!domain) {
          sendResponse({ ok: false, error: 'No domain' });
          return;
        }

        const rules = await getRules(extensionAdapter);
        const already = rules.some(
          (r) => r.customDomain === domain || r.packageName === domain,
        );
        if (already) {
          sendResponse({ ok: false, error: 'Already blocked' });
          return;
        }

        const newRule = {
          appName: domain,
          packageName: domain,
          customDomain: domain,
          type: 'domain' as const,
          scope: 'browser' as const,
          mode: 'block' as const,
          dailyLimitMinutes: 0,
          blockedToday: false,
          usedMinutesToday: 0,
          addedByUser: true,
          desiredBlockingState: true,
          addedAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveRules(extensionAdapter, [...rules, newRule]);
        // broadcastDiff({ rules: [...rules, newRule] });
        await runCycle(true);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  // ── Sync status (diagnostic) ─────────────────────────────────────────────
  if (msg.action === 'getSyncStatus') {
    // getPeerSyncStatus is already statically imported via initPeerSync
    sendResponse({
      ok: true,
      status: { enabled: false, connected: false, deviceId: '', profileId: '' },
    });
    return true;
  }

  // ── Cloud Auth (Google Sign-In commented out) ────────────────────────────
  // if (msg.action === 'signInWithGoogle') {
  //   signInWithGoogle()
  //     .then((success) => sendResponse({ ok: success }))
  //     .catch((e) => sendResponse({ ok: false, error: String(e) }));
  //   return true;
  // }

  if (msg.action === 'signOut') {
    signOut()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.action === 'getCloudUser') {
    getCloudUser()
      .then((user) => sendResponse({ ok: true, user }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  return false;
});
