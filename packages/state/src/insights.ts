/**
 * @focusgate/state — Insights Persistence (State Wrapper)
 */

import { getInsights } from '@focusgate/core/insights';
import { DailySnapshot } from '@focusgate/types';

export async function fetchInsights(storage: any): Promise<DailySnapshot[]> {
  return getInsights(storage);
}

export async function getSnapshots(storage: any): Promise<DailySnapshot[]> {
  return getInsights(storage);
}
