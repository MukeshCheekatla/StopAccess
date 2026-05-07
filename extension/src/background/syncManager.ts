import { supabase, getCloudUserSafe } from '@/lib/supabase';
import { extensionLogger } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
import {
  encryptPayload,
  decryptPayload,
  stableStringify,
  sanitizeRule,
} from '@stopaccess/core';

const KEY_SYNC_PROFILE_ID = 'profile_id';
const KEY_DEVICE_ID = 'device_id';
const KEY_LAST_SYNC_AT = 'last_cloud_sync_at';

// Optimized intervals to reduce DB pressure
const INTERVALS: Record<string, number> = {
  usage: 10 * 60 * 1000, // 10 minutes
  rules: 60 * 1000, // 1 minute (reactive)
  schedules: 60 * 1000, // 1 minute
  nextdns: 60 * 1000, // 1 minute
  default: 24 * 60 * 60 * 1000,
};

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

function logSync(event: string, meta: any = '') {
  const msg = `[Sync] ${event}`;
  console.log(msg, meta);
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
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function sanitizeStatePayload(entity: string, payload: any): any {
  const data = parsePayload(payload);
  if (data === undefined || data === null) {
    return null;
  }
  if (
    entity === 'focus' &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Object.keys(data).length === 0
  ) {
    return null;
  }
  if (entity === 'rules' && Array.isArray(data)) {
    return data.map(sanitizeRule);
  }
  return data;
}

function normalizeFocusSessionPayload(payload: any): any {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const status = payload.status;
  if (status !== 'focusing' && status !== 'paused') {
    return null;
  }

  const startedAt = Number(payload.startedAt);
  const duration = Number(payload.duration);
  const elapsed = Math.max(0, Number(payload.elapsed) || 0);
  const lastActivatedAt = payload.lastActivatedAt
    ? Number(payload.lastActivatedAt)
    : undefined;

  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return null;
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  if (
    !Array.isArray(payload.blockedDomains) ||
    payload.blockedDomains.some((domain: unknown) => typeof domain !== 'string')
  ) {
    return null;
  }

  const computedElapsed =
    status === 'focusing'
      ? elapsed +
        Math.max(
          0,
          Math.floor((Date.now() - (lastActivatedAt || startedAt)) / 1000),
        )
      : elapsed;

  if (computedElapsed >= duration * 60) {
    return null;
  }

  return {
    ...payload,
    startedAt,
    duration,
    elapsed,
    lastActivatedAt,
  };
}

async function safePush(fn: () => Promise<any>, key: string) {
  try {
    await fn();
  } catch (err: any) {
    logSync(`${key}_failed`, err.message);
    setTimeout(() => {
      logSync(`${key}_retrying`);
      fn().catch((e) => logSync(`${key}_retry_failed`, e.message));
    }, 5000);
  }
}

export async function getDeviceId(): Promise<string> {
  const res = await chrome.storage.local.get([KEY_DEVICE_ID]);
  if (res[KEY_DEVICE_ID]) {
    return res[KEY_DEVICE_ID] as string;
  }
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [KEY_DEVICE_ID]: id });
  return id;
}

export async function getProfileId(): Promise<string> {
  const res = await chrome.storage.local.get([KEY_SYNC_PROFILE_ID]);
  if (res[KEY_SYNC_PROFILE_ID]) {
    return res[KEY_SYNC_PROFILE_ID] as string;
  }
  const user = await getCloudUserSafe().catch(() => null);
  const id = user?.id ? `user:${user.id}` : crypto.randomUUID();
  await chrome.storage.local.set({ [KEY_SYNC_PROFILE_ID]: id });
  return id;
}

function getSyncGateKey(key: string): string {
  return `${KEY_LAST_SYNC_AT}_${key}`;
}

async function shouldHitCloud(entity: string, force = false): Promise<boolean> {
  if (force) {
    return true;
  }
  const syncKey = getSyncGateKey(entity);
  const res = await chrome.storage.local.get([syncKey]);
  const lastSync = (res[syncKey] as number) || 0;
  const now = Date.now();
  const interval = INTERVALS[entity] || INTERVALS.default;

  if (now - lastSync < interval) {
    return false;
  }
  return true;
}

async function markSyncSuccess(entity: string) {
  await chrome.storage.local.set({ [getSyncGateKey(entity)]: Date.now() });
}

// ── Core Operations ────────────────────────────────────────────────────────

export function scheduleSync(
  key: string,
  payload: any,
  fn: (p: any) => Promise<void>,
) {
  pendingPayloads[key] = payload;
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }

  debounceTimers[key] = setTimeout(() => {
    const data = pendingPayloads[key];
    delete debounceTimers[key];
    delete pendingPayloads[key];

    const hash = stableStringify(data);
    if (lastHashes[key] === hash) {
      return;
    }
    lastHashes[key] = hash;

    safePush(() => fn(data), key);
  }, 1500);
}

export async function pushState(entity: string, payload: any, force = false) {
  const user = await getCloudUserSafe();
  if (!user?.id) {
    return;
  }

  const profile_id = await getProfileId();
  const device_id = await getDeviceId();
  const data = sanitizeStatePayload(entity, payload);
  const stateKey = `state_${entity}`;
  const nextHash = stableStringify(data);
  const localHashRes = await chrome.storage.local.get([hashKey(stateKey)]);

  if (localHashRes[hashKey(stateKey)] === nextHash && !force) {
    return;
  }

  if (!(await shouldHitCloud(entity, force))) {
    return;
  }

  try {
    if (entity === 'rules' && Array.isArray(data)) {
      await pushRules(user.id, profile_id, device_id, data);
    } else if (entity === 'schedules' && Array.isArray(data)) {
      await pushSchedules(user.id, profile_id, device_id, data);
    } else if (entity === 'nextdns') {
      await pushNextDNSRow(user.id, profile_id, device_id, data);
    } else {
      // Legacy fallback for other entities (focus, etc)
      const { error } = await supabase.from('sync_state').upsert(
        {
          user_id: user.id,
          profile_id,
          entity,
          device_id,
          payload: data,
          ts: Date.now(),
          diff_id: crypto.randomUUID(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,profile_id,entity' },
      );
      if (error) {
        throw error;
      }
    }

    await chrome.storage.local.set({
      [`sync_ts_${entity}`]: Date.now(),
      [hashKey(stateKey)]: nextHash,
    });
    await markSyncSuccess(entity);
    logSync(`push_${entity}_success`);
  } catch (err: any) {
    logSync(`push_${entity}_failed`, err.message);
    throw err;
  }
}

async function pushRules(
  userId: string,
  profileId: string,
  deviceId: string,
  rules: any[],
) {
  const rows = rules
    .filter((r) => r.type !== 'category') // Categories are handled directly via NextDNS
    .map((r) => ({
      user_id: userId,
      profile_id: profileId,
      package_name: r.packageName,
      app_name: r.appName,
      type: r.type,
      custom_domain: r.customDomain,
      scope: r.scope,
      mode: r.mode,
      daily_limit_minutes: r.dailyLimitMinutes,
      desired_blocking_state: r.desiredBlockingState,
      max_daily_passes: r.maxDailyPasses,
      added_at: r.addedAt,
      updated_at: r.updatedAt,
      added_by_user: r.addedByUser,
      device_id: deviceId,
      diff_id: crypto.randomUUID(),
      cloud_updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from('user_rules').upsert(rows, {
    onConflict: 'user_id,profile_id,package_name',
  });
  if (error) {
    throw error;
  }
}

async function pushSchedules(
  userId: string,
  profileId: string,
  deviceId: string,
  schedules: any[],
) {
  const rows = schedules.map((s) => ({
    user_id: userId,
    profile_id: profileId,
    schedule_id: s.id,
    name: s.name,
    start_time: s.startTime,
    end_time: s.endTime,
    days: s.days,
    app_names: s.appNames,
    active: s.active,
    updated_at: s.updatedAt,
    device_id: deviceId,
    diff_id: crypto.randomUUID(),
    cloud_updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('user_schedules').upsert(rows, {
    onConflict: 'user_id,profile_id,schedule_id',
  });
  if (error) {
    throw error;
  }
}

async function pushNextDNSRow(
  userId: string,
  profileId: string,
  deviceId: string,
  payload: any,
) {
  const { error } = await supabase.from('user_nextdns').upsert(
    {
      user_id: userId,
      profile_id: profileId,
      encrypted_profile_id: payload.profileId,
      encrypted_api_key: payload.apiKey,
      device_id: deviceId,
      updated_at: payload.updatedAt,
      diff_id: crypto.randomUUID(),
      cloud_updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,profile_id' },
  );
  if (error) {
    throw error;
  }
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
  const [encryptedProfileId, encryptedKey] = await Promise.all([
    encryptPayload(profileId, user.id),
    encryptPayload(apiKey, user.id),
  ]);
  await pushState(
    'nextdns',
    {
      profileId: encryptedProfileId,
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
      const [encryptedProfileId, encryptedKey] = await Promise.all([
        encryptPayload(profileId, user.id),
        encryptPayload(apiKey, user.id),
      ]);
      pushStateDebounced(
        'nextdns',
        {
          profileId: encryptedProfileId,
          apiKey: encryptedKey,
          updatedAt: Date.now(),
        },
        force,
      );
    })
    .catch((err) => logSync('nextdns_config_read_failed', err.message));
}

export async function pushUsageToCloudInternal(
  params: { day: string; usage: any },
  force = false,
) {
  if (!(await shouldHitCloud('usage', force))) {
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
  await markSyncSuccess('usage');
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
  return Date.now() - lastPull >= INTERVALS.rules;
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

  // Pull from all normalized tables
  const [rulesRes, schedulesRes, nextdnsRes, legacyRes] = await Promise.all([
    supabase
      .from('user_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('profile_id', profile_id),
    supabase
      .from('user_schedules')
      .select('*')
      .eq('user_id', user.id)
      .eq('profile_id', profile_id),
    supabase
      .from('user_nextdns')
      .select('*')
      .eq('user_id', user.id)
      .eq('profile_id', profile_id)
      .maybeSingle(),
    supabase
      .from('sync_state')
      .select('*')
      .eq('user_id', user.id)
      .eq('profile_id', profile_id),
  ]);

  if (rulesRes.data && rulesRes.data.length > 0) {
    const rules = rulesRes.data.map((r) => ({
      packageName: r.package_name,
      appName: r.app_name,
      type: r.type,
      customDomain: r.custom_domain,
      scope: r.scope,
      mode: r.mode,
      dailyLimitMinutes: r.daily_limit_minutes,
      desiredBlockingState: r.desired_blocking_state,
      maxDailyPasses: r.max_daily_passes,
      addedAt: r.added_at,
      updatedAt: r.updated_at,
      addedByUser: r.added_by_user,
    }));
    const maxTs = Math.max(
      ...rulesRes.data.map((r) => Number(r.updated_at) || 0),
    );
    await applyStateLocally('rules', rules, maxTs);
  }

  if (schedulesRes.data && schedulesRes.data.length > 0) {
    const schedules = schedulesRes.data.map((s) => ({
      id: s.schedule_id,
      name: s.name,
      startTime: s.start_time,
      endTime: s.end_time,
      days: s.days,
      appNames: s.app_names,
      active: s.active,
      updatedAt: s.updated_at,
    }));
    const maxTs = Math.max(
      ...schedulesRes.data.map((s) => Number(s.updated_at) || 0),
    );
    await applyStateLocally('schedules', schedules, maxTs);
  }

  if (nextdnsRes.data) {
    const payload = {
      profileId: nextdnsRes.data.encrypted_profile_id,
      apiKey: nextdnsRes.data.encrypted_api_key,
      updatedAt: nextdnsRes.data.updated_at,
    };
    await applyStateLocally('nextdns', payload, Number(payload.updatedAt) || 0);
  }

  if (legacyRes.data) {
    for (const row of legacyRes.data) {
      const payload = parsePayload(row.payload);
      await applyStateLocally(row.entity, payload, row.ts);
    }
  }

  await chrome.storage.local.set({ [KEY_LAST_PULL_AT]: Date.now() });
}

export async function pullUsageFromCloud(_force = false) {
  const user = await getCloudUserSafe();
  if (!user?.id) {
    return;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
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

  const history: any = {};
  const current: any = {};
  const today = new Date().toLocaleDateString('en-CA');

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
  const localUsage = local[STORAGE_KEYS.USAGE] || {};
  const localHistory = local[STORAGE_KEYS.USAGE_HISTORY] || {};

  await chrome.storage.local.set({
    [STORAGE_KEYS.USAGE]: { ...(localUsage as any), ...current },
    [STORAGE_KEYS.USAGE_HISTORY]: { ...(localHistory as any), ...history },
  });
  logSync('pull_usage_success', { count: rows?.length || 0 });
}

export async function triggerDailySync(
  entities: Record<string, any>,
  lastDay?: { day: string; usage: any },
) {
  logSync('trigger_daily_sync_start');
  await pullState(true);
  await pullUsageFromCloud();
  for (const [entity, payload] of Object.entries(entities)) {
    await pushState(entity, payload, true);
  }
  if (lastDay) {
    await pushUsageToCloudInternal(lastDay, true);
  }
  logSync('trigger_daily_sync_complete');
}

let activeChannel: any = null;
export function subscribeToSync() {
  if (activeChannel) {
    return;
  }
  activeChannel = supabase
    .channel('sync_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_rules' },
      async (_p) => {
        // Handle realtime for normalized tables if needed
      },
    )
    .subscribe();
}

async function applyStateLocally(
  entity: string,
  payload: any,
  incomingTs: number,
) {
  const storageKey = `sync_ts_${entity}`;
  const res = await chrome.storage.local.get([storageKey]);
  const localTs = (res[storageKey] as number) || 0;

  if (incomingTs >= localTs) {
    const finalPayload =
      typeof payload === 'string' ? JSON.parse(payload) : payload;
    if (entity === 'nextdns') {
      const user = await getCloudUserSafe();
      let finalApiKey = finalPayload.apiKey || '';
      let nextdnsProfileId = finalPayload.profileId || '';
      if (user?.id && finalApiKey) {
        try {
          if (nextdnsProfileId) {
            nextdnsProfileId = await decryptPayload(nextdnsProfileId, user.id);
            finalApiKey = await decryptPayload(finalApiKey, user.id);
          } else {
            const decrypted = await decryptPayload(finalApiKey, user.id);
            const parts = decrypted.split('::');
            if (parts.length === 2) {
              nextdnsProfileId = parts[0];
              finalApiKey = parts[1];
            } else {
              finalApiKey = decrypted;
            }
          }
        } catch (e) {
          logSync('decrypt_nextdns_failed', String(e));
          return;
        }
      }

      if (!nextdnsProfileId || !finalApiKey) {
        logSync('pull_nextdns_skipped_incomplete');
        return;
      }

      await chrome.storage.local.set({
        _sync_in_progress_nextdns: true,
        [STORAGE_KEYS.PROFILE_ID]: nextdnsProfileId,
        [STORAGE_KEYS.API_KEY]: finalApiKey,
        [storageKey]: incomingTs || Date.now(),
      });
      setTimeout(
        () => chrome.storage.local.remove('_sync_in_progress_nextdns'),
        1000,
      );
      return;
    }

    if (entity === 'focus') {
      const session = normalizeFocusSessionPayload(finalPayload);
      await chrome.storage.local.set({
        _sync_in_progress_focus: true,
        [STORAGE_KEYS.SESSION]: session,
        [STORAGE_KEYS.SESSION_START]: session?.startedAt || 0,
        [STORAGE_KEYS.FOCUS_END]:
          session?.status === 'focusing'
            ? session.startedAt + session.duration * 60000
            : 0,
        [storageKey]: incomingTs || Date.now(),
      });
      setTimeout(
        () => chrome.storage.local.remove('_sync_in_progress_focus'),
        1000,
      );
      return;
    }

    const localKey = ENTITY_STORAGE_KEYS[entity] || entity;
    await chrome.storage.local.set({
      [`_sync_in_progress_${entity}`]: true,
      [localKey]:
        entity === 'rules' || entity === 'schedules'
          ? JSON.stringify(finalPayload)
          : finalPayload,
      [storageKey]: incomingTs || Date.now(),
    });
    setTimeout(
      () => chrome.storage.local.remove(`_sync_in_progress_${entity}`),
      1000,
    );
  }
}
