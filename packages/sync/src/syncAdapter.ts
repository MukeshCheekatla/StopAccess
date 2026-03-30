/**
 * @focusgate/sync — NextDNS Synchronization Adaptor
 */

import { AppRule } from '@focusgate/types';

export interface NextDNSSyncAdapterInterface {
  push(rules: AppRule[], logger?: any): Promise<void>;
  pull(currentRules: AppRule[]): Promise<AppRule[]>;
}

export class NextDNSSyncAdapter implements NextDNSSyncAdapterInterface {
  api: any;

  constructor(apiClient: any) {
    this.api = apiClient;
  }

  async push(localRules: AppRule[], logger?: any): Promise<void> {
    const isConfigured = await this.api.isConfigured();
    if (!isConfigured) {
      return;
    }

    const blocked = localRules.filter((r) => r.blockedToday);
    await this.api.blockApps(blocked, this.api, logger?.add);
  }

  async pull(currentRules: AppRule[]): Promise<AppRule[]> {
    const isConfigured = await this.api.isConfigured();
    if (!isConfigured) {
      return currentRules;
    }

    const [services, categories] = await Promise.all([
      this.api.getParentalControlServices(this.api, () => {}),
      this.api.getParentalControlCategories(this.api, () => {}),
    ]);
    const merged = currentRules.map((local) => {
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
      if (remote.active !== local.blockedToday) {
        return { ...local, blockedToday: remote.active, updatedAt: Date.now() };
      }
      return local;
    });

    return merged;
  }
}
