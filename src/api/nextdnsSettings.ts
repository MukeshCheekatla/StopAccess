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
const mobileApi: any = {
  ...nextDNS,
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
