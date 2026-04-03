import { AppRule } from './app';

/**
 * NextDNS Configuration and Credentials
 */
export interface NextDNSConfig {
  apiKey: string;
  profileId: string;
}

/**
 * NextDNS Component Target Types
 */
export type TargetKind = 'service' | 'category' | 'domain';

/**
 * Result of resolving a user input (URL or name) to a NextDNS entity
 */
export interface ResolvedTarget {
  kind: TargetKind;
  normalizedId: string;
  displayName: string;
  input: string;
  matchedServiceId?: string;
  matchedCategoryId?: string;
  matchedDomain?: string;
}

/**
 * Response from a single resource state mutation (e.g., adding to denylist)
 */
export interface TargetMutationResult {
  ok: boolean;
  kind: TargetKind;
  id: string;
  error?: string;
}

/**
 * Base for NextDNS resource entities (services, categories, denylist items)
 */
export interface NextDNSEntity {
  id: string;
  name?: string;
  active?: boolean;
}

export interface NextDNSService extends NextDNSEntity {}

export interface NextDNSCategory extends NextDNSEntity {}

/**
 * Single entry from NextDNS logs
 */
export interface NextDNSLogEntry {
  timestamp: string;
  domain: string;
  client?: string;
  status: 'allowed' | 'blocked' | 'whitelisted';
  reasons?: string[];
  device?: string;
}

/**
 * Aggregated analytics item (usually by domain)
 */
export interface NextDNSAnalyticsItem {
  id: string; // domain
  queries: number;
}

// --- Security Settings ---

export interface NextDNSTld {
  id: string; // e.g. "ru", "cn", "cf"
}

export interface NextDNSSecuritySettings {
  threatIntelligenceFeeds: boolean;
  aiThreatDetection: boolean;
  googleSafeBrowsing: boolean;
  cryptojacking: boolean;
  dnsRebinding: boolean;
  idnHomographs: boolean;
  typosquatting: boolean;
  dga: boolean;
  nrd: boolean;
  ddns: boolean;
  parking: boolean;
  csam: boolean;
  tlds: NextDNSTld[];
}

// --- Privacy Settings ---

export interface NextDNSBlocklist {
  id: string; // e.g. "nextdns-recommended", "oisd"
  name?: string;
}

export interface NextDNSNativeTracking {
  id: string; // e.g. "apple", "samsung", "huawei"
  name?: string;
}

export interface NextDNSPrivacySettings {
  blocklists: NextDNSBlocklist[];
  natives: NextDNSNativeTracking[];
  disguisedTrackers: boolean;
  allowAffiliate: boolean;
}

/**
 * Comprehensive snapshot of a NextDNS profile state
 */
export interface NextDNSFullSnapshot {
  services: NextDNSService[];
  categories: NextDNSCategory[];
  denylist: NextDNSEntity[];
  security: NextDNSSecuritySettings;
  privacy: NextDNSPrivacySettings;
}

// --- Error Handling ---

export type LogLevel = (
  level: 'info' | 'warn' | 'error',
  message: string,
  detail?: string,
) => void;

export type NextDNSErrorCode =
  | 'auth_error'
  | 'rate_limit'
  | 'validation_error'
  | 'network_failure'
  | 'profile_mismatch'
  | 'server_error'
  | 'pull_fail'
  | 'push_fail'
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

/**
 * Interface definition for any NextDNS API client implementation
 */
export interface NextDNSApiClient {
  isConfigured(): Promise<boolean>;
  blockApps(rules: AppRule[]): Promise<{ ok: boolean; error?: string }>;
  getServices(): Promise<NextDNSResponse<NextDNSService[]>>;
  getCategories(): Promise<NextDNSResponse<NextDNSCategory[]>>;
  unblockAll(): Promise<{ ok: boolean }>;

  // Security & Privacy
  getSecurity(): Promise<NextDNSResponse<NextDNSSecuritySettings>>;
  patchSecurity(
    patch: Partial<NextDNSSecuritySettings>,
  ): Promise<NextDNSResponse<NextDNSSecuritySettings>>;
  getPrivacy(): Promise<NextDNSResponse<NextDNSPrivacySettings>>;
  patchPrivacy(
    patch: Partial<NextDNSPrivacySettings>,
  ): Promise<NextDNSResponse<NextDNSPrivacySettings>>;

  // TLDs, Blocklists, Natives
  getBlockedTlds(): Promise<NextDNSResponse<NextDNSTld[]>>;
  getBlocklists(): Promise<NextDNSResponse<NextDNSBlocklist[]>>;
  getNativeTracking(): Promise<NextDNSResponse<NextDNSNativeTracking[]>>;

  // Denylist
  getDenylist(): Promise<NextDNSResponse<NextDNSEntity[]>>;

  // Analytics & Logs
  getLogs(
    limit?: number,
    status?: string,
  ): Promise<NextDNSResponse<NextDNSLogEntry[]>>;
  getAnalyticsDomains(
    limit?: number,
    status?: string,
  ): Promise<NextDNSResponse<NextDNSAnalyticsItem[]>>;
  getAnalyticsCounters(): Promise<
    NextDNSResponse<{ blocked: number; allowed: number }>
  >;

  // Snapshots
  getRemoteSnapshot(): Promise<
    NextDNSResponse<{
      services: NextDNSService[];
      categories: NextDNSCategory[];
      denylist: NextDNSEntity[];
    }>
  >;
  getFullSnapshot(): Promise<NextDNSResponse<NextDNSFullSnapshot>>;
}
