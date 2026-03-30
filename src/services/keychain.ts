import * as Keychain from 'react-native-keychain';
import { addLog } from './logger';

const SERVICE_NAME = 'focusgate_nextdns';

/**
 * Stores the NextDNS API Key in the native secure storage (Keystore/Keychain).
 */
export async function setSecureApiKey(apiKey: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword('apiKey', apiKey, {
      service: SERVICE_NAME,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (error) {
    addLog('error', 'Keychain save failed', (error as Error).message);
    return false;
  }
}

/**
 * Retrieves the NextDNS API Key from native secure storage.
 */
export async function getSecureApiKey(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: SERVICE_NAME,
    });
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch (error) {
    addLog('error', 'Keychain retrieval failed', (error as Error).message);
    return null;
  }
}

/**
 * Clears the NextDNS API Key from secure storage.
 */
export async function resetSecureApiKey(): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE_NAME });
    return true;
  } catch (error) {
    addLog('error', 'Keychain reset failed', (error as Error).message);
    return false;
  }
}
