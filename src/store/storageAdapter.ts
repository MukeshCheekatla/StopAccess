/**
 * React Native Storage Adapter
 * Implements the @focusgate/types/StorageAdapter interface using react-native-mmkv.
 */
import { MMKV } from 'react-native-mmkv';
import { AppRule, GlobalState } from '../types';
import * as rulesState from '@focusgate/state/rules';
import * as schedulesState from '@focusgate/state/schedules';
import * as syncState from '@focusgate/state/sync';
import { SyncState } from '@focusgate/types';

export const storage = new MMKV({ id: 'focusgate-storage' });

export const storageAdapter = {
  getString: async (key: string): Promise<string | null> =>
    storage.getString(key) ?? null,
  getBoolean: async (key: string): Promise<boolean | null> =>
    storage.getBoolean(key) ?? null,
  getNumber: async (key: string): Promise<number | null> =>
    storage.getNumber(key) ?? null,
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
    const focusEndTime = (storage.getNumber('focus_mode_end_time') ||
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
