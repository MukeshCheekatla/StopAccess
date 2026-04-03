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
  extensionCountToday?: number;
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
