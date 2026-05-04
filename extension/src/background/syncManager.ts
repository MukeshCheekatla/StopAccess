import { supabase, getCloudUserSafe } from '../lib/supabase';
import { extensionLogger } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
import {
  encryptPayload,
  decryptPayload,
  stableStringify,
  sanitizeRule,
} from '@stopaccess/core';

const KEY_PROFILE_ID = 'profile_id';
const KEY_DEVICE_ID = 'device_id';
const KEY_LAST_SYNC_AT = 'last_cloud_sync_at';
const KEY_PROFILE_ADOPTED_AT = 'profile_id_adopted_at';
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const USAGE_RESTORE_DAYS = 30;

const ENTITY_STORAGE_KEYS: Record<string, string> = {
  rules: STORAGE_KEYS.RULES,
  schedules: STORAGE_KEYS.SCHEDULES,
  focus: STORAGE_KEYS.SESSION,
};

// ── Shared State ───────────────────────────────────────────────────────────

const pendingPayloads: Record<string, any> = {};
const debounceTimers: Record<string, any> = {};
const lastHashes: Record<string, string> = {};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Structured sync logging for better observability.
 */
function logSync(event: string, meta: any = '') {
  const msg = `[Sync] ${event}`;
  console.log(msg, meta);
  // Optional: send to extensionLogger if it's an important lifecycle event
  if (
    typeof meta === 'string' &&
    (meta.includes('failed') || meta.includes('Retry'))
  ) {
    extensionLogger.add('warn', msg, meta);
  }
}

function hashKey(key: string): string {
  return `sync_hash_${key}`;
}

function parsePayload(payload: any): any {
  if (typeof payload !== 'string') {
    return payload;
  }
  return JSON.parse(payload);
}

function sanitizeStatePayload(entity: string, payload: any): any {
  const data = parsePayload(payload);
  if (data === undefined || data === null) {
    return {};
  }
  if (entity === 'nextdns') {
    return {
      profileId: String(data.profileId || '').trim(),
      apiKey: String(data.apiKey || '').trim(),
      updatedAt: Number(data.updatedAt) || Date.now(),
    };
  }
  if (entity === 'rules' && Array.isArray(data)) {
    return data.map(sanitizeRule);
  }
  return data;
}

function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

/**
 * Simple retry wrapper for transient network failures.
 */
async function safePush(fn: () => Promise<any>, key: string) {
  try {
    await fn();
  } catch (err: any) {
    logSync(`${key}_failed`, err.message);
    // Retry once after 5s
    setTimeout(() => {
      logSync(`${key}_retrying`);
      fn().catch((e) => logSync(`${key}_retry_failed`, e.message));
    }, 5000);
  }
}

/**
 * Get the unique ID for this installation.
 */
export async function getDeviceId(): Promise<string> {
  const res = await chrome.storage.local.get([KEY_DEVICE_ID]);
  if (res[KEY_DEVICE_ID]) {
    return res[KEY_DEVICE_ID] as string;
  }

  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [KEY_DEVICE_ID]: id });
  return id;
}

/**
 * Get the shared profile ID for this user (same across devices).
 */
export async function getProfileId(): Promise<string> {
  const res = await chrome.storage.local.get([KEY_PROFILE_ID]);
  if (res[KEY_PROFILE_ID]) {
    return res[KEY_PROFILE_ID] as string;
  }

  const user = await getCloudUserSafe().catch(() => null);
  const id = user?.id ? `user:${user.id}` : crypto.randomUUID();
  await chrome.storage.local.set({ [KEY_PROFILE_ID]: id });
  return id;
}

/**
 * Check if we should hit the DB based on the 24h gate.
 */
function getSyncGateKey(key: string): string {
  return `${KEY_LAST_SYNC_AT}_${key}`;
}

async function shouldHitCloud(key: string, force = false): Promise<boolean> {
  if (force) {
    return true;
  }
  const syncKey = getSyncGateKey(key);
  const res = await chrome.storage.local.get([syncKey]);
  const lastSync = (res[syncKey] as number) || 0;
  const now = Date.now();

  if (now - lastSync < SYNC_INTERVAL_MS) {
    logSync('skipped_too_soon', {
      next_sync_in_mins: Math.round(
        (SYNC_INTERVAL_MS - (now - lastSync)) / 60000,
      ),
    });
    return false;
  }
  return true;
}

/**
 * Mark a successful sync.
 */
async function markSyncSuccess(key: string) {
  await chrome.storage.local.set({ [getSyncGateKey(key)]: Date.now() });
}

// ── Core Operations ────────────────────────────────────────────────────────

/**
 * Centralized sync scheduler with debouncing and payload-safe storage.
 */
export function scheduleSync(
  key: string,
  payload: any,
  fn: (p: any) => Promise<void>,
) {
  // Store latest payload to avoid "last call wins" data loss
  pendingPayloads[key] = payload;

  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }

  debounceTimers[key] = setTimeout(() => {
    const data = pendingPayloads[key];
    delete debounceTimers[key];
    delete pendingPayloads[key];

    // Deduplication check
    const hash = stableStringify(data);
    if (lastHashes[key] === hash) {
      logSync(`${key}_skipped_unchanged`);
      return;
    }
    lastHashes[key] = hash;

    safePush(() => fn(data), key);
  }, 1500); // 1.5s debounce
}

/**
 * Internal: Push local state to Supabase.
 */
export async function pushState(entity: string, payload: any, force = false) {
  const user = await getCloudUserSafe();
  if (!user?.id) {
    return;
  }

  const profile_id = await getProfileId();
  const device_id = await getDeviceId();
  const ts = Date.now();
  const data = sanitizeStatePayload(entity, payload);
  const stateKey = `state_${entity}`;
  const nextHash = stableStringify(data);
  const localHashRes = await chrome.storage.local.get([hashKey(stateKey)]);

  if (localHashRes[hashKey(stateKey)] === nextHash) {
    logSync(`push_${entity}_skipped_unchanged_local`);
    return;
  }

  if (!(await shouldHitCloud(stateKey, force))) {
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from('sync_state')
    .select('payload,ts')
    .eq('user_id', user.id)
    .eq('profile_id', profile_id)
    .eq('entity', entity)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (
    existing &&
    stableStringify(parsePayload(existing.payload)) === nextHash
  ) {
    await chrome.storage.local.set({
      [`sync_ts_${entity}`]: existing.ts || ts,
      [hashKey(stateKey)]: nextHash,
    });
    await markSyncSuccess(stateKey);
    logSync(`push_${entity}_skipped_unchanged_cloud`);
    return;
  }

  logSync(`push_${entity}`, { device_id, force });

  const { error } = await supabase.from('sync_state').upsert(
    {
      user_id: user.id,
      profile_id,
      entity,
      device_id,
      payload: data,
      ts,
      diff_id: crypto.randomUUID(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,profile_id,entity' },
  );

  if (error) {
    throw error;
  }

  // Crucial: Update local timestamp so we don't pull our own stale push later!
  await chrome.storage.local.set({
    [`sync_ts_${entity}`]: ts,
    [hashKey(stateKey)]: nextHash,
  });

  await markSyncSuccess(stateKey);
  logSync(`push_${entity}_success`);
}

export function pushStateDebounced(
  entity: string,
  payload: any,
  force = false,
) {
  scheduleSync(`state_${entity}`, payload, (p) => pushState(entity, p, force));
}

export async function pushNextDNSConfig(force = false) {
  const res = await chrome.storage.local.get([
    STORAGE_KEYS.PROFILE_ID,
    STORAGE_KEYS.API_KEY,
  ]);
  const profileId = String(res[STORAGE_KEYS.PROFILE_ID] || '').trim();
  const apiKey = String(res[STORAGE_KEYS.API_KEY] || '').trim();

  if (!profileId || !apiKey) {
    return;
  }

  const user = await getCloudUserSafe();
  if (!user?.id) {
    return;
  }

  const encryptedKey = await encryptPayload(apiKey, user.id);

  await pushState(
    'nextdns',
    {
      profileId,
      apiKey: encryptedKey,
      updatedAt: Date.now(),
    },
    force,
  );
}

export function pushNextDNSConfigDebounced(force = false) {
  chrome.storage.local
    .get([STORAGE_KEYS.PROFILE_ID, STORAGE_KEYS.API_KEY])
    .then(async (res) => {
      const profileId = String(res[STORAGE_KEYS.PROFILE_ID] || '').trim();
      const apiKey = String(res[STORAGE_KEYS.API_KEY] || '').trim();
      if (!profileId || !apiKey) {
        return;
      }
      const user = await getCloudUserSafe();
      if (!user?.id) {
        return;
      }

      const encryptedKey = await encryptPayload(apiKey, user.id);

      pushStateDebounced(
        'nextdns',
        { profileId, apiKey: encryptedKey, updatedAt: Date.now() },
        force,
      );
    })
    .catch((err) => logSync('nextdns_config_read_failed', err.message));
}

export async function pushUsageToCloudInternal(
  params: { day: string; usage: any },
  force = false,
) {
  if (!(await shouldHitCloud(`usage_${params.day}`, force))) {
    return;
  }

  const { day, usage } = params;
  const user = await getCloudUserSafe();
  if (!user?.id) {
    return;
  }

  const profile_id = await getProfileId();
  const device_id = await getDeviceId();
  const rows = Object.entries(usage).map(([domain, data]: [string, any]) => ({
    user_id: user.id,
    profile_id,
    device_id,
    day,
    domain,
    time_ms: typeof data === 'number' ? data : data.time || 0,
    sessions: typeof data === 'number' ? 0 : data.sessions || 0,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) {
    return;
  }

  logSync('push_usage', { count: rows.length, day });

  const { error } = await supabase.from('usage_snapshots').upsert(rows, {
    onConflict: 'user_id,profile_id,device_id,day,domain',
  });

  if (error) {
    throw error;
  }
  await markSyncSuccess(`usage_${day}`);
  logSync('push_usage_success');
}

export function pushUsageToCloud(day: string, usage: any, force = false) {
  scheduleSync(`usage_${day}`, { day, usage }, (p) =>
    pushUsageToCloudInternal(p, force),
  );
}

const KEY_LAST_PULL_AT = 'last_cloud_pull_at';
async function shouldPullCloud(force = false): Promise<boolean> {
  if (force) {
    return true;
  }
  const res = await chrome.storage.local.get([KEY_LAST_PULL_AT]);
  const lastPull = (res[KEY_LAST_PULL_AT] as number) || 0;
  if (Date.now() - lastPull < SYNC_INTERVAL_MS) {
    return false;
  }
  return true;
}

export async function pullState(force = false) {
  if (!(await shouldPullCloud(force))) {
    return;
  }

  const user = await getCloudUserSafe();
  if (!user?.id) {
    return;
  }

  const profile_id = await getProfileId();
  logSync('pull_state', { profile_id });

  let { data: rows, error } = await supabase
    .from('sync_state')
    .select('*')
    .eq('user_id', user.id)
    .eq('profile_id', profile_id);

  if (error) {
    logSync('pull_state_failed', error.message);
    return;
  }

  if (!rows?.length) {
    const { data: allRows, error: allRowsError } = await supabase
      .from('sync_state')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (allRowsError) {
      logSync('pull_state_profile_discovery_failed', allRowsError.message);
      return;
    }

    const adoptedProfileId = allRows?.[0]?.profile_id;
    if (adoptedProfileId && adoptedProfileId !== profile_id) {
      rows = allRows.filter((row) => row.profile_id === adoptedProfileId);
      await chrome.storage.local.set({
        [KEY_PROFILE_ID]: adoptedProfileId,
        [KEY_PROFILE_ADOPTED_AT]: Date.now(),
      });
      logSync('pull_state_adopted_profile', { profile_id: adoptedProfileId });
    }
  }

  if (rows) {
    logSync('pull_state_success', { count: rows.length });
    for (const row of rows) {
      const payload = parsePayload(row.payload);
      await applyStateLocally(row.entity, payload, row.ts);
    }
    await chrome.storage.local.set({ [KEY_LAST_PULL_AT]: Date.now() });
  }
}

export async function pullUsageFromCloud(force = false) {
  if (!(await shouldHitCloud('usage_pull', force))) {
    return;
  }

  const user = await getCloudUserSafe();
  if (!user?.id) {
    return;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - USAGE_RESTORE_DAYS);
  const cutoffDay = cutoff.toLocaleDateString('en-CA');

  const { data: rows, error } = await supabase
    .from('usage_snapshots')
    .select('day,domain,time_ms,sessions,updated_at')
    .eq('user_id', user.id)
    .gte('day', cutoffDay)
    .order('day', { ascending: true });

  if (error) {
    logSync('pull_usage_failed', error.message);
    return;
  }

  const history: Record<
    string,
    Record<string, { time: number; sessions: number }>
  > = {};
  const current: Record<string, { time: number; sessions: number }> = {};
  const today = todayKey();

  for (const row of rows || []) {
    const target = row.day === today ? current : (history[row.day] ||= {});
    const existing = target[row.domain] || { time: 0, sessions: 0 };
    target[row.domain] = {
      time: Math.max(existing.time || 0, Number(row.time_ms) || 0),
      sessions: Math.max(existing.sessions || 0, Number(row.sessions) || 0),
    };
  }

  const local = await chrome.storage.local.get([
    STORAGE_KEYS.USAGE,
    STORAGE_KEYS.USAGE_HISTORY,
  ]);
  const localUsage = (local[STORAGE_KEYS.USAGE] || {}) as Record<
    string,
    { time?: number; sessions?: number }
  >;
  const localHistory = (local[STORAGE_KEYS.USAGE_HISTORY] || {}) as Record<
    string,
    Record<string, { time: number; sessions: number }>
  >;
  const mergedCurrent = { ...localUsage };
  for (const [domain, cloudEntry] of Object.entries(current)) {
    const localEntry = mergedCurrent[domain] || { time: 0, sessions: 0 };
    mergedCurrent[domain] = {
      time: Math.max(localEntry.time || 0, cloudEntry.time || 0),
      sessions: Math.max(localEntry.sessions || 0, cloudEntry.sessions || 0),
    };
  }
  const mergedHistory = {
    ...localHistory,
    ...history,
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.USAGE]: mergedCurrent,
    [STORAGE_KEYS.USAGE_HISTORY]: mergedHistory,
  });
  await markSyncSuccess('usage_pull');
  logSync('pull_usage_success', { count: rows?.length || 0 });
}

/**
 * Trigger a full daily synchronization:
 * 1. Pull latest rules/schedules from cloud
 * 2. Push final state back to cloud
 */
export async function triggerDailySync(
  entities: Record<string, any>,
  lastDay?: { day: string; usage: any },
) {
  logSync('trigger_daily_sync_start');

  // 1. Pull first to get any changes from other devices (if any) or just to stay in sync
  await pullState(true);
  await pullUsageFromCloud(true);

  // 2. Push current entities
  for (const [entity, payload] of Object.entries(entities)) {
    await pushState(entity, payload, true);
  }

  // 3. Push last day's usage if provided
  if (lastDay) {
    await pushUsageToCloudInternal(lastDay, true);
  }

  logSync('trigger_daily_sync_complete');
}

let activeChannel: any = null;

/**
 * Subscribe to realtime changes.
 */
export function subscribeToSync() {
  if (activeChannel) {
    return;
  }

  logSync('subscribing_realtime');
  activeChannel = supabase
    .channel('sync_state_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sync_state',
      },
      async (payload) => {
        const row = payload.new as any;
        if (row) {
          const [user, profileId, deviceId] = await Promise.all([
            getCloudUserSafe(),
            getProfileId(),
            getDeviceId(),
          ]);
          if (
            row.user_id !== user?.id ||
            row.profile_id !== profileId ||
            row.device_id === deviceId
          ) {
            return;
          }
          logSync('realtime_event', { entity: row.entity });
          applyStateLocally(row.entity, row.payload, row.ts);
        }
      },
    )
    .subscribe((status) => {
      logSync('realtime_status', status);
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        activeChannel = null;
      }
    });
}

/**
 * Apply incoming cloud state to local storage.
 */
async function applyStateLocally(
  entity: string,
  payload: any,
  incomingTs: number,
) {
  const storageKey = `sync_ts_${entity}`;
  const res = await chrome.storage.local.get([storageKey]);
  const localTs = (res[storageKey] as number) || 0;

  if (incomingTs > localTs) {
    const finalPayload =
      typeof payload === 'string' ? JSON.parse(payload) : payload;
    if (entity === 'nextdns') {
      const user = await getCloudUserSafe();
      let finalApiKey = finalPayload.apiKey || '';
      if (user?.id) {
        finalApiKey = await decryptPayload(finalApiKey, user.id);
      }

      await chrome.storage.local.set({
        _sync_in_progress_nextdns: true,
        [STORAGE_KEYS.PROFILE_ID]: finalPayload.profileId || '',
        [STORAGE_KEYS.API_KEY]: finalApiKey,
        [storageKey]: incomingTs,
      });

      logSync('applied_local', { entity, ts: incomingTs });

      setTimeout(() => {
        chrome.storage.local
          .remove('_sync_in_progress_nextdns')
          .catch(() => {});
      }, 1000);
      return;
    }

    const localKey = ENTITY_STORAGE_KEYS[entity] || entity;

    // To prevent infinite loops: mark this as an incoming sync
    await chrome.storage.local.set({
      [`_sync_in_progress_${entity}`]: true,
      [localKey]:
        entity === 'rules' || entity === 'schedules'
          ? JSON.stringify(finalPayload)
          : finalPayload,
      [storageKey]: incomingTs,
    });

    logSync('applied_local', { entity, ts: incomingTs });

    setTimeout(() => {
      chrome.storage.local
        .remove(`_sync_in_progress_${entity}`)
        .catch(() => {});
    }, 1000);
  }
}
