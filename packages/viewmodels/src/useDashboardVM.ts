declare var chrome: any;
import { loadAppsData } from './useAppsVM';
import {
  extensionAdapter as storage,
  STORAGE_KEYS,
  nextDNSApi,
} from '../../../extension/src/background/platformAdapter';

export async function loadDashboardData() {
  let rules: any[] = [];
  try {
    rules = (await loadAppsData()).rules;
  } catch {}

  const usageRes = (await chrome.storage.local.get([
    'usage',
    'fg_logs',
  ])) as any;
  const usage = usageRes.usage || {};
  const fgLogs = ((usageRes.fg_logs || []) as any[]).slice(-3).reverse();

  const allTotalMs = Object.values(usage as any).reduce(
    (a: number, b: any) => a + (b.time || 0),
    0,
  );
  const domainList = Object.entries(usage as any)
    .map(([domain, d]: [string, any]) => ({
      domain,
      timeMs: d.time || 0,
      sessions: d.sessions || 0,
    }))
    .filter((d) => d.timeMs > 0)
    .sort((a, b) => b.timeMs - a.timeMs)
    .slice(0, 5);

  const syncStatus = await storage.getString('nextdns_connection_status');
  const lastSync = await storage.getString('fg_last_sync_at');
  const isNew = rules.length === 0 && !syncStatus;

  const blockedCount = rules.filter(
    (r) => r.blockedToday || r.mode === 'block',
  ).length;
  const limitCount = rules.filter((r) => r.mode === 'limit').length;

  let cloudBlockedQueries = 0;
  if (syncStatus === 'connected') {
    try {
      const countersRes = await nextDNSApi.getAnalyticsCounters();
      if (countersRes && countersRes.ok) {
        // Handle variations in NextDNS API response keys
        const rawData = (countersRes as any).data || {};
        cloudBlockedQueries = rawData.blocked ?? rawData.blockedQueries ?? 0;
      }
    } catch (e) {
      console.warn('Real-time sync failed. Using local state.', e);
    }
  }

  const { getInsights } = await import('@stopaccess/core');
  const insights = await getInsights(storage);
  const avgFocusMins =
    insights.length > 0
      ? Math.round(
          insights.reduce((a, b) => a + (b.totalMinutes || 0), 0) /
            insights.length,
        )
      : 0;

  const focusEnd = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);

  return {
    rules,
    fgLogs,
    allTotalMs,
    domainList,
    syncStatus,
    lastSync,
    isNew,
    blockedCount,
    limitCount,
    cloudBlockedQueries,
    avgFocusMins,
    focusEnd,
  };
}
