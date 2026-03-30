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

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success' | 'ok';

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  pendingOps: number;
}

export interface SyncContext {
  storage: any;
  api: any;
  logger?: any;
  notifications?: any;
  usage?: any;
}
