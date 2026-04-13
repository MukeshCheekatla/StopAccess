/**
 * Mobile NextDNS Settings Bridge
 *
 * Wires the platform-agnostic `createSecurityVM` and `createPrivacyVM`
 * from `packages/viewmodels` to the React Native storage + API layer.
 *
 * Usage:
 *   import { securityVM, privacyVM } from '../api/nextdnsSettings';
 *   const data = await securityVM.load();
 */

import { createSecurityVM } from '@stopaccess/viewmodels/useSecurityVM';
import { createPrivacyVM } from '@stopaccess/viewmodels/usePrivacyVM';
import { storageAdapter } from '../store/storageAdapter';
import * as nextDNS from './nextdns';

/**
 * Mobile shim that satisfies the `api` contract expected by Security/PrivacyVM.
 * Maps @stopaccess/core NextDNS calls through the mobile API layer (keychain + MMKV).
 */
const mobileApi = {
  isConfigured: nextDNS.isConfigured,

  // --- Security ---
  getSecurity: async () => {
    const cfg = await nextDNS.getConfig();
    const { getSecuritySettings } = await import('@stopaccess/core');
    return getSecuritySettings(cfg, console.warn);
  },
  patchSecurity: async (patch: Record<string, unknown>) => {
    const cfg = await nextDNS.getConfig();
    const { patchSecuritySettings } = await import('@stopaccess/core');
    return patchSecuritySettings(patch as any, cfg, console.warn);
  },
  getBlockedTlds: async () => {
    const cfg = await nextDNS.getConfig();
    const { getBlockedTldsForProfile } = await import('@stopaccess/core');
    return getBlockedTldsForProfile(cfg, console.warn);
  },
  addBlockedTld: async (id: string) => {
    const cfg = await nextDNS.getConfig();
    const { addBlockedTldToProfile } = await import('@stopaccess/core');
    return addBlockedTldToProfile(id, cfg, console.warn);
  },
  removeBlockedTld: async (id: string) => {
    const cfg = await nextDNS.getConfig();
    const { removeBlockedTldFromProfile } = await import('@stopaccess/core');
    return removeBlockedTldFromProfile(id, cfg, console.warn);
  },

  // --- Privacy ---
  getPrivacy: async () => {
    const cfg = await nextDNS.getConfig();
    const { getPrivacySettings } = await import('@stopaccess/core');
    return getPrivacySettings(cfg, console.warn);
  },
  patchPrivacy: async (patch: Record<string, unknown>) => {
    const cfg = await nextDNS.getConfig();
    const { patchPrivacySettings } = await import('@stopaccess/core');
    return patchPrivacySettings(patch as any, cfg, console.warn);
  },
  getBlocklists: async () => {
    const cfg = await nextDNS.getConfig();
    const { getBlocklistsForProfile } = await import('@stopaccess/core');
    return getBlocklistsForProfile(cfg, console.warn);
  },
  addBlocklist: async (id: string) => {
    const cfg = await nextDNS.getConfig();
    const { addBlocklistToProfile } = await import('@stopaccess/core');
    return addBlocklistToProfile(id, cfg, console.warn);
  },
  removeBlocklist: async (id: string) => {
    const cfg = await nextDNS.getConfig();
    const { removeBlocklistFromProfile } = await import('@stopaccess/core');
    return removeBlocklistFromProfile(id, cfg, console.warn);
  },
  getNativeTracking: async () => {
    const cfg = await nextDNS.getConfig();
    const { getNativeTrackingForProfile } = await import('@stopaccess/core');
    return getNativeTrackingForProfile(cfg, console.warn);
  },
  addNativeTracking: async (id: string) => {
    const cfg = await nextDNS.getConfig();
    const { addNativeTrackingToProfile } = await import('@stopaccess/core');
    return addNativeTrackingToProfile(id, cfg, console.warn);
  },
  removeNativeTracking: async (id: string) => {
    const cfg = await nextDNS.getConfig();
    const { removeNativeTrackingFromProfile } = await import(
      '@stopaccess/core'
    );
    return removeNativeTrackingFromProfile(id, cfg, console.warn);
  },
};

/** Security VM — load/toggle security settings + TLD management */
export const securityVM = createSecurityVM(storageAdapter, mobileApi);

/** Privacy VM — load/toggle disguised trackers, blocklists, native tracking */
export const privacyVM = createPrivacyVM(storageAdapter, mobileApi);

/** Convenience: fetch NextDNS analytics for InsightsScreen */
export async function getAnalytics() {
  const configured = await nextDNS.isConfigured();
  if (!configured) {
    return { blockedToday: 0, topBlocked: [], logs: [] };
  }

  const cfg = await nextDNS.getConfig();
  const { getAnalyticsCounters, getTopBlockedDomains, getLogs } = await import(
    '@stopaccess/core'
  );

  const [countersRes, topRes, logsRes] = await Promise.allSettled([
    getAnalyticsCounters(cfg, console.warn),
    getTopBlockedDomains(cfg, console.warn, 10),
    getLogs(cfg, console.warn, 'blocked', 20),
  ]);

  const blockedToday =
    countersRes.status === 'fulfilled' && (countersRes.value as any)?.data
      ? (countersRes.value as any).data.blocked ?? 0
      : 0;

  const topBlocked =
    topRes.status === 'fulfilled' && (topRes.value as any)?.data
      ? (topRes.value as any).data
      : [];

  const logs =
    logsRes.status === 'fulfilled' && (logsRes.value as any)?.data
      ? (logsRes.value as any).data
      : [];

  return { blockedToday, topBlocked, logs };
}
