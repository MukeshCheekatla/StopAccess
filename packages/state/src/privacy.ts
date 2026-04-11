import { StorageAdapter, NextDNSPrivacySettings } from '@stopaccess/types';

export const PRIVACY_KEY = 'fg_privacy_settings';

/**
 * Fetch privacy settings from local storage
 */
export async function getLocalPrivacy(
  storage: StorageAdapter,
): Promise<NextDNSPrivacySettings | null> {
  const raw = await storage.getString(PRIVACY_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persist privacy settings to local storage
 */
export async function saveLocalPrivacy(
  storage: StorageAdapter,
  settings: NextDNSPrivacySettings,
): Promise<void> {
  await storage.set(PRIVACY_KEY, JSON.stringify(settings));
}

/**
 * Merge local privacy settings with updates
 */
export async function updateLocalPrivacy(
  storage: StorageAdapter,
  patch: Partial<NextDNSPrivacySettings>,
): Promise<NextDNSPrivacySettings | null> {
  const current = await getLocalPrivacy(storage);
  if (!current) {
    return null;
  }
  const updated = { ...current, ...patch };
  await saveLocalPrivacy(storage, updated);
  return updated;
}
export {
  getLocalPrivacy as getPrivacySettings,
  updateLocalPrivacy as updatePrivacySettings,
};
