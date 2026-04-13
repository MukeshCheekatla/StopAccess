/**
 * @stopaccess/core — Focus Insights Engine
 */

import { DailySnapshot, StorageAdapter } from '@stopaccess/types';

export const INSIGHTS_KEY = 'insights_v2';

export async function recordDailySnapshot(
  storage: StorageAdapter,
  totalMinutes: number,
  blockedCount: number,
): Promise<void> {
  const date = new Date().toLocaleDateString('en-CA');
  const raw = await storage.getString(INSIGHTS_KEY);
  let insights: DailySnapshot[] = raw ? JSON.parse(raw) : [];

  const idx = insights.findIndex((d) => d.date === date);
  if (idx >= 0) {
    insights[idx].totalMinutes = totalMinutes;
    insights[idx].blockedCount = blockedCount;
    insights[idx].screenTimeMinutes = totalMinutes;
    insights[idx].blockedAppsCount = blockedCount;
  } else {
    insights.unshift({
      date,
      totalMinutes,
      blockedCount,
      screenTimeMinutes: totalMinutes,
      focusSessions: 0,
      blockedAppsCount: blockedCount,
      focusMinutes: 0,
    });
  }

  insights = insights.slice(0, 30);
  await storage.set(INSIGHTS_KEY, JSON.stringify(insights));
}

export async function getInsights(
  storage: StorageAdapter,
): Promise<DailySnapshot[]> {
  const raw = await storage.getString(INSIGHTS_KEY);
  if (!raw) {
    return [];
  }
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

/**
 * Platform Agnostic Snapshot Retriever
 */
export async function getRecentSnapshots(
  storage: StorageAdapter,
  limit = 7,
): Promise<DailySnapshot[]> {
  const insights = await getInsights(storage);
  return insights.slice(0, limit);
}

export async function getFocusStreak(storage: any): Promise<number> {
  const insights = await getInsights(storage);
  let streak = 0;
  for (const day of insights) {
    if ((day.totalMinutes || 0) > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function recordFocusSession(
  _storage: any,
  _minutes: number,
): Promise<void> {
  // Stub for future focus-specific tracking
}
