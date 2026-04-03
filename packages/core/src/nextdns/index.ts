/**
 * @focusgate/core — NextDNS Infrastructure
 */

import {
  NextDNSConfig,
  NextDNSService,
  NextDNSCategory,
  AppRule,
} from '@focusgate/types';

import { NextDNSClient } from './client';
import { getServices, addServiceItem, removeServiceItem } from './services';
import {
  getCategories,
  addCategoryItem,
  removeCategoryItem,
} from './categories';
import { addDenylistItem, removeDenylistItem } from './denylist';
import {
  getAnalyticsDomains,
  getLogs as fetchLogs,
  getAnalyticsCounters as fetchAnalyticsCounters,
} from './analytics';
import { getRemoteSnapshot as fetchRemoteSnapshot } from './snapshot';

export * from './client';
export * from './security';
export * from './privacy';
export * from './denylist';
export * from './services';
export * from './categories';
export * from './analytics';
export * from './snapshot';
export * from './constants';

type LogLevel = 'info' | 'warn' | 'error';
type Logger = (level: LogLevel, message: string, detail?: string) => void;

// Helper to create client
export function createClient(
  cfg: NextDNSConfig,
  logger?: Logger,
): NextDNSClient {
  return new NextDNSClient(cfg, logger);
}

// Legacy Aliases for Platform Adapter migration
export function getParentalControlServices(
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  return getServices(createClient(cfg, logger));
}

export function getParentalControlCategories(
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  return getCategories(createClient(cfg, logger));
}

export async function syncParentalControlServices(
  services: NextDNSService[],
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  const client = createClient(cfg, logger);
  for (const s of services) {
    if (s.active) {
      await addServiceItem(client, s.id);
    } else {
      await removeServiceItem(client, s.id);
    }
  }
  return { ok: true };
}

export async function syncParentalControlCategories(
  categories: NextDNSCategory[],
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  const client = createClient(cfg, logger);
  for (const c of categories) {
    if (c.active) {
      await addCategoryItem(client, c.id);
    } else {
      await removeCategoryItem(client, c.id);
    }
  }
  return { ok: true };
}

export function setParentalControlServiceState(
  id: string,
  active: boolean,
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  const client = createClient(cfg, logger);
  return active ? addServiceItem(client, id) : removeServiceItem(client, id);
}

export function setParentalControlCategoryState(
  id: string,
  active: boolean,
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  const client = createClient(cfg, logger);
  return active ? addCategoryItem(client, id) : removeCategoryItem(client, id);
}

export function setDenylistDomainState(
  id: string,
  active: boolean,
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  const client = createClient(cfg, logger);
  return active ? addDenylistItem(client, id) : removeDenylistItem(client, id);
}

export function getLogs(
  cfg: NextDNSConfig,
  logger?: Logger,
  status?: string,
  limit?: number,
) {
  return fetchLogs(createClient(cfg, logger), limit || 50, status || 'blocked');
}

export function getTopBlockedDomains(
  cfg: NextDNSConfig,
  logger?: Logger,
  limit?: number,
) {
  return getAnalyticsDomains(createClient(cfg, logger), limit || 50, 'blocked');
}

export function getAnalyticsCounters(cfg: NextDNSConfig, logger?: Logger) {
  return fetchAnalyticsCounters(createClient(cfg, logger));
}

export async function getRemoteSnapshot(cfg: NextDNSConfig, logger?: Logger) {
  return fetchRemoteSnapshot(createClient(cfg, logger));
}

export async function testConnection(cfg: NextDNSConfig, logger?: Logger) {
  const res = await getServices(createClient(cfg, logger));
  return res.ok;
}

export async function blockApps(
  rules: AppRule[],
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  return createClient(cfg, logger).blockApps(rules);
}

export async function unblockAll(cfg: NextDNSConfig, logger?: Logger) {
  const client = createClient(cfg, logger);
  const snapshot = await fetchRemoteSnapshot(client);
  if (!snapshot.ok) {
    return snapshot;
  }

  const { services, categories, denylist } = snapshot.data;
  for (const s of services) {
    if (s.active) {
      await removeServiceItem(client, s.id);
    }
  }
  for (const c of categories) {
    if (c.active) {
      await removeCategoryItem(client, c.id);
    }
  }
  for (const d of denylist) {
    await removeDenylistItem(client, d.id);
  }

  return { ok: true };
}

export async function setTargetState(
  kind: 'service' | 'category' | 'domain',
  id: string,
  active: boolean,
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  const client = createClient(cfg, logger);
  if (kind === 'service') {
    return active ? addServiceItem(client, id) : removeServiceItem(client, id);
  }
  if (kind === 'category') {
    return active
      ? addCategoryItem(client, id)
      : removeCategoryItem(client, id);
  }
  return active ? addDenylistItem(client, id) : removeDenylistItem(client, id);
}

export async function setResolvedTargetState(
  target: any,
  active: boolean,
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  return setTargetState(target.kind, target.normalizedId, active, cfg, logger);
}

export async function resolveAndSetTargetState(
  input: string,
  active: boolean,
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  const target = await resolveNextDNSTarget(input);
  return setResolvedTargetState(target, active, cfg, logger);
}

export async function resolveNextDNSTarget(input: string): Promise<any> {
  const norm = input.toLowerCase().trim();
  if (NEXT_DNS_CATEGORY_MAP[norm]) {
    return {
      kind: 'category',
      normalizedId: NEXT_DNS_CATEGORY_MAP[norm],
      label: norm,
    };
  }
  if (NEXT_DNS_SERVICE_MAP[norm]) {
    return {
      kind: 'service',
      normalizedId: NEXT_DNS_SERVICE_MAP[norm],
      label: norm,
    };
  }
  return { kind: 'domain', normalizedId: norm, label: norm };
}

const NEXT_DNS_CATEGORY_MAP: any = {
  social: 'social-networks',
  games: 'games',
  video: 'video-streaming',
};
const NEXT_DNS_SERVICE_MAP: any = {
  fb: 'facebook',
  ig: 'instagram',
  yt: 'youtube',
};
