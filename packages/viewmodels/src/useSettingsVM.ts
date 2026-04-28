import { CloudUser } from '@stopaccess/types';
import { setStrictModePolicy } from '@stopaccess/state';
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
    pinResetStatus: await checkPinResetStatus(),
    challengeEnabled: await storage.getBoolean('challenge_enabled'),
    challengeText:
      (await storage.getString('challenge_text')) ||
      'Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions.',
    cloudUser: await (async (): Promise<CloudUser | null> => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getCloudUser' }, (res: any) => {
          resolve(res?.user || null);
        });
      });
    })(),
  };
}

export async function checkPinResetStatus() {
  const resetAtStr = await storage.getString('guardian_pin_reset_at');
  if (!resetAtStr) {
    return { pending: false };
  }

  const resetAt = parseInt(resetAtStr, 10);
  const now = Date.now();
  const delay = 12 * 3600 * 1000;
  const elapsed = now - resetAt;

  if (elapsed >= delay) {
    // Timer expired, clear PIN
    await storage.delete('guardian_pin');
    await storage.delete('guardian_pin_reset_at');
    return { pending: false, cleared: true };
  }

  return {
    pending: true,
    remainingMs: delay - elapsed,
    availableAt: resetAt + delay,
  };
}

export async function requestPinResetAction() {
  await storage.set('guardian_pin_reset_at', Date.now().toString());
}

export async function cancelPinResetAction() {
  await storage.delete('guardian_pin_reset_at');
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
  await setStrictModePolicy(storage, val);
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
  await storage.delete('guardian_pin_reset_at'); // Cancel any pending reset if a new PIN is set (unlikely scenario but good to have)
}

export async function removeGuardianPinAction() {
  await storage.delete('guardian_pin');
  return true;
}

export async function verifyAndRemoveGuardianPinAction(enteredPin: string) {
  const current = await storage.getString('guardian_pin');
  if (current === enteredPin) {
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
export async function toggleChallengeAction(enabled: boolean) {
  await storage.set('challenge_enabled', enabled);
}

export async function updateChallengeTextAction(text: string) {
  await storage.set('challenge_text', text);
}

export async function signInWithGoogleAction(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'signInWithGoogle' }, (res: any) => {
      if (res?.error) {
        reject(new Error(res.error.message || res.error));
      } else {
        resolve(!!res?.ok);
      }
    });
  });
}

export async function signInWithOtpAction(email: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'signInWithOtp', email },
      (res: any) => {
        if (res?.error) {
          reject(new Error(res.error.message || res.error));
        } else {
          resolve(!!res?.ok);
        }
      },
    );
  });
}

export async function signOutAction() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'signOut' }, () => {
      resolve(true);
    });
  });
}
