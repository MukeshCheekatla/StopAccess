import { setStrictModePolicy, STORAGE_KEYS } from '@stopaccess/state';
import { VMPlatformDependencies } from './types';
import { getRules } from '@stopaccess/state/rules';
import {
  getSecuritySettings,
  updateSecuritySettings,
} from '@stopaccess/state/security';
import {
  getPrivacySettings,
  updatePrivacySettings,
} from '@stopaccess/state/privacy';

export async function loadSettingsData(deps: VMPlatformDependencies) {
  const { storage, getPlatformRules, sendCommand } = deps;
  const profileId = (await storage.getString(STORAGE_KEYS.PROFILE_ID)) || '';
  const apiKey = (await storage.getString(STORAGE_KEYS.API_KEY)) || '';
  const strict = await storage.getBoolean('strict_mode_enabled');
  const theme = ((await storage.getString(STORAGE_KEYS.THEME)) || 'system') as
    | 'dark'
    | 'light'
    | 'system';

  const dnrRules = await getPlatformRules();

  const healthOk = !!(profileId && apiKey);
  const syncState = await storage.getSyncState();
  const profile = {
    name: (await storage.getString('fg_profile_name')) || '',
    handle: (await storage.getString('fg_profile_handle')) || '',
    bio: (await storage.getString('fg_profile_bio')) || '',
  };

  const cloudUserRes = await sendCommand('getCloudUser');
  const cloudUser = cloudUserRes?.user || null;
  const byteSettings = {
    defaultMood:
      (await storage.getString(STORAGE_KEYS.BYTE_DEFAULT_MOOD)) || 'happy',
    nightStart:
      (await storage.getNumber(STORAGE_KEYS.BYTE_NIGHT_START, 22)) ?? 22,
    nightEnd: (await storage.getNumber(STORAGE_KEYS.BYTE_NIGHT_END, 6)) ?? 6,
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
    pinResetStatus: await checkPinResetStatus(deps),
    challengeEnabled: await storage.getBoolean('challenge_enabled'),
    showMascot: await storage.getBoolean('fg_show_mascot'),
    challengeText:
      (await storage.getString('challenge_text')) ||
      'Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions.',
    cloudUser,
    byteSettings,
    hideCloudBox: (await storage.getBoolean('fg_hide_cloud_box')) || false,
  };
}

export async function checkPinResetStatus(deps: VMPlatformDependencies) {
  const { storage } = deps;
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

export async function requestPinResetAction(deps: VMPlatformDependencies) {
  await deps.storage.set('guardian_pin_reset_at', Date.now().toString());
}

export async function cancelPinResetAction(deps: VMPlatformDependencies) {
  await deps.storage.delete('guardian_pin_reset_at');
}

export async function saveProfileAction(
  deps: VMPlatformDependencies,
  profile: {
    name: string;
    handle: string;
    bio: string;
  },
) {
  const { storage } = deps;
  await storage.set('fg_profile_name', profile.name.trim());
  await storage.set('fg_profile_handle', profile.handle.trim());
  await storage.set('fg_profile_bio', profile.bio.trim());
}

export async function connectNextDNSAction(
  deps: VMPlatformDependencies,
  pid: string,
  key: string,
) {
  try {
    const { storage, nextDNSApi, sendCommand } = deps;
    await storage.set(STORAGE_KEYS.PROFILE_ID, pid);
    await storage.set(STORAGE_KEYS.API_KEY, key);

    const res = await nextDNSApi.testConnection();

    if (res.ok) {
      sendCommand('manualSync');
      return { ok: true };
    } else {
      return {
        ok: false,
        error: res.error?.message || 'Invalid Profile ID or API Key',
      };
    }
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function setStrictModeAction(
  deps: VMPlatformDependencies,
  val: boolean,
) {
  await setStrictModePolicy(deps.storage, val);
  deps.sendCommand('manualSync');
}

export async function setThemeAction(
  deps: VMPlatformDependencies,
  theme: string,
) {
  await deps.storage.set(STORAGE_KEYS.THEME, theme);
  deps.sendCommand('themeChanged', { theme });
}

export async function testDomainCoverageAction(
  deps: VMPlatformDependencies,
  domain: string,
  dnrRules: any[],
) {
  const { storage } = deps;
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

export async function exportRulesAction(deps: VMPlatformDependencies) {
  const rulesStr = (await deps.storage.getString(STORAGE_KEYS.RULES)) || '[]';
  return rulesStr;
}

export async function importRulesAction(
  deps: VMPlatformDependencies,
  text: string,
) {
  const { storage, sendCommand } = deps;
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid format: Rules must be an array.');
  }
  await storage.set(STORAGE_KEYS.RULES, JSON.stringify(parsed));
  sendCommand('manualSync');
}

export async function setGuardianPinAction(
  deps: VMPlatformDependencies,
  pin: string,
) {
  const { storage } = deps;
  await storage.set('guardian_pin', pin);
  await storage.delete('guardian_pin_reset_at');
}

export async function removeGuardianPinAction(deps: VMPlatformDependencies) {
  await deps.storage.delete('guardian_pin');
  return true;
}

export async function verifyAndRemoveGuardianPinAction(
  deps: VMPlatformDependencies,
  enteredPin: string,
) {
  const current = await deps.storage.getString('guardian_pin');
  if (current === enteredPin) {
    await deps.storage.delete('guardian_pin');
    return true;
  }
  return false;
}

export async function clearEngineLogsAction(deps: VMPlatformDependencies) {
  await deps.storage.set(STORAGE_KEYS.LOGS, JSON.stringify([]));
}

export async function loadSecuritySettingsAction(deps: VMPlatformDependencies) {
  const { storage, nextDNSApi } = deps;

  const security = await getSecuritySettings(storage);
  const isConfigured = await nextDNSApi.isConfigured();

  return { security, isConfigured };
}

export async function updateSecuritySettingsAction(
  deps: VMPlatformDependencies,
  nextSettings: any,
) {
  try {
    const { storage, sendCommand } = deps;
    await updateSecuritySettings(storage, nextSettings);
    sendCommand('manualSync');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function loadPrivacySettingsAction(deps: VMPlatformDependencies) {
  const { storage, nextDNSApi } = deps;

  const privacy = await getPrivacySettings(storage);
  const isConfigured = await nextDNSApi.isConfigured();

  return { privacy, isConfigured };
}

export async function updatePrivacySettingsAction(
  deps: VMPlatformDependencies,
  nextSettings: any,
) {
  try {
    const { storage, sendCommand } = deps;
    await updatePrivacySettings(storage, nextSettings);
    sendCommand('manualSync');
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function toggleChallengeAction(
  deps: VMPlatformDependencies,
  enabled: boolean,
) {
  await deps.storage.set('challenge_enabled', enabled);
}

export async function toggleMascotAction(
  deps: VMPlatformDependencies,
  enabled: boolean,
) {
  await deps.storage.set('fg_show_mascot', enabled);
}

export async function toggleCloudBoxAction(
  deps: VMPlatformDependencies,
  hide: boolean,
) {
  await deps.storage.set('fg_hide_cloud_box', hide);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('fg_hide_cloud_box', hide ? 'true' : 'false');
  }
}

export async function updateChallengeTextAction(
  deps: VMPlatformDependencies,
  text: string,
) {
  await deps.storage.set('challenge_text', text);
}

export async function updateByteSettingsAction(
  deps: VMPlatformDependencies,
  nextSettings: {
    defaultMood: string;
    nightStart: number;
    nightEnd: number;
  },
) {
  await deps.storage.set(
    STORAGE_KEYS.BYTE_DEFAULT_MOOD,
    nextSettings.defaultMood,
  );
  await deps.storage.set(
    STORAGE_KEYS.BYTE_NIGHT_START,
    nextSettings.nightStart,
  );
  await deps.storage.set(STORAGE_KEYS.BYTE_NIGHT_END, nextSettings.nightEnd);
}

export async function signInWithGoogleAction(
  deps: VMPlatformDependencies,
): Promise<boolean> {
  const res = await deps.sendCommand('signInWithGoogle');
  if (res?.error) {
    throw new Error(res.error.message || res.error);
  }
  return !!res?.ok;
}

export async function signInWithOtpAction(
  deps: VMPlatformDependencies,
  email: string,
): Promise<boolean> {
  const res = await deps.sendCommand('signInWithOtp', { email });
  if (res?.error) {
    throw new Error(res.error.message || res.error);
  }
  return !!res?.ok;
}

export async function signOutAction(deps: VMPlatformDependencies) {
  return deps.sendCommand('signOut');
}

export async function forcePushCloudAction(deps: VMPlatformDependencies) {
  const res = await deps.sendCommand('forcePushCloud');
  if (!res?.ok) {
    throw new Error(res?.error || 'Cloud push failed.');
  }
  return true;
}
