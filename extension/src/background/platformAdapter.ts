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
  NextDNSApiClient,
  ResolvedTarget,
  // NextDNSEntity,
} from '@stopaccess/types';
import { STORAGE_KEYS } from '@stopaccess/state';
import { checkGuard } from './sessionGuard';

export { STORAGE_KEYS } from '@stopaccess/state';

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
  getMultiple: async (keys: string[]): Promise<Record<string, any>> => {
    return chrome.storage.local.get(keys);
  },

  loadGlobalState: async (): Promise<GlobalState> => {
    const res = await chrome.storage.local.get([
      STORAGE_KEYS.RULES,
      STORAGE_KEYS.SCHEDULES,
      STORAGE_KEYS.FOCUS_END,
      STORAGE_KEYS.TEMP_PASSES,
    ]);
    const rawRules = res[STORAGE_KEYS.RULES];
    const rawSchedules = res[STORAGE_KEYS.SCHEDULES];
    return {
      rules:
        typeof rawRules === 'string'
          ? JSON.parse(rawRules)
          : Array.isArray(rawRules)
          ? rawRules
          : [],
      schedules:
        typeof rawSchedules === 'string'
          ? JSON.parse(rawSchedules)
          : Array.isArray(rawSchedules)
          ? rawSchedules
          : [],
      focusEndTime: Number(res[STORAGE_KEYS.FOCUS_END]) || 0,
      passes: res[STORAGE_KEYS.TEMP_PASSES] || {},
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
      ? typeof raw === 'string'
        ? JSON.parse(raw)
        : raw
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

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000;

async function withCache(key: string, fn: () => Promise<any>, ttl = CACHE_TTL) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  const data = await fn();
  apiCache.set(key, { data, timestamp: Date.now() });
  return data;
}

function clearCache(keyPrefix?: string) {
  if (!keyPrefix) {
    apiCache.clear();
    return;
  }
  for (const key of Array.from(apiCache.keys())) {
    if (key.startsWith(keyPrefix)) {
      apiCache.delete(key);
    }
  }
}

export const nextDNSApi: NextDNSApiClient = {
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

  testConnection: async () => {
    const cfg = await nextDNSApi.getConfig();
    if (!cfg.profileId || !cfg.apiKey) {
      return {
        ok: false,
        error: { code: 'auth_error' as any, message: 'Missing credentials' },
      };
    }
    const res = await ndnsCore.testConnection(cfg, extensionLogger.add);
    return { ok: true, data: !!res } as any;
  },

  blockApps: async (rules: AppRule[]) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.blockApps(rules, cfg, extensionLogger.add);
  },

  getServices: async () => {
    return nextDNSApi.getParentalControlServices();
  },

  getCategories: async () => {
    return nextDNSApi.getParentalControlCategories();
  },

  unblockAll: async () => {
    const check = await requireUnlocked('disable_blocking');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.unblockAll(cfg, extensionLogger.add);
    clearCache();
    return res as any;
  },

  getSecurity: async () => {
    const res = await withCache('security_settings', async () => {
      const cfg = await nextDNSApi.getConfig();
      return ndnsCore.getSecuritySettings(cfg, extensionLogger.add);
    });
    return res as any;
  },

  patchSecurity: async (patch: Partial<NextDNSSecuritySettings>) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.patchSecuritySettings(
      patch,
      cfg,
      extensionLogger.add,
    );
    clearCache('security_settings');
    return res as any;
  },

  getPrivacy: async () => {
    const res = await withCache('privacy_settings', async () => {
      const cfg = await nextDNSApi.getConfig();
      return ndnsCore.getPrivacySettings(cfg, extensionLogger.add);
    });
    return res as any;
  },

  patchPrivacy: async (patch: Partial<NextDNSPrivacySettings>) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.patchPrivacySettings(
      patch,
      cfg,
      extensionLogger.add,
    );
    clearCache('privacy_settings');
    return res as any;
  },

  getParentalControl: async () => {
    const res = await withCache('parental_settings', async () => {
      const cfg = await nextDNSApi.getConfig();
      return ndnsCore.getParentalControlSettings(cfg, extensionLogger.add);
    });
    return res as any;
  },

  patchParentalControl: async (
    patch: Partial<NextDNSParentalControlSettings>,
  ) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.patchParentalControlSettings(
      patch,
      cfg,
      extensionLogger.add,
    );
    clearCache('parental_settings');
    return res as any;
  },

  getBlockedTlds: async () => {
    const res = await withCache('blocked_tlds', async () => {
      const cfg = await nextDNSApi.getConfig();
      return ndnsCore.getBlockedTldsForProfile(cfg, extensionLogger.add);
    });
    return res as any;
  },

  addBlockedTld: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.addBlockedTldToProfile(
      id,
      cfg,
      extensionLogger.add,
    );
    clearCache('blocked_tlds');
    return res as any;
  },

  removeBlockedTld: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.removeBlockedTldFromProfile(
      id,
      cfg,
      extensionLogger.add,
    );
    clearCache('blocked_tlds');
    return res as any;
  },

  getBlocklists: async () => {
    const res = await withCache('blocklists', async () => {
      const cfg = await nextDNSApi.getConfig();
      return ndnsCore.getBlocklistsForProfile(cfg, extensionLogger.add);
    });
    return res as any;
  },

  getAvailableBlocklists: async () => {
    const res = await withCache('available_blocklists', async () => {
      const cfg = await nextDNSApi.getConfig();
      const client = new (ndnsCore as any).NextDNSClient(
        cfg,
        extensionLogger.add,
      );
      return ndnsCore.getAvailableBlocklists(client);
    });
    return res as any;
  },

  addBlocklist: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.addBlocklistToProfile(
      id,
      cfg,
      extensionLogger.add,
    );
    clearCache('blocklists');
    return res as any;
  },

  removeBlocklist: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.removeBlocklistFromProfile(
      id,
      cfg,
      extensionLogger.add,
    );
    clearCache('blocklists');
    return res as any;
  },

  getNativeTracking: async () => {
    const res = await withCache('native_tracking', async () => {
      const cfg = await nextDNSApi.getConfig();
      return ndnsCore.getNativeTrackingForProfile(cfg, extensionLogger.add);
    });
    return res as any;
  },

  addNativeTracking: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.addNativeTrackingToProfile(
      id,
      cfg,
      extensionLogger.add,
    );
    clearCache('native_tracking');
    return res as any;
  },

  removeNativeTracking: async (id: string) => {
    const check = await requireUnlocked('modify_blocklist');
    if (check.locked) {
      return check.result as any;
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.removeNativeTrackingFromProfile(
      id,
      cfg,
      extensionLogger.add,
    );
    clearCache('native_tracking');
    return res as any;
  },

  getDenylist: async () => {
    const res: any = await nextDNSApi.getRemoteSnapshot();
    if (res.ok) {
      return { ok: true, data: res.data.denylist };
    }
    return res;
  },

  getLogs: async (limit = 20, status = 'blocked') => {
    const res = await withCache(`logs_${status}_${limit}`, async () => {
      const cfg = await nextDNSApi.getConfig();
      const client = new (ndnsCore as any).NextDNSClient(
        cfg,
        extensionLogger.add,
      );
      return (ndnsCore as any).getLogs(client, limit, status);
    });
    return res as any;
  },

  getTopBlockedDomains: async (limit = 3) => {
    const res = await withCache(`top_blocked_${limit}`, async () => {
      const cfg = await nextDNSApi.getConfig();
      const client = new (ndnsCore as any).NextDNSClient(
        cfg,
        extensionLogger.add,
      );
      return (ndnsCore as any).getTopBlockedDomains(client, limit);
    });
    return res as any;
  },

  getAnalyticsDomains: async (limit = 10, status = 'blocked') => {
    const res = await withCache(
      `analytics_domains_${status}_${limit}`,
      async () => {
        const cfg = await nextDNSApi.getConfig();
        const client = new (ndnsCore as any).NextDNSClient(
          cfg,
          extensionLogger.add,
        );
        return (ndnsCore as any).getAnalyticsDomains(client, limit, status);
      },
    );
    return res as any;
  },

  getAnalyticsCounters: async () => {
    const res = await withCache('analytics_counters', async () => {
      const cfg = await nextDNSApi.getConfig();
      const client = new (ndnsCore as any).NextDNSClient(
        cfg,
        extensionLogger.add,
      );
      return (ndnsCore as any).getAnalyticsCounters(client);
    });
    return res as any;
  },

  getRemoteSnapshot: async () => {
    if (!(await nextDNSApi.shouldSync())) {
      return {
        ok: true,
        data: { denylist: [], services: [], categories: [] },
      } as any;
    }
    const res = await withCache('snapshot', async () => {
      const cfg = await nextDNSApi.getConfig();
      const client = new (ndnsCore as any).NextDNSClient(
        cfg,
        extensionLogger.add,
      );
      return (ndnsCore as any).getRemoteSnapshot(client);
    });
    return res as any;
  },

  getFullSnapshot: async () => {
    const res = await withCache('full_snapshot', async () => {
      const cfg = await nextDNSApi.getConfig();
      const client = new (ndnsCore as any).NextDNSClient(
        cfg,
        extensionLogger.add,
      );
      return (ndnsCore as any).getFullSnapshot(client);
    });
    return res as any;
  },

  getRecreationTime: async () => {
    return nextDNSApi.getSchedules();
  },

  syncRecreationTime: async (recreationTime: any) => {
    return nextDNSApi.updateSchedules(recreationTime);
  },

  getParentalControlServices: async () => {
    const res = await withCache('parental_services', async () => {
      const cfg = await nextDNSApi.getConfig();
      const client = new (ndnsCore as any).NextDNSClient(
        cfg,
        extensionLogger.add,
      );
      return (ndnsCore as any).getParentalControlServices(client);
    });
    return res as any;
  },

  getParentalControlCategories: async () => {
    const res = await withCache('parental_categories', async () => {
      const cfg = await nextDNSApi.getConfig();
      const client = new (ndnsCore as any).NextDNSClient(
        cfg,
        extensionLogger.add,
      );
      return (ndnsCore as any).getParentalControlCategories(client);
    });
    return res as any;
  },

  syncParentalControlServices: async (services: NextDNSService[]) => {
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
        return check.result as any;
      }
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.syncParentalControlServices(
      services,
      cfg,
      extensionLogger.add,
    );
    clearCache('parental_services');
    return res as any;
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
        return check.result as any;
      }
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.syncParentalControlCategories(
      categories,
      cfg,
      extensionLogger.add,
    );
    clearCache('parental_categories');
    return res as any;
  },

  setParentalControlServiceState: async (
    serviceId: string,
    active: boolean,
  ) => {
    if (!active) {
      const check = await requireUnlocked('remove_app');
      if (check.locked) {
        return check.result as any;
      }
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.setParentalControlServiceState(
      serviceId,
      active,
      cfg,
      extensionLogger.add,
    );
    clearCache('parental_services');
    return res as any;
  },

  setParentalControlCategoryState: async (
    categoryId: string,
    active: boolean,
  ) => {
    if (!active) {
      const check = await requireUnlocked('remove_app');
      if (check.locked) {
        return check.result as any;
      }
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.setParentalControlCategoryState(
      categoryId,
      active,
      cfg,
      extensionLogger.add,
    );
    clearCache('parental_categories');
    return res as any;
  },

  setDenylistDomainState: async (domain: string, active: boolean) => {
    if (!active) {
      const check = await requireUnlocked('remove_app');
      if (check.locked) {
        return check.result as any;
      }
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.setDenylistDomainState(
      domain,
      active,
      cfg,
      extensionLogger.add,
    );
    clearCache('snapshot');
    return res as any;
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
    return ndnsCore.resolveTargetInput(input) as any as Promise<ResolvedTarget>;
  },

  setTargetState: async (kind: string, id: string, active: boolean) => {
    if (!(await nextDNSApi.shouldSync())) {
      return { ok: true };
    }
    if (!active) {
      const check = await requireUnlocked('remove_app');
      if (check.locked) {
        return check.result as any;
      }
    }
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.setTargetState(
      kind as any,
      id,
      active,
      cfg,
      extensionLogger.add,
    );
    clearCache('snapshot');
    clearCache('parental');
    return res as any;
  },

  addResolvedTarget: async (target: any) => {
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.setResolvedTargetState(
      target,
      true,
      cfg,
      extensionLogger.add,
    );
    clearCache('snapshot');
    return res as any;
  },

  getSchedules: async () => {
    const res = await withCache('schedules', async () => {
      const cfg = await nextDNSApi.getConfig();
      return ndnsCore.getQuietHoursSync(cfg, extensionLogger.add);
    });
    return res as any;
  },

  updateSchedules: async (recreationTime: any) => {
    const cfg = await nextDNSApi.getConfig();
    const res = await ndnsCore.updateQuietHoursSync(
      recreationTime,
      cfg,
      extensionLogger.add,
    );
    clearCache('schedules');
    return res as any;
  },
};
