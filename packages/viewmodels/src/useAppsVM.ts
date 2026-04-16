import { getRules } from '@stopaccess/state/rules';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../../../extension/src/background/platformAdapter';

declare var chrome: any;

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
export async function loadAppsData(): Promise<AppsScreenData> {
  const [rules, isConfigured, cached, storageRes] = await Promise.all([
    getRules(storage),
    nextDNSApi.isConfigured(),
    (async () => {
      const res = (await chrome.storage.local.get([
        'cached_ndns_metadata',
      ])) as any;
      return res.cached_ndns_metadata || {};
    })(),
    chrome.storage.local.get(['fg_temp_passes', 'fg_usage_map']),
  ]);

  return {
    rules,
    isConfigured,
    availableServices: cached.services || [],
    availableCategories: cached.categories || [],
    passes: storageRes.fg_temp_passes || {},
    usage: storageRes.fg_usage_map || {},
  };
}
