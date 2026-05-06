/**
 * useSecurityVM
 * Shared view-model for Security settings screen.
 * Used by both SecurityPage and SecurityPopup.
 */

import {
  getSecuritySettings as getLocalSecurity,
  saveLocalSecurity,
  getLocalParental,
  saveLocalParental,
} from '@stopaccess/state/security';
import type {
  NextDNSSecuritySettings,
  NextDNSParentalControlSettings,
  StorageAdapter,
  NextDNSApiClient,
} from '@stopaccess/types';

export interface SecurityVMData {
  settings: NextDNSSecuritySettings | null;
  parental: NextDNSParentalControlSettings | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SecurityVM {
  load(): Promise<SecurityVMData>;
  toggleSetting(
    key:
      | keyof Omit<NextDNSSecuritySettings, 'tlds'>
      | keyof NextDNSParentalControlSettings,
    value: boolean,
  ): Promise<{ ok: boolean; error?: string }>;
  addTld(id: string): Promise<{ ok: boolean; error?: string }>;
  removeTld(id: string): Promise<{ ok: boolean; error?: string }>;
  getActiveCount(): Promise<number>;
}

export function createSecurityVM(
  storage: StorageAdapter,
  api: NextDNSApiClient,
): SecurityVM {
  const getErrorMessage = (res: any, fallback = 'NextDNS request failed') =>
    res?.error?.message || res?.error || res?.message || fallback;

  return {
    async load(): Promise<SecurityVMData> {
      const isConfigured = await api.isConfigured();
      if (!isConfigured) {
        return {
          settings: null,
          parental: null,
          isConfigured: false,
          isLoading: false,
          error: null,
        };
      }

      // Try local cache first
      const cachedSec = await getLocalSecurity(storage);
      const cachedPar = await getLocalParental(storage);

      if (cachedSec || cachedPar) {
        // Refresh from remote in background
        Promise.all([api.getSecurity(), api.getParentalControl()]).then(
          async ([resSec, resPar]: any) => {
            if (resSec && !resSec.error) {
              const data = resSec.data ?? resSec;
              if (data) {
                await saveLocalSecurity(storage, data);
              }
            }
            if (resPar && !resPar.error) {
              const data = resPar.data ?? resPar;
              if (data) {
                await saveLocalParental(storage, data);
              }
            }
          },
        );
        return {
          settings: cachedSec,
          parental: cachedPar,
          isConfigured: true,
          isLoading: false,
          error: null,
        };
      }

      // No cache — fetch remote
      try {
        const [resSec, resPar] = await Promise.all([
          api.getSecurity(),
          api.getParentalControl(),
        ]);

        if (resSec && !resSec.error && resPar && !resPar.error) {
          const dataSec = (resSec.data ?? resSec) as NextDNSSecuritySettings;
          const dataPar = (resPar.data ??
            resPar) as NextDNSParentalControlSettings;
          if (dataSec) {
            await saveLocalSecurity(storage, dataSec);
          }
          if (dataPar) {
            await saveLocalParental(storage, dataPar);
          }

          return {
            settings: dataSec,
            parental: dataPar,
            isConfigured: true,
            isLoading: false,
            error: null,
          };
        }
        return {
          settings: null,
          parental: null,
          isConfigured: true,
          isLoading: false,
          error:
            (resSec as any)?.error?.message ??
            (resPar as any)?.error?.message ??
            'Failed to load settings',
        };
      } catch (e: any) {
        return {
          settings: null,
          parental: null,
          isConfigured: true,
          isLoading: false,
          error: e.message,
        };
      }
    },

    async toggleSetting(
      key: any,
      value: boolean,
    ): Promise<{ ok: boolean; error?: string }> {
      const isParentalKey = [
        'safeSearch',
        'youtubeRestrictedMode',
        'blockBypass',
      ].includes(key);

      try {
        if (isParentalKey) {
          const current = await getLocalParental(storage);
          if (current) {
            await saveLocalParental(storage, { ...current, [key]: value });
          }
          const res = await api.patchParentalControl({ [key]: value });
          if (res && !res.ok) {
            const status = res.error?.status;
            if (status !== 400 && status !== 404) {
              if (current) {
                await saveLocalParental(storage, current);
              }
              return { ok: false, error: getErrorMessage(res) };
            }
          }
        } else {
          const current = await getLocalSecurity(storage);
          if (current) {
            await saveLocalSecurity(storage, { ...current, [key]: value });
          }
          const res = await api.patchSecurity({ [key]: value });
          if (res && !res.ok) {
            const status = res.error?.status;
            if (status !== 400 && status !== 404) {
              if (current) {
                await saveLocalSecurity(storage, current);
              }
              return { ok: false, error: getErrorMessage(res) };
            }
          }
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
        if (res && !res.ok) {
          const status = res.error?.status;
          // 400 = already exists
          if (status !== 400 && status !== 404) {
            return { ok: false, error: getErrorMessage(res) };
          }
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
        if (res && !res.ok) {
          const status = res.error?.status;
          // 404 = already removed
          if (status !== 400 && status !== 404) {
            return { ok: false, error: getErrorMessage(res) };
          }
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
