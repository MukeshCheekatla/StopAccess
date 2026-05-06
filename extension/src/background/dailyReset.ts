/**
 * background/dailyReset.ts
 * Performs the daily state reset: archives usage, wipes counters, resets rule streaks.
 * Imported by both usageTracker.ts (via saveUsage) and tabTracker.ts (runCycle).
 * Has NO imports from tabTracker or usageTracker to avoid circular deps.
 */
import { getRules, saveRules } from '@stopaccess/state/rules';
import { extensionAdapter, extensionLogger } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';

let isResetting = false;
const ACTIVE_TAB_KEY = 'active_tab_state';

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

    // Reset active tab clock so phantom time doesn't accumulate across day boundary.
    const tabRes = await chrome.storage.local.get([ACTIVE_TAB_KEY]);
    const current = tabRes[ACTIVE_TAB_KEY] as {
      domain: string | null;
      start: number;
      tabId: number;
    } | null;
    if (current) {
      current.start = Date.now();
      await chrome.storage.local.set({ [ACTIVE_TAB_KEY]: current });
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
  } catch (err: any) {
    const message =
      err instanceof Error ? err.stack || err.message : String(err);
    console.error('[StopAccess] daily_reset', err);
    chrome.storage.local
      .set({
        [STORAGE_KEYS.RUNTIME_ERROR]: JSON.stringify({
          at: new Date().toISOString(),
          source: 'daily_reset',
          error: message,
        }),
      })
      .catch(() => {});
    return false;
  } finally {
    isResetting = false;
  }
}
