import * as core from '@focusgate/core';
import { getRules } from '@focusgate/state/rules';
import { addLog } from '../services/logger';
import { NextDNSConfig, AppRule, NextDNSService } from '@focusgate/types';
import { storageAdapter as storage } from '../store/storageAdapter';

let configCache: NextDNSConfig | null = null;

const logger = (
  level: 'info' | 'warn' | 'error',
  msg: string,
  detail?: string,
) => addLog(level, msg, detail);

export const isConfigured = async (): Promise<boolean> => {
  const cfg = await getConfig();
  return !!(cfg.profileId && cfg.apiKey);
};

export const getConfig = async (): Promise<NextDNSConfig> => {
  if (configCache) {
    return configCache;
  }
  configCache = {
    profileId: (await storage.getString('nextdns_profile_id')) || '',
    apiKey: (await storage.getString('nextdns_api_key')) || '',
  };
  return configCache;
};

export const saveConfig = async (cfg: NextDNSConfig): Promise<void> => {
  await storage.set('nextdns_profile_id', cfg.profileId);
  await storage.set('nextdns_api_key', cfg.apiKey);
  configCache = cfg;
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
