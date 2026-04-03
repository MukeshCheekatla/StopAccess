/**
 * @focusgate/state — Sync State Persistence
 */

import { SyncState, SyncTelemetry, StorageAdapter } from '@focusgate/types';

export const SYNC_STATE_KEY = 'sync_state';

const INITIAL_TELEMETRY: SyncTelemetry = {
  changedCount: 0,
  errors: [],
};

const INITIAL_STATE: SyncState = {
  status: 'idle',
  lastSyncAt: null,
  lastAttemptAt: null,
  lastError: null,
  pendingOps: 0,
  telemetry: INITIAL_TELEMETRY,
};

export async function getSyncState(
  storage: StorageAdapter,
): Promise<SyncState> {
  const raw = await storage.getString(SYNC_STATE_KEY);
  if (!raw) {
    return INITIAL_STATE;
  }
  const state = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return {
    ...INITIAL_STATE,
    ...state,
    telemetry: { ...INITIAL_TELEMETRY, ...(state.telemetry || {}) },
  };
}

export async function saveSyncState(
  storage: StorageAdapter,
  state: SyncState,
): Promise<void> {
  await storage.set(SYNC_STATE_KEY, JSON.stringify(state));
}

export async function updateSyncTelemetry(
  storage: StorageAdapter,
  update: Partial<SyncTelemetry>,
): Promise<SyncState> {
  const state = await getSyncState(storage);
  const newState: SyncState = {
    ...state,
    telemetry: {
      ...(state.telemetry || INITIAL_TELEMETRY),
      ...update,
    },
  };
  await saveSyncState(storage, newState);
  return newState;
}
