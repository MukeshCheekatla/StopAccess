/**
 * background/tabTracker.ts — Orchestrator
 * Wires usageTracker + dailyReset + the engine cycle.
 * Tab-level helpers (switchTab, initActiveTab) are re-exported from usageTracker.
 */
import {
  runFullEngineCycle,
  NextDNSClient,
  SyncOrchestrator,
  formatMinutes,
} from '@stopaccess/core';
import { NextDNSConfig, SyncContext } from '@stopaccess/types';
import { extensionAdapter, extensionLogger } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
import { syncDNRRules } from './dnrAdapter';
import { checkUsageMilestones } from './notifications';
import { performDailyReset } from './dailyReset';
import {
  sanitizeUsageData,
  flushActiveTabUsage,
  syncRulesWithUsage,
  getActiveTabState,
  checkSessionDistraction,
  switchTab as _switchTab,
  initActiveTab as _initActiveTab,
} from './usageTracker';

// Re-exports so lifecycle.ts imports don't change
export { performDailyReset } from './dailyReset';
export {
  getDomain,
  getActiveTabState,
  setActiveTabState,
} from './usageTracker';

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

// ── Storage Lock (shared) ──────────────────────────────────────────────────

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

// ── Wired tab helpers (pass withStorageLock into switchTab) ────────────────

export async function switchTab(tabId: number) {
  return _switchTab(tabId, withStorageLock);
}

export async function initActiveTab() {
  return _initActiveTab();
}

// ── Run Cycle ──────────────────────────────────────────────────────────────

let sync: SyncOrchestrator | null = null;
export let isRunningCycle = false;
let isCyclePending = false;

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

      await checkSessionDistraction(await getActiveTabState());

      const cfg = await chrome.storage.local.get([
        STORAGE_KEYS.PROFILE_ID,
        STORAGE_KEYS.API_KEY,
      ]);
      const nextdns_cfg: NextDNSConfig = {
        profileId: (cfg[STORAGE_KEYS.PROFILE_ID] as string) || '',
        apiKey: (cfg[STORAGE_KEYS.API_KEY] as string) || '',
      };
      const client = new NextDNSClient(nextdns_cfg, extensionLogger.add);
      const ctx: SyncContext = {
        storage: extensionAdapter,
        api: client as any,
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

      const result = await runFullEngineCycle(ctx);
      let blockedDomains = result?.ok && result?.domains ? result.domains : [];

      if (nextdns_cfg.profileId && nextdns_cfg.apiKey) {
        if (!sync) {
          sync = new SyncOrchestrator(ctx);
          await sync.onLaunch();
        } else {
          sync.ctx = ctx;
          (sync.adapter as any).client = client;
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
