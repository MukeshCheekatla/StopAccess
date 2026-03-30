/**
 * @focusgate/sync — NextDNS Synchronization Logic
 */

import { SyncContext } from '@focusgate/types';
import { NextDNSSyncAdapter } from './syncAdapter.ts';

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

  async performSync(forcePush = false) {
    if (this.isSyncing) {
      this.pendingSync = true;
      return;
    }

    this.isSyncing = true;
    try {
      const { storage, logger } = this.ctx;
      const { rules } = await storage.loadGlobalState();

      if (forcePush) {
        await this.adapter.push(rules, logger);
      } else {
        const syncedRules = await this.adapter.pull(rules);
        if (JSON.stringify(syncedRules) !== JSON.stringify(rules)) {
          await storage.saveRules(syncedRules);
          logger?.add('info', 'SyncOrchestrator: Rules updated from cloud');
        }
      }
    } catch (e: any) {
      this.ctx.logger?.add('error', 'SyncOrchestrator: Sync failed', e.message);
    } finally {
      this.isSyncing = false;
      if (this.pendingSync) {
        this.pendingSync = false;
        await this.performSync(forcePush);
      }
    }
  }
}
