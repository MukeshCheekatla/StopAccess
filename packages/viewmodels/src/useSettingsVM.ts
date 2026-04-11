declare var chrome: any;
import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../../../extension/src/background/platformAdapter';

export async function loadSettingsData() {
  const profileId = (await storage.getString(STORAGE_KEYS.PROFILE_ID)) || '';
  const apiKey = (await storage.getString(STORAGE_KEYS.API_KEY)) || '';
  const strict = await storage.getBoolean('strict_mode_enabled');
  const theme = ((await storage.getString(STORAGE_KEYS.THEME)) || 'system') as
    | 'dark'
    | 'light'
    | 'system';

  const dnrRules = (await new Promise((resolve) => {
    if (chrome?.declarativeNetRequest?.getDynamicRules) {
      chrome.declarativeNetRequest.getDynamicRules(resolve);
    } else {
      resolve([]);
    }
  })) as any[];

  const healthOk = !!(profileId && apiKey);
  const syncState = await (storage as any).getSyncState();
  const profile = {
    name: (await storage.getString('fg_profile_name')) || '',
    handle: (await storage.getString('fg_profile_handle')) || '',
    bio: (await storage.getString('fg_profile_bio')) || '',
  };

  return {
    profileId,
    apiKey,
    profile,
    strict,
    theme,
    dnrRules,
    healthOk,
    syncState,
  };
}

export async function saveProfileAction(profile: {
  name: string;
  handle: string;
  bio: string;
}) {
  await storage.set('fg_profile_name', profile.name.trim());
  await storage.set('fg_profile_handle', profile.handle.trim());
  await storage.set('fg_profile_bio', profile.bio.trim());
}

export async function connectNextDNSAction(pid: string, key: string) {
  try {
    await storage.set(STORAGE_KEYS.PROFILE_ID, pid);
    await storage.set(STORAGE_KEYS.API_KEY, key);

    const { nextDNSApi } = await import(
      '../../../extension/src/background/platformAdapter'
    );
    const ok = await nextDNSApi.testConnection();

    if (ok) {
      chrome.runtime.sendMessage({ action: 'manualSync' });
      return { ok: true };
    } else {
      return { ok: false, error: 'Invalid Profile ID or API Key' };
    }
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function setStrictModeAction(val: boolean) {
  await storage.set('strict_mode_enabled', val);
  chrome.runtime.sendMessage({ action: 'manualSync' });
}

export async function setThemeAction(theme: string) {
  await storage.set(STORAGE_KEYS.THEME, theme);
  chrome.runtime.sendMessage({ action: 'themeChanged', theme });
}

export async function testDomainCoverageAction(
  domain: string,
  dnrRules: any[],
) {
  const { getRules } = await import('@stopaccess/state/rules');
  const rules = await getRules(storage);
  const appRules = rules as any[];

  const localMatch = appRules.find(
    (r) => (r.domain || r.packageName || '').toLowerCase() === domain,
  );
  const dnrMatch = dnrRules.find(
    (r: any) => r.condition.urlFilter && r.condition.urlFilter.includes(domain),
  );

  return { localMatch, dnrMatch };
}

export async function exportRulesAction() {
  const rulesStr = (await storage.getString(STORAGE_KEYS.RULES)) || '[]';
  return rulesStr;
}

export async function importRulesAction(text: string) {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid format: Rules must be an array.');
  }
  await storage.set(STORAGE_KEYS.RULES, JSON.stringify(parsed));
  chrome.runtime.sendMessage({ action: 'manualSync' });
}

export async function setGuardianPinAction(pin: string) {
  await storage.set('guardian_pin', pin);
}

export async function verifyAndRemoveGuardianPinAction(enteredPin: string) {
  const currentPin = await storage.getString('guardian_pin');
  if (enteredPin === currentPin) {
    await storage.delete('guardian_pin');
    return true;
  }
  return false;
}

export async function clearEngineLogsAction() {
  await storage.set(STORAGE_KEYS.LOGS, JSON.stringify([]));
}

export async function loadSecuritySettingsAction() {
  const { getSecuritySettings } = await import('@stopaccess/state/security');
  const { nextDNSApi } = await import(
    '../../../extension/src/background/platformAdapter'
  );

  const security = await getSecuritySettings(storage);
  const isConfigured = await nextDNSApi.isConfigured();

  return { security, isConfigured };
}

export async function updateSecuritySettingsAction(nextSettings: any) {
  try {
    const { updateSecuritySettings } = await import(
      '@stopaccess/state/security'
    );
    await updateSecuritySettings(storage, nextSettings);
    chrome.runtime.sendMessage({ action: 'manualSync' });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function loadPrivacySettingsAction() {
  const { getPrivacySettings } = await import('@stopaccess/state/privacy');
  const { nextDNSApi } = await import(
    '../../../extension/src/background/platformAdapter'
  );

  const privacy = await getPrivacySettings(storage);
  const isConfigured = await nextDNSApi.isConfigured();

  return { privacy, isConfigured };
}

export async function updatePrivacySettingsAction(nextSettings: any) {
  try {
    const { updatePrivacySettings } = await import('@stopaccess/state/privacy');
    await updatePrivacySettings(storage, nextSettings);
    chrome.runtime.sendMessage({ action: 'manualSync' });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
