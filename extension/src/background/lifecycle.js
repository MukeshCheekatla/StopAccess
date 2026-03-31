/**
 * Extension Service Worker Entry Point (Thin Lifecycle Wrapper)
 * Implementation of "Analytics-Grade Tab Tracking" Strategy.
 */
import {
  runFullEngineCycle,
  recordDailySnapshot,
  NextDNSClient,
} from '@focusgate/core';
import { SyncOrchestrator } from '@focusgate/sync';
import { getRules, saveRules } from '@focusgate/state/rules';
import {
  extensionAdapter,
  extensionLogger,
  STORAGE_KEYS,
} from './platformAdapter.js';
import { syncDNRRules } from './dnrAdapter.js';

// --- Local-First Tracking State ---
let current = null;
let sync = null;
let isRunningCycle = false;

console.log('[FocusGate] TRACKER INITIALIZING');

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

  const ruleIdx = rules.findIndex((r) => matchesDomain(domain, r.packageName));
  if (ruleIdx >= 0) {
    const mins = durationMs / 60000;
    rules[ruleIdx].usedMinutesToday =
      (rules[ruleIdx].usedMinutesToday || 0) + mins;
    await saveRules(extensionAdapter, rules);

    // Dynamic Cycle Evaluation
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
  if (current && current.domain) {
    const now = Date.now();
    const duration = now - current.start;

    if (duration > 1000) {
      await saveUsage(current.domain, duration);
      current.start = now;
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

    current = { domain, start: now };
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
      current = { domain, start: Date.now() };
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
    }

    const cfg = await chrome.storage.local.get([
      STORAGE_KEYS.PROFILE_ID,
      STORAGE_KEYS.API_KEY,
    ]);

    // Modern Client Context
    const nextdns_cfg = {
      profileId: cfg[STORAGE_KEYS.PROFILE_ID],
      apiKey: cfg[STORAGE_KEYS.API_KEY],
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

    if (result?.ok && result?.domains) {
      await syncDNRRules(result.domains);
    }
  } catch (e) {
    extensionLogger.add('error', 'Lifecycle Engine Fail', String(e));
  } finally {
    isRunningCycle = false;
  }
}

// --- Event Handlers ---
chrome.tabs.onActivated.addListener(({ tabId }) => switchTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === 'complete') {
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
    });
    // Open full-page dashboard on install
    const url = chrome.runtime.getURL('dist/dashboard.html');
    chrome.tabs.create({ url });
  }
  await initActiveTab();
  chrome.alarms.create('focusgate_engine', {
    periodInMinutes: 1,
    when: Date.now() + 500,
  });
  runCycle().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  initActiveTab();
  chrome.alarms.create('focusgate_engine', {
    periodInMinutes: 1,
    when: Date.now() + 500,
  });
  runCycle().catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusgate_engine') {
    runCycle().catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'manualSync') {
    runCycle(true)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (msg.action === 'startFocus') {
    const endTime = Date.now() + msg.minutes * 60000;
    chrome.storage.local.set({ [STORAGE_KEYS.FOCUS_END]: endTime }).then(() => {
      runCycle().then(() => sendResponse({ ok: true }));
    });
    return true;
  }
  if (msg.action === 'stopFocus') {
    (async () => {
      const { strict_mode_enabled } = await chrome.storage.local.get([
        'strict_mode_enabled',
      ]);
      const focusEnd =
        (await extensionAdapter.getNumber(STORAGE_KEYS.FOCUS_END)) || 0;
      const isStillFocusing = focusEnd > Date.now();

      if (strict_mode_enabled && isStillFocusing) {
        extensionLogger.add(
          'warn',
          'Attempted to stop focus during active strict session. Blocked.',
        );
        sendResponse({ ok: false, error: 'Strict Mode Enforced' });
        return;
      }

      await chrome.storage.local.set({ [STORAGE_KEYS.FOCUS_END]: 0 });
      await runCycle();
      sendResponse({ ok: true });
    })();
    return true;
  }
  return false;
});
