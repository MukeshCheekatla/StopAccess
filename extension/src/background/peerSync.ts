// /**
//  * Cross-Device Sync — Supabase backend
//  *
//  * ─── Auth (zero setup for users) ─────────────────────────────────────────────
//  *  The extension signs in anonymously to Supabase on first boot.
//  *  The NextDNS profile_id is embedded into the user's JWT metadata.
//  *  Row-Level Security enforces: you only see rows that match your profile_id.
//  *  The NextDNS API key never leaves the device — Supabase never sees it.
//  *
//  * ─── What syncs ───────────────────────────────────────────────────────────────
//  *  rules           → block rules  (per-rule last-write-wins by updatedAt)
//  *  schedules       → recreation schedules (last-write-wins by timestamp)
//  *  focus           → active focus session end-time (max wins)
//  *
//  * ─── Transport ────────────────────────────────────────────────────────────────
//  *  Push:  REST UPSERT, debounced 2 s per entity
//  *  Pull:  REST GET on every boot (catch-up after being offline)
//  *  Live:  Supabase Realtime WebSocket subscription
//  */

// declare var chrome: any;
// import { STORAGE_KEYS } from '@stopaccess/state';

// // ─── Build-time credentials (injected by esbuild define) ─────────────────────
// declare const __SUPABASE_URL__: string;
// declare const __SUPABASE_ANON_KEY__: string;
// const SUPABASE_URL: string =
//   typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : '';
// const SUPABASE_ANON_KEY: string =
//   typeof __SUPABASE_ANON_KEY__ !== 'undefined' ? __SUPABASE_ANON_KEY__ : '';

// // eslint-disable-next-line no-control-regex
// const _safe = (v: string) => v.replace(/[^\x00-\xFF]/g, '');

// // ─── Keys ────────────────────────────────────────────────────────────────────
// const KEY_TOKEN = 'fg_sync_token';
// const KEY_TOKEN_EXP = 'fg_sync_token_exp';
// const KEY_REFRESH = 'fg_sync_refresh';
// const KEY_DEVICE_ID = 'fg_device_id';
// const KEY_SCHEDULES = 'fg_nextdns_schedule'; // what SchedulePage saves to

// // ─── Timing ──────────────────────────────────────────────────────────────────
// const DEBOUNCE_MS = 2_000;
// const RECONNECT_MS = 10_000;
// const TOKEN_EXPIRE_BUFFER_MS = 120_000; // refresh 2 min before expiry

// // ─── Types ───────────────────────────────────────────────────────────────────
// export type SyncEntity = 'rules' | 'schedules' | 'focus';

// export interface StateDiff {
//   diffId: string;
//   deviceId: string;
//   profileId: string;
//   ts: number;
//   rules?: any[];
//   schedules?: any;
//   focusEndTime?: number;
// }

// // ─── State ───────────────────────────────────────────────────────────────────
// let _profileId = '';
// let _deviceId = '';
// let _token = '';
// let _ws: WebSocket | null = null;

// // Tracks keys currently being written by us from a remote apply.
// // Prevents the storage.onChanged listener from re-broadcasting those writes.
// const _remoteWriteKeys = new Set<string>();

// let _debounce: Partial<Record<SyncEntity, ReturnType<typeof setTimeout>>> = {};
// let _onUpdate: (() => void) | null = null;
// let _initialized = false;

// // ─── Bootstrap ───────────────────────────────────────────────────────────────

// /**
//  * Call once from lifecycle.ts at service-worker boot.
//  * @param onUpdate  Called after a remote diff is applied so the engine can re-run.
//  */
// export async function initPeerSync(onUpdate: () => void): Promise<void> {
//   // Sync disabled until backend/auth is implemented to avoid CSP errors.
//   return;

//   /*
//   if (_initialized) {
//     return;
//   }
//   _initialized = true;
//   _onUpdate = onUpdate;

//   _deviceId = await _getOrCreateDeviceId();

//   // Read profile ID that the extension already stored when the user linked NextDNS
//   const res = await chrome.storage.local.get([STORAGE_KEYS.PROFILE_ID]);
//   _profileId = (res[STORAGE_KEYS.PROFILE_ID] as string) || '';

//   // Watch for profile changes (user links or changes their NextDNS account)
//   chrome.storage.local.onChanged.addListener(_onStorageChanged);

//   if (_profileId) {
//     await _connect();
//   } else {
//     console.log('[Sync] No NextDNS profile yet — waiting for user to link.');
//   }
//   */
// }

// // ─── Auth ─────────────────────────────────────────────────────────────────────

// /**
//  * Returns a valid Supabase JWT, refreshing or signing up as needed.
//  * Never touches the NextDNS API key.
//  */
// async function _getToken(): Promise<string> {
//   // Return cached token if still fresh
//   if (_token) {
//     return _token;
//   }

//   const cache = await chrome.storage.local.get([
//     KEY_TOKEN,
//     KEY_TOKEN_EXP,
//     KEY_REFRESH,
//   ]);
//   const cachedToken = cache[KEY_TOKEN] as string | undefined;
//   const cachedExp = cache[KEY_TOKEN_EXP] as number | undefined;
//   const refreshToken = cache[KEY_REFRESH] as string | undefined;

//   // Token still valid
//   if (
//     cachedToken &&
//     cachedExp &&
//     cachedExp > Date.now() + TOKEN_EXPIRE_BUFFER_MS
//   ) {
//     _token = cachedToken;
//     return _token;
//   }

//   // Refresh if we have a refresh token
//   if (refreshToken) {
//     const refreshed = await _refreshToken(refreshToken);
//     if (refreshed) {
//       return _token;
//     }
//   }

//   // First time or refresh failed → anonymous sign-up
//   return _signUpAnon();
// }

// async function _signUpAnon(): Promise<string> {
//   const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       apikey: _safe(SUPABASE_ANON_KEY),
//     },
//     body: JSON.stringify({}),
//   });

//   if (!res.ok) {
//     if (res.status === 422) {
//       // Anonymous sign-ins are disabled in Supabase.
//       // Enable at: Supabase Dashboard → Authentication → Settings → Allow anonymous sign-ins
//       console.info(
//         '[Sync] Anonymous auth disabled — peer sync requires "Allow anonymous sign-ins" in Supabase. Cross-device sync will be skipped.',
//       );
//       // Permanently disable retries for this session so we don't spam errors.
//       _initialized = false;
//       return '';
//     }
//     throw new Error(`[Sync] Signup failed: ${res.status}`);
//   }
//   const data = await res.json();
//   await _saveSession(data);
//   // Immediately embed profile_id so RLS works on this new user
//   await _updateProfileMetadata(_token);
//   return _token;
// }

// async function _refreshToken(refreshToken: string): Promise<boolean> {
//   try {
//     const res = await fetch(
//       `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
//       {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           apikey: _safe(SUPABASE_ANON_KEY),
//         },
//         body: JSON.stringify({ refresh_token: refreshToken }),
//       },
//     );
//     if (!res.ok) {
//       return false;
//     }
//     const data = await res.json();
//     await _saveSession(data);
//     return true;
//   } catch {
//     return false;
//   }
// }

// /**
//  * Embed profile_id in the Supabase user's metadata.
//  * This is what RLS reads from the JWT: auth.jwt()->'user_metadata'->>'profile_id'
//  * The response includes a fresh JWT with updated claims.
//  */
// async function _updateProfileMetadata(token: string): Promise<void> {
//   if (!_profileId) {
//     return;
//   }
//   const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
//     method: 'PUT',
//     headers: {
//       'Content-Type': 'application/json',
//       apikey: _safe(SUPABASE_ANON_KEY),
//       Authorization: `Bearer ${_safe(token)}`,
//     },
//     body: JSON.stringify({ data: { profile_id: _profileId } }),
//   });
//   if (res.ok) {
//     const data = await res.json();
//     // PUT /auth/v1/user returns the user record; session comes from a re-login
//     // Some Supabase versions include new session here, others require a refresh
//     if (data.access_token) {
//       await _saveSession(data);
//     } else {
//       // Refresh to get JWT with updated claims
//       const cache = await chrome.storage.local.get([KEY_REFRESH]);
//       if (cache[KEY_REFRESH]) {
//         await _refreshToken(cache[KEY_REFRESH] as string);
//       }
//     }
//   }
// }

// async function _saveSession(data: any): Promise<void> {
//   _token = data.access_token as string;
//   const exp = Date.now() + (data.expires_in ?? 3600) * 1000;
//   await chrome.storage.local.set({
//     [KEY_TOKEN]: _token,
//     [KEY_TOKEN_EXP]: exp,
//     [KEY_REFRESH]: data.refresh_token ?? '',
//   });
// }

// // ─── Connect ─────────────────────────────────────────────────────────────────

// async function _connect(): Promise<void> {
//   try {
//     await _getToken();
//     // Re-embed profile_id in metadata whenever we (re)connect
//     // (handles case where user changed profile or token was for a different profile)
//     const cache = await chrome.storage.local.get([KEY_TOKEN]);
//     await _updateProfileMetadata(cache[KEY_TOKEN] as string);
//     _token = (await chrome.storage.local.get([KEY_TOKEN]))[KEY_TOKEN] as string;

//     await _pullLatest();
//     await _subscribeRealtime();
//     console.log(
//       '[Sync] Connected | device:',
//       _deviceId,
//       '| profile:',
//       _profileId,
//     );
//   } catch (e) {
//     console.error('[Sync] Connect failed, retry in 10s:', e);
//     setTimeout(() => {
//       if (_profileId) {
//         _connect().catch(() => {});
//       }
//     }, RECONNECT_MS);
//   }
// }

// // ─── Pull on boot ─────────────────────────────────────────────────────────────

// async function _pullLatest(): Promise<void> {
//   const token = await _getToken();
//   const res = await fetch(
//     `${SUPABASE_URL}/rest/v1/sync_state?profile_id=eq.${encodeURIComponent(
//       _profileId,
//     )}&select=entity,payload,ts,device_id`,
//     {
//       headers: {
//         apikey: _safe(SUPABASE_ANON_KEY),
//         Authorization: `Bearer ${_safe(token)}`,
//       },
//     },
//   );
//   if (!res.ok) {
//     console.warn('[Sync] Pull failed:', res.status);
//     return;
//   }

//   const rows: {
//     entity: SyncEntity;
//     payload: any;
//     ts: number;
//     device_id: string;
//   }[] = await res.json();

//   let changed = false;
//   for (const row of rows) {
//     if (row.device_id === _deviceId) {
//       continue;
//     }
//     const applied = await _applyRow(row.entity, row.payload, row.ts);
//     if (applied) {
//       changed = true;
//     }
//   }
//   if (changed && _onUpdate) {
//     _onUpdate();
//   }
// }

// // ─── Realtime ─────────────────────────────────────────────────────────────────

// async function _subscribeRealtime(): Promise<void> {
//   if (_ws) {
//     _ws.close();
//     _ws = null;
//   }

//   const wsBase = SUPABASE_URL.replace('https://', 'wss://').replace(
//     'http://',
//     'ws://',
//   );
//   const wsUrl = `${wsBase}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;

//   const ws = new WebSocket(wsUrl);
//   _ws = ws;

//   ws.onopen = () => {
//     ws.send(
//       JSON.stringify({
//         topic: `realtime:public:sync_state:profile_id=eq.${_profileId}`,
//         event: 'phx_join',
//         payload: { user_token: _token },
//         ref: '1',
//       }),
//     );
//   };

//   ws.onmessage = async (event: MessageEvent) => {
//     try {
//       const msg = JSON.parse(event.data as string);
//       if (msg.event !== 'INSERT' && msg.event !== 'UPDATE') {
//         return;
//       }
//       const record = msg.payload?.record;
//       if (!record || record.device_id === _deviceId) {
//         return;
//       }
//       const applied = await _applyRow(
//         record.entity as SyncEntity,
//         record.payload,
//         record.ts,
//       );
//       if (applied && _onUpdate) {
//         _onUpdate();
//       }
//     } catch {
//       /* ignore */
//     }
//   };

//   ws.onclose = () => {
//     setTimeout(() => {
//       if (_profileId) {
//         _subscribeRealtime().catch(() => {});
//       }
//     }, RECONNECT_MS);
//   };

//   ws.onerror = () => ws.close();
// }

// // ─── Apply remote state ───────────────────────────────────────────────────────

// async function _applyRow(
//   entity: SyncEntity,
//   payload: any,
//   remoteTs: number,
// ): Promise<boolean> {
//   const patch: Record<string, any> = {};

//   if (entity === 'rules' && Array.isArray(payload?.rules)) {
//     const local = await chrome.storage.local.get([STORAGE_KEYS.RULES]);
//     const localRules: any[] = _parseSafe(local[STORAGE_KEYS.RULES], []);
//     const merged = _mergeRules(localRules, payload.rules);
//     patch[STORAGE_KEYS.RULES] = JSON.stringify(merged);
//   }

//   if (entity === 'schedules' && payload?.schedules) {
//     const local = await chrome.storage.local.get([
//       KEY_SCHEDULES,
//       'fg_schedules_ts',
//     ]);
//     const localTs = Number(local.fg_schedules_ts) || 0;
//     if (remoteTs > localTs) {
//       patch[KEY_SCHEDULES] = payload.schedules; // schedule page stores as object, not JSON string
//       patch.fg_schedules_ts = remoteTs;
//     }
//   }

//   if (entity === 'focus' && typeof payload?.focusEndTime === 'number') {
//     const local = await chrome.storage.local.get([STORAGE_KEYS.FOCUS_END]);
//     const localEnd = Number(local[STORAGE_KEYS.FOCUS_END]) || 0;
//     // Only apply if remote focus is still in the future or was cleared (0)
//     if (payload.focusEndTime > localEnd || payload.focusEndTime === 0) {
//       patch[STORAGE_KEYS.FOCUS_END] = payload.focusEndTime;
//     }
//   }

//   if (Object.keys(patch).length === 0) {
//     return false;
//   }

//   // Mark these keys so our storage listener doesn't re-broadcast them
//   for (const key of Object.keys(patch)) {
//     _remoteWriteKeys.add(key);
//   }
//   await chrome.storage.local.set(patch);
//   // Keep keys marked until after the storage.onChanged event fires (next task)
//   setTimeout(() => {
//     for (const key of Object.keys(patch)) {
//       _remoteWriteKeys.delete(key);
//     }
//   }, 500);

//   return true;
// }

// // ─── Storage listener — auto-broadcast local changes ─────────────────────────

// function _onStorageChanged(changes: Record<string, any>): void {
//   // Profile ID changed — re-auth and reconnect
//   if (changes[STORAGE_KEYS.PROFILE_ID]) {
//     const next = (changes[STORAGE_KEYS.PROFILE_ID].newValue as string) || '';
//     if (next !== _profileId) {
//       _profileId = next;
//       _token = ''; // invalidate cached token
//       if (_profileId) {
//         _connect().catch(() => {});
//       }
//     }
//     return;
//   }

//   if (!_profileId || !SUPABASE_URL) {
//     return;
//   }

//   // Rules changed locally
//   if (
//     changes[STORAGE_KEYS.RULES] &&
//     !_remoteWriteKeys.has(STORAGE_KEYS.RULES)
//   ) {
//     const rules = _parseSafe(changes[STORAGE_KEYS.RULES].newValue, []);
//     _schedule('rules', { rules });
//   }

//   // Schedules changed locally (saved by SchedulePage)
//   if (changes[KEY_SCHEDULES] && !_remoteWriteKeys.has(KEY_SCHEDULES)) {
//     const schedules = changes[KEY_SCHEDULES].newValue;
//     _schedule('schedules', { schedules });
//   }

//   // Focus end-time changed locally
//   if (
//     changes[STORAGE_KEYS.FOCUS_END] &&
//     !_remoteWriteKeys.has(STORAGE_KEYS.FOCUS_END)
//   ) {
//     const focusEndTime = Number(changes[STORAGE_KEYS.FOCUS_END].newValue) || 0;
//     _schedule('focus', { focusEndTime });
//   }
// }

// function _schedule(entity: SyncEntity, payload: any): void {
//   if (_debounce[entity]) {
//     clearTimeout(_debounce[entity]!);
//   }
//   _debounce[entity] = setTimeout(() => _push(entity, payload), DEBOUNCE_MS);
// }

// // ─── Push ─────────────────────────────────────────────────────────────────────

// async function _push(entity: SyncEntity, payload: any): Promise<void> {
//   if (!_profileId) {
//     return;
//   }
//   try {
//     const token = await _getToken();
//     const resp = await fetch(`${SUPABASE_URL}/rest/v1/sync_state`, {
//       method: 'POST',
//       headers: {
//         apikey: _safe(SUPABASE_ANON_KEY),
//         Authorization: `Bearer ${_safe(token)}`,
//         'Content-Type': 'application/json',
//         Prefer: 'resolution=merge-duplicates,return=minimal',
//       },
//       body: JSON.stringify({
//         profile_id: _profileId,
//         entity,
//         device_id: _deviceId,
//         payload: { ...payload, deviceId: _deviceId },
//         ts: Date.now(),
//         diff_id: _makeId(),
//         updated_at: new Date().toISOString(),
//       }),
//     });
//     if (!resp.ok) {
//       console.warn('[Sync] Push failed:', resp.status, await resp.text());
//     }
//   } catch (e) {
//     console.warn('[Sync] Push error:', e);
//   }
// }

// // ─── Explicitly push (called from lifecycle for focus start/stop) ─────────────

// /**
//  * Explicit push — lifecycle.ts calls this for focus session events.
//  * Storage listener handles rules and schedules automatically.
//  */
// export function broadcastDiff(
//   diff: Partial<Pick<StateDiff, 'rules' | 'schedules' | 'focusEndTime'>>,
// ): void {
//   if (!SUPABASE_URL || !_profileId) {
//     return;
//   }
//   if (diff.rules !== undefined) {
//     _schedule('rules', { rules: diff.rules });
//   }
//   if (diff.schedules !== undefined) {
//     _schedule('schedules', { schedules: diff.schedules });
//   }
//   if (diff.focusEndTime !== undefined) {
//     _schedule('focus', { focusEndTime: diff.focusEndTime });
//   }
// }

// // ─── Rule merge ───────────────────────────────────────────────────────────────

// function _mergeRules(local: any[], remote: any[]): any[] {
//   const map = new Map<string, any>();
//   for (const r of local) {
//     map.set(_ruleKey(r), r);
//   }
//   for (const r of remote) {
//     const key = _ruleKey(r);
//     const existing = map.get(key);
//     if (!existing || (r.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
//       map.set(key, r);
//     }
//   }
//   return [...map.values()];
// }

// function _ruleKey(rule: any): string {
//   return (
//     rule.customDomain ??
//     rule.packageName ??
//     rule.appName ??
//     JSON.stringify(rule)
//   );
// }

// // ─── Device ID ────────────────────────────────────────────────────────────────

// async function _getOrCreateDeviceId(): Promise<string> {
//   const res = await chrome.storage.local.get([KEY_DEVICE_ID]);
//   if (res[KEY_DEVICE_ID]) {
//     return res[KEY_DEVICE_ID] as string;
//   }
//   const id = _makeId();
//   await chrome.storage.local.set({ [KEY_DEVICE_ID]: id });
//   return id;
// }

// // ─── Utils ────────────────────────────────────────────────────────────────────

// function _makeId(): string {
//   return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
// }

// function _parseSafe(raw: any, fallback: any): any {
//   if (!raw) {
//     return fallback;
//   }
//   try {
//     return typeof raw === 'string' ? JSON.parse(raw) : raw;
//   } catch {
//     return fallback;
//   }
// }

// // ─── Public status ────────────────────────────────────────────────────────────

// export function getPeerSyncStatus(): {
//   enabled: boolean;
//   connected: boolean;
//   deviceId: string;
//   profileId: string;
// } {
//   return {
//     enabled: !!SUPABASE_URL && !!_profileId,
//     connected: _ws?.readyState === WebSocket.OPEN,
//     deviceId: _deviceId,
//     profileId: _profileId,
//   };
// }
