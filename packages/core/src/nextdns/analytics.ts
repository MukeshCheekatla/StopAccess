import {
  NextDNSLogEntry,
  NextDNSAnalyticsItem,
  NextDNSResponse,
} from '@stopaccess/types';
import { wrapResponse } from './base';
import type { NextDNSClient } from './client';

export async function getLogs(
  client: NextDNSClient,
  limit = 20,
  status?: string,
): Promise<NextDNSResponse<NextDNSLogEntry[]>> {
  let path = `/profiles/${(client as any).cfg.profileId}/logs?limit=${limit}`;
  if (status) {
    path += `&status=${status}`;
  }
  const res = await (client as any).fetch(path);
  return wrapResponse(res);
}

export async function getAnalyticsDomains(
  client: NextDNSClient,
  limit = 10,
  status = 'blocked',
): Promise<NextDNSResponse<NextDNSAnalyticsItem[]>> {
  const path = `/profiles/${
    (client as any).cfg.profileId
  }/analytics/domains?limit=${limit}&status=${status}`;
  const res = await (client as any).fetch(path);
  return wrapResponse(res);
}

export async function getAnalyticsCounters(
  client: NextDNSClient,
): Promise<NextDNSResponse<{ blocked: number; allowed: number }>> {
  const path = `/profiles/${(client as any).cfg.profileId}/analytics/status`;
  const res = await (client as any).fetch(path);
  return wrapResponse(res);
}
