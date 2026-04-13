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
} from './sessionManager';

// --- Local-First Tracking State ---
let sync = null;
let isRunningCycle = false;

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
      url.startsWith('chrome-extension://')
    ) {
      return null;
    }
    return new URL(url).hostname.replace('www.', '');
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

  // 1. Raw Accumulated Usage
  const res = await chrome.storage.local.get([STORAGE_KEYS.USAGE]);
  const usage = res[STORAGE_KEYS.USAGE] || {};

  if (!usage[domain]) {
    usage[domain] = { time: 0, sessions: 0 };
  }

  usage[domain].time += durationMs;
  await chrome.storage.local.set({ [STORAGE_KEYS.USAGE]: usage });

  // 2. Aggregate Snapshots (Dashboard Parity)
  const totalMs = Object.values(usage).reduce((a, b) => a + (b.time || 0), 0);
  const totalMins = Math.round(totalMs / 60000);

  // 3. Bridge to Focus Engine
  const rules = await getRules(extensionAdapter);
  const blockedCount = rules.filter((r) => r.blockedToday).length;

  await recordDailySnapshot(extensionAdapter, totalMins, blockedCount);

  const ruleIdx = rules.findIndex((r) => {
    if (matchesDomain(domain, r.packageName)) {
      return true;
    }
    if (r.customDomain && matchesDomain(domain, r.customDomain)) {
      return true;
    }
    const mapped = getDomainForRule(r);
    if (mapped && matchesDomain(domain, mapped)) {
      return true;
    }
    return false;
  });
  if (ruleIdx >= 0) {
    const mins = durationMs / 60000;
    const rule = rules[ruleIdx];
    rule.usedMinutesToday = (rule.usedMinutesToday || 0) + mins;

    // Check for limit hit
    if (
      rule.mode === 'limit' &&
      (rule.usedMinutesToday || 0) >= (rule.dailyLimitMinutes || 0)
    ) {
      if (!rule.blockedToday) {
        rule.blockedToday = true;
        extensionLogger.add('info', `Limit reached for ${domain}. Blocking.`);
      }
    }

    await saveRules(extensionAdapter, rules);
    runCycle().catch(() => {});
  }
}

async function incrementSession(domain) {
  if (!domain) {
    return;
  }
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
    if (tabs[0]) {
      const domain = getDomain(tabs[0].url);
      const nextState = { domain, start: Date.now(), tabId: tabs[0].id };
      await setActiveTabState(nextState);
      if (domain) {
        await incrementSession(domain);
      }
    }
  } catch {
    await setActiveTabState(null);
  }
}

// --- Sync & Engine Orchestration ---
async function runCycle(forceSync = false) {
  if (isRunningCycle) {
    return;
  }
  isRunningCycle = true;

  try {
    await flushActiveTabUsage();
    const lastReset = await extensionAdapter.getString(STORAGE_KEYS.LAST_RESET);
    // Use local date string (YYYY-MM-DD) for more natural 12 AM reset
    const todayStr = new Date().toLocaleDateString('en-CA');

    if (lastReset && lastReset !== todayStr) {
      // 1. Archive previous day usage before clearing
      const archiveRes = await chrome.storage.local.get([
        STORAGE_KEYS.USAGE,
        STORAGE_KEYS.USAGE_HISTORY,
      ]);
      const oldUsage = archiveRes[STORAGE_KEYS.USAGE] || {};
      const usageHistory = archiveRes[STORAGE_KEYS.USAGE_HISTORY] || {};

      usageHistory[lastReset] = oldUsage; // Use the date the usage was actually recorded on

      // Prune history to keep only last 3entries
      const historyKeys = Object.keys(usageHistory).sort();
      if (historyKeys.length > 30) {
        delete usageHistory[historyKeys[0]];
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.USAGE]: {},
        [STORAGE_KEYS.USAGE_HISTORY]: usageHistory,
      });

      const currentRules = await getRules(extensionAdapter);
      const resetRules = currentRules.map((r) => ({
        ...r,
        usedMinutesToday: 0,
        blockedToday: false,
        extensionCountToday: 0,
        streakDays:
          r.desiredBlockingState === false
            ? 0
            : (r.streakUpdatedOn || '') === todayStr
            ? r.streakDays || 0
            : (r.streakDays || 0) + 1,
        streakUpdatedOn:
          r.desiredBlockingState === false ? undefined : todayStr,
        desiredBlockingState:
          r.mode === 'limit' ? true : r.desiredBlockingState,
      }));
      await saveRules(extensionAdapter, resetRules);
      // Clean temp passes and extension counts
      await chrome.storage.local.set({
        [STORAGE_KEYS.TEMP_PASSES]: {},
        [STORAGE_KEYS.EXTENSION_COUNTS]: {},
      });
      await extensionAdapter.set(STORAGE_KEYS.LAST_RESET, todayStr);
      extensionLogger.add('info', `Daily reset performed for ${todayStr}`);
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
        notifyBlocked: (name) => {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '../assets/icon.png',
            title: 'Focus Terminal: Active Rule',
            message: `${name} has reached its daily focus limit.`,
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

      if (forceSync) {
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
    switchTab(-1);
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs[0]) {
        switchTab(tabs[0].id);
      }
    });
  }
});

chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener((state) => {
  if (state !== 'active') {
    switchTab(-1);
  } else {
    initActiveTab();
  }
});

// Bootstrapper
initActiveTab().catch((err) => recordRuntimeError('boot_init_tab', err));
setTimeout(
  () => runCycle().catch((err) => recordRuntimeError('boot_run_cycle', err)),
  100,
);

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

        await endSession('cancelled');
        await runCycle();
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
  return false;
});
