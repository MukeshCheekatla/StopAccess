/**
 * @focusgate/core — NextDNS API Client
 */

import { AppRule, NextDNSConfig } from '@focusgate/types';
import { getDomainForRule, getNextDNSServiceId } from './domains.ts';

const BASE_URL = 'https://api.nextdns.io';
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}

async function readJsonIfPresent(res: Response): Promise<any | null> {
  const text = await res.text();
  if (!text || !text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchWithRetry(
  url: string,
  options: any,
  log: (level: string, msg: string, details?: string) => void,
  attempt = 1,
): Promise<Response> {
  const res = await fetch(url, options);

  if (res.status === 429 && attempt <= MAX_RETRIES) {
    const waitMs = RETRY_BASE_MS * 2 ** (attempt - 1);
    log(
      'warn',
      `NextDNS rate limited (attempt ${attempt}/${MAX_RETRIES})`,
      `Retrying in ${waitMs}ms`,
    );
    await sleep(waitMs);
    return fetchWithRetry(url, options, log, attempt + 1);
  }

  if (res.status >= 500 && attempt <= MAX_RETRIES) {
    const waitMs = RETRY_BASE_MS * 2 ** (attempt - 1);
    log(
      'warn',
      `NextDNS server error ${res.status} (attempt ${attempt}/${MAX_RETRIES})`,
      `Retrying in ${waitMs}ms`,
    );
    await sleep(waitMs);
    return fetchWithRetry(url, options, log, attempt + 1);
  }

  return res;
}

export async function testConnection(
  cfg: NextDNSConfig,
  _log: any,
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/profiles/${cfg.profileId}/denylist`, {
      headers: { 'X-Api-Key': cfg.apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function blockApps(
  rulesToBlock: AppRule[],
  cfg: NextDNSConfig,
  log: any,
): Promise<{ ok: boolean; error?: string; domains?: string[] }> {
  // 1. Domains (denylist)
  const appDomains = rulesToBlock
    .filter((r) => r.type === 'domain' || !getNextDNSServiceId(r))
    .map(getDomainForRule)
    .filter((d): d is string => d !== null);
  const uniqueAppDomains = Array.from(new Set(appDomains));

  // 2. Services (parentalControl/services)
  const servicesToBlock = rulesToBlock
    .filter((r) => r.type === 'service')
    .map((r) => r.packageName)
    .filter((id): id is string => id !== null);

  // 3. Categories (parentalControl/categories)
  const categoriesToBlock = rulesToBlock
    .filter((r) => r.type === 'category')
    .map((r) => r.packageName)
    .filter((id): id is string => id !== null);

  try {
    const [getDenyRes, getSvcRes, getCatRes] = await Promise.all([
      fetchWithRetry(
        `${BASE_URL}/profiles/${cfg.profileId}/denylist`,
        { headers: { 'X-Api-Key': cfg.apiKey } },
        log,
      ),
      fetchWithRetry(
        `${BASE_URL}/profiles/${cfg.profileId}/parentalControl/services`,
        { headers: { 'X-Api-Key': cfg.apiKey } },
        log,
      ),
      fetchWithRetry(
        `${BASE_URL}/profiles/${cfg.profileId}/parentalControl/categories`,
        { headers: { 'X-Api-Key': cfg.apiKey } },
        log,
      ),
    ]);

    if (getDenyRes.status === 403 || getSvcRes.status === 403) {
      return { ok: false, error: '403' };
    }

    let existingDenyIds: string[] = [];
    if (getDenyRes.ok) {
      const data = await readJsonIfPresent(getDenyRes);
      existingDenyIds = (Array.isArray(data) ? data : data?.data || [])
        .map((i: any) => i.id)
        .filter(Boolean);
    }

    let existingSvcIds: string[] = [];
    if (getSvcRes.ok) {
      const data = await readJsonIfPresent(getSvcRes);
      existingSvcIds = (Array.isArray(data) ? data : data?.data || [])
        .filter((s: any) => s.active)
        .map((s: any) => s.id)
        .filter(Boolean);
    }

    let existingCatIds: string[] = [];
    if (getCatRes.ok) {
      const data = await readJsonIfPresent(getCatRes);
      existingCatIds = (Array.isArray(data) ? data : data?.data || [])
        .filter((c: any) => c.active)
        .map((c: any) => c.id)
        .filter(Boolean);
    }

    const finalDenyList = Array.from(
      new Set([...existingDenyIds, ...uniqueAppDomains]),
    ).map((id) => ({ id, active: true }));
    const finalSvcList = Array.from(
      new Set([...existingSvcIds, ...servicesToBlock]),
    ).map((id) => ({ id, active: true }));
    const finalCatList = Array.from(
      new Set([...existingCatIds, ...categoriesToBlock]),
    ).map((id) => ({ id, active: true }));

    const [resDeny, resSvc, resCat] = await Promise.all([
      fetchWithRetry(
        `${BASE_URL}/profiles/${cfg.profileId}/denylist`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': cfg.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalDenyList),
        },
        log,
      ),
      fetchWithRetry(
        `${BASE_URL}/profiles/${cfg.profileId}/parentalControl/services`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': cfg.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalSvcList),
        },
        log,
      ),
      fetchWithRetry(
        `${BASE_URL}/profiles/${cfg.profileId}/parentalControl/categories`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': cfg.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(finalCatList),
        },
        log,
      ),
    ]);

    if (resDeny.ok && resSvc.ok && resCat.ok) {
      return { ok: true, domains: uniqueAppDomains };
    }
    return { ok: false, error: 'Sync Failed' };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function unblockAll(
  cfg: NextDNSConfig,
  log: any,
): Promise<boolean> {
  try {
    const [denyRes, svcRes, catRes] = await Promise.all([
      fetchWithRetry(
        `${BASE_URL}/profiles/${cfg.profileId}/denylist`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': cfg.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([]),
        },
        log,
      ),
      fetchWithRetry(
        `${BASE_URL}/profiles/${cfg.profileId}/parentalControl/services`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': cfg.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([]),
        },
        log,
      ),
      fetchWithRetry(
        `${BASE_URL}/profiles/${cfg.profileId}/parentalControl/categories`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': cfg.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([]),
        },
        log,
      ),
    ]);
    return denyRes.ok && svcRes.ok && catRes.ok;
  } catch {
    return false;
  }
}

export async function getParentalControlServices(
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  try {
    const res = await fetchWithRetry(
      `${BASE_URL}/profiles/${cfg.profileId}/parentalControl/services`,
      {
        headers: { 'X-Api-Key': cfg.apiKey },
      },
      log,
    );
    if (res.ok) {
      const json = await readJsonIfPresent(res);
      return json?.data || json || [];
    }
  } catch {}
  return [];
}

export async function getParentalControlCategories(
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  try {
    const res = await fetchWithRetry(
      `${BASE_URL}/profiles/${cfg.profileId}/parentalControl/categories`,
      {
        headers: { 'X-Api-Key': cfg.apiKey },
      },
      log,
    );
    if (res.ok) {
      const json = await readJsonIfPresent(res);
      return json?.data || json || [];
    }
  } catch {}
  return [];
}

async function syncCollection(
  cfg: NextDNSConfig,
  log: any,
  path: string,
  items: Array<{ id: string; active?: boolean }>,
): Promise<any[]> {
  const normalizedItems = items
    .filter((item) => item.id)
    .map((item) => ({
      id: item.id,
      active: item.active ?? true,
    }));

  const res = await fetchWithRetry(
    `${BASE_URL}/profiles/${cfg.profileId}/${path}`,
    {
      method: 'PUT',
      headers: {
        'X-Api-Key': cfg.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedItems),
    },
    log,
  );

  if (!res.ok) {
    throw new Error(`${path} sync failed with ${res.status}`);
  }

  const json = await readJsonIfPresent(res);
  return json?.data || json || normalizedItems;
}

export async function syncParentalControlServices(
  services: Array<{ id: string; active?: boolean }>,
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  return syncCollection(
    cfg,
    log,
    'parentalControl/services',
    services.map((service) => ({
      id: service.id,
      active: service.active ?? true,
    })),
  );
}

export async function syncParentalControlCategories(
  categories: Array<{ id: string; active?: boolean }>,
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  return syncCollection(
    cfg,
    log,
    'parentalControl/categories',
    categories.map((category) => ({
      id: category.id,
      active: category.active ?? true,
    })),
  );
}

export async function syncDenylist(
  domains: Array<{ id: string; active?: boolean }>,
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  return syncCollection(
    cfg,
    log,
    'denylist',
    domains.map((domain) => ({
      id: domain.id.toLowerCase(),
      active: domain.active ?? true,
    })),
  );
}

async function toggleCollectionItem(
  cfg: NextDNSConfig,
  log: any,
  getter: (cfg: NextDNSConfig, log: any) => Promise<any[]>,
  syncer: (
    items: Array<{ id: string; active?: boolean }>,
    cfg: NextDNSConfig,
    log: any,
  ) => Promise<any[]>,
  id: string,
  active: boolean,
): Promise<any[]> {
  const current = await getter(cfg, log);
  const byId = new Map<string, { id: string; active: boolean; name?: string }>(
    current
      .filter((item) => item?.id)
      .map((item) => [
        item.id,
        {
          id: item.id,
          active: item.active ?? false,
          name: item.name,
        },
      ]),
  );

  byId.set(id, {
    ...(byId.get(id) || { id }),
    id,
    active,
  });

  return syncer(Array.from(byId.values()), cfg, log);
}

export async function setParentalControlServiceState(
  serviceId: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  return toggleCollectionItem(
    cfg,
    log,
    getParentalControlServices,
    syncParentalControlServices,
    serviceId,
    active,
  );
}

export async function setParentalControlCategoryState(
  categoryId: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  return toggleCollectionItem(
    cfg,
    log,
    getParentalControlCategories,
    syncParentalControlCategories,
    categoryId,
    active,
  );
}

export async function setDenylistDomainState(
  domain: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  const current = await fetchWithRetry(
    `${BASE_URL}/profiles/${cfg.profileId}/denylist`,
    { headers: { 'X-Api-Key': cfg.apiKey } },
    log,
  );

  if (!current.ok) {
    throw new Error(`denylist fetch failed with ${current.status}`);
  }

  const json = await readJsonIfPresent(current);
  const items = (json?.data || json || []).filter((item: any) => item?.id);
  const byId = new Map<string, { id: string; active: boolean }>(
    items.map((item: any) => [
      item.id,
      {
        id: item.id,
        active: item.active ?? true,
      },
    ]),
  );
  byId.set(domain.toLowerCase(), { id: domain.toLowerCase(), active });

  return syncDenylist(Array.from(byId.values()), cfg, log);
}

export async function getLogs(
  cfg: NextDNSConfig,
  log: any,
  status?: string,
  limit: number = 20,
): Promise<any[]> {
  try {
    const url = new URL(`${BASE_URL}/profiles/${cfg.profileId}/logs`);
    url.searchParams.append('limit', limit.toString());
    if (status) {
      url.searchParams.append('status', status);
    }

    const res = await fetchWithRetry(
      url.toString(),
      { headers: { 'X-Api-Key': cfg.apiKey } },
      log,
    );
    if (res.ok) {
      const json = await readJsonIfPresent(res);
      return json?.data || [];
    }
  } catch {}
  return [];
}

export async function getTopBlockedDomains(
  cfg: NextDNSConfig,
  log: any,
  limit: number = 10,
): Promise<any[]> {
  try {
    const url = new URL(
      `${BASE_URL}/profiles/${cfg.profileId}/analytics/domains`,
    );
    url.searchParams.append('status', 'blocked');
    url.searchParams.append('limit', limit.toString());

    const res = await fetchWithRetry(
      url.toString(),
      { headers: { 'X-Api-Key': cfg.apiKey } },
      log,
    );
    if (res.ok) {
      const json = await readJsonIfPresent(res);
      return json?.data || [];
    }
  } catch {}
  return [];
}
