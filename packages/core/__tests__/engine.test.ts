import { AppRule, ScheduleRule } from '@focusgate/types';
import { evaluateRules } from '../src/engine';

describe('evaluateRules', () => {
  const mockRules: AppRule[] = [
    {
      appName: 'Instagram',
      packageName: 'com.instagram.android',
      type: 'domain',
      mode: 'block',
      blockedToday: false,
      scope: 'browser',
      addedByUser: false,
      dailyLimitMinutes: 0,
      usedMinutesToday: 0,
    },
    {
      appName: 'YouTube',
      packageName: 'com.google.android.youtube',
      type: 'domain',
      mode: 'limit',
      dailyLimitMinutes: 60,
      usedMinutesToday: 70,
      blockedToday: false,
      scope: 'browser',
      addedByUser: false,
    },
    {
      appName: 'Reddit',
      packageName: 'com.reddit.frontpage',
      type: 'domain',
      mode: 'limit',
      dailyLimitMinutes: 60,
      usedMinutesToday: 30,
      blockedToday: false,
      scope: 'browser',
      addedByUser: false,
    },
  ];

  const mockSchedules: ScheduleRule[] = [];

  it('blocks apps in "block" mode', () => {
    const { updatedRules } = evaluateRules({
      rules: mockRules,
      schedules: mockSchedules,
      focusEndTime: 0,
    });
    const instagram = updatedRules.find((r) => r.appName === 'Instagram');
    expect(instagram?.blockedToday).toBe(true);
  });

  it('blocks apps when daily limit is exceeded', () => {
    const { updatedRules } = evaluateRules({
      rules: mockRules,
      schedules: mockSchedules,
      focusEndTime: 0,
    });
    const youtube = updatedRules.find((r) => r.appName === 'YouTube');
    expect(youtube?.blockedToday).toBe(true);
  });

  it('does not block apps when within daily limit', () => {
    const { updatedRules } = evaluateRules({
      rules: mockRules,
      schedules: mockSchedules,
      focusEndTime: 0,
    });
    const reddit = updatedRules.find((r) => r.appName === 'Reddit');
    expect(reddit?.blockedToday).toBe(false);
  });

  it('blocks all apps when Focus Mode is active', () => {
    const now = new Date();
    const { updatedRules } = evaluateRules({
      rules: mockRules,
      schedules: mockSchedules,
      focusEndTime: now.getTime() + 1000000,
      now,
    });
    expect(updatedRules.every((r) => r.blockedToday)).toBe(true);
  });

  it('blocks apps based on active schedule', () => {
    const now = new Date('2024-01-01T10:00:00'); // Monday (1)
    const schedule: ScheduleRule = {
      id: 'work',
      name: 'Work',
      startTime: '09:00',
      endTime: '17:00',
      days: [1, 2, 3, 4, 5],
      active: true,
      appNames: ['com.reddit.frontpage'],
    };

    const { masterBlockList } = evaluateRules({
      rules: mockRules,
      schedules: [schedule],
      focusEndTime: 0,
      now,
    });

    expect(masterBlockList.has('com.reddit.frontpage')).toBe(true);
    expect(masterBlockList.get('com.reddit.frontpage')?.blockedToday).toBe(
      true,
    );
  });
});
