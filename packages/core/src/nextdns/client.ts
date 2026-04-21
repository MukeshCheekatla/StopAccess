import {
  NextDNSConfig,
  NextDNSApiClient,
  NextDNSResponse,
  NextDNSService,
  NextDNSCategory,
  NextDNSEntity,
  AppRule,
  NextDNSSecuritySettings,
  NextDNSTld,
  NextDNSPrivacySettings,
  NextDNSBlocklist,
  NextDNSNativeTracking,
  NextDNSRecreationTime,
  NextDNSParentalControlSettings,
} from '@stopaccess/types';
import { sleep } from '../utils/retry';
import { getDomainForRule } from '../engine/domains';
import { sanitizeForHeader } from '../utils/text';
import { BASE_URL, MAX_RETRIES, RETRY_BASE_MS, wrapResponse } from './base';
import * as denylist from './denylist';
import * as services from './services';
import * as categories from './categories';
import * as security from './security';
import * as privacy from './privacy';
import * as analytics from './analytics';
import * as snapshot from './snapshot';
import * as recreationTime from './recreationTime';
import * as parentalControl from './parentalControl';

export class NextDNSClient implements NextDNSApiClient {
  constructor(
    public readonly cfg: NextDNSConfig,
    public readonly log?: (
      level: 'info' | 'warn' | 'error',
      msg: string,
      details?: string,
    ) => void,
  ) {}

  private _log(
    level: 'info' | 'warn' | 'error',
    msg: string,
    details?: string,
  ) {
    if (this.log) {
      this.log(level, msg, details);
    }
  }

  async isConfigured(): Promise<boolean> {
    return !!(this.cfg.apiKey && this.cfg.profileId);
  }

  async fetch(
    path: string,
    options: RequestInit = {},
    attempt = 1,
  ): Promise<Response> {
    const url = `${BASE_URL}${path}`;
    const headers = {
      'X-Api-Key': sanitizeForHeader(this.cfg.apiKey),
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const res = await fetch(url, { ...options, headers });

      if (res.status === 429 && attempt <= MAX_RETRIES) {
        const waitMs = RETRY_BASE_MS * 2 ** (attempt - 1);
        this._log(
          'warn',
          `NextDNS rate limited (attempt ${attempt}/${MAX_RETRIES})`,
          `Retrying in ${waitMs}ms`,
        );
        await sleep(waitMs);
        return this.fetch(path, options, attempt + 1);
      }

      if (res.status >= 500 && attempt <= MAX_RETRIES) {
        const waitMs = RETRY_BASE_MS * 2 ** (attempt - 1);
        this._log(
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
        this._log(
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

  // --- Denylist ---
  async getDenylist() {
    return denylist.getDenylist(this);
  }
  async setDenylist(items: NextDNSEntity[]) {
    return denylist.setDenylist(this, items);
  }
  async addDenylistItem(id: string) {
    return denylist.addDenylistItem(this, id);
  }
  async removeDenylistItem(id: string) {
    return denylist.removeDenylistItem(this, id);
  }

  // --- Services ---
  async getServices() {
    return services.getServices(this);
  }
  async setServices(items: NextDNSService[]) {
    return services.setServices(this, items);
  }
  async addServiceItem(id: string) {
    return services.addServiceItem(this, id);
  }
  async removeServiceItem(id: string) {
    return services.removeServiceItem(this, id);
  }

  // --- Categories ---
  async getCategories() {
    return categories.getCategories(this);
  }
  async setCategories(items: NextDNSCategory[]) {
    return categories.setCategories(this, items);
  }
  async addCategoryItem(id: string) {
    return categories.addCategoryItem(this, id);
  }
  async removeCategoryItem(id: string) {
    return categories.removeCategoryItem(this, id);
  }

  // --- Security ---
  async getSecurity() {
    return security.getSecurity(this);
  }
  async patchSecurity(patch: Partial<NextDNSSecuritySettings>) {
    return security.patchSecurity(this, patch);
  }
  async getBlockedTlds() {
    return security.getBlockedTlds(this);
  }
  async setBlockedTlds(tlds: NextDNSTld[]) {
    return security.setBlockedTlds(this, tlds);
  }
  async addBlockedTld(id: string) {
    return security.addBlockedTld(this, id);
  }
  async removeBlockedTld(id: string) {
    return security.removeBlockedTld(this, id);
  }

  // --- Privacy ---
  async getAvailableBlocklists() {
    return privacy.getAvailableBlocklists(this);
  }
  async getPrivacy() {
    return privacy.getPrivacy(this);
  }
  async patchPrivacy(patch: Partial<NextDNSPrivacySettings>) {
    return privacy.patchPrivacy(this, patch);
  }
  async getBlocklists() {
    return privacy.getBlocklists(this);
  }
  async setBlocklists(items: NextDNSBlocklist[]) {
    return privacy.setBlocklists(this, items);
  }
  async addBlocklist(id: string) {
    return privacy.addBlocklist(this, id);
  }
  async removeBlocklist(id: string) {
    return privacy.removeBlocklist(this, id);
  }
  async getNativeTracking() {
    return privacy.getNativeTracking(this);
  }
  async setNativeTracking(items: NextDNSNativeTracking[]) {
    return privacy.setNativeTracking(this, items);
  }
  async addNativeTracking(id: string) {
    return privacy.addNativeTracking(this, id);
  }
  async removeNativeTracking(id: string) {
    return privacy.removeNativeTracking(this, id);
  }

  // --- Analytics ---
  async getLogs(limit?: number, status?: string) {
    return analytics.getLogs(this, limit, status);
  }
  async getAnalyticsDomains(limit?: number, status?: string) {
    return analytics.getAnalyticsDomains(this, limit, status);
  }
  async getAnalyticsCounters() {
    return analytics.getAnalyticsCounters(this);
  }

  // --- Snapshots ---
  async getRemoteSnapshot() {
    return snapshot.getRemoteSnapshot(this);
  }
  async getFullSnapshot() {
    return snapshot.getFullSnapshot(this);
  }

  // --- Recreation Time ---
  async getRecreationTime() {
    return recreationTime.getRecreationTime(this);
  }
  async syncRecreationTime(recreation: NextDNSRecreationTime) {
    return recreationTime.syncRecreationTime(this, recreation);
  }

  // --- Parental Control ---
  async getParentalControl() {
    return parentalControl.getParentalControl(this);
  }
  async patchParentalControl(patch: Partial<NextDNSParentalControlSettings>) {
    return parentalControl.patchParentalControl(this, patch);
  }

  // --- Composite Block Logic ---
  async setTargetState(
    kind: 'service' | 'category' | 'domain',
    id: string,
    active: boolean,
  ) {
    if (kind === 'service') {
      return active ? this.addServiceItem(id) : this.removeServiceItem(id);
    }
    if (kind === 'category') {
      return active ? this.addCategoryItem(id) : this.removeCategoryItem(id);
    }
    return active ? this.addDenylistItem(id) : this.removeDenylistItem(id);
  }

  async blockApps(
    rulesToBlock: AppRule[],
  ): Promise<{ ok: boolean; error?: string; domains?: string[] }> {
    const domainItems = rulesToBlock
      .filter((r) => r.type === 'domain')
      .map(getDomainForRule)
      .filter((d): d is string => d !== null);
    const servicesToBlock = rulesToBlock
      .filter((r) => r.type === 'service')
      .map((r) => r.packageName)
      .filter(Boolean);
    const categoriesToBlock = rulesToBlock
      .filter((r) => r.type === 'category')
      .map((r) => r.packageName)
      .filter(Boolean);

    try {
      const [denyRes, svcRes, catRes] = await Promise.all([
        this.getDenylist(),
        this.getServices(),
        this.getCategories(),
      ]);
      if (!denyRes.ok || !svcRes.ok || !catRes.ok) {
        return { ok: false, error: 'Failed to fetch current state' };
      }

      const finalDenyList = Array.from(
        new Set([...denyRes.data.map((i) => i.id), ...domainItems]),
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
        return { ok: true, domains: domainItems };
      }
      return { ok: false, error: 'Sync Failed' };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async unblockAll(): Promise<NextDNSResponse<boolean>> {
    try {
      const [resDeny, resSvc, resCat] = await Promise.all([
        this.setDenylist([]),
        this.setServices([]),
        this.setCategories([]),
      ]);
      if (resDeny.ok && resSvc.ok && resCat.ok) {
        return { ok: true, data: true };
      }
      return {
        ok: false,
        error: {
          code: 'network_failure',
          message: 'One or more resets failed',
        },
      };
    } catch (e: any) {
      return {
        ok: false,
        error: { code: 'network_failure', message: e.message },
      };
    }
  }
}
