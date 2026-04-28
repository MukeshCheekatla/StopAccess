/**
 * AuthManager — Chrome Extension → Supabase
 * Refactored to focus strictly on authentication logic.
 */

import { supabase, getCloudUserSafe, clearAuthCache } from '../lib/supabase';
import { extensionLogger } from './platformAdapter';

export interface CloudUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

const KEY_CLOUD_USER = 'fg_cloud_user';

/**
 * Sign in using Email Magic Link (OTP).
 */
export async function signInWithOtp(email: string): Promise<{ error: any }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `https://stopaccess.pages.dev/auth/callback?ext=${chrome.runtime.id}`,
    },
  });

  if (error) {
    extensionLogger.add('error', `Sign in failed: ${error.message}`);
  } else {
    extensionLogger.add('info', `Magic link sent to ${email}`);
  }

  return { error };
}

/**
 * Sign in using Google OAuth.
 */
export async function signInWithGoogle(): Promise<{ error: any }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `https://stopaccess.pages.dev/auth/callback?ext=${chrome.runtime.id}`,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    extensionLogger.add('error', `Google sign-in failed: ${error.message}`);
  } else if (data?.url) {
    extensionLogger.add('info', 'Opening Google login tab');
    chrome.tabs.create({ url: data.url });
  }

  return { error };
}

/**
 * Get current authenticated user from Supabase with caching.
 */
export async function getCloudUser(): Promise<CloudUser | null> {
  const user = await getCloudUserSafe();

  if (!user) {
    // Check storage cache as last-ditch fallback for UI persistence
    const res = await chrome.storage.local.get([KEY_CLOUD_USER]);
    return (res[KEY_CLOUD_USER] as CloudUser) || null;
  }

  const meta = user.user_metadata || {};
  const cloudUser: CloudUser = {
    id: user.id,
    email: user.email || '',
    full_name: meta.full_name || meta.name || user.email || '',
    avatar_url: meta.avatar_url || meta.picture || '',
  };

  // Keep storage in sync for UI speed
  await chrome.storage.local.set({ [KEY_CLOUD_USER]: cloudUser });

  return cloudUser;
}

/**
 * Sign out from Supabase.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    extensionLogger.add('error', `Sign out failed: ${error.message}`);
  }

  await clearAuthCache();
  await chrome.storage.local.remove([KEY_CLOUD_USER]);
  extensionLogger.add('info', 'Signed out from cloud');
}

/**
 * Manual helper to set session from a URL hash.
 */
export async function setSessionFromUrl(url: string): Promise<{ error: any }> {
  try {
    const hash = url.split('#')[1];
    if (!hash) {
      return { error: new Error('No hash found in URL') };
    }

    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      return { error: new Error('Missing tokens') };
    }

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    return { error };
  } catch (err: any) {
    return { error: err };
  }
}
