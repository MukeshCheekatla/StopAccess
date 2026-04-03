import {
  NextDNSApiClient,
  AppRule,
  NextDNSError,
  LogLevel,
} from '@focusgate/types';

export interface SyncPushResult {
  ok: boolean;
  changedCount: number;
  error?: NextDNSError;
}

export interface SyncPullResult {
  ok: boolean;
  rules: AppRule[];
  changedCount: number;
  error?: NextDNSError;
}

/**
 * High-level Sync Adapter for NextDNS.
 * Maps between FocusGate AppRules and NextDNS entities.
 */
export class NextDNSSyncAdapter {
  api: NextDNSApiClient;

  constructor(api: NextDNSApiClient) {
    this.api = api;
  }

  async pull(currentRules: AppRule[]): Promise<SyncPullResult> {
    try {
      const snapshot = await this.api.getRemoteSnapshot();
      if (!snapshot || (snapshot as any).error) {
        return {
          ok: false,
          rules: currentRules,
          changedCount: 0,
          error: (snapshot as any).error,
        };
      }

      const data = (snapshot as any).data || snapshot;
      const { services = [] } = data;

      let changedCount = 0;
      const updatedRules = [...currentRules];

      // Sync services (apps)
      for (const s of services) {
        const rule = updatedRules.find(
          (r) => r.packageName === s.id && r.type === 'service',
        );
        if (rule) {
          if (rule.mode !== (s.active ? 'block' : 'allow')) {
            rule.mode = s.active ? 'block' : 'allow';
            changedCount++;
          }
        }
      }

      return { ok: true, rules: updatedRules, changedCount };
    } catch (e: any) {
      return {
        ok: false,
        rules: currentRules,
        changedCount: 0,
        error: { code: 'pull_fail', message: e.message },
      };
    }
  }

  async push(
    rules: AppRule[],
    mode: 'profile' | 'browser',
    _logger?: LogLevel,
  ): Promise<SyncPushResult> {
    if (mode !== 'profile') {
      return { ok: true, changedCount: 0 };
    }

    try {
      let changedCount = 0;
      for (const rule of rules) {
        const active = rule.mode === 'block' || rule.mode === 'limit';
        const result = await (this.api as any).setTargetState(
          rule.type || 'domain',
          rule.packageName,
          active,
        );
        if (result.ok) {
          changedCount++;
        }
      }
      return { ok: true, changedCount };
    } catch (e: any) {
      return {
        ok: false,
        changedCount: 0,
        error: { code: 'push_fail', message: e.message },
      };
    }
  }
}
