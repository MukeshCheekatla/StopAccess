import { updateRule, deleteRule } from '@focusgate/state/rules';
import {
  nextDNSApi,
  extensionAdapter as storage,
} from '../background/platformAdapter';
import { toast } from './toast';
import { checkGuard } from '../background/sessionGuard';

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

    const isConfigured = await nextDNSApi.isConfigured();
    try {
      if (isConfigured) {
        const result = await nextDNSApi.setTargetState(kind, id, nextState);
        if (!result.ok) {
          const errorMsg =
            typeof (result.error as any) === 'object'
              ? (result.error as any).message
              : result.error;
          throw new Error(errorMsg || 'Sync failed');
        }
        await nextDNSApi.refreshNextDNSMetadata();
      }

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
              scope: 'browser' as const,
            }
          : {
              packageName: id,
              appName: name || id,
              type: kind as any,
              scope: 'profile' as const,
            });

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
        updatedAt: Date.now(),
      });

      chrome.runtime.sendMessage({ action: 'manualSync' });
      return { ok: true };
    } catch (err: any) {
      toast.error(`Toggle Error: ${err.message}`);
      return { ok: false, error: err.message };
    }
  },

  async addDomainRule(domain: string) {
    const isConfigured = await nextDNSApi.isConfigured();
    try {
      const resolved = await nextDNSApi.resolveTargetInput(domain);

      if (isConfigured) {
        const result = await nextDNSApi.addResolvedTarget(resolved);
        if (!result.ok) {
          const errorMsg =
            typeof (result.error as any) === 'object'
              ? (result.error as any).message
              : result.error;
          throw new Error(errorMsg || 'Add failed');
        }
        await nextDNSApi.refreshNextDNSMetadata();
      }

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
        updatedAt: Date.now(),
        addedByUser: true,
      };

      await updateRule(storage, rule as any);
      chrome.runtime.sendMessage({ action: 'manualSync' });
      toast.success(`Shielded: ${resolved.displayName}`);
      return { ok: true };
    } catch (err: any) {
      toast.error(`Add Error: ${err.message}`);
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

    const isConfigured = await nextDNSApi.isConfigured();
    const rule = rules.find((r) => r.packageName === id);
    try {
      if (isConfigured && rule) {
        await nextDNSApi.setTargetState(rule.type || 'domain', id, false);
        await nextDNSApi.refreshNextDNSMetadata();
      }
      await deleteRule(storage, id);
      chrome.runtime.sendMessage({ action: 'manualSync' });
      return { ok: true };
    } catch (err: any) {
      toast.error(`Delete Error: ${err.message}`);
      return { ok: false };
    }
  },
};
