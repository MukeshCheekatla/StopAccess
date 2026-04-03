import { getRules } from '@focusgate/state/rules';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../../../extension/src/background/platformAdapter';

declare var chrome: any;

export interface AppsScreenData {
  rules: any;
  isConfigured: boolean;
  syncMode: string;
  availableServices: any[];
  availableCategories: any[];
}

/**
 * Unified ViewModel for Apps Screen.
 * Fetches everything in a single pass to avoid multiple UI flickers.
 */
export async function loadAppsData(): Promise<AppsScreenData> {
  const [rules, isConfigured, syncMode, cached] = await Promise.all([
    getRules(storage),
    nextDNSApi.isConfigured(),
    storage.getString('fg_sync_mode').then((val) => val || 'browser'),
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
    syncMode,
    availableServices: cached.services || [],
    availableCategories: cached.categories || [],
  };
}
