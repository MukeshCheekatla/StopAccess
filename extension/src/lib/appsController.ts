import { updateRule, deleteRule } from '@stopaccess/state/rules';
import {
  nextDNSApi,
  extensionAdapter as storage,
} from '../background/platformAdapter';
import { getBlockingPolicy } from '@stopaccess/state';
import { toast } from './toast';
import { checkGuard } from '../background/sessionGuard';
import { STORAGE_KEYS } from '@stopaccess/state/index';
import { findServiceIdByDomain, getDomainForRule } from '@stopaccess/core';

function matchesDomain(domain: string, target: string): boolean {
  const normalizedDomain = String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  const normalizedTarget = String(target || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');

  return Boolean(
    normalizedDomain &&
      normalizedTarget &&
      (normalizedDomain === normalizedTarget ||
        normalizedDomain.endsWith(`.${normalizedTarget}`) ||
        normalizedTarget.endsWith(`.${normalizedDomain}`)),
  );
}

function getRuleTargets(rule: any, fallbackId?: string): string[] {
  const targets = new Set<string>();
  const primary = rule ? getDomainForRule(rule) : null;
  if (primary) {
    targets.add(primary);
  }
  if (rule?.customDomain) {
    targets.add(rule.customDomain);
  }
  if (rule?.packageName) {
    targets.add(rule.packageName);
  }
  if (fallbackId) {
    targets.add(fallbackId);
  }
  return Array.from(targets)
    .map((target) =>
      String(target || '')
        .trim()
        .toLowerCase()
        .replace(/^www\./, ''),
    )
    .filter(Boolean);
}

async function removeLocalBlockStateForRule(rule: any, fallbackId?: string) {
  const targets = getRuleTargets(rule, fallbackId);
  if (targets.length === 0) {
    return;
  }

  const res = await chrome.storage.local.get([
    STORAGE_KEYS.BLOCKED_DOMAINS,
    STORAGE_KEYS.TEMP_PASSES,
  ]);

  const blockedDomains: string[] = Array.isArray(
    res[STORAGE_KEYS.BLOCKED_DOMAINS],
  )
    ? (res[STORAGE_KEYS.BLOCKED_DOMAINS] as string[])
    : [];
  const nextBlockedDomains = blockedDomains.filter(
    (domain: string) =>
      !targets.some((target) => matchesDomain(domain, target)),
  );

  const passes = res[STORAGE_KEYS.TEMP_PASSES] || {};
  let passesModified = false;
  for (const passKey of Object.keys(passes)) {
    if (
      targets.some((target) => matchesDomain(passKey, target)) ||
      (rule?.type === 'service' &&
        findServiceIdByDomain(passKey) === rule.packageName)
    ) {
      delete passes[passKey];
      passesModified = true;
    }
  }

  const patch: Record<string, any> = {};
  if (nextBlockedDomains.length !== blockedDomains.length) {
    patch[STORAGE_KEYS.BLOCKED_DOMAINS] = nextBlockedDomains;
  }
  if (passesModified) {
    patch[STORAGE_KEYS.TEMP_PASSES] = passes;
  }

  if (Object.keys(patch).length > 0) {
    await chrome.storage.local.set(patch);
  }
}

function isRuleBlockingEnabled(
  rule: any,
  passes: Record<string, any> = {},
): boolean {
  if (!rule || rule.desiredBlockingState === false || rule.mode === 'allow') {
    return false;
  }

  const pkg = rule.packageName || rule.appName;
  if (passes[pkg]) {
    const pass = passes[pkg];
    if (pass && pass.expiresAt > Date.now()) {
      return false;
    }
  }

  return Boolean(
    rule.blockedToday || rule.mode === 'block' || rule.mode === 'limit',
  );
}

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
      chrome.runtime.sendMessage({ action: 'manualSync' });

      if (!nextState) {
        await removeLocalBlockStateForRule(baseRule, id);
      }

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
      const state = await storage.loadGlobalState();
      const actualState = isRuleBlockingEnabled(rule, state.passes);

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

      // 3. Immediately clear stale local block state so open tabs unblock now.
      await removeLocalBlockStateForRule(rule, id);

      chrome.runtime.sendMessage({ action: 'manualSync' });
      return { ok: true };
    } catch (err: any) {
      toast.error(err.message);
      return { ok: false };
    }
  },

  async reconcileAppsDnsMode(enabled: boolean, rules: any[]) {
    try {
      const isConfigured = await nextDNSApi.isConfigured();
      if (!isConfigured) {
        return { ok: true };
      }

      const state = await storage.loadGlobalState();
      const currentPasses = state.passes || {};

      // Parallelize cloud updates to avoid sequential network delays
      const promises = rules.map(async (rule) => {
        const kind = rule.type || 'domain';
        const id = rule.packageName;
        const result = await nextDNSApi.setTargetState(
          kind,
          id,
          enabled && isRuleBlockingEnabled(rule, currentPasses),
        );
        if (result && result.ok === false) {
          const error = (result as any).error;
          const status = error?.status;
          if (status !== 400 && status !== 404) {
            throw new Error(error?.message || 'NextDNS sync failed');
          }
        }
      });

      await Promise.all(promises);

      // Refresh metadata once at the end instead of after every rule
      await nextDNSApi.refreshNextDNSMetadata();

      toast.success(
        enabled ? 'DNS Hard Mode Active' : 'DNS Hard Mode Disabled',
      );
      return { ok: true };
    } catch (err: any) {
      toast.error(`Reconcile Failed: ${err.message}`);
      return { ok: false, error: err.message };
    }
  },

  minutesTillMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.ceil((midnight.getTime() - now.getTime()) / 60000);
  },

  async grantTempPass(
    domain: string,
    minutes: number,
    maxDailyPasses: number,
    skipLimit = false,
  ) {
    const guard = await checkGuard('disable_blocking');
    if (!guard.allowed) {
      return { ok: false, error: (guard as any).reason };
    }

    const storageRes = await chrome.storage.local.get([
      STORAGE_KEYS.TEMP_PASSES,
      STORAGE_KEYS.EXTENSION_COUNTS,
    ]);

    const passes = storageRes[STORAGE_KEYS.TEMP_PASSES] || {};
    const counts = storageRes[STORAGE_KEYS.EXTENSION_COUNTS] || {};
    const today = new Date().toISOString().split('T')[0];

    if (!counts[today]) {
      counts[today] = {};
    }

    const currentCount = counts[today][domain] || 0;
    if (!skipLimit && currentCount >= maxDailyPasses) {
      return { ok: false, error: 'No more passes left today' };
    }

    passes[domain] = {
      expiresAt: Date.now() + minutes * 60000,
      grantedMinutes: minutes,
      grantedAt: Date.now(),
    };

    if (!skipLimit) {
      counts[today][domain] = currentCount + 1;
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.TEMP_PASSES]: passes,
      [STORAGE_KEYS.EXTENSION_COUNTS]: counts,
    });

    chrome.runtime.sendMessage({ action: 'manualSync' });
    return { ok: true };
  },
};
