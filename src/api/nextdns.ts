import * as core from '@focusgate/core';
import { getRules } from '@focusgate/state/rules';
import { addLog } from '../services/logger';
import { NextDNSConfig, AppRule, NextDNSService } from '@focusgate/types';
import { storageAdapter as storage } from '../store/storageAdapter';

import {
  getSecureApiKey,
  setSecureApiKey,
  resetSecureApiKey,
} from '../services/keychain';

let configCache: NextDNSConfig | null = null;

const logger = (
  level: 'info' | 'warn' | 'error',
  msg: string,
  detail?: string,
) => addLog(level, msg, detail);

export const isConfigured = async (): Promise<boolean> => {
  const cfg = await getConfig(true); // Force refresh to ensure we see new credentials immediately
  return !!(cfg.profileId && cfg.apiKey);
};

export const getConfig = async (
  forceRefresh = false,
): Promise<NextDNSConfig> => {
  if (configCache && !forceRefresh) {
    return configCache;
  }

  // 1. Try secure storage first
  let apiKey = await getSecureApiKey();

  // 2. Fallback to legacy MMKV storage for migration
  if (!apiKey) {
    const legacyKey = await storage.getString('nextdns_api_key');
    if (legacyKey) {
      // Migrate to secure storage
      await setSecureApiKey(legacyKey);
      // Delete from insecure storage
      await storage.delete('nextdns_api_key');
      apiKey = legacyKey;
      addLog('info', 'Migrated NextDNS API Key to secure storage');
    }
  }

  configCache = {
    profileId: (await storage.getString('nextdns_profile_id')) || '',
    apiKey: apiKey || '',
  };
  return configCache;
};

export const saveConfig = async (cfg: NextDNSConfig): Promise<void> => {
  await storage.set('nextdns_profile_id', cfg.profileId);

  if (cfg.apiKey) {
    await setSecureApiKey(cfg.apiKey);
  }

  // Ensure legacy key is removed if it somehow exists
  await storage.delete('nextdns_api_key');

  configCache = cfg;
};

export const resetConfig = async (): Promise<void> => {
  await storage.delete('nextdns_profile_id');
  await resetSecureApiKey();
  configCache = null;
};

export const testConnection = async (cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.testConnection(activeCfg, logger);
};

export const blockApps = async (rules: AppRule[], cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.blockApps(rules, activeCfg, logger);
};

function matchesRuleTarget(rule: AppRule, target: string) {
  const value = target.toLowerCase();
  return [rule.appName, rule.packageName, rule.customDomain]
    .filter(Boolean)
    .some((candidate) => candidate!.toLowerCase() === value);
}

export const blockApp = async (target: string, cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  const rules = await getRules(storage);
  const rulesToBlock = rules.filter(
    (rule) =>
      matchesRuleTarget(rule, target) ||
      rule.blockedToday ||
      rule.mode === 'block',
  );
  return core.blockApps(rulesToBlock, activeCfg, logger);
};

export const unblockApp = async (target: string, cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  const rules = await getRules(storage);
  const rulesToKeepBlocked = rules.filter(
    (rule) =>
      !matchesRuleTarget(rule, target) &&
      (rule.blockedToday || rule.mode === 'block'),
  );
  return core.blockApps(rulesToKeepBlocked, activeCfg, logger);
};

export const unblockAll = async (cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.unblockAll(activeCfg, logger);
};

export const getParentalControlServices = async (cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.getParentalControlServices(activeCfg, logger);
};

export const getServices = async (cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.getParentalControlServices(activeCfg, logger).then((data) => ({
    ok: true,
    data,
  }));
};

export const getCategories = async (cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.getParentalControlCategories(activeCfg, logger).then((data) => ({
    ok: true,
    data,
  }));
};

export const syncParentalControlServices = async (
  services: NextDNSService[],
  cfg?: NextDNSConfig,
) => {
  const activeCfg = cfg || (await getConfig());
  return core.syncParentalControlServices(services, activeCfg, logger);
};

export const getRemoteSnapshot = async (cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.getRemoteSnapshot(activeCfg, logger);
};
