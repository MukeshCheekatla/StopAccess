/**
 * AuthManager — Chrome Extension → Supabase Google OAuth
 *
 * Flow:
 *  1. launchWebAuthFlow → Supabase /auth/v1/authorize?provider=google
 *     Supabase handles Google OAuth using the credentials configured in
 *     Supabase Dashboard (Google Client ID + Secret already set).
 *  2. Supabase redirects back to chrome.identity.getRedirectURL() with
 *     access_token + refresh_token in the URL fragment.
 *  3. Parse tokens, fetch user from Supabase, save to storage.
 *
 * IMPORTANT: chrome.identity.getRedirectURL() must be added to
 * Supabase → Auth → URL Configuration → Redirect URLs.
 * Run the extension once and check the service worker console for the URL.
 */

import { extensionLogger } from './platformAdapter';

declare var chrome: any;

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

const SUPABASE_URL: string =
  typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : '';
const SUPABASE_ANON_KEY: string =
  typeof __SUPABASE_ANON_KEY__ !== 'undefined' ? __SUPABASE_ANON_KEY__ : '';

// eslint-disable-next-line no-control-regex
const _safe = (v: string) => v.replace(/[^\x00-\xFF]/g, '');

const KEY_CLOUD_SESSION = 'fg_cloud_session';
const KEY_CLOUD_USER = 'fg_cloud_user';

export interface CloudUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
}

// ── Sign In (Google) — commented out ─────────────────────────────────────────

// export async function signInWithGoogle(): Promise<boolean> {
//   if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
//     throw new Error('Supabase credentials are not configured in the build.');
//   }
//
//   // Chrome's OAuth redirect URL for this extension
//   const redirectUrl = chrome.identity.getRedirectURL();
//   console.log(
//     '[Auth] Redirect URL (must be in Supabase allowed list):',
//     redirectUrl,
//   );
//
//   // flow_type=implicit → Supabase returns tokens in the URL fragment directly.
//   // Without this Supabase uses PKCE (auth code) which requires a server-side
//   // exchange that isn't possible inside a Chrome extension.
//   const authUrl =
//     `${SUPABASE_URL}/auth/v1/authorize` +
//     '?provider=google' +
//     `&redirect_to=${encodeURIComponent(redirectUrl)}` +
//     '&flow_type=implicit';
//
//   // Open the Google sign-in window via Supabase
//   const callbackUrl = await new Promise<string>((resolve, reject) => {
//     chrome.identity.launchWebAuthFlow(
//       { url: authUrl, interactive: true },
//       (url: string | undefined) => {
//         if (chrome.runtime.lastError) {
//           reject(new Error(chrome.runtime.lastError.message));
//         } else if (!url) {
//           reject(new Error('Auth was cancelled — no redirect URL returned.'));
//         } else {
//           resolve(url);
//         }
//       },
//     );
//   });
//
//   // Supabase returns tokens in the hash fragment: #access_token=...&...
//   const hash = new URL(callbackUrl).hash.substring(1); // strip leading '#'
//   const params = new URLSearchParams(hash);
//
//   const access_token = params.get('access_token');
//   const refresh_token = params.get('refresh_token') || '';
//   const expires_in = Number(params.get('expires_in') || 3600);
//
//   if (!access_token) {
//     const errDesc = params.get('error_description') || params.get('error');
//     if (errDesc) {
//       throw new Error(`Google auth failed: ${errDesc}`);
//     }
//     // If no token in hash, check if Supabase returned an error page
//     // (happens when the redirect URL isn't in Supabase's allowed list)
//     throw new Error(
//       `No access_token in callback. Make sure this URL is in Supabase → Auth → Redirect URLs: ${redirectUrl}`,
//     );
//   }
//
//   // Fetch the user profile using the Supabase access token
//   const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
//     headers: {
//       apikey: SUPABASE_ANON_KEY,
//       Authorization: `Bearer ${access_token}`,
//     },
//   });
//
//   if (!userRes.ok) {
//     throw new Error(`Failed to fetch user from Supabase (${userRes.status})`);
//   }
//
//   const userData = await userRes.json();
//   const meta = userData.user_metadata || {};
//
//   const cloudUser: CloudUser = {
//     id: userData.id,
//     email: userData.email,
//     full_name: meta.full_name || meta.name || userData.email,
//     avatar_url: meta.avatar_url || meta.picture || '',
//   };
//
//   await chrome.storage.local.set({
//     [KEY_CLOUD_USER]: cloudUser,
//     [KEY_CLOUD_SESSION]: {
//       token: access_token,
//       refresh_token,
//       provider: 'google',
//       expiresAt: Date.now() + expires_in * 1000,
//     },
//   });
//
//   extensionLogger.add('info', `Signed in as ${cloudUser.email}`);
//   return true;
// }

// ── Get cached user ───────────────────────────────────────────────────────────

export async function getCloudUser(): Promise<CloudUser | null> {
  const res = await chrome.storage.local.get([KEY_CLOUD_USER]);
  return (res[KEY_CLOUD_USER] as CloudUser) || null;
}

// ── Sign out ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  try {
    const res = await chrome.storage.local.get([KEY_CLOUD_SESSION]);
    const session = res[KEY_CLOUD_SESSION];
    if (session?.token) {
      fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: _safe(SUPABASE_ANON_KEY),
          Authorization: `Bearer ${_safe(session.token)}`,
        },
      }).catch(() => {});
    }
  } catch {}

  await chrome.storage.local.remove([KEY_CLOUD_SESSION, KEY_CLOUD_USER]);
  extensionLogger.add('info', 'Signed out from cloud');
}

// ── Push usage to Supabase ────────────────────────────────────────────────────

export async function pushUsageToCloud(
  usage: Record<string, any>,
): Promise<void> {
  try {
    const res = await chrome.storage.local.get([
      KEY_CLOUD_SESSION,
      KEY_CLOUD_USER,
    ]);
    const session = res[KEY_CLOUD_SESSION];
    const user = res[KEY_CLOUD_USER] as CloudUser;

    if (!session?.token || !user?.id) {
      return;
    }

    const day = new Date().toLocaleDateString('en-CA');
    const rows = Object.entries(usage).map(([domain, data]: [string, any]) => ({
      user_id: user.id,
      day,
      domain,
      time_ms: data.time || 0,
      sessions: data.sessions || 0,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      return;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/usage_snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: _safe(SUPABASE_ANON_KEY),
        Authorization: `Bearer ${_safe(session.token)}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(rows),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      extensionLogger.add(
        'warn',
        `Usage sync failed: ${err.message || response.statusText}`,
      );
    } else {
      extensionLogger.add('info', `Synced ${rows.length} usage records`);
    }
  } catch (err) {
    extensionLogger.add('error', `Cloud push error: ${err}`);
  }
}
