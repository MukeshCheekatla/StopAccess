import { STORAGE_KEYS } from './registry';
import type { StorageAdapter } from '@stopaccess/types';

export type BlockingSyncMode = 'browser' | 'hybrid' | 'profile';

export interface BlockingPolicy {
  strictMode: boolean;
  syncMode: BlockingSyncMode;
  appsDnsHardMode: boolean;
  usesCloudSync: boolean;
  enforcesCloudBlocking: boolean;
}

function normalizeSyncMode(value: string | null | undefined): BlockingSyncMode {
  if (value === 'browser' || value === 'profile' || value === 'hybrid') {
    return value;
  }
  return 'hybrid';
}

export async function getBlockingPolicy(
  storage: StorageAdapter,
): Promise<BlockingPolicy> {
  const [strictMode, syncModeRaw, appsDnsHardMode] = await Promise.all([
    storage.getBoolean(STORAGE_KEYS.STRICT_MODE, false),
    storage.getString(STORAGE_KEYS.SYNC_MODE, 'hybrid'),
    storage.getBoolean('fg_apps_dns_hard_mode', false),
  ]);

  const syncMode = normalizeSyncMode(syncModeRaw);
  const strict = Boolean(strictMode);
  const dnsHardMode = Boolean(appsDnsHardMode);
  const usesCloudSync = dnsHardMode || syncMode === 'profile';

  return {
    strictMode: strict,
    syncMode,
    appsDnsHardMode: dnsHardMode,
    usesCloudSync,
    enforcesCloudBlocking: usesCloudSync,
  };
}

export async function setAppsDnsHardMode(
  storage: StorageAdapter,
  enabled: boolean,
): Promise<BlockingPolicy> {
  await storage.set('fg_apps_dns_hard_mode', enabled);

  const currentMode = normalizeSyncMode(
    await storage.getString(STORAGE_KEYS.SYNC_MODE, 'hybrid'),
  );
  const nextMode: BlockingSyncMode = enabled
    ? 'profile'
    : currentMode === 'profile'
    ? 'hybrid'
    : currentMode;

  if (nextMode !== currentMode) {
    await storage.set(STORAGE_KEYS.SYNC_MODE, nextMode);
  }

  return getBlockingPolicy(storage);
}

export async function setStrictModePolicy(
  storage: StorageAdapter,
  enabled: boolean,
): Promise<BlockingPolicy> {
  await storage.set(STORAGE_KEYS.STRICT_MODE, enabled);

  return getBlockingPolicy(storage);
}
