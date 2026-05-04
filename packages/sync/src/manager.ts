import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  StorageAdapter,
  CloudSyncConfig,
  NextDNSConfig,
} from '@stopaccess/types';
import {
  stableStringify,
  encryptPayload,
  decryptPayload,
} from '@stopaccess/core';

const KEY_PROFILE_ID = 'profile_id';
const KEY_DEVICE_ID = 'device_id';
const KEY_LAST_SYNC_AT = 'last_cloud_sync_at';
const KEY_LAST_PULL_AT = 'last_cloud_pull_at';
const DEFAULT_SYNC_INTERVAL = 24 * 60 * 60 * 1000;

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

  private pendingPayloads: Record<string, any> = {};
  private debounceTimers: Record<string, any> = {};
  private lastHashes: Record<string, string> = {};

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
        detectSessionInUrl: false, // Usually false for background/mobile
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
    const id = await this.storage.getString(KEY_PROFILE_ID);
    if (id) {
      return id;
    }

    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    const newId = user?.id ? `user:${user.id}` : crypto.randomUUID();
    await this.storage.set(KEY_PROFILE_ID, newId);
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
    const data = this.sanitizePayload(entity, payload);
    const hash = stableStringify(data);

    const stateKey = `state_${entity}`;
    const localHash = await this.storage.getString(`sync_hash_${stateKey}`);

    if (!force && localHash === hash) {
      this.log(`push_${entity}_skipped_unchanged_local`);
      return;
    }

    if (!force && !(await this.shouldHitCloud(stateKey))) {
      return;
    }

    const { error } = await this.supabase.from('sync_state').upsert(
      {
        user_id: user.id,
        profile_id: profileId,
        entity,
        device_id: deviceId,
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

    await this.storage.set(`sync_ts_${entity}`, ts);
    await this.storage.set(`sync_hash_${stateKey}`, hash);
    await this.markSyncSuccess(stateKey);
    this.log(`push_${entity}_success`);
  }

  private sanitizePayload(entity: string, payload: any): any {
    if (entity === 'rules' && Array.isArray(payload)) {
      const allowedKeys = [
        'packageName',
        'appName',
        'type',
        'customDomain',
        'scope',
        'mode',
        'dailyLimitMinutes',
        'desiredBlockingState',
        'maxDailyPasses',
        'addedAt',
        'updatedAt',
        'addedByUser',
      ];

      return payload.map((rule) => {
        return allowedKeys.reduce((acc: Record<string, any>, key) => {
          if (rule[key] !== undefined) {
            acc[key] = rule[key];
          }
          return acc;
        }, {});
      });
    }
    return payload;
  }

  private async shouldHitCloud(key: string): Promise<boolean> {
    const syncKey = `${KEY_LAST_SYNC_AT}_${key}`;
    const lastSync = await this.storage.getNumber(syncKey, 0);
    const interval = this.config.syncIntervalMs || DEFAULT_SYNC_INTERVAL;
    return Date.now() - (lastSync || 0) >= interval;
  }

  private async markSyncSuccess(key: string) {
    await this.storage.set(`${KEY_LAST_SYNC_AT}_${key}`, Date.now());
  }

  async pullState(force = false) {
    if (!force) {
      const lastPull = await this.storage.getNumber(KEY_LAST_PULL_AT, 0);
      const interval = this.config.syncIntervalMs || DEFAULT_SYNC_INTERVAL;
      if (Date.now() - (lastPull || 0) < interval) {
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
    const { data: rows, error } = await this.supabase
      .from('sync_state')
      .select('*')
      .eq('user_id', user.id)
      .eq('profile_id', profileId);

    if (error) {
      this.log('pull_state_failed', error.message);
      return;
    }

    if (rows) {
      for (const row of rows) {
        await this.applyStateLocally(row.entity, row.payload, row.ts);
      }
      await this.storage.set(KEY_LAST_PULL_AT, Date.now());
    }
  }

  private async applyStateLocally(
    entity: string,
    payload: any,
    incomingTs: number,
  ) {
    const tsKey = `sync_ts_${entity}`;
    const localTs = await this.storage.getNumber(tsKey, 0);

    if (incomingTs > (localTs || 0)) {
      this.log('applied_local', { entity, ts: incomingTs });
      await this.storage.set(tsKey, incomingTs);
    }
  }

  async pushUsage(day: string, usage: Record<string, any>, force = false) {
    if (!force && !(await this.shouldHitCloud(`usage_${day}`))) {
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
    await this.markSyncSuccess(`usage_${day}`);
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

    const encryptedKey = await encryptPayload(config.apiKey, user.id);

    await this.pushState(
      'nextdns',
      {
        profileId: config.profileId,
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
    const { data: rows, error } = await this.supabase
      .from('sync_state')
      .select('payload')
      .eq('user_id', user.id)
      .eq('profile_id', profileId)
      .eq('entity', 'nextdns')
      .maybeSingle();

    if (error || !rows) {
      return null;
    }

    const payload = rows.payload;
    if (!payload.apiKey) {
      return null;
    }

    const decryptedKey = await decryptPayload(payload.apiKey, user.id);

    return {
      profileId: payload.profileId,
      apiKey: decryptedKey,
    };
  }
}
