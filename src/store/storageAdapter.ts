/**
 * React Native Storage Adapter
 * Implements the @stopaccess/types/StorageAdapter interface using react-native-mmkv.
 */
import { MMKV } from 'react-native-mmkv';
import {
  AppRule,
  GlobalState,
  SyncState,
  StorageAdapter,
} from '@stopaccess/types';
import * as rulesState from '@stopaccess/state/rules';
import * as schedulesState from '@stopaccess/state/schedules';
import * as syncState from '@stopaccess/state/sync';
import { STORAGE_KEYS } from '@stopaccess/state';

export const storage = new MMKV({ id: 'StopAccess-storage' });

export const storageAdapter: StorageAdapter = {
  getString: async (key: string, fallback?: string): Promise<string | null> =>
    storage.getString(key) ?? fallback ?? null,
  getBoolean: async (
    key: string,
    fallback?: boolean,
  ): Promise<boolean | null> => {
    const val = storage.getBoolean(key);
    return val !== undefined ? val : fallback ?? null;
  },
  getNumber: async (key: string, fallback?: number): Promise<number | null> => {
    const val = storage.getNumber(key);
    return val !== undefined ? val : fallback ?? null;
  },
  getArray: async (key: string): Promise<any[]> => {
    const raw = storage.getString(key);
    if (!raw) {
      return [];
    }
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },
  set: async (key: string, val: string | number | boolean): Promise<void> => {
    storage.set(key, val);
  },
  delete: async (key: string): Promise<void> => {
    storage.delete(key);
  },

  // Compound loaders for the core engine
  loadGlobalState: async (): Promise<GlobalState> => {
    const rules = await rulesState.getRules(storageAdapter);
    const schedules = await schedulesState.getSchedules(storageAdapter);
    const focusEndTime = (storage.getNumber(STORAGE_KEYS.FOCUS_END) ||
      0) as number;
    return { rules, schedules, focusEndTime };
  },

  saveRules: async (rules: AppRule[]): Promise<void> => {
    await rulesState.saveRules(storageAdapter, rules);
  },

  getSyncState: async (): Promise<SyncState> => {
    return syncState.getSyncState(storageAdapter);
  },

  saveSyncState: async (state: SyncState): Promise<void> => {
    await syncState.saveSyncState(storageAdapter, state);
  },
};
