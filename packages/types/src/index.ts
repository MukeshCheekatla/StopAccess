/**
 * @focusgate/types — Shared Type Definitions
 */

export type RuleMode = 'allow' | 'limit' | 'block';

export interface AppRule {
  appName: string;
  packageName: string;
  type: 'domain' | 'service' | 'category';
  scope: 'browser' | 'profile';
  mode: RuleMode;
  dailyLimitMinutes: number;
  blockedToday: boolean;
  usedMinutesToday: number;
  customDomain?: string;
  iconBase64?: string;
  addedByUser: boolean;
  warningSent?: boolean;
  updatedAt?: number;
  changeId?: string;
  desiredBlockingState?: boolean;
  lastObservedState?: boolean;
}

export interface AppUsageStat {
  packageName: string;
  appName: string;
  totalMinutes: number;
  lastUsed?: number;
  sessions?: number;
}

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  blockedCount: number;
  // UI Display Compatibility (React Native)
  screenTimeMinutes: number;
  focusSessions: number;
  blockedAppsCount: number;
  focusMinutes: number;
}

export interface ScheduleRule {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  days: number[]; // 0-6
  appNames: string[]; // app names or package names to block
  active: boolean;
  updatedAt?: number;
  changeId?: string;
}

export interface GlobalState {
  rules: AppRule[];
  schedules: ScheduleRule[];
  focusEndTime: number;
  updatedAt?: number;
  deviceId?: string;
  version?: number;
  lastChangeId?: string;
}

export interface NextDNSConfig {
  apiKey: string;
  profileId: string;
}

export type TargetKind = 'service' | 'category' | 'domain';

export interface ResolvedTarget {
  kind: TargetKind;
  normalizedId: string;
  displayName: string;
  input: string;
  matchedServiceId?: string;
  matchedCategoryId?: string;
  matchedDomain?: string;
}

export interface TargetMutationResult {
  ok: boolean;
  kind: TargetKind;
  id: string;
  error?: string;
}

// --- NextDNS Entities ---

export interface NextDNSEntity {
  id: string;
  name?: string;
  active?: boolean;
}

export interface NextDNSService extends NextDNSEntity {
  id: string;
  name?: string;
  active?: boolean;
}

export interface NextDNSCategory extends NextDNSEntity {
  id: string;
  name?: string;
  active?: boolean;
}

export interface NextDNSLogEntry {
  timestamp: string;
  domain: string;
  client?: string;
  status: 'allowed' | 'blocked' | 'whitelisted';
  reasons?: string[];
  device?: string;
}

export interface NextDNSAnalyticsItem {
  id: string; // domain
  queries: number;
}

// --- Error Model ---

export type NextDNSErrorCode =
  | 'auth_error'
  | 'rate_limit'
  | 'validation_error'
  | 'network_failure'
  | 'profile_mismatch'
  | 'server_error'
  | 'unknown';

export interface NextDNSError {
  code: NextDNSErrorCode;
  message: string;
  status?: number;
  details?: any;
}

export type NextDNSResponse<T> =
  | { ok: true; data: T; error?: never }
  | { ok: false; data?: never; error: NextDNSError };

// --- Sync & Telemetry ---

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success' | 'ok';

export interface SyncTelemetry {
  lastSuccess?: string;
  lastFailure?: string;
  lastPush?: string;
  lastPull?: string;
  changedCount: number;
  errors: NextDNSError[];
}

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  lastSuccess?: string;
  lastFailure?: string;
  lastPush?: string;
  lastPull?: string;
  pendingOps: number;
  telemetry?: SyncTelemetry;
}

export interface SyncContext {
  storage: any;
  api: any;
  logger?: any;
  notifications?: any;
  usage?: any;
  enforcements?: {
    applyBlockedPackages: (packageNames: string[]) => Promise<void>;
  };
}
