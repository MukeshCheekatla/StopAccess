import type { GlobalState, AppRule } from './app';
import type { SyncState } from './sync';

/**
 * Common interface for data persistence across platforms
 */
export interface StorageAdapter {
  getString(key: string, fallback?: string): Promise<string | null>;
  getNumber(key: string, fallback?: number): Promise<number | null>;
  getBoolean(key: string, fallback?: boolean): Promise<boolean | null>;
  getArray(key: string): Promise<any[]>;
  set(key: string, val: string | number | boolean): Promise<void>;
  delete(key: string): Promise<void>;

  // High-level complex state persistence
  loadGlobalState(): Promise<GlobalState>;
  saveRules(rules: AppRule[]): Promise<void>;
  getSyncState(): Promise<SyncState>;
  saveSyncState(state: SyncState): Promise<void>;
}
