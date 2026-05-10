/**
 * Service Worker Entry Point — thin wiring only.
 * All logic lives in tabTracker.ts and sessionManager.ts.
 */
import { buildExtensionPagePath } from '@stopaccess/core';
import { getRules, saveRules } from '@stopaccess/state/rules';
import { extensionAdapter, extensionLogger } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
import {
  runCycle,
  switchTab,
  initActiveTab,
  recordRuntimeError,
} from './tabTracker';
import {
  handleAlarm,
  getActiveSession,
  endSession,
  updateBadge,
  startSession,
  pauseSession,
  resumeSession,
} from './sessionManager';
import { getEffectiveElapsed } from '@/lib/sessionTimer';
import { notifyFocusComplete, notifyFocusStopped } from './notifications';
import {
  getCloudUser,
  signOut,
  signInWithGoogle,
  signInWithOtp,
  setSessionFromUrl,
} from './authManager';
import { notifyExtensionUpdated } from './notifications';
import {
  pullState,
  pullUsageFromCloud,
  pushNextDNSConfig,
  pushNextDNSConfigDebounced,
  pushState,
  pushStateDebounced,
  pushUsageToCloud,
  pushUsageToCloudInternal,
  subscribeToSync,
} from './syncManager';

console.log('[StopAccess] TRACKER INITIALIZING');

function parseMaybeJson(value: any) {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function restoreCloudBackup(force = false) {
  const rules = await getRules(extensionAdapter);
  const localRes = await chrome.storage.local.get([
    STORAGE_KEYS.SCHEDULES,
    STORAGE_KEYS.SESSION,
  ]);
  const schedules = parseMaybeJson(localRes[STORAGE_KEYS.SCHEDULES]) || [];
  const focusSession = parseMaybeJson(localRes[STORAGE_KEYS.SESSION]) || null;

  // 1. If we have local state, push it FIRST.
  // This ensures local deletions/changes are mirrored before any pull occurs.
  if (rules.length > 0 || schedules.length > 0) {
    await pushNextDNSConfig(force);
    await pushState('rules', rules, force);
    await pushState('schedules', schedules, force);
    await pushState('focus', focusSession, force);
  }

  // 2. Only pull if forced OR if we have no local state (onboarding case)
  const shouldPull = force || (rules.length === 0 && schedules.length === 0);
  if (shouldPull) {
    await pullState(force);
    await pullUsageFromCloud(force);
  }

  subscribeToSync();
}

async function forcePushCloudBackup() {
  const rules = await getRules(extensionAdapter);
  const res = await chrome.storage.local.get([
    STORAGE_KEYS.SCHEDULES,
    STORAGE_KEYS.SESSION,
    STORAGE_KEYS.USAGE,
  ]);
  const results: Array<{ entity: string; ok: boolean; error?: string }> = [];

  async function runPush(entity: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ entity, ok: true });
    } catch (err: any) {
      results.push({
        entity,
        ok: false,
        error: err?.message || String(err),
      });
    }
  }

  await runPush('nextdns', () => pushNextDNSConfig(true));
  await runPush('rules', () => pushState('rules', rules, true));
  await runPush('schedules', () =>
    pushState(
      'schedules',
      parseMaybeJson(res[STORAGE_KEYS.SCHEDULES]) || [],
      true,
    ),
  );
  await runPush('focus', () =>
    pushState('focus', parseMaybeJson(res[STORAGE_KEYS.SESSION]) || null, true),
  );
  await runPush('usage', () =>
    pushUsageToCloudInternal(
      {
        day: new Date().toLocaleDateString('en-CA'),
        usage: res[STORAGE_KEYS.USAGE] || {},
      },
      true,
    ),
  );

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    throw new Error(
      failed
        .map((result) => `${result.entity}: ${result.error || 'failed'}`)
        .join(' | '),
    );
  }

  return results;
}

// ── Tab Events ─────────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(({ tabId }) => switchTab(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url || tab.url || '';
  if (url.includes('stopaccess.pages.dev/auth/callback')) {
    (async () => {
      const { error } = await setSessionFromUrl(url);
      if (!error) {
        // Close the tab IMMEDIATELY to prevent browser redirect errors
        chrome.tabs.remove(tabId).catch(() => {});

        // Run background tasks AFTER the tab is gone
        await restoreCloudBackup(true);
        await runCycle(true);
      }
    })();
  }

  // Only fire on 'complete' to avoid double-counting per navigation (url change fires before complete)
  if (tab.active && changeInfo.status === 'complete') {
    switchTab(tabId);
  }
});
chrome.tabs.onRemoved.addListener((tabId) => {
  (async () => {
    const { getActiveTabState } = await import('./tabTracker');
    const current = await getActiveTabState();
    if (current && current.tabId === tabId) {
      await switchTab(-1);
    }
  })();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    (async () => {
      try {
        const { getActiveTabState } = await import('./tabTracker');
        const current = await getActiveTabState();
        if (current?.tabId) {
          const tab = await chrome.tabs.get(current.tabId);
          if (tab.audible) {
            return;
          } // Media playing — keep tracking
        }
      } catch (e) {}
      switchTab(-1);
    })();
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs[0]) {
        switchTab(tabs[0].id);
      } else {
        // If the focused window is not in this profile, stop tracking here.
        // This prevents double-counting when using multiple browser profiles.
        switchTab(-1);
      }
    });
  }
});

chrome.idle.setDetectionInterval(180);
chrome.idle.onStateChanged.addListener((state) => {
  if (state !== 'active') {
    (async () => {
      try {
        const { getActiveTabState } = await import('./tabTracker');
        const current = await getActiveTabState();
        if (current && current.tabId) {
          const tab = await chrome.tabs.get(current.tabId);
          if (tab.audible) {
            return;
          } // Passive watching — keep tracking
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

// ── Bootstrap ──────────────────────────────────────────────────────────────

initActiveTab().catch((err) => recordRuntimeError('boot_init_tab', err));
setTimeout(
  () =>
    restoreCloudBackup()
      .catch((err) => recordRuntimeError('boot_cloud_restore', err))
      .finally(() =>
        runCycle().catch((err) => recordRuntimeError('boot_run_cycle', err)),
      ),
  100,
);

self.addEventListener('error', (event) => {
  recordRuntimeError(
    'service_worker_error',
    (event as ErrorEvent).error || (event as ErrorEvent).message,
  );
});
self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  recordRuntimeError('service_worker_unhandled_rejection', event.reason);
});

// ── Chrome Lifecycle ───────────────────────────────────────────────────────

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
    const url = chrome.runtime.getURL(buildExtensionPagePath('dashboard.html'));
    chrome.tabs.create({ url });
  } else if (details.reason === 'update') {
    const version = chrome.runtime.getManifest().version;
    notifyExtensionUpdated(version);
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
  restoreCloudBackup().catch((err) =>
    recordRuntimeError('startup_restore', err),
  );

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

// ── Message Handlers ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'NEXTDNS_ID_FOUND') {
    (async () => {
      await chrome.storage.local.set({ [STORAGE_KEYS.PROFILE_ID]: msg.id });
      pushNextDNSConfigDebounced(true);
      if (_sender.tab?.id) {
        setTimeout(
          () => chrome.tabs.remove(_sender.tab.id).catch(() => {}),
          800,
        );
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
    (async () => {
      try {
        console.log('[StopAccess] Manual sync requested');
        // Perform full sync (pull then push others).
        // restoreCloudBackup(true) handles both pushing local changes and pulling cloud data.
        await restoreCloudBackup(true);
        await runCycle(true);
        sendResponse({ ok: true });
      } catch (e: any) {
        const errorMsg = e?.message || e?.details || String(e);
        console.error('[StopAccess] Manual sync failed:', errorMsg, e);
        sendResponse({ ok: false, error: errorMsg });
      }
    })();
    return true;
  }

  if (msg.action === 'forcePushCloud') {
    forcePushCloudBackup()
      .then((results) => sendResponse({ ok: true, results }))
      .catch((err) =>
        sendResponse({ ok: false, error: err?.message || String(err) }),
      );
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
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

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
        await runCycle(true);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg.action === 'getSyncStatus') {
    sendResponse({
      ok: true,
      status: { enabled: false, connected: false, deviceId: '', profileId: '' },
    });
    return true;
  }

  if (msg.action === 'signOut') {
    signOut()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.action === 'signInWithGoogle') {
    signInWithGoogle()
      .then((res) => sendResponse({ ok: !res.error, error: res.error }))
      .catch((err) => sendResponse({ ok: false, error: err }));
    return true;
  }

  if (msg.action === 'signInWithOtp') {
    signInWithOtp(msg.email)
      .then((res) => sendResponse({ ok: !res.error, error: res.error }))
      .catch((err) => sendResponse({ ok: false, error: err }));
    return true;
  }

  if (msg.action === 'setSessionFromUrl') {
    setSessionFromUrl(msg.url)
      .then(async (res) => {
        if (!res.error) {
          await restoreCloudBackup(true);
          await runCycle(true);
        }
        sendResponse({ ok: !res.error, error: res.error });
      })
      .catch((err) => sendResponse({ ok: false, error: err }));
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

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') {
    return;
  }

  if (changes[STORAGE_KEYS.RULES] && !changes._sync_in_progress_rules) {
    pushStateDebounced(
      'rules',
      parseMaybeJson(changes[STORAGE_KEYS.RULES].newValue),
    );
  }

  if (changes[STORAGE_KEYS.SCHEDULES] && !changes._sync_in_progress_schedules) {
    pushStateDebounced(
      'schedules',
      parseMaybeJson(changes[STORAGE_KEYS.SCHEDULES].newValue),
    );
  }

  if (changes[STORAGE_KEYS.SESSION] && !changes._sync_in_progress_focus) {
    pushStateDebounced(
      'focus',
      parseMaybeJson(changes[STORAGE_KEYS.SESSION].newValue),
    );
  }

  if (changes[STORAGE_KEYS.USAGE]) {
    pushUsageToCloud(
      new Date().toLocaleDateString('en-CA'),
      changes[STORAGE_KEYS.USAGE].newValue || {},
    );
  }

  if (
    (changes[STORAGE_KEYS.PROFILE_ID] || changes[STORAGE_KEYS.API_KEY]) &&
    !changes._sync_in_progress_nextdns
  ) {
    pushNextDNSConfigDebounced();
  }
});
