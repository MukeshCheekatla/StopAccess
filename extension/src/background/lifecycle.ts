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
} from '@focusgate/core';
import { NextDNSConfig } from '@focusgate/types';
import { getRules, saveRules } from '@focusgate/state/rules';
import {
  extensionAdapter,
  extensionLogger,
  STORAGE_KEYS,
} from './platformAdapter';
import { syncDNRRules } from './dnrAdapter';
import {
  handleAlarm,
  getActiveSession,
  endSession,
  updateBadge,
  startSession,
} from './sessionManager';

// --- Local-First Tracking State ---
let current = null;
let sync = null;
let isRunningCycle = false;
const BLOCKED_DOMAINS_KEY = 'blocked_domains';
const BLOCK_DEBUG_KEY = 'fg_block_debug';
const RUNTIME_ERROR_KEY = 'fg_last_runtime_error';

console.log('[FocusGate] TRACKER INITIALIZING');

function recordRuntimeError(source, error) {
  const message =
    error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[FocusGate] ${source}`, error);
  chrome.storage.local
    .set({
      [RUNTIME_ERROR_KEY]: JSON.stringify({
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
  const res = await chrome.storage.local.get(['usage']);
  const usage = res.usage || {};

  if (!usage[domain]) {
    usage[domain] = { time: 0, sessions: 0 };
  }

  usage[domain].time += durationMs;
  await chrome.storage.local.set({ usage });

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
  const res = await chrome.storage.local.get(['usage']);
  const usage = res.usage || {};
  if (!usage[domain]) {
    usage[domain] = { time: 0, sessions: 0 };
  }
  usage[domain].sessions += 1;
  await chrome.storage.local.set({ usage });
}

// HYBRID ACCURATE MODEL: Interval-based flush (1s)
setInterval(async () => {
  const activeSession = current;
  if (activeSession && activeSession.domain) {
    const now = Date.now();
    const duration = now - activeSession.start;

    if (duration > 1000) {
      try {
        await saveUsage(activeSession.domain, duration);
        if (current === activeSession) {
          current.start = now;
        }
      } catch (error) {
        recordRuntimeError('interval_flush', error);
      }
    }
  }
}, 1000);

async function switchTab(tabId) {
  const now = Date.now();

  if (tabId === -1) {
    if (current && current.domain) {
      const duration = now - current.start;
      if (duration > 50) {
        await saveUsage(current.domain, duration);
      }
    }
    current = null;
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

    current = { domain, start: now, tabId };
    if (domain) {
      await incrementSession(domain);
    }
  } catch (e) {
    current = null;
  }
}

async function initActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      const domain = getDomain(tabs[0].url);
      current = { domain, start: Date.now(), tabId: tabs[0].id };
      if (domain) {
        await incrementSession(domain);
      }
    }
  } catch {
    current = null;
  }
}

// --- Sync & Engine Orchestration ---
async function runCycle(forceSync = false) {
  if (isRunningCycle) {
    return;
  }
  isRunningCycle = true;

  try {
    const lastReset = await extensionAdapter.getString(STORAGE_KEYS.LAST_RESET);
    const todayStr = new Date().toISOString().split('T')[0];

    if (lastReset && lastReset !== todayStr) {
      await chrome.storage.local.set({ usage: {} });
      const currentRules = await getRules(extensionAdapter);
      const resetRules = currentRules.map((r) => ({
        ...r,
        usedMinutesToday: 0,
        blockedToday: false,
        extensionCountToday: 0,
        desiredBlockingState:
          r.mode === 'limit' ? true : r.desiredBlockingState,
      }));
      await saveRules(extensionAdapter, resetRules);
      // Clean temp passes and extension counts
      await chrome.storage.local.set({
        fg_temp_passes: {},
        fg_extension_counts: {},
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

    // 1. NextDNS Cloud Sync (Automated if configured)
    if (nextdns_cfg.profileId && nextdns_cfg.apiKey) {
      if (!sync) {
        sync = new SyncOrchestrator(ctx);
        await sync.onLaunch();
      } else {
        sync.ctx = ctx;
        sync.adapter.client = client;
      }

      if (forceSync) {
        await sync.onStateChange(true); // Immediate Push
      }

      // Heartbeat
      try {
        const connectedRes = await client.testConnection();
        const connected = connectedRes.ok;
        await extensionAdapter.set(
          'nextdns_connection_status',
          connected ? 'connected' : 'error',
        );
      } catch (e) {
        await extensionAdapter.set('nextdns_connection_status', 'error');
      }
    } else {
      await extensionAdapter.set('nextdns_connection_status', 'not_configured');
    }

    // 2. Engine Logic (DNR Sync - All Levels)
    const result = await runFullEngineCycle(ctx);

    const blockedDomains = result?.ok && result?.domains ? result.domains : [];
    const dnrResult = await syncDNRRules(blockedDomains);
    await chrome.storage.local.set({
      [BLOCKED_DOMAINS_KEY]: blockedDomains,
      [BLOCK_DEBUG_KEY]: JSON.stringify({
        at: new Date().toISOString(),
        ok: result?.ok ?? false,
        blockedDomains,
        dnrResult,
      }),
    });
  } catch (e) {
    extensionLogger.add('error', 'Lifecycle Engine Fail', String(e));
    await chrome.storage.local.set({
      [BLOCK_DEBUG_KEY]: JSON.stringify({
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
initActiveTab().catch(() => {});
setTimeout(() => runCycle().catch(() => {}), 100);

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
      usage: {},
      fg_sync_mode: 'hybrid',
      [STORAGE_KEYS.LAST_RESET]: new Date().toISOString().split('T')[0],
    });
    // Open full-page dashboard on install
    const url = chrome.runtime.getURL(buildExtensionPagePath('dashboard.html'));
    chrome.tabs.create({ url });
  }
  await initActiveTab();
  chrome.alarms.create('focusgate_engine', {
    periodInMinutes: 1,
    when: Date.now() + 500,
  });
  runCycle().catch(() => {});
});

chrome.runtime.onStartup.addListener(async () => {
  initActiveTab();
  chrome.alarms.create('focusgate_engine', {
    periodInMinutes: 1,
    when: Date.now() + 500,
  });
  runCycle().catch(() => {});

  const session = await getActiveSession();
  if (session && session.status === 'focusing') {
    const elapsed = (Date.now() - session.startedAt) / 60000;
    if (elapsed >= session.duration) {
      await endSession('completed');
    } else {
      await updateBadge(session);
    }
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusgate_engine') {
    runCycle().catch(() => {});
  }
  handleAlarm(alarm).catch(() => {});
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
        const { blocked_domains = [] } = (await chrome.storage.local.get([
          'blocked_domains',
        ])) as any;
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
        const { strict_mode_enabled } = await chrome.storage.local.get([
          'strict_mode_enabled',
        ]);
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
