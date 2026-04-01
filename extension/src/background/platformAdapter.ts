/**
 * Extension Platform Adapter
 * Thin bridge between Chrome APIs and @focusgate/core.
 */

import * as ndnsCore from '@focusgate/core';
import { NextDNSConfig } from '@focusgate/types';
import { checkGuard } from './sessionGuard';

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

export const STORAGE_KEYS = {
  RULES: 'rules',
  SCHEDULES: 'schedules',
  FOCUS_END: 'focus_mode_end_time',
  LAST_RESET: 'last_reset_day',
  PROFILE_ID: 'nextdns_profile_id',
  API_KEY: 'nextdns_api_key',
  LOGS: 'app_system_logs',
};

export const extensionAdapter = {
  getString: async (key) => {
    const res = await chrome.storage.local.get(key);
    return res[key] ?? null;
  },
  getBoolean: async (key) => {
    const res = await chrome.storage.local.get(key);
    return res[key] ?? !!res[key];
  },
  getNumber: async (key, fallback = 0) => {
    const res = await chrome.storage.local.get(key);
    return Number(res[key]) || fallback;
  },
  set: async (key, val) => {
    await chrome.storage.local.set({ [key]: val });
  },
  delete: async (key) => {
    await chrome.storage.local.remove(key);
  },
  getArray: async (key: string) => {
    const res = await chrome.storage.local.get(key);
    const raw = res[key];
    if (!raw) {
      return [];
    }
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return [];
    }
  },

  loadGlobalState: async () => {
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

  saveRules: async (rules) => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.RULES]: JSON.stringify(rules),
    });
  },

  getSyncState: async () => {
    const res = await chrome.storage.local.get('sync_state');
    return res.sync_state
      ? JSON.parse(res.sync_state as string)
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

  saveSyncState: async (state) => {
    await chrome.storage.local.set({
      sync_state: JSON.stringify(state),
    });
  },
};

export const extensionLogger = {
  add: async (level, message, details = '') => {
    const current = await extensionAdapter.getString(STORAGE_KEYS.LOGS);
    const logs = current ? JSON.parse(current as string) : [];
    const updated = [
      {
        timestamp: new Date().toISOString(),
        level,
        message,
        details,
      },
      ...logs,
    ].slice(0, 100);
    await extensionAdapter.set(STORAGE_KEYS.LOGS, JSON.stringify(updated));
    console.log(`[FocusGate] ${message}`, details);
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

  syncParentalControlServices: async (services) => {
    // Check if we're REMOVING any currently active services
    const current = await nextDNSApi.getParentalControlServices();
    const currentActiveIds = (current || [])
      .filter((s) => s.active)
      .map((s) => s.id);
    const newActiveIds = (services || [])
      .filter((s) => s.active)
      .map((s) => s.id);
    const removing = currentActiveIds.some((id) => !newActiveIds.includes(id));

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

  syncParentalControlCategories: async (categories) => {
    const current = await nextDNSApi.getParentalControlCategories();
    const currentActiveIds = (current || [])
      .filter((c) => c.active)
      .map((c) => c.id);
    const newActiveIds = (categories || [])
      .filter((c) => c.active)
      .map((c) => c.id);
    const removing = currentActiveIds.some((id) => !newActiveIds.includes(id));

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

  setParentalControlServiceState: async (serviceId, active) => {
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
  setServiceState: async (serviceId, active) => {
    return nextDNSApi.setParentalControlServiceState(serviceId, active);
  },

  setParentalControlCategoryState: async (categoryId, active) => {
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
  setCategoryState: async (categoryId, active) => {
    return nextDNSApi.setParentalControlCategoryState(categoryId, active);
  },

  setDenylistDomainState: async (domain, active) => {
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

  getLogs: async (status, limit) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getLogs(cfg, extensionLogger.add, status, limit);
  },

  getTopBlockedDomains: async (limit) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getTopBlockedDomains(cfg, extensionLogger.add, limit);
  },
  getAnalyticsCounters: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getAnalyticsCounters(cfg, extensionLogger.add);
  },

  getRemoteSnapshot: async () => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.getRemoteSnapshot(cfg, extensionLogger.add);
  },

  refreshNextDNSMetadata: async () => {
    if (!(await nextDNSApi.isConfigured())) {
      const empty = { services: [], categories: [], denylist: [] };
      await chrome.storage.local.set({ cached_ndns_metadata: empty });
      return empty;
    }

    const snapshot = await nextDNSApi.getRemoteSnapshot();
    const metadata = {
      services: snapshot.services || [],
      categories: snapshot.categories || [],
      denylist: snapshot.denylist || [],
    };
    await chrome.storage.local.set({ cached_ndns_metadata: metadata });
    return metadata;
  },

  resolveTargetInput: async (input) => {
    return ndnsCore.resolveTargetInput(input);
  },

  setTargetState: async (kind, id, active) => {
    if (!active) {
      const check = await requireUnlocked('remove_app');
      if (check.locked) {
        return check.result;
      }
    }

    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.setTargetState(kind, id, active, cfg, extensionLogger.add);
  },

  addResolvedTarget: async (target) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.setResolvedTargetState(
      target,
      true,
      cfg,
      extensionLogger.add,
    );
  },

  resolveAndAddTarget: async (input) => {
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
  unblockAll: async () => {
    const check = await requireUnlocked('disable_blocking');
    if (check.locked) {
      return check.result;
    }

    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.unblockAll(cfg, extensionLogger.add);
  },
};
