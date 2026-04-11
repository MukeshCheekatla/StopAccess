import { SyncContext, SyncState, NextDNSError } from '@stopaccess/types';
import {
  NextDNSSyncAdapter,
  SyncPullResult,
  SyncPushResult,
} from './syncAdapter';

export class SyncOrchestrator {
  ctx: SyncContext;
  adapter: NextDNSSyncAdapter;
  syncTimer: ReturnType<typeof setTimeout> | null = null;
  isSyncing = false;
  pendingSync = false;

  constructor(engineCtx: SyncContext) {
    this.ctx = engineCtx;
    this.adapter = new NextDNSSyncAdapter(engineCtx.api);
  }

  async performSync(forcePush = false, depth = 0) {
    if (depth > 5) {
      return;
    }
    if (this.isSyncing) {
      this.pendingSync = true;
      return;
    }
    this.isSyncing = true;

    if (typeof this.ctx.api.isConfigured === 'function') {
      if (!(await this.ctx.api.isConfigured())) {
        this.isSyncing = false;
        return;
      }
    }

    await this.updateState({
      status: 'syncing',
      lastAttemptAt: new Date().toISOString(),
    });

    try {
      const { storage, logger } = this.ctx;
      const { rules } = await storage.loadGlobalState();
      const state = await storage.getSyncState();
      const telemetry = state.telemetry || { changedCount: 0, errors: [] };

      if (forcePush) {
        const mode = (await storage.getString('fg_sync_mode')) || 'hybrid';
        const result: SyncPushResult = await this.adapter.push(
          rules,
          mode as any,
          logger?.add.bind(logger),
        );
        if (result.ok) {
          await this.updateState({
            status: 'success',
            lastSyncAt: new Date().toISOString(),
            lastPush: new Date().toISOString(),
            lastSuccess: new Date().toISOString(),
            telemetry: {
              ...telemetry,
              lastSuccess: new Date().toISOString(),
              lastPush: new Date().toISOString(),
              changedCount:
                (telemetry.changedCount || 0) + (result.changedCount || 0),
            },
          });
        } else if (result.error) {
          await this.recordError(result.error);
        }
      } else {
        const result: SyncPullResult = await this.adapter.pull(rules);
        if (result.ok) {
          if (result.changedCount > 0) {
            await storage.saveRules(result.rules);
          }
          await this.updateState({
            status: 'success',
            lastSyncAt: new Date().toISOString(),
            lastPull: new Date().toISOString(),
            lastSuccess: new Date().toISOString(),
            telemetry: {
              ...telemetry,
              lastSuccess: new Date().toISOString(),
              lastPull: new Date().toISOString(),
              changedCount: (telemetry.changedCount || 0) + result.changedCount,
            },
          });
        } else if (result.error) {
          await this.recordError(result.error);
        }
      }
    } catch (e: any) {
      await this.recordError({ code: 'unknown', message: e.message });
    } finally {
      this.isSyncing = false;
      if (this.pendingSync) {
        this.pendingSync = false;
        await this.performSync(forcePush, depth + 1);
      }
    }
  }

  async onForeground() {
    return this.performSync();
  }

  private async updateState(update: Partial<SyncState>) {
    const { storage } = this.ctx;
    const current = await storage.getSyncState();
    const newState = { ...current, ...update };
    await storage.saveSyncState(newState);
    return newState;
  }

  private async recordError(error: NextDNSError) {
    const { storage } = this.ctx;
    const state = await storage.getSyncState();
    const telemetry = state.telemetry || { changedCount: 0, errors: [] };
    const errors = [error, ...(telemetry.errors || [])].slice(0, 10);
    await this.updateState({
      status: 'error',
      lastError: error.message,
      lastFailure: new Date().toISOString(),
      telemetry: { ...telemetry, errors },
    });
  }
}
