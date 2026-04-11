/**
 * @stopaccess/state — Rule Persistence
 */

import { AppRule, StorageAdapter } from '@stopaccess/types';

export const RULES_KEY = 'rules';

export async function getRules(storage: StorageAdapter): Promise<AppRule[]> {
  const raw = await storage.getString(RULES_KEY);
  if (!raw) {
    return [];
  }
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function saveRules(
  storage: StorageAdapter,
  rules: AppRule[],
): Promise<void> {
  await storage.set(RULES_KEY, JSON.stringify(rules));
}

export async function updateRule(
  storage: StorageAdapter,
  updated: AppRule,
): Promise<AppRule[]> {
  const rules = await getRules(storage);
  const idx = rules.findIndex((r) => r.packageName === updated.packageName);

  if (idx >= 0) {
    rules[idx] = { ...updated, updatedAt: Date.now() };
  } else {
    rules.push({ ...updated, updatedAt: Date.now() });
  }

  await saveRules(storage, rules);
  return rules;
}

export async function deleteRule(
  storage: StorageAdapter,
  packageName: string,
): Promise<AppRule[]> {
  let rules = await getRules(storage);
  rules = rules.filter((r) => r.packageName !== packageName);
  await saveRules(storage, rules);
  return rules;
}

export function isRuleActive(rule?: Partial<AppRule> | null): boolean {
  return Boolean(
    rule?.desiredBlockingState ??
      rule?.blockedToday ??
      (rule?.mode === 'block' || rule?.mode === 'limit'),
  );
}

export function createRule(
  id: string,
  type: AppRule['type'],
  name: string,
  active: boolean,
): AppRule {
  return {
    appName: name || id,
    packageName: id,
    customDomain: type === 'domain' ? id : undefined,
    type,
    scope: type === 'domain' ? 'browser' : 'profile',
    mode: active ? 'limit' : 'allow',
    dailyLimitMinutes: 0,
    blockedToday: active,
    desiredBlockingState: active,
    usedMinutesToday: 0,
    addedByUser: true,
    updatedAt: Date.now(),
  };
}
