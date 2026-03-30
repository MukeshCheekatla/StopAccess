/**
 * @focusgate/state — Rule Persistence
 */

import { AppRule } from '@focusgate/types';

export const RULES_KEY = 'rules';

export async function getRules(storage: any): Promise<AppRule[]> {
  const raw = await storage.getString(RULES_KEY);
  if (!raw) {
    return [];
  }
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function saveRules(storage: any, rules: AppRule[]): Promise<void> {
  await storage.set(
    RULES_KEY,
    typeof rules === 'string' ? rules : JSON.stringify(rules),
  );
}

export async function updateRule(
  storage: any,
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
  storage: any,
  packageName: string,
): Promise<AppRule[]> {
  let rules = await getRules(storage);
  rules = rules.filter((r) => r.packageName !== packageName);
  await saveRules(storage, rules);
  return rules;
}
