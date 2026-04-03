import { StorageAdapter, NextDNSSecuritySettings } from '@focusgate/types';

export const SECURITY_KEY = 'fg_security_settings';

/**
 * Fetch security settings from local storage
 */
export async function getLocalSecurity(
  storage: StorageAdapter,
): Promise<NextDNSSecuritySettings | null> {
  const raw = await storage.getString(SECURITY_KEY);
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
 * Persist security settings to local storage
 */
export async function saveLocalSecurity(
  storage: StorageAdapter,
  settings: NextDNSSecuritySettings,
): Promise<void> {
  await storage.set(SECURITY_KEY, JSON.stringify(settings));
}

/**
 * Merge local security settings with updates
 */
export async function updateLocalSecurity(
  storage: StorageAdapter,
  patch: Partial<NextDNSSecuritySettings>,
): Promise<NextDNSSecuritySettings | null> {
  const current = await getLocalSecurity(storage);
  if (!current) {
    return null;
  }
  const updated = { ...current, ...patch };
  await saveLocalSecurity(storage, updated);
  return updated;
}
export {
  getLocalSecurity as getSecuritySettings,
  updateLocalSecurity as updateSecuritySettings,
};
