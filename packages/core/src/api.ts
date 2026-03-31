/**
 * @focusgate/core — NextDNS API Client
 */

import {
  AppRule,
  NextDNSConfig,
  NextDNSResponse,
  NextDNSErrorCode,
  NextDNSService,
  NextDNSCategory,
  NextDNSEntity,
  NextDNSLogEntry,
  NextDNSAnalyticsItem,
  ResolvedTarget,
  TargetKind,
  TargetMutationResult,
} from '@focusgate/types';
import {
  getDomainForRule,
  getNextDNSServiceId,
  resolveTargetInput,
} from './domains.ts';

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

function mapStatusToErrorCode(status: number): NextDNSErrorCode {
  if (status === 401 || status === 403) {
    return 'auth_error';
  }
  if (status === 429) {
    return 'rate_limit';
  }
  if (status === 400) {
    return 'validation_error';
  }
  if (status === 404) {
    return 'profile_mismatch';
  }
  if (status >= 500) {
    return 'server_error';
  }
  return 'unknown';
}

async function wrapResponse<T>(
  res: Response,
  transform?: (data: any) => T,
): Promise<NextDNSResponse<T>> {
  if (res.ok) {
    const json = await readJsonIfPresent(res);
    const data = json?.data ?? json;
    return {
      ok: true,
      data: transform ? transform(data) : (data as T),
    };
  }

  const errorData = await readJsonIfPresent(res);
  const code = mapStatusToErrorCode(res.status);

  // NextDNS typically returns { "errors": [{ "detail": "...", "code": "..." }] }
  const message =
    errorData?.errors?.[0]?.detail ||
    errorData?.error ||
    errorData?.message ||
    res.statusText;

  return {
    ok: false,
    error: {
      code,
      message,
      status: res.status,
      details: errorData,
    },
  };
}

export class NextDNSClient {
  constructor(
    private cfg: NextDNSConfig,
    private log: (level: string, msg: string, details?: string) => void,
  ) { }

  private async fetch(
    path: string,
    options: RequestInit = {},
    attempt = 1,
  ): Promise<Response> {
    const url = `${BASE_URL}${path}`;
    const headers = {
      'X-Api-Key': this.cfg.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const res = await fetch(url, { ...options, headers });

      if (res.status === 429 && attempt <= MAX_RETRIES) {
        const waitMs = RETRY_BASE_MS * 2 ** (attempt - 1);
        this.log(
          'warn',
          `NextDNS rate limited (attempt ${attempt}/${MAX_RETRIES})`,
          `Retrying in ${waitMs}ms`,
        );
        await sleep(waitMs);
        return this.fetch(path, options, attempt + 1);
      }

      if (res.status >= 500 && attempt <= MAX_RETRIES) {
        const waitMs = RETRY_BASE_MS * 2 ** (attempt - 1);
        this.log(
          'warn',
          `NextDNS server error ${res.status} (attempt ${attempt}/${MAX_RETRIES})`,
          `Retrying in ${waitMs}ms`,
        );
        await sleep(waitMs);
        return this.fetch(path, options, attempt + 1);
      }

      return res;
    } catch (e: any) {
      if (attempt <= MAX_RETRIES) {
        const waitMs = RETRY_BASE_MS * 2 ** (attempt - 1);
        this.log(
          'warn',
          `NextDNS network error (attempt ${attempt}/${MAX_RETRIES})`,
          e.message,
        );
        await sleep(waitMs);
        return this.fetch(path, options, attempt + 1);
      }
      throw e;
    }
  }

  async testConnection(): Promise<NextDNSResponse<boolean>> {
    try {
      const res = await this.fetch(`/profiles/${this.cfg.profileId}/denylist`);
      return wrapResponse(res, () => true);
    } catch (e: any) {
      return {
        ok: false,
        error: { code: 'network_failure', message: e.message },
      };
    }
  }

  async getDenylist(): Promise<NextDNSResponse<NextDNSEntity[]>> {
    const res = await this.fetch(`/profiles/${this.cfg.profileId}/denylist`);
    return wrapResponse(res);
  }

  async setDenylist(
    items: NextDNSEntity[],
  ): Promise<NextDNSResponse<NextDNSEntity[]>> {
    const res = await this.fetch(`/profiles/${this.cfg.profileId}/denylist`, {
      method: 'PUT',
      body: JSON.stringify(items),
    });
    return wrapResponse(res);
  }

  async getServices(): Promise<NextDNSResponse<NextDNSService[]>> {
    const res = await this.fetch(
      `/profiles/${this.cfg.profileId}/parentalControl/services`,
    );
    return wrapResponse(res);
  }

  async setServices(
    items: NextDNSService[],
  ): Promise<NextDNSResponse<NextDNSService[]>> {
    const res = await this.fetch(
      `/profiles/${this.cfg.profileId}/parentalControl/services`,
      {
        method: 'PUT',
        body: JSON.stringify(items),
      },
    );
    return wrapResponse(res);
  }

  async getCategories(): Promise<NextDNSResponse<NextDNSCategory[]>> {
    const res = await this.fetch(
      `/profiles/${this.cfg.profileId}/parentalControl/categories`,
    );
    return wrapResponse(res);
  }

  async setCategories(
    items: NextDNSCategory[],
  ): Promise<NextDNSResponse<NextDNSCategory[]>> {
    const res = await this.fetch(
      `/profiles/${this.cfg.profileId}/parentalControl/categories`,
      {
        method: 'PUT',
        body: JSON.stringify(items),
      },
    );
    return wrapResponse(res);
  }

  async getRemoteSnapshot(): Promise<
    NextDNSResponse<{
      services: NextDNSService[];
      categories: NextDNSCategory[];
      denylist: NextDNSEntity[];
    }>
  > {
    const [services, categories, denylist] = await Promise.all([
      this.getServices(),
      this.getCategories(),
      this.getDenylist(),
    ]);

    if (!services.ok) {
      return services;
    }
    if (!categories.ok) {
      return categories;
    }
    if (!denylist.ok) {
      return denylist;
    }

    return {
      ok: true,
      data: {
        services: services.data,
        categories: categories.data,
        denylist: denylist.data,
      },
    };
  }

  // --- Individual Resource Methods (Refined Enforcement) ---

  async addDenylistItem(id: string): Promise<NextDNSResponse<boolean>> {
    const res = await this.fetch(`/profiles/${this.cfg.profileId}/denylist`, {
      method: 'POST',
      body: JSON.stringify({ id, active: true }),
    });
    return wrapResponse(res, () => true);
  }

  async removeDenylistItem(id: string): Promise<NextDNSResponse<boolean>> {
    const res = await this.fetch(
      `/profiles/${this.cfg.profileId}/denylist/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    );
    return wrapResponse(res, () => true);
  }

  async addServiceItem(id: string): Promise<NextDNSResponse<boolean>> {
    const res = await this.fetch(
      `/profiles/${this.cfg.profileId}/parentalControl/services`,
      {
        method: 'POST',
        body: JSON.stringify({ id, active: true }),
      },
    );
    return wrapResponse(res, () => true);
  }

  async removeServiceItem(id: string): Promise<NextDNSResponse<boolean>> {
    const res = await this.fetch(
      `/profiles/${this.cfg.profileId
      }/parentalControl/services/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    );
    return wrapResponse(res, () => true);
  }

  async addCategoryItem(id: string): Promise<NextDNSResponse<boolean>> {
    const res = await this.fetch(
      `/profiles/${this.cfg.profileId}/parentalControl/categories`,
      {
        method: 'POST',
        body: JSON.stringify({ id, active: true }),
      },
    );
    return wrapResponse(res, () => true);
  }

  async removeCategoryItem(id: string): Promise<NextDNSResponse<boolean>> {
    const res = await this.fetch(
      `/profiles/${this.cfg.profileId
      }/parentalControl/categories/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    );
    return wrapResponse(res, () => true);
  }

  async getLogs(
    limit = 20,
    status?: string,
  ): Promise<NextDNSResponse<NextDNSLogEntry[]>> {
    let path = `/profiles/${this.cfg.profileId}/logs?limit=${limit}`;
    if (status) {
      path += `&status=${status}`;
    }
    const res = await this.fetch(path);
    return wrapResponse(res);
  }

  async getAnalyticsDomains(
    limit = 10,
    status = 'blocked',
  ): Promise<NextDNSResponse<NextDNSAnalyticsItem[]>> {
    const path = `/profiles/${this.cfg.profileId}/analytics/domains?limit=${limit}&status=${status}`;
    const res = await this.fetch(path);
    return wrapResponse(res);
  }
  async getAnalyticsCounters(): Promise<
    NextDNSResponse<{ blocked: number; allowed: number }>
  > {
    const path = `/profiles/${this.cfg.profileId}/analytics/status`;
    const res = await this.fetch(path);
    return wrapResponse(res);
  }
  async blockApps(
    rulesToBlock: AppRule[],
  ): Promise<{ ok: boolean; error?: string; domains?: string[] }> {
    // 1. Domains (explicit denylist rules)
    const domainItems = rulesToBlock
      .filter((r) => r.type === 'domain')
      .map(getDomainForRule)
      .filter((d): d is string => d !== null);
    const uniqueAppDomains = Array.from(new Set(domainItems));

    // 2. Services (known apps based on service ID)
    const servicesToBlock = rulesToBlock
      .filter((r) => r.type === 'service')
      .map((r) => getNextDNSServiceId(r))
      .filter((id): id is string => id !== null);

    // 3. Categories (parentalControl/categories)
    const categoriesToBlock = rulesToBlock
      .filter((r) => r.type === 'category')
      .map((r) => r.packageName)
      .filter((id): id is string => id !== null);

    try {
      const [denyRes, svcRes, catRes] = await Promise.all([
        this.getDenylist(),
        this.getServices(),
        this.getCategories(),
      ]);

      if (!denyRes.ok) {
        return { ok: false, error: denyRes.error.message };
      }
      if (!svcRes.ok) {
        return { ok: false, error: svcRes.error.message };
      }
      if (!catRes.ok) {
        return { ok: false, error: catRes.error.message };
      }

      const finalDenyList = Array.from(
        new Set([...denyRes.data.map((i) => i.id), ...uniqueAppDomains]),
      ).map((id) => ({ id, active: true }));

      const finalSvcList = Array.from(
        new Set([
          ...svcRes.data.filter((s) => s.active).map((s) => s.id),
          ...servicesToBlock,
        ]),
      ).map((id) => ({ id, active: true }));

      const finalCatList = Array.from(
        new Set([
          ...catRes.data.filter((c) => c.active).map((c) => c.id),
          ...categoriesToBlock,
        ]),
      ).map((id) => ({ id, active: true }));

      const [resDeny, resSvc, resCat] = await Promise.all([
        this.setDenylist(finalDenyList),
        this.setServices(finalSvcList),
        this.setCategories(finalCatList),
      ]);

      if (resDeny.ok && resSvc.ok && resCat.ok) {
        return { ok: true, domains: uniqueAppDomains };
      }
      return { ok: false, error: 'Sync Failed' };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async unblockAll(): Promise<boolean> {
    try {
      const [resDeny, resSvc, resCat] = await Promise.all([
        this.setDenylist([]),
        this.setServices([]),
        this.setCategories([]),
      ]);
      return resDeny.ok && resSvc.ok && resCat.ok;
    } catch {
      return false;
    }
  }
}

// Legacy compatibility exports (can be refactored later if needed, but keeping interface for now)
export async function testConnection(
  cfg: NextDNSConfig,
  log: any,
): Promise<boolean> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.testConnection();
  return res.ok;
}

export async function blockApps(
  rulesToBlock: AppRule[],
  cfg: NextDNSConfig,
  log: any,
): Promise<{ ok: boolean; error?: string; domains?: string[] }> {
  const client = new NextDNSClient(cfg, log);
  return client.blockApps(rulesToBlock);
}

export async function unblockAll(
  cfg: NextDNSConfig,
  log: any,
): Promise<boolean> {
  const client = new NextDNSClient(cfg, log);
  return client.unblockAll();
}

export async function getParentalControlServices(
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.getServices();
  return res.ok ? res.data : [];
}

export async function getParentalControlCategories(
  cfg: NextDNSConfig,
  log: any,
): Promise<any[]> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.getCategories();
  return res.ok ? res.data : [];
}

export async function getLogs(
  cfg: NextDNSConfig,
  log: any,
  status?: string,
  limit = 20,
): Promise<any[]> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.getLogs(limit, status);
  return res.ok ? res.data : [];
}

export async function getTopBlockedDomains(
  cfg: NextDNSConfig,
  log: any,
  limit = 10,
): Promise<any[]> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.getAnalyticsDomains(limit, 'blocked');
  return res.ok ? res.data : [];
}

export async function getAnalyticsCounters(
  cfg: NextDNSConfig,
  log: any,
): Promise<any | null> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.getAnalyticsCounters();
  return res.ok ? res.data : null;
}

export async function getRemoteSnapshot(
  cfg: NextDNSConfig,
  log: any,
): Promise<{
  services: NextDNSService[];
  categories: NextDNSCategory[];
  denylist: NextDNSEntity[];
}> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.getRemoteSnapshot();
  return res.ok ? res.data : { services: [], categories: [], denylist: [] };
}

export async function syncParentalControlServices(
  services: NextDNSService[],
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSService[]> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.setServices(services);
  return res.ok ? res.data : [];
}

export async function syncParentalControlCategories(
  categories: NextDNSCategory[],
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSCategory[]> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.setCategories(categories);
  return res.ok ? res.data : [];
}

export async function syncDenylist(
  items: NextDNSEntity[],
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSEntity[]> {
  const client = new NextDNSClient(cfg, log);
  const res = await client.setDenylist(items);
  return res.ok ? res.data : [];
}

export async function ensureServiceState(
  serviceId: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<TargetMutationResult> {
  const res = await setParentalControlServiceState(serviceId, active, cfg, log);
  return {
    ok: res.ok,
    kind: 'service',
    id: serviceId,
    error: res.ok ? undefined : res.error.message,
  };
}

export async function ensureCategoryState(
  categoryId: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<TargetMutationResult> {
  const res = await setParentalControlCategoryState(
    categoryId,
    active,
    cfg,
    log,
  );
  return {
    ok: res.ok,
    kind: 'category',
    id: categoryId,
    error: res.ok ? undefined : res.error.message,
  };
}

export async function ensureDomainState(
  domain: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<TargetMutationResult> {
  const res = await setDenylistDomainState(domain, active, cfg, log);
  return {
    ok: res.ok,
    kind: 'domain',
    id: domain,
    error: res.ok ? undefined : res.error.message,
  };
}

export async function setResolvedTargetState(
  target: ResolvedTarget,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<TargetMutationResult> {
  if (target.kind === 'service') {
    return ensureServiceState(target.normalizedId, active, cfg, log);
  }
  if (target.kind === 'category') {
    return ensureCategoryState(target.normalizedId, active, cfg, log);
  }
  return ensureDomainState(target.normalizedId, active, cfg, log);
}

export async function setTargetState(
  kind: TargetKind,
  id: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<TargetMutationResult> {
  if (kind === 'service') {
    return ensureServiceState(id, active, cfg, log);
  }
  if (kind === 'category') {
    return ensureCategoryState(id, active, cfg, log);
  }
  return ensureDomainState(id, active, cfg, log);
}

export async function resolveAndSetTargetState(
  input: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<ResolvedTarget & { mutation: TargetMutationResult }> {
  const target = resolveTargetInput(input);
  const mutation = await setResolvedTargetState(target, active, cfg, log);
  return { ...target, mutation };
}

export async function setParentalControlServiceState(
  serviceId: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSResponse<boolean>> {
  const client = new NextDNSClient(cfg, log);
  if (active) {
    return client.addServiceItem(serviceId);
  } else {
    return client.removeServiceItem(serviceId);
  }
}

export async function setParentalControlCategoryState(
  categoryId: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSResponse<boolean>> {
  const client = new NextDNSClient(cfg, log);
  if (active) {
    return client.addCategoryItem(categoryId);
  } else {
    return client.removeCategoryItem(categoryId);
  }
}

export async function setDenylistDomainState(
  domain: string,
  active: boolean,
  cfg: NextDNSConfig,
  log: any,
): Promise<NextDNSResponse<boolean>> {
  const client = new NextDNSClient(cfg, log);
  if (active) {
    return client.addDenylistItem(domain);
  } else {
    return client.removeDenylistItem(domain);
  }
}
