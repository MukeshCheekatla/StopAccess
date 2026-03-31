/**
 * @focusgate/core — NextDNS Synchronization Adaptor
 */

import { AppRule, NextDNSError } from '@focusgate/types';

export interface SyncPushResult {
  ok: boolean;
  error?: NextDNSError;
  changedCount?: number;
}

export interface SyncPullResult {
  ok: boolean;
  error?: NextDNSError;
  rules: AppRule[];
  changedCount: number;
}

export interface NextDNSSyncAdapterInterface {
  push(
    rules: AppRule[],
    mode?: 'browser' | 'hybrid' | 'profile',
    logger?: any,
  ): Promise<SyncPushResult>;
  pull(currentRules: AppRule[]): Promise<SyncPullResult>;
}

export class NextDNSSyncAdapter implements NextDNSSyncAdapterInterface {
  client: any;

  constructor(apiClient: any) {
    this.client = apiClient;
  }

  async push(
    localRules: AppRule[],
    mode: 'browser' | 'hybrid' | 'profile' = 'hybrid',
    logger?: any,
  ): Promise<SyncPushResult> {
    if (mode === 'browser') {
      return { ok: true, changedCount: 0 };
    }

    const blocked = localRules.filter(
      (r) => r.desiredBlockingState ?? r.blockedToday,
    );

    let res: any;
    if (typeof this.client.blockApps === 'function') {
      // Check if it's the new class-based method (1 arg) or legacy (3 args)
      if (this.client.constructor?.name === 'NextDNSClient') {
        res = await this.client.blockApps(blocked);
      } else {
        res = await this.client.blockApps(blocked, this.client, logger?.add);
      }
    } else {
      return {
        ok: false,
        error: { code: 'unknown', message: 'API client missing blockApps' },
      };
    }

    if (res.ok) {
      return { ok: true, changedCount: blocked.length };
    }

    return {
      ok: false,
      error: {
        code: 'unknown',
        message: res.error || 'Push failed',
      },
    };
  }

  async pull(currentRules: AppRule[]): Promise<SyncPullResult> {
    const [svcRes, catRes] = await Promise.all([
      this.client.getServices(),
      this.client.getCategories(),
    ]);

    if (!svcRes.ok || !catRes.ok) {
      return {
        ok: false,
        error: svcRes.error || catRes.error,
        rules: currentRules,
        changedCount: 0,
      };
    }

    const services = svcRes.data;
    const categories = catRes.data;

    let changedCount = 0;
    const rules = currentRules.map((local) => {
      const remote =
        services.find(
          (s: any) => local.type === 'service' && s.id === local.packageName,
        ) ||
        categories.find(
          (c: any) => local.type === 'category' && c.id === local.packageName,
        );

      if (!remote) {
        return local;
      }

      // Track actual observed state
      const isRemoteActive = !!remote.active;
      const stateChanged = local.lastObservedState !== isRemoteActive;

      // If remote matches our target, we are in sync
      const inSync = isRemoteActive === local.desiredBlockingState;

      if (stateChanged || !inSync) {
        changedCount++;
        return {
          ...local,
          lastObservedState: isRemoteActive,
          // We only update the public UI state (blockedToday) if we are in sync,
          // OR if we don't have a specific desired state yet (initial sync).
          blockedToday: local.desiredBlockingState ?? isRemoteActive,
          updatedAt: Date.now(),
        };
      }

      return local;
    });

    return { ok: true, rules, changedCount };
  }
}
