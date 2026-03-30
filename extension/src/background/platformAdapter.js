/**
 * Extension Platform Adapter
 * Thin bridge between Chrome APIs and @focusgate/core.
 */

import * as ndnsCore from '@focusgate/core';

export const STORAGE_KEYS = {
  RULES: 'app_rules',
  SCHEDULES: 'schedule_rules',
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

  loadGlobalState: async () => {
    const res = await chrome.storage.local.get([
      STORAGE_KEYS.RULES,
      STORAGE_KEYS.SCHEDULES,
      STORAGE_KEYS.FOCUS_END,
    ]);
    return {
      rules: res[STORAGE_KEYS.RULES] ? JSON.parse(res[STORAGE_KEYS.RULES]) : [],
      schedules: res[STORAGE_KEYS.SCHEDULES]
        ? JSON.parse(res[STORAGE_KEYS.SCHEDULES])
        : [],
      focusEndTime: Number(res[STORAGE_KEYS.FOCUS_END]) || 0,
    };
  },

  saveRules: async (rules) => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.RULES]: JSON.stringify(rules),
    });
  },
};

export const extensionLogger = {
  add: async (level, message, details = '') => {
    const current = await extensionAdapter.getString(STORAGE_KEYS.LOGS);
    const logs = current ? JSON.parse(current) : [];
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

  getConfig: async () => {
    const res = await chrome.storage.local.get([
      STORAGE_KEYS.PROFILE_ID,
      STORAGE_KEYS.API_KEY,
    ]);
    return {
      profileId: res[STORAGE_KEYS.PROFILE_ID],
      apiKey: res[STORAGE_KEYS.API_KEY],
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
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.syncParentalControlServices(
      services,
      cfg,
      extensionLogger.add,
    );
  },

  syncParentalControlCategories: async (categories) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.syncParentalControlCategories(
      categories,
      cfg,
      extensionLogger.add,
    );
  },

  setParentalControlServiceState: async (serviceId, active) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.setParentalControlServiceState(
      serviceId,
      active,
      cfg,
      extensionLogger.add,
    );
  },

  setParentalControlCategoryState: async (categoryId, active) => {
    const cfg = await nextDNSApi.getConfig();
    return ndnsCore.setParentalControlCategoryState(
      categoryId,
      active,
      cfg,
      extensionLogger.add,
    );
  },

  setDenylistDomainState: async (domain, active) => {
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
};
