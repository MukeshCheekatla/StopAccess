import { AppRule } from '../types';
import { storage } from './storage';

const RULES_KEY = 'app_rules';

export function getRules(): AppRule[] {
  const raw = storage.getString(RULES_KEY);
  if (raw) {
    return JSON.parse(raw) as AppRule[];
  }

  // Return empty by default to ensure fresh fetch
  const defaults: AppRule[] = [];
  saveRules(defaults);
  return defaults;
}

export function saveRules(rules: AppRule[]): void {
  storage.set(RULES_KEY, JSON.stringify(rules));
}

export function updateRule(updated: AppRule): void {
  const rules = getRules();
  const idx = rules.findIndex((r) => r.packageName === updated.packageName);
  if (idx >= 0) {
    rules[idx] = { ...rules[idx], ...updated };
  } else {
    rules.push(updated);
  }
  saveRules(rules);
}

export function deleteRule(packageName: string): void {
  const rules = getRules();
  const filtered = rules.filter((r) => r.packageName !== packageName);
  saveRules(filtered);
}
