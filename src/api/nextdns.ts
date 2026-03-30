/**
 * React Native NextDNS Bridge
 * Implements authoritative @focusgate/core API with local logging and convenience helpers.
 */

import * as core from '@focusgate/core/api';
import { addLog } from '../services/logger';
import { NextDNSConfig, AppRule } from '@focusgate/types';
import { storage } from '../store/storageAdapter';

export const isConfigured = async (): Promise<boolean> => {
  const profileId = storage.getString('nextdns_profile_id');
  const apiKey = storage.getString('nextdns_api_key');
  return !!(profileId && apiKey);
};

export const getConfig = async (): Promise<NextDNSConfig> => {
  return {
    profileId: storage.getString('nextdns_profile_id') || '',
    apiKey: storage.getString('nextdns_api_key') || '',
  };
};

export const saveConfig = async (cfg: NextDNSConfig): Promise<void> => {
  storage.set('nextdns_profile_id', cfg.profileId);
  storage.set('nextdns_api_key', cfg.apiKey);
};

export const testConnection = async (cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.testConnection(activeCfg, addLog);
};

export const blockApps = async (rules: AppRule[], cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.blockApps(rules, activeCfg, addLog);
};

export const unblockAll = async (cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.unblockAll(activeCfg, addLog);
};

export const blockApp = async (
  appName: string,
  rules?: AppRule[],
): Promise<void> => {
  const cfg = await getConfig();
  const currentRules = rules || [];
  const rulesToBlock = currentRules.filter(
    (r) => r.appName === appName || r.blockedToday,
  );
  await core.blockApps(rulesToBlock, cfg, addLog);
};

export const unblockApp = async (
  appName: string,
  rules?: AppRule[],
): Promise<void> => {
  const cfg = await getConfig();
  const currentRules = rules || [];
  const rulesToBlock = currentRules.filter(
    (r) => r.appName !== appName && r.blockedToday,
  );
  await core.blockApps(rulesToBlock, cfg, addLog);
};

export const getParentalControlServices = async (cfg?: NextDNSConfig) => {
  const activeCfg = cfg || (await getConfig());
  return core.getParentalControlServices(activeCfg, addLog);
};

export const syncParentalControlServices = async (
  services: any[],
  cfg?: NextDNSConfig,
) => {
  const activeCfg = cfg || (await getConfig());
  return core.syncParentalControlServices(services, activeCfg, addLog);
};
