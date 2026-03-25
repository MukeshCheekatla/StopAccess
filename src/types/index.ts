export interface NextDNSConfig {
  apiKey: string;
  profileId: string;
}
export interface DenylistEntry {
  id: string;
  active: boolean;
}
export type RuleMode = 'allow' | 'limit' | 'block';

export interface AppRule {
  appName: string;
  packageName: string;
  mode: RuleMode;
  dailyLimitMinutes: number;
  blockedToday: boolean;
  usedMinutesToday: number;
  iconBase64?: string;
  warningSent?: boolean;
  addedByUser?: boolean;
  customDomain?: string;
}

export interface UsageStats {
  packageName: string;
  totalTimeVisible: number; // ms
  lastTimeUsed: number;
}

export interface AppUsageStat {
  packageName: string;
  appName: string;
  totalMinutes: number;
  lastUsed: number;
}

export interface FocusPreset {
  id: string;
  name: string;
  icon: string;
  appNames: string[];
  active: boolean;
}

export interface ScheduleRule {
  id: string;
  name: string;
  appNames: string[];
  startTime: string;
  endTime: string;
  days: number[];
  active: boolean;
}

export interface AppDomainMap {
  appName: string;
  packageName: string;
  domain: string;
}
