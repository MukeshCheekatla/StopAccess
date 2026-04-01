import { storage } from './storageAdapter';
import { SyncState, SyncStatus } from '@focusgate/types';

const SYNC_STATE_KEY = 'nextdns_sync_state';

const DEFAULT_STATE: SyncState = {
  status: 'idle',
  lastSyncAt: null,
  lastAttemptAt: null,
  lastError: null,
  pendingOps: 0,
};

export function getSyncState(): SyncState {
  const raw = storage.getString(SYNC_STATE_KEY);
  if (!raw) {
    return { ...DEFAULT_STATE };
  }
  try {
    return JSON.parse(raw) as SyncState;
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function setSyncState(state: SyncState): void {
  storage.set(SYNC_STATE_KEY, JSON.stringify(state));
}

export function setSyncStatus(status: SyncStatus, error?: string | null): void {
  const current = getSyncState();
  const now = new Date().toISOString();
  setSyncState({
    ...current,
    status,
    lastAttemptAt: now,
    lastSyncAt: status === 'ok' ? now : current.lastSyncAt,
    lastError: error ?? (status === 'ok' ? null : current.lastError),
  });
}

export function incrementPendingOps(): void {
  const s = getSyncState();
  setSyncState({ ...s, pendingOps: s.pendingOps + 1, status: 'syncing' });
}

export function decrementPendingOps(): void {
  const s = getSyncState();
  const next = Math.max(0, s.pendingOps - 1);
  setSyncState({
    ...s,
    pendingOps: next,
    status: next > 0 ? 'syncing' : s.status,
  });
}
