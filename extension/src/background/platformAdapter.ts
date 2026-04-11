/**
 * Extension Platform Adapter
 * Thin bridge between Chrome APIs and @stopaccess/core.
 */

declare var chrome: any;
import * as ndnsCore from '@stopaccess/core';
import {
  NextDNSService,
  NextDNSCategory,
  NextDNSConfig,
  NextDNSSecuritySettings,
  NextDNSPrivacySettings,
  NextDNSParentalControlSettings,
  StorageAdapter,
  AppRule,
  SyncState,
  GlobalState,
} from '@stopaccess/types';
import { STORAGE_KEYS } from '@stopaccess/state';
import { checkGuard } from './sessionGuard';

export { STORAGE_KEYS } from '@stopaccess/state';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Add this helper at the TOP of the file
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type GuardAction = 'remove_app' | 'disable_blocking' | 'modify_blocklist';

async function requireUnlocked(action: GuardAction): Promise<
  | {
      locked: false;
    }
  | {
      locked: true;
      result: { ok: false; error: { code: string; message: string } };
    }
> {
  const guard = await checkGuard(action);
  if (guard.allowed === false) {
    return {
      locked: true,
      result: {
        ok: false,
        error: {
          code: 'session_locked',
          message: guard.reason,
        },
      },
    };
  }
  return { locked: false };
}

export const extensionAdapter: StorageAdapter = {
  getString: async (key: string, fallback?: string): Promise<string | null> => {
    const res = await chrome.storage.local.get(key);
    return (res[key] as string) ?? fallback ?? null;
  },
  getBoolean: async (
    key: string,
    fallback?: boolean,
  ): Promise<boolean | null> => {
    const res = await chrome.storage.local.get(key);
    const val = res[key];
    if (val === undefined || val === null) {
      return fallback ?? null;
    }
    return typeof val === 'boolean' ? val : !!val;
  },
  getNumber: async (key: string, fallback?: number): Promise<number | null> => {
    const res = await chrome.storage.local.get(key);
    const val = Number(res[key]);
    if (isNaN(val) || res[key] === undefined) {
      return fallback ?? null;
    }
    return val;
  },
  set: async (key: string, val: string | number | boolean): Promise<void> => {
    await chrome.storage.local.set({ [key]: val });
  },
  delete: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key);
  },
  // Internal extension helper now in StorageAdapter
  getArray: async (key: string): Promise<any[]> => {
    const res = await chrome.storage.local.get(key);
    const raw = res[key];
    if (!raw) {
      return [];
    }
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  loadGlobalState: async (): Promise<GlobalState> => {
    const res = await chrome.storage.local.get([
      STORAGE_KEYS.RULES,
      STORAGE_KEYS.SCHEDULES,
      STORAGE_KEYS.FOCUS_END,
    ]);
    return {
      rules: res[STORAGE_KEYS.RULES]
        ? JSON.parse(res[STORAGE_KEYS.RULES] as string)
        : [],
      schedules: res[STORAGE_KEYS.SCHEDULES]
        ? JSON.parse(res[STORAGE_KEYS.SCHEDULES] as string)
        : [],
      focusEndTime: Number(res[STORAGE_KEYS.FOCUS_END]) || 0,
    };
  },

  saveRules: async (rules: AppRule[]): Promise<void> => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.RULES]: JSON.stringify(rules),
    });
  },

  getSyncState: async (): Promise<SyncState> => {
    const res = await chrome.storage.local.get(STORAGE_KEYS.SYNC_STATE);
    const raw = res[STORAGE_KEYS.SYNC_STATE];
    return raw
      ? JSON.parse(raw as string)
      : {
          status: 'idle',
          lastSyncAt: null,
          lastAttemptAt: null,
          lastError: null,
          pendingOps: 0,
          telemetry: {
            changedCount: 0,
            errors: [],
          },
        };
  },

  saveSyncState: async (state: SyncState): Promise<void> => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SYNC_STATE]: JSON.stringify(state),
    });
  },
};

function redact(input: string | undefined): string {
  if (!input) {
    return '';
  }
  return input.replace(/[a-zA-Z0-9]{10,}/g, (match) => {
    return match.substring(0, 2) + '****';
  });
}

export const extensionLogger = {
  add: async (level: any, message: string, details = '') => {
    const redactedMessage = redact(message);
    const redactedDetails = redact(details);

    const current = await extensionAdapter.getString(STORAGE_KEYS.LOGS);
    const logs = current ? JSON.parse(current as string) : [];
    const updated = [
      {
        timestamp: new Date().toISOString(),
        level,
        message: redactedMessage,
        details: redactedDetails,
      },
      ...logs,
    ].slice(0, 100);
    await extensionAdapter.set(STORAGE_KEYS.LOGS, JSON.stringify(updated));
    console.log(`[StopAccess] ${redactedMessage}`, redactedDetails);
  },
};

export const nextDNSApi = {
  isConfigured: async () => {
    const res = await chrome.storage.local.get([
      STORAGE_KEYS.PROFILE_ID,
      STORAGE_KEYS.API_KEY,
    ]);
    return !!(res[STORAGE_KEYS.PROFILE_ID] && res[STORAGE_KEYS.API_KEY]);
  },

  shouldSync: async () => {
    return nextDNSApi.isConfigured();
  },

  getConfig: async (): Promise<NextDNSConfig> => {
    const res = await chrome.storage.local.get([
      STORAGE_KEYS.PROFILE_ID,
      STORAGE_KEYS.API_KEY,
    ]);
    return {
      profileId: (res[STORAGE_KEYS.PROFILE_ID] as string) || '',
      apiKey: (res[STORAGE_KEYS.API_KEY] as string) || '',
    };
  },

  getParentalControlServices: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getParentalControlServices(cfg, extensionLogger.add);
  },

  getParentalControlCategories: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getParentalControlCategories(cfg, extensionLogger.add);
  },

  syncParentalControlServices: async (services: NextDNSService[]) => {
    // Check if we're REMOVING any currently active services
    const currentRes: any = await nextDNSApi.getParentalControlServices();
    const current = currentRes.ok ? currentRes.data : [];
    const currentActiveIds = (current || [])
      .filter((s: any) => s.active)
      .map((s: any) => s.id);
    const newActiveIds = (services || [])
      .filter((s: any) => s.active)
      .map((s: any) => s.id);
    const removing = currentActiveIds.some(
      (id: string) => !newActiveIds.includes(id),
    );

    if (removing) {
      const check = await requireUnlocked('modify_blocklist');
      if (check.locked) {
        return check.result;
      }
    }

    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.syncParentalControlServices(
      services,
      cfg,
      extensionLogger.add,
    );
  },

  syncParentalControlCategories: async (categories: NextDNSCategory[]) => {
    const currentRes: any = await nextDNSApi.getParentalControlCategories();
    const current = currentRes.ok ? currentRes.data : [];
    const currentActiveIds = (current || [])
      .filter((c: any) => c.active)
      .map((c: any) => c.id);
    const newActiveIds = (categories || [])
      .filter((c: any) => c.active)
      .map((c: any) => c.id);
    const removing = currentActiveIds.some(
      (id: string) => !newActiveIds.includes(id),
    );

    if (removing) {
      const check = await requireUnlocked('modify_blocklist');
      if (check.locked) {
        return check.result;
      }
    }

    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.syncParentalControlCategories(
      categories,
      cfg,
      extensionLogger.add,
    );
  },

  setParentalControlServiceState: async (
    serviceId: string,
    active: boolean,
  ) => {
    if (!active) {
      const check = await requireUnlocked('remove_app');
      if (check.locked) {
        return check.result;
      }
    }

    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.setParentalControlServiceState(
      serviceId,
      active,
      cfg,
      extensionLogger.add,
    );
  },
  setServiceState: async (serviceId: string, active: boolean) => {
    return nextDNSApi.setParentalControlServiceState(serviceId, active);
  },

  setParentalControlCategoryState: async (
    categoryId: string,
    active: boolean,
  ) => {
    if (!active) {
      const check = await requireUnlocked('remove_app');
      if (check.locked) {
        return check.result;
      }
    }

    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.setParentalControlCategoryState(
      categoryId,
      active,
      cfg,
      extensionLogger.add,
    );
  },
  setCategoryState: async (categoryId: string, active: boolean) => {
    return nextDNSApi.setParentalControlCategoryState(categoryId, active);
  },

  setDenylistDomainState: async (domain: string, active: boolean) => {
    if (!active) {
      const check = await requireUnlocked('remove_app');
      if (check.locked) {
        return check.result;
      }
    }

    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.setDenylistDomainState(
      domain,
      active,
      cfg,
      extensionLogger.add,
    );
  },

  getLogs: async (status: string, limit: number) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getLogs(cfg, extensionLogger.add, status, limit);
  },

  getTopBlockedDomains: async (limit: number) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getTopBlockedDomains(cfg, extensionLogger.add, limit);
  },
  getAnalyticsCounters: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getAnalyticsCounters(cfg, extensionLogger.add);
  },

  getRemoteSnapshot: async () => {
    if (!(await nextDNSApi.shouldSync())) {
      return { ok: true, data: { denylist: [], services: [], categories: [] } };
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getRemoteSnapshot(cfg, extensionLogger.add);
  },

  refreshNextDNSMetadata: async () => {
    if (!(await nextDNSApi.isConfigured())) {
      const empty = { services: [], categories: [], denylist: [] };
      await chrome.storage.local.set({ [STORAGE_KEYS.CACHED_METADATA]: empty });
      return empty;
    }

    const snapshotRes: any = await nextDNSApi.getRemoteSnapshot();
    const snapshot = snapshotRes.ok
      ? snapshotRes.data
      : { services: [], categories: [], denylist: [] };
    const metadata = {
      services: snapshot.services || [],
      categories: snapshot.categories || [],
      denylist: snapshot.denylist || [],
    };
    await chrome.storage.local.set({
      [STORAGE_KEYS.CACHED_METADATA]: metadata,
    });
    return metadata;
  },

  resolveTargetInput: async (input: string) => {
    return ndnsCore.resolveTargetInput(input);
  },

  setTargetState: async (kind: string, id: string, active: boolean) => {
    if (!(await nextDNSApi.shouldSync())) {
      return { ok: true };
    }
    if (!active) {
      const check = await requireUnlocked('remove_app');
      if (check.locked) {
        return check.result;
      }
    }

    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.setTargetState(
      kind as any,
      id,
      active,
      cfg,
      extensionLogger.add,
    );
  },

  addResolvedTarget: async (target: any) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.setResolvedTargetState(
      target,
      true,
      cfg,
      extensionLogger.add,
    );
  },

  resolveAndAddTarget: async (input: string) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.resolveAndSetTargetState(
      input,
      true,
      cfg,
      extensionLogger.add,
    );
  },

  testConnection: async () => {
    const cfg = await nextDNSApi.getConfig();
    if (!cfg.profileId || !cfg.apiKey) {
      return false;
    }
    return ndnsCore.testConnection(cfg, extensionLogger.add);
  },

  getSecurity: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getSecuritySettings(cfg, extensionLogger.add);
  },
  patchSecurity: async (patch: Partial<NextDNSSecuritySettings>) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result;
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.patchSecuritySettings(patch, cfg, extensionLogger.add);
  },
  getParentalControl: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getParentalControlSettings(cfg, extensionLogger.add);
  },
  patchParentalControl: async (
    patch: Partial<NextDNSParentalControlSettings>,
  ) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result;
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.patchParentalControlSettings(
      patch,
      cfg,
      extensionLogger.add,
    );
  },
  getBlockedTlds: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getBlockedTldsForProfile(cfg, extensionLogger.add);
  },
  addBlockedTld: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result;
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.addBlockedTldToProfile(id, cfg, extensionLogger.add);
  },
  removeBlockedTld: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result;
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.removeBlockedTldFromProfile(id, cfg, extensionLogger.add);
  },

  getPrivacy: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getPrivacySettings(cfg, extensionLogger.add);
  },
  patchPrivacy: async (patch: Partial<NextDNSPrivacySettings>) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result;
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.patchPrivacySettings(patch, cfg, extensionLogger.add);
  },
  getBlocklists: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getBlocklistsForProfile(cfg, extensionLogger.add);
  },
  getAvailableBlocklists: async () => {
    const cfg = await nextDNSApi.getConfig();
    const client = ndnsCore.createClient(cfg, extensionLogger.add);
    return ndnsCore.getAvailableBlocklists(client);
  },
  addBlocklist: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result;
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.addBlocklistToProfile(id, cfg, extensionLogger.add);
  },
  removeBlocklist: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result;
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.removeBlocklistFromProfile(id, cfg, extensionLogger.add);
  },
  getNativeTracking: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getNativeTrackingForProfile(cfg, extensionLogger.add);
  },
  addNativeTracking: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result;
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.addNativeTrackingToProfile(id, cfg, extensionLogger.add);
  },
  removeNativeTracking: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result;
    }
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.removeNativeTrackingFromProfile(
      id,
      cfg,
      extensionLogger.add,
    );
  },

  unblockAll: async () => {
    const check = await requireUnlocked('disable_blocking');
    if (check.locked) {
      return check.result;
    }

    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.unblockAll(cfg, extensionLogger.add);
  },

  getSchedules: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getQuietHoursSync(cfg, extensionLogger.add);
  },

  updateSchedules: async (recreationTime: any) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.updateQuietHoursSync(
      recreationTime,
      cfg,
      extensionLogger.add,
    );
  },
};
