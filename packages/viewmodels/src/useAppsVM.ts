import { getRules } from '@focusgate/state/rules';
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
}

/**
 * Unified ViewModel for Apps Screen.
 * Fetches everything in a single pass to avoid multiple UI flickers.
 */
export async function loadAppsData(): Promise<AppsScreenData> {
  const [rules, isConfigured, cached] = await Promise.all([
    getRules(storage),
    nextDNSApi.isConfigured(),
    (async () => {
      const res = (await chrome.storage.local.get([
        'cached_ndns_metadata',
      ])) as any;
      return res.cached_ndns_metadata || {};
    })(),
  ]);

  return {
    rules,
    isConfigured,
    availableServices: cached.services || [],
    availableCategories: cached.categories || [],
  };
}
