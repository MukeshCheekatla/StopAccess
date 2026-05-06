import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StorageAdapter,
  CloudSyncConfig,
  NextDNSConfig,
  AppRule,
  ScheduleRule,
} from '@stopaccess/types';
import { encryptPayload, decryptPayload } from '@stopaccess/core';

const KEY_SYNC_PROFILE_ID = 'profile_id';
const KEY_DEVICE_ID = 'device_id';
const KEY_LAST_SYNC_AT = 'last_cloud_sync_at';
const KEY_LAST_PULL_AT = 'last_cloud_pull_at';

// Sync intervals: much shorter for state, reasonable for usage to avoid spam
const INTERVALS: Record<string, number> = {
  usage: 10 * 60 * 1000, // 10 minutes
  rules: 60 * 1000, // 1 minute
  schedules: 60 * 1000, // 1 minute
  nextdns: 60 * 1000, // 1 minute
  default: 24 * 60 * 60 * 1000, // 24 hours fallback
};

export interface SyncLogger {
  add: (
    level: 'info' | 'warn' | 'error',
    message: string,
    detail?: string,
  ) => void;
}

export class CloudSyncManager {
  private supabase: SupabaseClient;
  private storage: StorageAdapter;
  private config: CloudSyncConfig;
  private logger?: SyncLogger;

  constructor(
    config: CloudSyncConfig,
    storage: StorageAdapter,
    logger?: SyncLogger,
  ) {
    this.config = config;
    this.storage = storage;
    this.logger = logger;

    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        storage: {
          getItem: (key: string) => this.storage.getString(key),
          setItem: (key: string, value: string) => this.storage.set(key, value),
          removeItem: (key: string) => this.storage.delete(key),
        } as any,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  private log(event: string, meta: any = '') {
    const msg = `[CloudSync] ${event}`;
    console.log(msg, meta);
    if (
      this.logger &&
      typeof meta === 'string' &&
      (meta.includes('failed') || meta.includes('Retry'))
    ) {
      this.logger.add('warn', msg, meta);
    }
  }

  async getDeviceId(): Promise<string> {
    const id = await this.storage.getString(KEY_DEVICE_ID);
    if (id) {
      return id;
    }
    const newId = crypto.randomUUID();
    await this.storage.set(KEY_DEVICE_ID, newId);
    return newId;
  }

  async getProfileId(): Promise<string> {
    const id = await this.storage.getString(KEY_SYNC_PROFILE_ID);
    if (id) {
      return id;
    }
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    const newId = user?.id ? `user:${user.id}` : crypto.randomUUID();
    await this.storage.set(KEY_SYNC_PROFILE_ID, newId);
    return newId;
  }

  async pushState(entity: string, payload: any, force = false) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user?.id) {
      return;
    }

    const profileId = await this.getProfileId();
    const deviceId = await this.getDeviceId();
    const ts = Date.now();

    if (!force && !(await this.shouldHitCloud(entity))) {
      return;
    }

    try {
      if (entity === 'rules' && Array.isArray(payload)) {
        await this.pushRules(user.id, profileId, deviceId, payload);
      } else if (entity === 'schedules' && Array.isArray(payload)) {
        await this.pushSchedules(user.id, profileId, deviceId, payload);
      } else if (entity === 'nextdns') {
        await this.pushNextDNSRow(user.id, profileId, deviceId, payload);
      } else {
        // Fallback to legacy sync_state for other entities (focus, etc)
        const { error } = await this.supabase.from('sync_state').upsert(
          {
            user_id: user.id,
            profile_id: profileId,
            entity,
            device_id: deviceId,
            payload,
            ts,
            diff_id: crypto.randomUUID(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,profile_id,entity' },
        );
        if (error) {
          throw error;
        }
      }

      await this.storage.set(`sync_ts_${entity}`, ts);
      await this.markSyncSuccess(entity);
      this.log(`push_${entity}_success`);
    } catch (err: any) {
      this.log(`push_${entity}_failed`, err.message);
      throw err;
    }
  }

  private async pushRules(
    userId: string,
    profileId: string,
    deviceId: string,
    rules: AppRule[],
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

    const { error } = await this.supabase.from('user_rules').upsert(rows, {
      onConflict: 'user_id,profile_id,package_name',
    });
    if (error) {
      throw error;
    }
  }

  private async pushSchedules(
    userId: string,
    profileId: string,
    deviceId: string,
    schedules: ScheduleRule[],
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

    const { error } = await this.supabase.from('user_schedules').upsert(rows, {
      onConflict: 'user_id,profile_id,schedule_id',
    });
    if (error) {
      throw error;
    }
  }

  private async pushNextDNSRow(
    userId: string,
    profileId: string,
    deviceId: string,
    payload: any,
  ) {
    const { error } = await this.supabase.from('user_nextdns').upsert(
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

  private async shouldHitCloud(entity: string): Promise<boolean> {
    const syncKey = `${KEY_LAST_SYNC_AT}_${entity}`;
    const lastSync = await this.storage.getNumber(syncKey, 0);
    const interval = INTERVALS[entity] || INTERVALS.default;
    return Date.now() - (lastSync || 0) >= interval;
  }

  private async markSyncSuccess(entity: string) {
    await this.storage.set(`${KEY_LAST_SYNC_AT}_${entity}`, Date.now());
  }

  async pullState(force = false) {
    if (!force) {
      const lastPull = await this.storage.getNumber(KEY_LAST_PULL_AT, 0);
      if (Date.now() - (lastPull || 0) < INTERVALS.rules) {
        return;
      }
    }

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user?.id) {
      return;
    }

    const profileId = await this.getProfileId();

    // Pull from all normalized tables
    const [rulesRes, schedulesRes, nextdnsRes, legacyRes] = await Promise.all([
      this.supabase
        .from('user_rules')
        .select('*')
        .eq('user_id', user.id)
        .eq('profile_id', profileId),
      this.supabase
        .from('user_schedules')
        .select('*')
        .eq('user_id', user.id)
        .eq('profile_id', profileId),
      this.supabase
        .from('user_nextdns')
        .select('*')
        .eq('user_id', user.id)
        .eq('profile_id', profileId)
        .maybeSingle(),
      this.supabase
        .from('sync_state')
        .select('*')
        .eq('user_id', user.id)
        .eq('profile_id', profileId),
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
      await this.applyStateLocally('rules', rules, maxTs);
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
      await this.applyStateLocally('schedules', schedules, maxTs);
    }

    if (nextdnsRes.data) {
      const payload = {
        profileId: nextdnsRes.data.encrypted_profile_id,
        apiKey: nextdnsRes.data.encrypted_api_key,
        updatedAt: nextdnsRes.data.updated_at,
      };
      await this.applyStateLocally(
        'nextdns',
        payload,
        Number(payload.updatedAt) || 0,
      );
    }

    if (legacyRes.data) {
      for (const row of legacyRes.data) {
        await this.applyStateLocally(row.entity, row.payload, row.ts);
      }
    }

    await this.storage.set(KEY_LAST_PULL_AT, Date.now());
  }

  private async applyStateLocally(
    entity: string,
    payload: any,
    incomingTs: number,
  ) {
    const tsKey = `sync_ts_${entity}`;
    const localTs = await this.storage.getNumber(tsKey, 0);

    if (incomingTs >= (localTs || 0)) {
      this.log('applied_local', { entity, ts: incomingTs });
      await this.storage.set(tsKey, incomingTs);
      // Actual storage apply logic would be here, but manager is intended to be generic
    }
  }

  async pushUsage(day: string, usage: Record<string, any>, force = false) {
    if (!force && !(await this.shouldHitCloud('usage'))) {
      return;
    }

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user?.id) {
      return;
    }

    const profileId = await this.getProfileId();
    const deviceId = await this.getDeviceId();

    const rows = Object.entries(usage).map(([domain, data]: [string, any]) => ({
      user_id: user.id,
      profile_id: profileId,
      device_id: deviceId,
      day,
      domain,
      time_ms: typeof data === 'number' ? data : data.time || 0,
      sessions: typeof data === 'number' ? 0 : data.sessions || 0,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      return;
    }

    this.log('push_usage', { count: rows.length, day });

    const { error } = await this.supabase.from('usage_snapshots').upsert(rows, {
      onConflict: 'user_id,profile_id,device_id,day,domain',
    });

    if (error) {
      throw error;
    }
    await this.markSyncSuccess('usage');
  }

  async pullUsage(daysBack = 30) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user?.id) {
      return [];
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffDay = cutoff.toLocaleDateString('en-CA');

    const { data: rows, error } = await this.supabase
      .from('usage_snapshots')
      .select('day,domain,time_ms,sessions,updated_at')
      .eq('user_id', user.id)
      .gte('day', cutoffDay)
      .order('day', { ascending: true });

    if (error) {
      this.log('pull_usage_failed', error.message);
      return [];
    }

    return rows || [];
  }

  async pushNextDNSConfig(config: NextDNSConfig, force = false) {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user?.id || !config.apiKey || !config.profileId) {
      return;
    }

    const [encryptedProfileId, encryptedKey] = await Promise.all([
      encryptPayload(config.profileId, user.id),
      encryptPayload(config.apiKey, user.id),
    ]);

    await this.pushState(
      'nextdns',
      {
        profileId: encryptedProfileId,
        apiKey: encryptedKey,
        updatedAt: Date.now(),
      },
      force,
    );
  }

  async pullNextDNSConfig(): Promise<NextDNSConfig | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user?.id) {
      return null;
    }

    const profileId = await this.getProfileId();
    const { data: row, error } = await this.supabase
      .from('user_nextdns')
      .select('*')
      .eq('user_id', user.id)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error || !row) {
      return null;
    }

    const encryptedProfileId = row.encrypted_profile_id;
    const encryptedKey = row.encrypted_api_key;
    if (!encryptedKey) {
      return null;
    }

    let nextdnsProfileId = '';
    let nextdnsApiKey = '';
    try {
      if (encryptedProfileId) {
        nextdnsProfileId = await decryptPayload(encryptedProfileId, user.id);
        nextdnsApiKey = await decryptPayload(encryptedKey, user.id);
      } else {
        const decrypted = await decryptPayload(encryptedKey, user.id);
        const parts = decrypted.split('::');
        if (parts.length === 2) {
          nextdnsProfileId = parts[0];
          nextdnsApiKey = parts[1];
        } else {
          nextdnsApiKey = decrypted;
        }
      }
    } catch (e) {
      this.log('decrypt_nextdns_failed', String(e));
      return null;
    }

    if (!nextdnsProfileId || !nextdnsApiKey) {
      this.log('pull_nextdns_skipped_incomplete');
      return null;
    }

    return {
      profileId: nextdnsProfileId,
      apiKey: nextdnsApiKey,
    };
  }
}
