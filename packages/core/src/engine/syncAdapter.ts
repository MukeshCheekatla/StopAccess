import {
  NextDNSApiClient,
  AppRule,
  NextDNSError,
  LogLevel,
} from '@stopaccess/types';

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
 * Maps between StopAccess AppRules and NextDNS entities.
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
      const { services = [], categories = [], denylist = [] } = data;

      let changedCount = 0;
      const updatedRules = [...currentRules];

      const upsertRemoteRule = (
        type: AppRule['type'],
        id: string,
        label: string,
        active: boolean,
      ) => {
        const idx = updatedRules.findIndex(
          (r) => r.packageName === id && r.type === type,
        );

        if (idx >= 0) {
          const current = updatedRules[idx];
          const nextMode = active ? 'block' : 'allow';
          const nextDesired = active;
          const nextBlockedToday = active;
          if (
            current.mode !== nextMode ||
            current.desiredBlockingState !== nextDesired ||
            current.blockedToday !== nextBlockedToday
          ) {
            updatedRules[idx] = {
              ...current,
              appName: current.appName || label,
              scope: 'profile',
              mode: nextMode,
              blockedToday: nextBlockedToday,
              desiredBlockingState: nextDesired,
            };
            changedCount++;
          }
          return;
        }

        if (!active) {
          return;
        }

        updatedRules.push({
          appName: label,
          packageName: id,
          type,
          scope: 'profile',
          mode: 'block',
          dailyLimitMinutes: 0,
          blockedToday: true,
          usedMinutesToday: 0,
          customDomain: type === 'domain' ? id : undefined,
          addedByUser: false,
          desiredBlockingState: true,
        });
        changedCount++;
      };

      const activeServices = new Set(
        services.filter((s: any) => s.active).map((s: any) => s.id),
      );
      const activeCategories = new Set(
        categories.filter((c: any) => c.active).map((c: any) => c.id),
      );
      const activeDomains = new Set(denylist.map((d: any) => d.id));

      for (const rule of updatedRules.map((r) => ({ ...r }))) {
        if (rule.scope !== 'profile') {
          continue;
        }

        if (rule.type === 'service') {
          upsertRemoteRule(
            'service',
            rule.packageName,
            rule.appName,
            activeServices.has(rule.packageName),
          );
        } else if (rule.type === 'category') {
          upsertRemoteRule(
            'category',
            rule.packageName,
            rule.appName,
            activeCategories.has(rule.packageName),
          );
        } else if (rule.type === 'domain') {
          const domainId = rule.customDomain || rule.packageName;
          upsertRemoteRule(
            'domain',
            rule.packageName,
            rule.appName || domainId,
            activeDomains.has(domainId),
          );
        }
      }

      for (const s of services) {
        upsertRemoteRule('service', s.id, s.name || s.id, Boolean(s.active));
      }
      for (const c of categories) {
        upsertRemoteRule('category', c.id, c.name || c.id, Boolean(c.active));
      }
      for (const d of denylist) {
        upsertRemoteRule('domain', d.id, d.id, true);
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
        // Only push if the rule is CURRENTLY blocked (e.g. limit reached or manual block)
        const active = rule.blockedToday === true;

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
