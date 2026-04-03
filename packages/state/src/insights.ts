/**
 * @focusgate/state — Insights Persistence (State Wrapper)
 */

import { getInsights } from '@focusgate/core/insights';
import { DailySnapshot, StorageAdapter } from '@focusgate/types';

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
