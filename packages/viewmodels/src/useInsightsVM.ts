declare var chrome: any;
import { getRecentSnapshots } from '@focusgate/core';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../../../extension/src/background/platformAdapter';

export async function loadInsightsData() {
  const isConfigured = await nextDNSApi.isConfigured();
  const isSyncModeFull =
    (await storage.getString('fg_sync_mode')) !== 'browser';

  let snapshots = await getRecentSnapshots(storage, 14); // 2 weeks trend
  if (!Array.isArray(snapshots)) {
    snapshots = [];
  }

  let blockedLogs = [];
  let topBlocked = [];
  let counters = { blocked: 0, allowed: 0 };

  if (isConfigured) {
    try {
      const [logsRes, domainsRes, countersRes] = await Promise.all([
        nextDNSApi.getLogs('blocked', 20),
        nextDNSApi.getTopBlockedDomains(10),
        nextDNSApi.getAnalyticsCounters(),
      ]);
      blockedLogs = (logsRes as any).ok ? (logsRes as any).data || [] : [];
      topBlocked = (domainsRes as any).ok ? (domainsRes as any).data || [] : [];

      if ((countersRes as any).ok && Array.isArray((countersRes as any).data)) {
        const dataArray = (countersRes as any).data;
        const blockedObj = dataArray.find((i: any) => i.status === 'blocked');
        const allowedObj = dataArray.find((i: any) => i.status === 'allowed');
        const defaultObj = dataArray.find((i: any) => i.status === 'default');

        const blocked = Number(blockedObj?.queries) || 0;
        const allowed = Number(allowedObj?.queries || defaultObj?.queries) || 0;
        counters = { blocked, allowed };
      }
    } catch (e) {
      console.warn('NextDNS insights fetch failed', e);
    }
  }

  const maxMins = Math.max(
    1,
    ...(snapshots as any[]).map((s) => Number(s.screenTimeMinutes) || 0),
  );

  const avgFocusTime =
    snapshots.length > 0
      ? Math.round(
          snapshots.reduce(
            (acc, s) => acc + (Number(s.screenTimeMinutes) || 0),
            0,
          ) / snapshots.length,
        )
      : 0;

  const { usage = {} } = (await chrome.storage.local.get(['usage'])) as any;
  const allTotalMs = Object.values(usage).reduce(
    (a: number, b: any) => a + (Number(b.time) || 0),
    0,
  );

  const focusConsistency =
    snapshots.length > 0
      ? Math.round(
          (snapshots.filter((s: any) => (Number(s.screenTimeMinutes) || 0) > 0)
            .length /
            snapshots.length) *
            100,
        )
      : 0;

  const totalQueries = Number(counters.blocked) + Number(counters.allowed);
  const protectionRate =
    totalQueries > 0
      ? Math.round((Number(counters.blocked) / totalQueries) * 100)
      : 0;

  return {
    isConfigured,
    isSyncModeFull,
    snapshots,
    blockedLogs,
    topBlocked,
    allTotalMs,
    maxMins,
    avgFocusTime,
    focusConsistency,
    totalQueries: isNaN(totalQueries) ? 0 : totalQueries,
    blockedQueries: isNaN(counters.blocked) ? 0 : counters.blocked,
    protectionRate: isNaN(protectionRate) ? 0 : protectionRate,
  };
}
