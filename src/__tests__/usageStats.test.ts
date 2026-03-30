/**
 * usageStats.test.ts -- Jest tests for src/modules/usageStats.ts
 *
 * Strategy:
 *   - react-native is mocked via jest.rn-mock.js (moduleNameMapper in jest.config.js)
 *     which exposes NativeModules as a plain mutable object and Platform as a
 *     configurable object. We mutate these before each test.
 *   - storage (MMKV) is mocked via jest.mock so tests run without native bindings.
 *   - The module under test accesses NativeModules lazily (inside each function)
 *     so mocks applied in beforeEach are always picked up.
 *
 * Run with:  npx jest src/__tests__/usageStats.test.ts
 */

// --- Storage mock (before any imports that use it) ---

const mockStorageSet = jest.fn();
const mockStorageGet = jest.fn<string | undefined, [string]>();

jest.mock('../store/storageAdapter', () => ({
  storage: {
    set: (key: string, value: string) => mockStorageSet(key, value),
    getString: (key: string) => mockStorageGet(key),
  },
}));

// --- React Native mock handles ---
// jest.rn-mock.js exposes { NativeModules, Platform } as plain objects.
// We import them here so we can mutate them per-test.

import { NativeModules, Platform } from 'react-native';

// --- Native method mocks ---

const mockHasPermission = jest.fn<Promise<boolean>, []>();
const mockRequestPermission = jest.fn<Promise<void>, []>();
const mockGetTodayUsage = jest.fn<Promise<RawRecord[]>, []>();
const mockGetAppUsage = jest.fn<Promise<RawRecord>, [string]>();

interface RawRecord {
  packageName: string;
  appName: string;
  usageMinutes: number;
}

function makeRawRecord(
  packageName = 'com.example.app',
  appName = 'Example',
  usageMinutes = 42,
): RawRecord {
  return { packageName, appName, usageMinutes };
}

// --- Module under test ---

import {
  hasUsagePermission,
  requestUsagePermission,
  refreshTodayUsage,
  getCachedUsage,
  getAppMinutesToday,
  formatMinutes,
} from '../modules/usageStats';

// --- Setup ---

beforeEach(() => {
  jest.clearAllMocks();

  // Default: Android, with all native methods wired up
  (Platform as { OS: string }).OS = 'android';
  (NativeModules as Record<string, unknown>).UsageStats = {
    hasPermission: mockHasPermission,
    requestPermission: mockRequestPermission,
    getTodayUsage: mockGetTodayUsage,
    getAppUsage: mockGetAppUsage,
  };
});

// --- hasUsagePermission ---

describe('hasUsagePermission', () => {
  it('returns true when native module resolves true', async () => {
    mockHasPermission.mockResolvedValue(true);
    await expect(hasUsagePermission()).resolves.toBe(true);
    expect(mockHasPermission).toHaveBeenCalledTimes(1);
  });

  it('returns false when native module resolves false', async () => {
    mockHasPermission.mockResolvedValue(false);
    await expect(hasUsagePermission()).resolves.toBe(false);
  });

  it('returns false when native module rejects', async () => {
    mockHasPermission.mockRejectedValue(new Error('native crash'));
    await expect(hasUsagePermission()).resolves.toBe(false);
  });

  it('returns false on iOS without calling native module', async () => {
    (Platform as { OS: string }).OS = 'ios';
    await expect(hasUsagePermission()).resolves.toBe(false);
    expect(mockHasPermission).not.toHaveBeenCalled();
  });
});

// --- requestUsagePermission ---

describe('requestUsagePermission', () => {
  it('calls native requestPermission on Android', async () => {
    mockRequestPermission.mockResolvedValue(undefined);
    await requestUsagePermission();
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('does not call native module on iOS', async () => {
    (Platform as { OS: string }).OS = 'ios';
    await requestUsagePermission();
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it('propagates rejection from the native module', async () => {
    mockRequestPermission.mockRejectedValue(new Error('PERMISSION_ERROR'));
    await expect(requestUsagePermission()).rejects.toThrow('PERMISSION_ERROR');
  });
});

// --- refreshTodayUsage ---

describe('refreshTodayUsage', () => {
  it('maps usageMinutes -> totalMinutes and persists to cache', async () => {
    const raw = [
      makeRawRecord('com.instagram.android', 'Instagram', 90),
      makeRawRecord('com.twitter.android', 'Twitter', 30),
    ];
    mockGetTodayUsage.mockResolvedValue(raw);

    const result = await refreshTodayUsage();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      packageName: 'com.instagram.android',
      appName: 'Instagram',
      totalMinutes: 90,
      lastUsed: 0,
    });
    expect(result[1]).toEqual({
      packageName: 'com.twitter.android',
      appName: 'Twitter',
      totalMinutes: 30,
      lastUsed: 0,
    });

    expect(mockStorageSet).toHaveBeenCalledWith(
      'usage_cache_today',
      JSON.stringify(result),
    );
  });

  it('returns an empty array when native module returns empty', async () => {
    mockGetTodayUsage.mockResolvedValue([]);
    const result = await refreshTodayUsage();
    expect(result).toEqual([]);
  });

  it('falls back to cached data on iOS without calling native module', async () => {
    (Platform as { OS: string }).OS = 'ios';
    const cached = [
      {
        packageName: 'com.example',
        appName: 'Example',
        totalMinutes: 10,
        lastUsed: 0,
      },
    ];
    mockStorageGet.mockReturnValue(JSON.stringify(cached));

    const result = await refreshTodayUsage();
    expect(mockGetTodayUsage).not.toHaveBeenCalled();
    expect(result[0].totalMinutes).toBe(10);
  });
});

// --- getCachedUsage ---

describe('getCachedUsage', () => {
  it('returns parsed array from MMKV', () => {
    const stored = [
      { packageName: 'com.a', appName: 'A', totalMinutes: 5, lastUsed: 0 },
    ];
    mockStorageGet.mockReturnValue(JSON.stringify(stored));
    expect(getCachedUsage()).toEqual(stored);
  });

  it('returns empty array when cache is empty', () => {
    mockStorageGet.mockReturnValue(undefined);
    expect(getCachedUsage()).toEqual([]);
  });

  it('returns empty array when cache contains invalid JSON', () => {
    mockStorageGet.mockReturnValue('not-valid-json{{');
    expect(getCachedUsage()).toEqual([]);
  });
});

// --- getAppMinutesToday ---

describe('getAppMinutesToday', () => {
  it('returns usageMinutes from native getAppUsage', async () => {
    mockGetAppUsage.mockResolvedValue(
      makeRawRecord('com.example', 'Example', 77),
    );
    await expect(getAppMinutesToday('com.example')).resolves.toBe(77);
    expect(mockGetAppUsage).toHaveBeenCalledWith('com.example');
  });

  it('returns 0 when native module rejects', async () => {
    mockGetAppUsage.mockRejectedValue(new Error('crash'));
    await expect(getAppMinutesToday('com.example')).resolves.toBe(0);
  });

  it('falls back to cache on iOS', async () => {
    (Platform as { OS: string }).OS = 'ios';
    mockStorageGet.mockReturnValue(
      JSON.stringify([
        {
          packageName: 'com.example',
          appName: 'X',
          totalMinutes: 33,
          lastUsed: 0,
        },
      ]),
    );
    await expect(getAppMinutesToday('com.example')).resolves.toBe(33);
    expect(mockGetAppUsage).not.toHaveBeenCalled();
  });

  it('returns 0 for unknown package in cache fallback on iOS', async () => {
    (Platform as { OS: string }).OS = 'ios';
    mockStorageGet.mockReturnValue(JSON.stringify([]));
    await expect(getAppMinutesToday('com.unknown')).resolves.toBe(0);
  });
});

// --- formatMinutes ---

describe('formatMinutes', () => {
  const cases: [number, string][] = [
    [0, '0m'],
    [1, '1m'],
    [59, '59m'],
    [60, '1h'],
    [61, '1h 1m'],
    [90, '1h 30m'],
    [120, '2h'],
    [125, '2h 5m'],
    [600, '10h'],
  ];

  test.each(cases)('formatMinutes(%i) === "%s"', (input, expected) => {
    expect(formatMinutes(input)).toBe(expected);
  });
});
