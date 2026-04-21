import { updateRule, deleteRule } from '@stopaccess/state/rules';
import {
  nextDNSApi,
  extensionAdapter as storage,
} from '../background/platformAdapter';
import { getBlockingPolicy } from '@stopaccess/state';
import { toast } from './toast';
import { checkGuard } from '../background/sessionGuard';
import { STORAGE_KEYS } from '@stopaccess/state/index';
import { findServiceIdByDomain } from '@stopaccess/core';

/**
 * Shared logic controller for Apps/Blocklist features in the extension.
 * Eliminates duplication between AppsPage, AppsPopup, and AppsScreen.
 */
export const appsController = {
  async loadMetadata(): Promise<any> {
    try {
      const metadata = await nextDNSApi.refreshNextDNSMetadata();
      return metadata;
    } catch (err) {
      const cached = await chrome.storage.local.get(['cached_ndns_metadata']);
      return cached.cached_ndns_metadata || { services: [], categories: [] };
    }
  },

  /**
   * Internal helper to execute a cloud action only if Strong Protection (syncMode=profile) is active.
   */
  async _runCloudSync(action: () => Promise<any>) {
    const isConfigured = await nextDNSApi.isConfigured();

    if (isConfigured) {
      const result = await action();
      if (result && result.ok === false) {
        const status = result.error?.status;
        // Ignore 400 (Already Exists) and 404 (Not Found) which happen when
        // our local temporary pass overrides drifted from the external cloud state
        if (status !== 400 && status !== 404) {
          const errorMsg =
            typeof result.error === 'object'
              ? result.error.message
              : result.error;
          throw new Error(errorMsg || 'NextDNS Sync Failed');
        }
      }
      await nextDNSApi.refreshNextDNSMetadata();
    }
  },

  async toggleRule(
    kind: string,
    id: string,
    name: string,
    nextState: boolean,
    rules: any[],
  ) {
    if (!nextState) {
      const guard = await checkGuard('disable_blocking');
      if (!guard.allowed) {
        toast.error((guard as any).reason);
        return { ok: false, error: (guard as any).reason };
      }
    }

    try {
      const existingRule = rules.find(
        (r) =>
          (r.customDomain || r.packageName) === id &&
          (kind !== 'service' || r.type === 'service'),
      );

      const baseRule =
        existingRule ||
        (kind === 'domain'
          ? {
              packageName: id,
              appName: name || id,
              type: 'domain' as const,
              customDomain: id,
              scope: 'both' as const,
            }
          : {
              packageName: id,
              appName: name || id,
              type: kind as any,
              scope: 'both' as const,
            });

      // 1. Cloud Layer (NextDNS)
      // STRICT: Only sync to NextDNS if Hard Mode is enabled globally.
      const policy = await getBlockingPolicy(storage);
      // STRICT: Only sync to cloud if Hard Mode is enabled globally.
      const shouldCloudSync = policy.enforcesCloudBlocking;

      if (shouldCloudSync) {
        await this._runCloudSync(() =>
          nextDNSApi.setTargetState(kind, id, nextState),
        );
      }

      const newMode = !nextState
        ? ('allow' as const)
        : (baseRule.dailyLimitMinutes || 0) > 0
        ? ('limit' as const)
        : ('block' as const);

      await updateRule(storage, {
        ...baseRule,
        blockedToday: nextState,
        mode: newMode,
        desiredBlockingState: nextState,
        maxDailyPasses: baseRule.maxDailyPasses ?? 3,
        streakDays: nextState ? baseRule.streakDays ?? 0 : 0,
        streakStartedAt:
          !nextState || !baseRule.streakDays
            ? Date.now()
            : baseRule.streakStartedAt,
        streakUpdatedOn: nextState ? baseRule.streakUpdatedOn : undefined,
        addedAt: baseRule.addedAt ?? Date.now(),
        updatedAt: Date.now(),
      });

      // Always cleanup ANY temp pass when toggling the master rule to prevent conflicts
      const res = await chrome.storage.local.get([STORAGE_KEYS.TEMP_PASSES]);
      const passes = res[STORAGE_KEYS.TEMP_PASSES] || {};
      const ruleKey = baseRule.customDomain || baseRule.packageName;
      let passesModified = false;

      // Clean up direct matches or subdomains attached to this rule
      for (const passKey of Object.keys(passes)) {
        if (
          passKey === ruleKey ||
          (ruleKey && passKey.endsWith(`.${ruleKey}`)) ||
          (baseRule.type === 'service' &&
            findServiceIdByDomain(passKey) === baseRule.packageName)
        ) {
          delete passes[passKey];
          passesModified = true;
        }
      }

      if (passesModified) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.TEMP_PASSES]: passes,
        });
      }

      chrome.runtime.sendMessage({ action: 'manualSync' });
      return { ok: true };
    } catch (err: any) {
      toast.error(err.message);
      return { ok: false, error: err.message };
    }
  },

  async setDnsEnforcement(id: string, enabled: boolean, rules: any[]) {
    const rule = rules.find((r) => r.packageName === id);
    if (!rule) {
      return { ok: false, error: 'Rule not found' };
    }

    try {
      const kind = rule.type || 'domain';
      const actualState = Boolean(
        rule.blockedToday || rule.mode === 'block' || rule.mode === 'limit',
      );

      // Apply immediate state to NextDNS
      const policy = await getBlockingPolicy(storage);
      if (policy.enforcesCloudBlocking) {
        await this._runCloudSync(() =>
          nextDNSApi.setTargetState(kind, id, enabled && actualState),
        );
      }

      await updateRule(storage, {
        ...rule,
        scope: enabled ? 'both' : 'browser',
        updatedAt: Date.now(),
      });

      chrome.runtime.sendMessage({ action: 'manualSync' });
      return { ok: true };
    } catch (err: any) {
      toast.error(err.message);
      return { ok: false, error: err.message };
    }
  },

  async addDomainRule(domain: string) {
    try {
      const resolved = await nextDNSApi.resolveTargetInput(domain);

      // 1. Cloud Layer (NextDNS) - Only runs in STRONG mode if apps hard mode is ON
      const policy = await getBlockingPolicy(storage);
      if (policy.enforcesCloudBlocking) {
        await this._runCloudSync(() => nextDNSApi.addResolvedTarget(resolved));
      }

      // 2. Local Layer (Browser DNR) - Always runs
      const rule = {
        packageName: resolved.normalizedId,
        appName: resolved.displayName,
        type: (resolved.kind === 'service' ? 'service' : 'domain') as any,
        customDomain:
          resolved.kind === 'domain' ? resolved.normalizedId : undefined,
        scope: (resolved.kind === 'service' ? 'profile' : 'browser') as any,
        mode: 'block' as const,
        dailyLimitMinutes: 0,
        blockedToday: true,
        desiredBlockingState: true,
        maxDailyPasses: 3,
        streakDays: 0,
        streakStartedAt: Date.now(),
        streakUpdatedOn: undefined,
        addedAt: Date.now(),
        updatedAt: Date.now(),
        addedByUser: true,
      };

      await updateRule(storage, rule as any);
      chrome.runtime.sendMessage({ action: 'manualSync' });
      toast.success(`Shielded: ${resolved.displayName}`);
      return { ok: true };
    } catch (err: any) {
      toast.error(err.message);
      return { ok: false, error: err.message };
    }
  },

  async removeRule(id: string, rules: any[]) {
    const guard = await checkGuard('remove_app');
    if (!guard.allowed) {
      const msg = (guard as any).reason;
      toast.error(msg);
      return { ok: false, error: msg };
    }

    const rule = rules.find((r) => r.packageName === id);
    try {
      // 1. Cloud Layer (NextDNS) - Only runs in STRONG mode
      if (rule) {
        const policy = await getBlockingPolicy(storage);
        if (policy.enforcesCloudBlocking) {
          await this._runCloudSync(() =>
            nextDNSApi.setTargetState(rule.type || 'domain', id, false),
          );
        }
      }

      // 2. Local Layer (Browser DNR) - Always runs
      await deleteRule(storage, id);

      // 3. Cleanup temp pass for this domain
      const res = await chrome.storage.local.get([STORAGE_KEYS.TEMP_PASSES]);
      const passes = res[STORAGE_KEYS.TEMP_PASSES] || {};
      if (passes[id]) {
        delete passes[id];
        await chrome.storage.local.set({ [STORAGE_KEYS.TEMP_PASSES]: passes });
      }

      chrome.runtime.sendMessage({ action: 'manualSync' });
      return { ok: true };
    } catch (err: any) {
      toast.error(err.message);
      return { ok: false };
    }
  },

  async reconcileAppsDnsMode(enabled: boolean, rules: any[]) {
    try {
      toast.info(
        enabled ? 'Syncing Rules to DNS...' : 'Removing Rules from DNS...',
      );

      for (const rule of rules) {
        const kind = rule.type || 'domain';
        const id = rule.packageName;
        const isActive = Boolean(
          rule.blockedToday || rule.mode === 'block' || rule.mode === 'limit',
        );

        // If master is ON, sync only active rules. If master is OFF, remove ALL rules from DNS.
        await this._runCloudSync(() =>
          nextDNSApi.setTargetState(kind, id, enabled && isActive),
        );
      }

      toast.success(
        enabled ? 'Dns Hard Mode Active' : 'Local Verification Active',
      );
      return { ok: true };
    } catch (err: any) {
      toast.error(`Reconcile Failed: ${err.message}`);
      return { ok: false, error: err.message };
    }
  },
};
