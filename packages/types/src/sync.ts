import { NextDNSError, NextDNSApiClient } from './nextdns';
import { StorageAdapter } from './storage';
import { AppRule } from './app';

/**
 * High-level orchestration status for synchronization
 */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

/**
 * Telemetry and Audit for last sync result
 */
export interface SyncTelemetry {
  lastSuccess?: string;
  lastFailure?: string;
  lastPush?: string;
  lastPull?: string;
  changedCount: number;
  errors: NextDNSError[];
}

/**
 * Persistence model for sync state
 */
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

/**
 * Contextual services and dependencies for a sync engine
 */
export interface SyncContext {
  storage: StorageAdapter;
  api: NextDNSApiClient;
  logger?: {
    add: (
      level: 'info' | 'warn' | 'error',
      message: string,
      detail?: string,
    ) => void;
  };
  notifications?: {
    notifyBlocked: (appName: string) => void;
  };
  usage?: {
    refreshUsage: (rules: AppRule[]) => Promise<AppRule[]>;
  };
  enforcements?: {
    applyBlockedPackages: (packageNames: string[]) => Promise<void>;
  };
}
