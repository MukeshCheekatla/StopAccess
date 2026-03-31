/**
 * @focusgate/sync — NextDNS Synchronization Logic
 */

import {
  SyncContext,
  SyncState,
  SyncTelemetry,
  NextDNSError,
} from '@focusgate/types';
import {
  NextDNSSyncAdapter,
  SyncPullResult,
  SyncPushResult,
} from './syncAdapter.ts';

export * from './syncAdapter.ts';

export class SyncOrchestrator {
  ctx: SyncContext;
  adapter: NextDNSSyncAdapter;
  syncTimer: any = null;
  isSyncing = false;
  pendingSync = false;

  constructor(engineCtx: SyncContext) {
    this.ctx = engineCtx;
    this.adapter = new NextDNSSyncAdapter(engineCtx.api);
  }

  async onLaunch() {
    this.ctx.logger?.add('info', 'SyncOrchestrator launched');
    await this.performSync();
  }

  async onForeground() {
    this.ctx.logger?.add('info', 'SyncOrchestrator: foregrounded');
    await this.performSync();
  }

  async onStateChange(immediate = false) {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    if (immediate) {
      this.ctx.logger?.add(
        'info',
        'SyncOrchestrator: Pushing onStateChange (Immediate)',
      );
      return this.performSync(true);
    }

    this.syncTimer = setTimeout(async () => {
      this.ctx.logger?.add(
        'info',
        'SyncOrchestrator: Pushing onStateChange (Debounced)',
      );
      await this.performSync(true);
    }, 1000);
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
    const telemetry: SyncTelemetry = state.telemetry || {
      changedCount: 0,
      errors: [],
    };

    // Keep only last 10 errors
    const errors = [error, ...(telemetry.errors || [])].slice(0, 10);

    await this.updateState({
      status: 'error',
      lastError: error.message,
      lastFailure: new Date().toISOString(),
      telemetry: { ...telemetry, errors },
    });
  }

  async performSync(forcePush = false) {
    if (this.isSyncing) {
      this.pendingSync = true;
      return;
    }

    this.isSyncing = true;
    await this.updateState({
      status: 'syncing',
      lastAttemptAt: new Date().toISOString(),
    });

    try {
      const { storage, logger } = this.ctx;
      const { rules } = await storage.loadGlobalState();
      const state = await storage.getSyncState();
      const telemetry: SyncTelemetry = state.telemetry || {
        changedCount: 0,
        errors: [],
      };

      if (forcePush) {
        const mode = (await storage.getString('fg_sync_mode')) || 'hybrid';
        const result: SyncPushResult = await this.adapter.push(
          rules,
          mode,
          logger,
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
            logger?.add(
              'info',
              `SyncOrchestrator: Rules updated from cloud (${result.changedCount} changes)`,
            );
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
      this.ctx.logger?.add(
        'error',
        'SyncOrchestrator: Unexpected sync failure',
        e.message,
      );
      await this.recordError({ code: 'unknown', message: e.message });
    } finally {
      this.isSyncing = false;
      if (this.pendingSync) {
        this.pendingSync = false;
        await this.performSync(forcePush);
      }
    }
  }
}
