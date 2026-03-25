import { getRules, updateRule } from '../store/rules';
import { getSchedules } from '../store/schedules';
import { getAppMinutesToday, refreshTodayUsage } from '../modules/usageStats';
import * as nextDNS from '../api/nextdns';
import { storage } from '../store/storage';
import { notifyWarning, notifyBlocked } from '../services/notifications';

let engineInterval: ReturnType<typeof setInterval> | null = null;
const FOCUS_END_KEY = 'focus_mode_end_time';

export function stopRuleEngine(): void {
  if (engineInterval) {
    clearInterval(engineInterval);
    engineInterval = null;
  }
}

export function startRuleEngine(): void {
  if (engineInterval) {
    return;
  }
  refreshTodayUsage().catch(() => {});
  // Run primary check loop
  runEngineCycle();
  engineInterval = setInterval(runEngineCycle, 60 * 1000);
}

async function runEngineCycle() {
  // Check for Midnight Reset
  const today = new Date().toDateString();
  const lastReset = storage.getString('last_reset_day');
  if (lastReset !== today) {
    await resetDailyBlocks().catch(() => {});
    storage.set('last_reset_day', today);
  }

  await refreshTodayUsage().catch(() => {});
  const masterBlockList = new Set<string>();

  // 1. Check Manual Blocks & Limits
  const rules = getRules();
  for (const rule of rules) {
    let usedMinutes = rule.usedMinutesToday || 0;
    if (rule.mode === 'limit' && rule.dailyLimitMinutes > 0) {
      usedMinutes = await getAppMinutesToday(rule.packageName).catch(
        () => usedMinutes,
      );
    }

    // Update store with fresh usage
    const updated = { ...rule, usedMinutesToday: usedMinutes };

    // Check for block reasons
    const isManualBlock = rule.mode === 'block';
    const isOverLimit =
      rule.mode === 'limit' &&
      rule.dailyLimitMinutes > 0 &&
      usedMinutes >= rule.dailyLimitMinutes;

    if (isManualBlock || isOverLimit) {
      masterBlockList.add(rule.appName);
      if (!rule.blockedToday) {
        updated.blockedToday = true;
        if (isOverLimit) {
          notifyBlocked(rule.appName).catch(() => {});
        }
      }
    } else {
      updated.blockedToday = false;
      // Handle warning (80%)
      if (rule.mode === 'limit' && rule.dailyLimitMinutes > 0) {
        const pct = usedMinutes / rule.dailyLimitMinutes;
        if (pct >= 0.8 && pct < 1.0 && !rule.warningSent) {
          notifyWarning(
            rule.appName,
            usedMinutes,
            rule.dailyLimitMinutes,
          ).catch(() => {});
          updated.warningSent = true;
        }
      }
    }
    updateRule(updated);
  }

  // 2. Check Schedules
  const schedules = getSchedules();
  const now = new Date();
  const currentDay = now.getDay();
  const currentMin = now.getHours() * 60 + now.getMinutes();

  for (const s of schedules) {
    if (!s.active || !s.days.includes(currentDay)) {
      continue;
    }
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    if (currentMin >= sh * 60 + sm && currentMin < eh * 60 + em) {
      s.appNames.forEach((name) => masterBlockList.add(name));
    }
  }

  // 3. Check Focus Mode (Timer)
  const focusEndTime = storage.getNumber(FOCUS_END_KEY) || 0;
  if (Date.now() < focusEndTime) {
    // Block ALL controlled apps during focus
    rules.forEach((r) => masterBlockList.add(r.appName));
  }

  // 4. Sync with NextDNS
  await syncMasterList(Array.from(masterBlockList));
}

async function syncMasterList(names: string[]) {
  if (!nextDNS.isConfigured()) {
    return;
  }
  await nextDNS.blockApps(names).catch(() => {});
}

export async function resetDailyBlocks(): Promise<void> {
  const rules = getRules();
  for (const rule of rules) {
    if (rule.blockedToday || rule.usedMinutesToday > 0) {
      updateRule({
        ...rule,
        blockedToday: false,
        usedMinutesToday: 0,
        warningSent: false,
      });
    }
  }
  await nextDNS.unblockAll().catch(() => {});
}

export const runChecks = runEngineCycle;
