import {
  startRuleEngine,
  stopRuleEngine,
  resetDailyBlocks,
  runChecks,
} from '../engine/ruleEngine';
import { getRules } from '../store/rules';
import { getSchedules } from '../store/schedules';
import { getAppMinutesToday } from '../modules/usageStats';
import { blockApps, unblockAll } from '../api/nextdns';

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(() => null),
    getNumber: jest.fn(() => 0),
    getBoolean: jest.fn(() => false),
    delete: jest.fn(),
  })),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    displayNotification: jest.fn(),
  },
  AndroidImportance: {
    HIGH: 'HIGH',
  },
}));

jest.mock('../api/nextdns', () => ({
  isConfigured: jest.fn(() => true),
  blockApp: jest.fn(() => Promise.resolve()),
  unblockApp: jest.fn(() => Promise.resolve()),
  blockApps: jest.fn(() => Promise.resolve()),
  unblockAll: jest.fn(() => Promise.resolve()),
}));

jest.mock('../modules/usageStats', () => ({
  getAppMinutesToday: jest.fn(() => Promise.resolve(0)),
  refreshTodayUsage: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../store/rules', () => ({
  getRules: jest.fn(() => []),
  saveRules: jest.fn(),
  updateRule: jest.fn(),
}));

jest.mock('../store/schedules', () => ({
  getSchedules: jest.fn(() => []),
}));

const mockGetRules = getRules as jest.Mock;
const mockGetSchedules = getSchedules as jest.Mock;
const mockGetAppMinutesToday = getAppMinutesToday as jest.Mock;
const mockUnblockAll = unblockAll as jest.Mock;
const mockBlockApps = blockApps as jest.Mock;
// const mockUpdateRule = updateRule as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  stopRuleEngine();
  jest.useRealTimers();
});

describe('RuleEngine', () => {
  describe('startRuleEngine / stopRuleEngine', () => {
    it('starts the engine interval', () => {
      startRuleEngine();
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('is idempotent — calling start twice does not create two intervals', () => {
      startRuleEngine();
      const countAfterFirst = jest.getTimerCount();
      startRuleEngine();
      expect(jest.getTimerCount()).toBe(countAfterFirst);
    });

    it('stopRuleEngine clears the interval', () => {
      startRuleEngine();
      stopRuleEngine();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('resetDailyBlocks', () => {
    it('calls unblockApps with names of all BLOCKED rules', async () => {
      mockGetRules.mockReturnValue([
        { appName: 'Instagram', mode: 'BLOCK', domains: ['instagram.com'] },
        { appName: 'YouTube', mode: 'ALLOW', domains: ['youtube.com'] },
        { appName: 'Twitter', mode: 'BLOCK', domains: ['twitter.com'] },
      ]);

      await resetDailyBlocks();
      expect(mockUnblockAll).toHaveBeenCalled();
    });

    it('still syncs an unblock when no rules are BLOCKED', async () => {
      mockGetRules.mockReturnValue([
        { appName: 'Instagram', mode: 'ALLOW', domains: ['instagram.com'] },
      ]);

      await resetDailyBlocks();

      expect(mockUnblockAll).toHaveBeenCalled();
    });
  });

  describe('runChecks — limit enforcement', () => {
    it('blocks an app when usage exceeds the daily limit', async () => {
      mockGetRules.mockReturnValue([
        {
          appName: 'Instagram',
          packageName: 'com.instagram.android',
          mode: 'limit',
          dailyLimitMinutes: 30,
          blockedToday: false,
          usedMinutesToday: 0,
          domains: ['instagram.com'],
        },
      ]);
      mockGetAppMinutesToday.mockResolvedValue(45);

      await runChecks();

      expect(mockBlockApps).toHaveBeenCalledWith(['Instagram']);
    });

    it('does NOT block an app that is under the limit', async () => {
      mockGetRules.mockReturnValue([
        {
          appName: 'YouTube',
          packageName: 'com.google.android.youtube',
          mode: 'limit',
          dailyLimitMinutes: 60,
          blockedToday: false,
          usedMinutesToday: 0,
          domains: ['youtube.com'],
        },
      ]);
      mockGetAppMinutesToday.mockResolvedValue(20);

      await runChecks();

      expect(mockBlockApps).not.toHaveBeenCalledWith(['YouTube']);
    });
  });

  describe('checkSchedules', () => {
    it('returns without error when no schedules exist', async () => {
      mockGetSchedules.mockReturnValue([]);
      startRuleEngine();
      expect(() => jest.advanceTimersByTime(60000)).not.toThrow();
    });
  });
});
