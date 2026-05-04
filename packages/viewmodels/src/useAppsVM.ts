import { getRules } from '@stopaccess/state/rules';
import { STORAGE_KEYS } from '@stopaccess/state';
import { VMPlatformDependencies } from './types';

export interface AppsScreenData {
  rules: any;
  isConfigured: boolean;
  availableServices: any[];
  availableCategories: any[];
  passes: any;
  usage: any;
}

/**
 * Unified ViewModel for Apps Screen.
 * Fetches everything in a single pass to avoid multiple UI flickers.
 */
export async function loadAppsData(
  deps: VMPlatformDependencies,
): Promise<AppsScreenData> {
  const { storage, nextDNSApi } = deps;

  const [rules, isConfigured, storageRes] = await Promise.all([
    getRules(storage),
    nextDNSApi.isConfigured(),
    storage.getMultiple([
      STORAGE_KEYS.CACHED_METADATA,
      STORAGE_KEYS.TEMP_PASSES,
      'fg_usage_map',
    ]),
  ]);

  const cached = storageRes[STORAGE_KEYS.CACHED_METADATA] || {};

  return {
    rules,
    isConfigured,
    availableServices: cached.services || [],
    availableCategories: cached.categories || [],
    passes: storageRes[STORAGE_KEYS.TEMP_PASSES] || {},
    usage: storageRes.fg_usage_map || {},
  };
}
