/**
 * usePrivacyVM
 * Shared view-model for Privacy settings screen.
 */

import {
  getPrivacySettings as getLocalPrivacy,
  saveLocalPrivacy,
} from '@stopaccess/state/privacy';
import type {
  NextDNSPrivacySettings,
  StorageAdapter,
  NextDNSApiClient,
} from '@stopaccess/types';

export interface PrivacyVMData {
  settings: NextDNSPrivacySettings | null;
  availableBlocklists: any[] | null;
  isConfigured: boolean;
  error: string | null;
}

export interface PrivacyVM {
  load(): Promise<PrivacyVMData>;
  getAvailableBlocklists(): Promise<any[]>;
  toggleDisguisedTrackers(
    value: boolean,
  ): Promise<{ ok: boolean; error?: string }>;
  toggleAllowAffiliate(
    value: boolean,
  ): Promise<{ ok: boolean; error?: string }>;
  addBlocklist(id: string): Promise<{ ok: boolean; error?: string }>;
  removeBlocklist(id: string): Promise<{ ok: boolean; error?: string }>;
  addNativeTracking(id: string): Promise<{ ok: boolean; error?: string }>;
  removeNativeTracking(id: string): Promise<{ ok: boolean; error?: string }>;
  getActiveBlocklistCount(): Promise<number>;
  getActiveNativeCount(): Promise<number>;
}

export function createPrivacyVM(
  storage: StorageAdapter,
  api: NextDNSApiClient,
): PrivacyVM {
  let cachedBlocklists: any[] | null = null;
  const getErrorMessage = (res: any, fallback = 'NextDNS request failed') =>
    res?.error?.message || res?.error || res?.message || fallback;

  async function refreshLocal(): Promise<void> {
    const res = await api.getPrivacy();
    if (res && !res.error) {
      const data = (res.data ?? res) as NextDNSPrivacySettings;
      if (data && data.blocklists) {
        await saveLocalPrivacy(storage, data);
      }
    }
  }

  return {
    async load(): Promise<PrivacyVMData> {
      const isConfigured = await api.isConfigured();
      if (!isConfigured) {
        return {
          settings: null,
          availableBlocklists: null,
          isConfigured: false,
          error: null,
        };
      }

      const cached = await getLocalPrivacy(storage);
      if (cached) {
        refreshLocal();
        return {
          settings: cached as NextDNSPrivacySettings,
          availableBlocklists: null,
          isConfigured: true,
          error: null,
        };
      }

      try {
        const res = await api.getPrivacy();
        if (res && !res.error) {
          const data = (res.data ?? res) as NextDNSPrivacySettings;
          if (data) {
            await saveLocalPrivacy(storage, data);
            return {
              settings: data,
              availableBlocklists: null,
              isConfigured: true,
              error: null,
            };
          }
        }
        return {
          settings: null,
          availableBlocklists: null,
          isConfigured: true,
          error:
            (res as any)?.error?.message ?? 'Failed to load privacy settings',
        };
      } catch (e: any) {
        return {
          settings: null,
          availableBlocklists: null,
          isConfigured: true,
          error: e.message,
        };
      }
    },

    async getAvailableBlocklists() {
      if (cachedBlocklists) {
        return cachedBlocklists;
      }
      try {
        const res = await api.getAvailableBlocklists();
        if (res && !res.error) {
          cachedBlocklists = (res.data ?? res) as any[];
          return cachedBlocklists || [];
        }
        return [];
      } catch {
        return [];
      }
    },

    async toggleDisguisedTrackers(value: boolean) {
      try {
        const current = await getLocalPrivacy(storage);
        if (current) {
          await saveLocalPrivacy(storage, {
            ...current,
            disguisedTrackers: value,
          });
        }
        const res = await api.patchPrivacy({ disguisedTrackers: value });
        if (res && !res.ok) {
          if (current) {
            await saveLocalPrivacy(storage, current);
          }
          return { ok: false, error: getErrorMessage(res) };
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async toggleAllowAffiliate(value: boolean) {
      try {
        const current = await getLocalPrivacy(storage);
        if (current) {
          await saveLocalPrivacy(storage, {
            ...current,
            allowAffiliate: value,
          });
        }
        const res = await api.patchPrivacy({ allowAffiliate: value });
        if (res && !res.ok) {
          if (current) {
            await saveLocalPrivacy(storage, current);
          }
          return { ok: false, error: getErrorMessage(res) };
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async addBlocklist(id: string) {
      try {
        const res = await api.addBlocklist(id);
        if (res && !res.ok) {
          const status = res.error?.status;
          // 400 = already exists (idempotent — desired state achieved)
          if (status !== 400 && status !== 404) {
            return { ok: false, error: getErrorMessage(res) };
          }
        }
        const current = await getLocalPrivacy(storage);
        if (current) {
          const already = current.blocklists.some((b) => b.id === id);
          if (!already) {
            await saveLocalPrivacy(storage, {
              ...current,
              blocklists: [...current.blocklists, { id }],
            });
          }
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async removeBlocklist(id: string) {
      try {
        const res = await api.removeBlocklist(id);
        if (res && !res.ok) {
          const status = res.error?.status;
          // 404 = already removed (idempotent — desired state achieved)
          if (status !== 400 && status !== 404) {
            return { ok: false, error: getErrorMessage(res) };
          }
        }
        const current = await getLocalPrivacy(storage);
        if (current) {
          await saveLocalPrivacy(storage, {
            ...current,
            blocklists: current.blocklists.filter((b) => b.id !== id),
          });
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async addNativeTracking(id: string) {
      try {
        const res = await api.addNativeTracking(id);
        if (res && !res.ok) {
          const status = res.error?.status;
          if (status !== 400 && status !== 404) {
            return { ok: false, error: getErrorMessage(res) };
          }
        }
        const current = await getLocalPrivacy(storage);
        if (current) {
          const already = current.natives.some((n) => n.id === id);
          if (!already) {
            await saveLocalPrivacy(storage, {
              ...current,
              natives: [...current.natives, { id }],
            });
          }
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async removeNativeTracking(id: string) {
      try {
        const res = await api.removeNativeTracking(id);
        if (res && !res.ok) {
          const status = res.error?.status;
          if (status !== 400 && status !== 404) {
            return { ok: false, error: getErrorMessage(res) };
          }
        }
        const current = await getLocalPrivacy(storage);
        if (current) {
          await saveLocalPrivacy(storage, {
            ...current,
            natives: current.natives.filter((n) => n.id !== id),
          });
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async getActiveBlocklistCount(): Promise<number> {
      const cached = await getLocalPrivacy(storage);
      return cached?.blocklists?.length ?? 0;
    },

    async getActiveNativeCount(): Promise<number> {
      const cached = await getLocalPrivacy(storage);
      return cached?.natives?.length ?? 0;
    },
  };
}
