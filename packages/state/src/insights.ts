/**
 * @stopaccess/state — Insights Persistence (State Wrapper)
 */

import { getInsights } from '@stopaccess/core/insights';
import { DailySnapshot, StorageAdapter } from '@stopaccess/types';

export async function fetchInsights(
  storage: StorageAdapter,
): Promise<DailySnapshot[]> {
  return getInsights(storage);
}

export async function getSnapshots(
  storage: StorageAdapter,
): Promise<DailySnapshot[]> {
  return getInsights(storage);
}
