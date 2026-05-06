/**
 * content/passManager.ts
 * Handles temp-pass storage reads/writes for the content script.
 * No DOM, no overlay — pure Chrome storage logic.
 */
import { ruleMatchesDomain } from '@stopaccess/core';
import { AppRule } from '@stopaccess/types';

export const TEMP_PASSES_KEY = 'fg_temp_passes';
export const EXT_COUNTS_KEY = 'fg_extension_counts';
const RULES_KEY = 'rules';
const WILT_UNTIL_KEY = 'wilt_until';
export const DEFAULT_MAX_DAILY_PASSES = 3;

function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function findMatchingRule(rules: AppRule[], domain: string) {
  return rules.find((rule) => ruleMatchesDomain(rule, domain));
}

export async function getActiveTempPass(domain: string) {
  const res = await chrome.storage.local.get([TEMP_PASSES_KEY]);
  const passes = res[TEMP_PASSES_KEY] || {};

  const parts = domain.split('.');
  let pass = null;
  for (let i = 0; i <= parts.length - 2; i++) {
    const d = parts.slice(i).join('.');
    if (passes[d]) {
      pass = passes[d];
      break;
    }
  }

  if (!pass) {
    return null;
  }

  if (Date.now() > pass.expiresAt) {
    if (passes[domain]) {
      delete passes[domain];
      await chrome.storage.local.set({ [TEMP_PASSES_KEY]: passes });
    }
    return null;
  }
  return pass;
}

export async function getExtensionCount(domain: string): Promise<number> {
  const res = await chrome.storage.local.get([EXT_COUNTS_KEY]);
  const counts = res[EXT_COUNTS_KEY] || {};
  const today = todayKey();
  return (counts[today] && counts[today][domain]) || 0;
}

export function getMaxPasses(rule: AppRule | undefined): number {
  return Math.max(0, Number(rule?.maxDailyPasses ?? DEFAULT_MAX_DAILY_PASSES));
}

export async function grantTempPass(
  domain: string,
  minutes: number,
  maxDailyPasses = DEFAULT_MAX_DAILY_PASSES,
): Promise<boolean> {
  const count = await getExtensionCount(domain);
  if (count >= maxDailyPasses) {
    return false;
  }

  const res = await chrome.storage.local.get([
    TEMP_PASSES_KEY,
    EXT_COUNTS_KEY,
    RULES_KEY,
  ]);
  const passes = res[TEMP_PASSES_KEY] || {};
  const counts = res[EXT_COUNTS_KEY] || {};
  const today = todayKey();

  let rules: AppRule[] = [];
  try {
    rules =
      typeof res[RULES_KEY] === 'string'
        ? JSON.parse(res[RULES_KEY] || '[]')
        : res[RULES_KEY] || [];
  } catch {}

  const matchingRule = findMatchingRule(rules, domain);
  const pkgId = matchingRule?.packageName;

  const passData = {
    expiresAt: Date.now() + minutes * 60000,
    grantedMinutes: minutes,
    grantedAt: Date.now(),
  };

  if (pkgId) {
    passes[pkgId] = passData;
  }
  passes[domain] = passData;

  if (!counts[today]) {
    counts[today] = {};
  }
  counts[today][domain] = (counts[today][domain] || 0) + 1;

  for (const key of Object.keys(counts)) {
    if (key !== today) {
      delete counts[key];
    }
  }

  await chrome.storage.local.set({
    [TEMP_PASSES_KEY]: passes,
    [EXT_COUNTS_KEY]: counts,
    [WILT_UNTIL_KEY]: Date.now() + 60 * 60 * 1000,
  });

  return true;
}
