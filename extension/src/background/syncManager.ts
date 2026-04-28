import { supabase, getCloudUserSafe } from '../lib/supabase';
import { extensionLogger } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';

const KEY_PROFILE_ID = 'profile_id';
const KEY_DEVICE_ID = 'device_id';
const KEY_LAST_SYNC_AT = 'last_cloud_sync_at';
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

/**
 * Deterministic stringify to ensure consistent hashing even if key order changes.
 */
function stableStringify(obj: any): string {
  if (!obj || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(',')}}`;
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

  const id = crypto.randomUUID();
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
  if (!(await shouldHitCloud(`state_${entity}`, force))) {
    return;
  }

  const user = await getCloudUserSafe();
  if (!user?.id) {
    return;
  }

  const profile_id = await getProfileId();
  const device_id = await getDeviceId();
  const ts = Date.now();

  logSync(`push_${entity}`, { device_id, force });

  // Strip daily state from rules so they don't conflict across devices
  let data = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (entity === 'rules' && Array.isArray(data)) {
    data = data.map(
      ({
        usedMinutesToday: _u,
        blockedToday: _b,
        extensionCountToday: _e,
        isLimitHit: _l,
        lastUsedAt: _la,
        ...rest
      }) => rest,
    );
  }

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
  await chrome.storage.local.set({ [`sync_ts_${entity}`]: ts });

  await markSyncSuccess(`state_${entity}`);
  logSync(`push_${entity}_success`);
}

export function pushStateDebounced(
  entity: string,
  payload: any,
  force = false,
) {
  scheduleSync(`state_${entity}`, payload, (p) => pushState(entity, p, force));
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

  const rows = Object.entries(usage).map(([domain, data]: [string, any]) => ({
    user_id: user.id,
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
    onConflict: 'user_id,day,domain',
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

  const { data: rows, error } = await supabase
    .from('sync_state')
    .select('*')
    .eq('user_id', user.id)
    .eq('profile_id', profile_id);

  if (error) {
    logSync('pull_state_failed', error.message);
    return;
  }

  if (rows) {
    logSync('pull_state_success', { count: rows.length });
    for (const row of rows) {
      const payload =
        typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
      await applyStateLocally(row.entity, payload, row.ts);
    }
    await chrome.storage.local.set({ [KEY_LAST_PULL_AT]: Date.now() });
  }
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
      (payload) => {
        const row = payload.new as any;
        if (row) {
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
