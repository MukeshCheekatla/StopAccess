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

  if (isConfigured) {
    try {
      const [logsRes, domainsRes] = await Promise.all([
        nextDNSApi.getLogs('blocked', 50),
        nextDNSApi.getTopBlockedDomains(20),
      ]);
      blockedLogs = (logsRes as any).ok ? (logsRes as any).data : [];
      topBlocked = (domainsRes as any).ok ? (domainsRes as any).data : [];
    } catch (e) {
      console.warn('NextDNS insights fetch failed', e);
    }
  }

  const maxMins = Math.max(
    1,
    ...(snapshots as any[]).map((s) => s.screenTimeMinutes || 0),
  );

  const avgFocusTime =
    snapshots.length > 0
      ? Math.round(
          snapshots.reduce((acc, s) => acc + (s.screenTimeMinutes || 0), 0) /
            snapshots.length,
        )
      : 0;

  const { usage = {} } = (await chrome.storage.local.get(['usage'])) as any;
  const allTotalMs = Object.values(usage).reduce(
    (a: number, b: any) => a + (b.time || 0),
    0,
  );

  const focusConsistency =
    snapshots.length > 0
      ? Math.round(
          (snapshots.filter((s: any) => (s.screenTimeMinutes || 0) > 0).length /
            snapshots.length) *
            100,
        )
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
  };
}
