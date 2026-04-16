import { getLockedDomains } from '../background/sessionGuard';
import { STORAGE_KEYS } from '@stopaccess/state';

declare var chrome: any;

export interface AppsRuntimeState {
  rules: any[];
  usage: Record<string, { time?: number }>;
  passes: Record<string, any>;
  lockedDomains: string[];
}

export async function loadAppsRuntimeState(): Promise<AppsRuntimeState> {
  const [storageRes, lockedDomains] = await Promise.all([
    chrome.storage.local.get([
      STORAGE_KEYS.RULES,
      STORAGE_KEYS.USAGE,
      STORAGE_KEYS.TEMP_PASSES,
    ]),
    getLockedDomains(),
  ]);

  const rawRules = storageRes[STORAGE_KEYS.RULES];
  const rules =
    typeof rawRules === 'string'
      ? JSON.parse(rawRules || '[]')
      : Array.isArray(rawRules)
      ? rawRules
      : [];

  return {
    rules,
    usage: (storageRes[STORAGE_KEYS.USAGE] || {}) as Record<
      string,
      { time?: number }
    >,
    passes: (storageRes[STORAGE_KEYS.TEMP_PASSES] || {}) as Record<string, any>,
    lockedDomains,
  };
}

export function subscribeAppsRuntimeState(callback: () => void): () => void {
  const listener = (changes: Record<string, unknown>, area: string) => {
    if (area !== 'local') {
      return;
    }

    if (
      changes[STORAGE_KEYS.RULES] ||
      changes[STORAGE_KEYS.USAGE] ||
      changes[STORAGE_KEYS.TEMP_PASSES] ||
      changes[STORAGE_KEYS.SESSION]
    ) {
      callback();
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
