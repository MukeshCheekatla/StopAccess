import { STORAGE_KEYS } from '@stopaccess/state';

export interface IconCacheEntry {
  url: string;
  ts: number;
}

export type IconCache = Record<string, IconCacheEntry>;

let localCache: IconCache | null = null;
let cachePromise: Promise<IconCache> | null = null;

export function getCachedIconSync(domain: string): string | null {
  if (!localCache) {
    return null;
  }
  const entry = localCache[domain];
  if (entry && Date.now() - entry.ts < 7 * 24 * 60 * 60 * 1000) {
    return entry.url;
  }
  return null;
}

export async function prefetchIconCache(): Promise<IconCache> {
  if (localCache) {
    return localCache;
  }
  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = (async () => {
    const res = await chrome.storage.local.get([STORAGE_KEYS.ICON_CACHE]);
    localCache = (res[STORAGE_KEYS.ICON_CACHE] as IconCache) || {};
    return localCache;
  })();

  return cachePromise;
}

async function getCache(): Promise<IconCache> {
  return prefetchIconCache();
}

export async function getCachedIcon(domain: string): Promise<string | null> {
  const cache = await getCache();
  const entry = cache[domain];
  if (entry) {
    // Cache for 7 days
    if (Date.now() - entry.ts < 7 * 24 * 60 * 60 * 1000) {
      return entry.url;
    }
  }
  return null;
}

export async function saveIconToCache(domain: string, url: string) {
  const cache = await getCache();
  cache[domain] = { url, ts: Date.now() };

  // Prune cache if it gets too large (keep newest 200)
  const keys = Object.keys(cache);
  if (keys.length > 200) {
    const sorted = keys.sort((a, b) => cache[b].ts - cache[a].ts);
    const newCache: IconCache = {};
    sorted.slice(0, 200).forEach((k) => {
      newCache[k] = cache[k];
    });
    localCache = newCache;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.ICON_CACHE]: localCache });
}
