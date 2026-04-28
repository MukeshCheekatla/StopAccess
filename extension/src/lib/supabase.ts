import { createClient } from '@supabase/supabase-js';

// These are injected by esbuild via define in build.js
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

const supabaseUrl =
  typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : '';
const supabaseAnonKey =
  typeof __SUPABASE_ANON_KEY__ !== 'undefined' ? __SUPABASE_ANON_KEY__ : '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Credentials missing. Ensure .env is set before building.',
  );
}

/**
 * Supabase client configured for Chrome Extension environment.
 * Uses chrome.storage.local for session persistence.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: {
      getItem: (key: string) => {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            resolve(result[key] || null);
          });
        }) as any;
      },
      setItem: (key: string, value: string) => {
        return new Promise<void>((resolve) => {
          chrome.storage.local.set({ [key]: value }, () => {
            resolve();
          });
        }) as any;
      },
      removeItem: (key: string) => {
        return new Promise<void>((resolve) => {
          chrome.storage.local.remove([key], () => {
            resolve();
          });
        }) as any;
      },
    },
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

let cachedUser: any = null;
let lastFetch = 0;
const AUTH_TTL = 604800000; // 7 days (essentially permanent cache)

const KEY_LAST_FETCH = 'fg_last_auth_fetch';
const KEY_CACHED_USER = 'fg_cached_auth_user';

/**
 * Get current authenticated user with long-term persistent cache.
 * Prioritizes local storage over network calls to survive background script restarts.
 */
export async function getCloudUserSafe() {
  const now = Date.now();

  // 1. In-Memory Check (Fastest)
  if (cachedUser && now - lastFetch < AUTH_TTL) {
    return cachedUser;
  }

  // 2. Persistent Storage Check (Survives Service Worker restarts)
  const res = await chrome.storage.local.get([KEY_LAST_FETCH, KEY_CACHED_USER]);
  const storedLastFetch = (res[KEY_LAST_FETCH] as number) || 0;
  const storedUser = res[KEY_CACHED_USER];

  if (storedUser && now - storedLastFetch < AUTH_TTL) {
    cachedUser = storedUser;
    lastFetch = storedLastFetch;
    return cachedUser;
  }

  // 3. Local Session Check (Supabase internal storage)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) {
    cachedUser = session.user;
    lastFetch = now;
    await chrome.storage.local.set({
      [KEY_LAST_FETCH]: now,
      [KEY_CACHED_USER]: cachedUser,
    });
    return cachedUser;
  }

  // 4. Network Check (Last resort)
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    cachedUser = data.user;
    lastFetch = now;
    await chrome.storage.local.set({
      [KEY_LAST_FETCH]: now,
      [KEY_CACHED_USER]: cachedUser,
    });
  }
  return data.user;
}

/**
 * Clear auth cache (e.g. on logout).
 */
export async function clearAuthCache() {
  cachedUser = null;
  lastFetch = 0;
  await chrome.storage.local.remove([KEY_LAST_FETCH, KEY_CACHED_USER]);
}

// Global Auth Listener to keep cache fresh
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    clearAuthCache();
  } else if (session?.user) {
    cachedUser = session.user;
    lastFetch = Date.now();
    chrome.storage.local.set({
      [KEY_LAST_FETCH]: lastFetch,
      [KEY_CACHED_USER]: cachedUser,
    });
  }
});
