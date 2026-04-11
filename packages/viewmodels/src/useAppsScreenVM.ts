declare var chrome: any;
import { getRules } from '@focusgate/state/rules';
import {
  extensionAdapter as storage,
  nextDNSApi,
  STORAGE_KEYS,
} from '../../../extension/src/background/platformAdapter';

export async function loadAppsScreenData() {
  const rules = await getRules(storage);
  const isConfigured = await nextDNSApi.isConfigured();

  let availableServices = [];
  let availableCategories = [];
  const cached = (await chrome.storage.local.get([
    STORAGE_KEYS.CACHED_METADATA,
  ])) as any;

  if (cached[STORAGE_KEYS.CACHED_METADATA]) {
    availableServices = cached[STORAGE_KEYS.CACHED_METADATA].services || [];
    availableCategories = cached[STORAGE_KEYS.CACHED_METADATA].categories || [];
  }

  return {
    rules,
    isConfigured,
    availableServices,
    availableCategories,
  };
}
