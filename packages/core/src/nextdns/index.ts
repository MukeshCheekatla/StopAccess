/**
 * @focusgate/core — NextDNS Infrastructure
 */

import {
  NextDNSConfig,
  NextDNSService,
  NextDNSCategory,
  AppRule,
  NextDNSRecreationTime,
} from '@focusgate/types';

import { NEXTDNS_SERVICES, NEXTDNS_CATEGORIES } from './constants';

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
import { getRecreationTime, syncRecreationTime } from './recreationTime';
import { getParentalControl, patchParentalControl } from './parentalControl';

export * from './client';
export * from './security';
export * from './privacy';
export * from './denylist';
export * from './services';
export * from './categories';
export * from './analytics';
export * from './snapshot';
export * from './constants';
export * from './recreationTime';
export * from './parentalControl';

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

  // Try matching Categories first
  const category = NEXTDNS_CATEGORIES.find(
    (c) => c.id === norm || c.name.toLowerCase() === norm,
  );
  if (category) {
    return {
      kind: 'category',
      normalizedId: category.id,
      label: category.name,
    };
  }

  // Try matching Services next
  const service = NEXTDNS_SERVICES.find(
    (s) => s.id === norm || s.name.toLowerCase() === norm,
  );
  if (service) {
    return {
      kind: 'service',
      normalizedId: service.id,
      label: service.name,
    };
  }

  // Fallback to domain
  return { kind: 'domain', normalizedId: norm, label: norm };
}

export function getQuietHoursSync(cfg: NextDNSConfig, logger?: Logger) {
  return getRecreationTime(createClient(cfg, logger));
}

export function updateQuietHoursSync(
  recreationTime: NextDNSRecreationTime,
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  return syncRecreationTime(createClient(cfg, logger), recreationTime);
}

export function getParentalControlSettings(
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  return getParentalControl(createClient(cfg, logger));
}

export function patchParentalControlSettings(
  patch: any,
  cfg: NextDNSConfig,
  logger?: Logger,
) {
  return patchParentalControl(createClient(cfg, logger), patch);
}
