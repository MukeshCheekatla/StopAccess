import CryptoJS from 'crypto-js';

const APP_STATIC_SALT = 'StopAccess_E2EE_V1_8f9a2b';
const ENC_PREFIX = 'enc_v1:';

/**
 * Derives a consistent AES key from the user's ID and the app's static salt.
 */
function deriveKey(userId: string): string {
  // We use PBKDF2 to derive a strong key from the user ID.
  // This ensures the key is consistent across devices for the same user.
  const key = CryptoJS.PBKDF2(userId, APP_STATIC_SALT, {
    keySize: 256 / 32,
    iterations: 1000,
  });
  return key.toString();
}

/**
 * Encrypts a plaintext payload using an AES key derived from the userId.
 * Adds a prefix to identify it as encrypted data.
 */
export async function encryptPayload(
  payload: string,
  userId: string,
): Promise<string> {
  if (!payload || !userId) {
    return payload;
  }

  // Don't double encrypt
  if (payload.startsWith(ENC_PREFIX)) {
    return payload;
  }

  const key = deriveKey(userId);
  const encrypted = CryptoJS.AES.encrypt(payload, key).toString();
  return `${ENC_PREFIX}${encrypted}`;
}

/**
 * Decrypts a payload using an AES key derived from the userId.
 * If the payload is not encrypted (missing prefix), it returns the payload as-is.
 */
export async function decryptPayload(
  ciphertext: string,
  userId: string,
): Promise<string> {
  if (!ciphertext || !userId) {
    return ciphertext;
  }

  // If it doesn't have the prefix, it's either an old plaintext payload or empty
  if (!ciphertext.startsWith(ENC_PREFIX)) {
    return ciphertext;
  }

  const actualCiphertext = ciphertext.slice(ENC_PREFIX.length);
  const key = deriveKey(userId);

  try {
    const bytes = CryptoJS.AES.decrypt(actualCiphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails due to wrong key, it might return empty string
    if (!decrypted) {
      console.warn('[Crypto] Decryption returned empty string (invalid key?)');
      return ciphertext; // Fallback to raw string just in case
    }
    return decrypted;
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    return ciphertext; // Fallback
  }
}
