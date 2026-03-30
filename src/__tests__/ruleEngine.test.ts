import {
  evaluateRules,
  runFullEngineCycle,
  startEngine,
  stopEngine,
} from '@focusgate/core/engine';

describe('@focusgate/core engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    stopEngine();
    jest.useRealTimers();
  });

  it('starts exactly one interval at a time', () => {
    startEngine({} as any);
    expect(jest.getTimerCount()).toBe(1);

    startEngine({} as any);
    expect(jest.getTimerCount()).toBe(1);
  });

  it('stopEngine clears the interval', () => {
    startEngine({} as any);
    stopEngine();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('blocks manual and over-limit rules', () => {
    const { masterBlockList, updatedRules } = evaluateRules({
      rules: [
        {
          appName: 'Instagram',
          packageName: 'com.instagram.android',
          mode: 'limit',
          dailyLimitMinutes: 30,
          blockedToday: false,
          usedMinutesToday: 45,
          addedByUser: true,
        },
        {
          appName: 'YouTube',
          packageName: 'com.google.android.youtube',
          mode: 'block',
          dailyLimitMinutes: 0,
          blockedToday: false,
          usedMinutesToday: 0,
          addedByUser: true,
        },
      ],
      schedules: [],
      focusEndTime: 0,
    });

    expect(masterBlockList.has('com.instagram.android')).toBe(true);
    expect(masterBlockList.has('com.google.android.youtube')).toBe(true);
    expect(updatedRules.every((rule) => rule.blockedToday)).toBe(true);
  });

  it('blocks scheduled apps during an active schedule window', () => {
    const { masterBlockList } = evaluateRules({
      rules: [
        {
          appName: 'Instagram',
          packageName: 'com.instagram.android',
          mode: 'allow',
          dailyLimitMinutes: 0,
          blockedToday: false,
          usedMinutesToday: 0,
          addedByUser: true,
        },
      ],
      schedules: [
        {
          id: 'sched-1',
          name: 'Workday block',
          appNames: ['com.instagram.android'],
          startTime: '09:00',
          endTime: '17:00',
          days: [1],
          active: true,
        },
      ],
      focusEndTime: 0,
      now: new Date('2026-03-30T10:00:00'),
    });

    expect(masterBlockList.has('com.instagram.android')).toBe(true);
  });

  it('runFullEngineCycle persists updated rules', async () => {
    const saveRules = jest.fn().mockResolvedValue(undefined);
    const notifyBlocked = jest.fn();

    const result = await runFullEngineCycle({
      storage: {
        loadGlobalState: jest.fn().mockResolvedValue({
          rules: [
            {
              appName: 'Instagram',
              packageName: 'com.instagram.android',
              mode: 'limit',
              dailyLimitMinutes: 30,
              blockedToday: false,
              usedMinutesToday: 45,
              addedByUser: true,
            },
          ],
          schedules: [],
          focusEndTime: 0,
        }),
        saveRules,
      },
      api: {},
      logger: { add: jest.fn() },
      notifications: { notifyBlocked },
    } as any);

    expect(result.ok).toBe(true);
    expect(saveRules).toHaveBeenCalledWith([
      expect.objectContaining({
        appName: 'Instagram',
        blockedToday: true,
      }),
    ]);
    expect(notifyBlocked).toHaveBeenCalledWith('Instagram');
  });
});
