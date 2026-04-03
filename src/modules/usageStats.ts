/**
 * usageStats.ts -- JS bridge for the Android UsageStatsModule native module.
 *
 * API contract (must match Kotlin method names exactly):
 *   NativeModules.UsageStats.hasPermission()           -> Promise<boolean>
 *   NativeModules.UsageStats.requestPermission()       -> Promise<void>
 *   NativeModules.UsageStats.getTodayUsage()           -> Promise<UsageRecord[]>
 *   NativeModules.UsageStats.getAppUsage(pkg: string)  -> Promise<UsageRecord>
 *
 * UsageRecord: { packageName: string; appName: string; usageMinutes: number }
 *
 * IMPORTANT: NativeModules is accessed lazily (inside each function) so that
 * Jest tests can inject mocks on NativeModules before the functions are called.
 * Do NOT destructure NativeModules.UsageStats at module load time.
 */

import { NativeModules, Platform } from 'react-native';
import { storage } from '../store/storageAdapter';
import { AppUsageStat } from '@focusgate/types';

// --- Internal types ---

/** Shape returned directly by the Kotlin layer. */
interface RawUsageRecord {
  packageName: string;
  appName: string;
  /** Minutes of foreground use today -- matches Kotlin putInt("usageMinutes", ...) */
  usageMinutes: number;
}

interface UsageStatsNativeModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<void>;
  getTodayUsage(): Promise<RawUsageRecord[]>;
  getAppUsage(packageName: string): Promise<RawUsageRecord>;
  getWeeklyAverageMinutes(packageName: string): Promise<number>;
}

// --- Constants ---

const USAGE_CACHE_KEY = 'usage_cache_today';

// --- Lazy accessor ---

/**
 * Return the native UsageStats module, or null if unavailable.
 * Accessed lazily so Jest mocks applied before function calls are respected.
 */
function getNativeModule(): UsageStatsNativeModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  const mod = (NativeModules as Record<string, unknown>).UsageStats;
  return (mod as UsageStatsNativeModule) ?? null;
}

// --- Permission ---

/**
 * Check whether the PACKAGE_USAGE_STATS special permission has been granted.
 * Always resolves -- never rejects. Returns false on iOS or module missing.
 */
export async function hasUsagePermission(): Promise<boolean> {
  const mod = getNativeModule();
  if (!mod) {
    return false;
  }
  try {
    return await mod.hasPermission();
  } catch {
    return false;
  }
}

/**
 * Open the Android Usage Access Settings screen.
 * The user must manually toggle access for FocusGate.
 * Resolves immediately after the Intent is fired.
 * Rejects if the settings Intent cannot be launched.
 */
export async function requestUsagePermission(): Promise<void> {
  const mod = getNativeModule();
  if (!mod) {
    return;
  }
  return mod.requestPermission();
}

// --- Data ---

/**
 * Fetch today's usage from the OS, normalise to AppUsageStat[], persist to
 * the MMKV cache, and return the array.
 *
 * The `usageMinutes` field from Kotlin is mapped to `totalMinutes` on
 * AppUsageStat so the rest of the app (ruleEngine, DashboardScreen) is unchanged.
 */
export async function refreshTodayUsage(): Promise<AppUsageStat[]> {
  const mod = getNativeModule();
  if (!mod) {
    return getCachedUsage();
  }

  const raw: RawUsageRecord[] = await mod.getTodayUsage();

  const stats: AppUsageStat[] = raw.map((r) => ({
    packageName: r.packageName,
    appName: r.appName,
    totalMinutes: r.usageMinutes, // Kotlin field -> internal field
    lastUsed: 0, // not provided by module; placeholder
  }));

  storage.set(USAGE_CACHE_KEY, JSON.stringify(stats));
  return stats;
}

/**
 * Read the last-persisted usage array from MMKV.
 * Returns an empty array if nothing has been cached yet.
 * Safe to call synchronously from the rule engine.
 */
export function getCachedUsage(): AppUsageStat[] {
  try {
    const raw = storage.getString(USAGE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppUsageStat[]) : [];
  } catch {
    return [];
  }
}

/**
 * Fetch today's usage for a single package name.
 * Returns the minutes as a number (0 if the app was not used today).
 * Never rejects.
 */
export async function getAppMinutesToday(packageName: string): Promise<number> {
  const mod = getNativeModule();
  if (!mod) {
    // Fall back to cache on non-Android or missing module
    const cached = getCachedUsage();
    return cached.find((s) => s.packageName === packageName)?.totalMinutes ?? 0;
  }
  try {
    const record: RawUsageRecord = await mod.getAppUsage(packageName);
    return record.usageMinutes;
  } catch {
    return 0;
  }
}

/**
 * Returns the average daily usage minutes over the last 7 days for a package.
 */
export async function getWeeklyAverage(packageName: string): Promise<number> {
  const mod = getNativeModule();
  if (!mod) {
    return 0;
  }
  try {
    return await mod.getWeeklyAverageMinutes(packageName);
  } catch {
    return 0;
  }
}

/**
 * Get the currently visible (foreground) package name.
 * Returns "" if unavailable.
 */
export async function getForegroundApp(): Promise<string> {
  const mod = (NativeModules as any).UsageStats;
  if (!mod || typeof mod.getForegroundApp !== 'function') {
    return '';
  }
  try {
    return await mod.getForegroundApp();
  } catch {
    return '';
  }
}

// --- Formatting ---

/**
 * Format a minute count as a human-readable string.
 * Examples: 45 -> "45m", 90 -> "1h 30m", 120 -> "2h"
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 1) {
    return '0m';
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
