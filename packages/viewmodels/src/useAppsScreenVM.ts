import { getRules } from '@stopaccess/state/rules';
import { STORAGE_KEYS } from '@stopaccess/state';
import { VMPlatformDependencies } from './types';

export async function loadAppsScreenData(deps: VMPlatformDependencies) {
  const { storage, nextDNSApi } = deps;
  const rules = await getRules(storage);
  const isConfigured = await nextDNSApi.isConfigured();

  let availableServices = [];
  let availableCategories = [];
  const storageRes = await storage.getMultiple([STORAGE_KEYS.CACHED_METADATA]);

  const cached = storageRes[STORAGE_KEYS.CACHED_METADATA] || {};
  availableServices = cached.services || [];
  availableCategories = cached.categories || [];

  return {
    rules,
    isConfigured,
    availableServices,
    availableCategories,
  };
}
