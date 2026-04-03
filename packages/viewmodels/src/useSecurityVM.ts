/**
 * useSecurityVM
 * Shared view-model for Security settings screen.
 * Used by both SecurityPage and SecurityPopup.
 */

import {
  getSecuritySettings as getLocalSecurity,
  saveLocalSecurity,
} from '@focusgate/state/security';
import type { NextDNSSecuritySettings, StorageAdapter } from '@focusgate/types';

export interface SecurityVMData {
  settings: NextDNSSecuritySettings | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SecurityVM {
  load(): Promise<SecurityVMData>;
  toggleSetting(
    key: keyof Omit<NextDNSSecuritySettings, 'tlds'>,
    value: boolean,
  ): Promise<{ ok: boolean; error?: string }>;
  addTld(id: string): Promise<{ ok: boolean; error?: string }>;
  removeTld(id: string): Promise<{ ok: boolean; error?: string }>;
  getActiveCount(): Promise<number>;
}

export function createSecurityVM(
  storage: StorageAdapter,
  api: any,
): SecurityVM {
  return {
    async load(): Promise<SecurityVMData> {
      const isConfigured = await api.isConfigured();
      if (!isConfigured) {
        return {
          settings: null,
          isConfigured: false,
          isLoading: false,
          error: null,
        };
      }

      // Try local cache first
      const cached = await getLocalSecurity(storage);
      if (cached) {
        // Refresh from remote in background
        api.getSecurity().then(async (res: any) => {
          if (res && !res.error) {
            const data = res.data ?? res;
            if (data) {
              await saveLocalSecurity(storage, data);
            }
          }
        });
        return {
          settings: cached,
          isConfigured: true,
          isLoading: false,
          error: null,
        };
      }

      // No cache — fetch remote
      try {
        const res = await api.getSecurity();
        if (res && !res.error) {
          const data = res.data ?? res;
          if (data) {
            await saveLocalSecurity(storage, data);
            return {
              settings: data,
              isConfigured: true,
              isLoading: false,
              error: null,
            };
          }
        }
        return {
          settings: null,
          isConfigured: true,
          isLoading: false,
          error: res?.error?.message ?? 'Failed to load security settings',
        };
      } catch (e: any) {
        return {
          settings: null,
          isConfigured: true,
          isLoading: false,
          error: e.message,
        };
      }
    },

    async toggleSetting(
      key: keyof Omit<NextDNSSecuritySettings, 'tlds'>,
      value: boolean,
    ): Promise<{ ok: boolean; error?: string }> {
      try {
        // Optimistic local update
        const current = await getLocalSecurity(storage);
        if (current) {
          await saveLocalSecurity(storage, { ...current, [key]: value });
        }
        // Remote update
        const res = await api.patchSecurity({ [key]: value });
        if (res && res.error) {
          // Revert on failure
          if (current) {
            await saveLocalSecurity(storage, current);
          }
          return { ok: false, error: res.error.message };
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async addTld(id: string): Promise<{ ok: boolean; error?: string }> {
      const normalized = id.toLowerCase().replace(/^\./, '').trim();
      if (!normalized) {
        return { ok: false, error: 'Invalid TLD' };
      }
      try {
        const res = await api.addBlockedTld(normalized);
        if (res && res.error) {
          return { ok: false, error: res.error.message };
        }
        // Update local cache
        const current = await getLocalSecurity(storage);
        if (current) {
          const already = current.tlds.some((t) => t.id === normalized);
          if (!already) {
            await saveLocalSecurity(storage, {
              ...current,
              tlds: [...current.tlds, { id: normalized }],
            });
          }
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async removeTld(id: string): Promise<{ ok: boolean; error?: string }> {
      try {
        const res = await api.removeBlockedTld(id);
        if (res && res.error) {
          return { ok: false, error: res.error.message };
        }
        // Update local cache
        const current = await getLocalSecurity(storage);
        if (current) {
          await saveLocalSecurity(storage, {
            ...current,
            tlds: current.tlds.filter((t) => t.id !== id),
          });
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async getActiveCount(): Promise<number> {
      const cached = await getLocalSecurity(storage);
      if (!cached) {
        return 0;
      }
      const boolKeys: (keyof Omit<NextDNSSecuritySettings, 'tlds'>)[] = [
        'threatIntelligenceFeeds',
        'aiThreatDetection',
        'googleSafeBrowsing',
        'cryptojacking',
        'dnsRebinding',
        'idnHomographs',
        'typosquatting',
        'dga',
        'nrd',
        'ddns',
        'parking',
        'csam',
      ];
      return boolKeys.filter((k) => cached[k] === true).length;
    },
  };
}
