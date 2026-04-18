declare var chrome: any;
import { getRecentSnapshots } from '@stopaccess/core';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../../../extension/src/background/platformAdapter';

export async function loadInsightsData() {
  const isConfigured = await nextDNSApi.isConfigured();

  let snapshots = await getRecentSnapshots(storage, 14); // 2 weeks trend
  if (!Array.isArray(snapshots)) {
    snapshots = [];
  }

  let blockedLogs = [];
  let topBlocked = [];
  let counters = { blocked: 0, allowed: 0 };

  if (isConfigured) {
    // We use individual try-catches to ensure one failing endpoint doesn't break the whole page
    try {
      const logsRes = await nextDNSApi.getLogs('blocked', 20).catch((e) => {
        console.warn('[Insights] Logs fetch failed', e);
        return { ok: false };
      });
      blockedLogs = (logsRes as any).ok ? (logsRes as any).data || [] : [];
    } catch (e) {}

    try {
      const domainsRes = await nextDNSApi
        .getTopBlockedDomains(10)
        .catch((e) => {
          console.warn('[Insights] Top domains fetch failed', e);
          return { ok: false };
        });
      topBlocked = (domainsRes as any).ok ? (domainsRes as any).data || [] : [];
    } catch (e) {}

    try {
      const countersRes = await nextDNSApi.getAnalyticsCounters().catch((e) => {
        console.warn('[Insights] Counters fetch failed', e);
        return { ok: false };
      });

      if ((countersRes as any).ok) {
        const data = (countersRes as any).data;
        // Handle both Array (list of statuses) and Object (summary) formats
        if (Array.isArray(data)) {
          const blockedObj = data.find((i: any) => i.status === 'blocked');
          const allowedObj = data.find(
            (i: any) => i.status === 'allowed' || i.status === 'default',
          );
          counters = {
            blocked: Number(blockedObj?.queries) || 0,
            allowed: Number(allowedObj?.queries) || 0,
          };
        } else if (data && typeof data === 'object') {
          counters = {
            blocked: Number(data.blocked || data.blockedQueries) || 0,
            allowed: Number(data.allowed || data.allowedQueries) || 0,
          };
        }
      }
    } catch (e) {}
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

  const isOffline = !navigator.onLine;

  return {
    isConfigured,
    isOffline,
    isSyncModeFull: isConfigured,
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
