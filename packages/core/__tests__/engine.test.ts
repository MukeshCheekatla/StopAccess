import { AppRule, SyncContext } from '@stopaccess/types';
import {
  evaluateRules,
  runFullEngineCycle,
  FocusEngine,
} from '../src/engine/rules';
import { SyncOrchestrator } from '../src/engine/sync';

jest.mock('../src/engine/sync');

describe('FocusEngine', () => {
  let mockCtx: jest.Mocked<SyncContext>;
  let engine: FocusEngine;

  beforeEach(() => {
    mockCtx = {
      storage: {
        loadGlobalState: jest.fn().mockResolvedValue({
          rules: [],
          schedules: [],
          focusEndTime: 0,
        }),
        saveRules: jest.fn().mockResolvedValue(undefined),
      } as any,
      logger: { add: jest.fn() },
    } as any;
    engine = new FocusEngine(mockCtx);
  });

  it('runs a tick and performs sync', async () => {
    const tickResult = await engine.tick();
    expect(tickResult.ok).toBe(true);
    expect(SyncOrchestrator).toHaveBeenCalled();
    const syncInstance = (SyncOrchestrator as jest.Mock).mock.instances[0];
    expect(syncInstance.performSync).toHaveBeenCalled();
  });
});

describe('runFullEngineCycle', () => {
  let mockCtx: jest.Mocked<SyncContext>;

  beforeEach(() => {
    mockCtx = {
      storage: {
        loadGlobalState: jest.fn().mockResolvedValue({
          rules: [
            {
              appName: 'Insta',
              packageName: 'com.insta',
              mode: 'block',
              blockedToday: false,
              addedByUser: true,
            },
          ],
          schedules: [],
          focusEndTime: 0,
        }),
        saveRules: jest.fn().mockResolvedValue(undefined),
      } as any,
      enforcements: {
        applyBlockedPackages: jest.fn().mockResolvedValue(undefined),
      },
    } as any;
  });

  it('applies enforcements for blocked packages', async () => {
    const result = await runFullEngineCycle(mockCtx);
    expect(result.ok).toBe(true);
    expect(mockCtx.enforcements?.applyBlockedPackages).toHaveBeenCalledWith([
      'com.insta',
    ]);
    expect(mockCtx.storage.saveRules).toHaveBeenCalled();
  });
});

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
  ];

  it('blocks apps in "block" mode', () => {
    const { updatedRules } = evaluateRules({
      rules: mockRules,
      schedules: [],
      focusEndTime: 0,
    });
    expect(updatedRules[0].blockedToday).toBe(true);
  });
});
