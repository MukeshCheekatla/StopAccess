import { STORAGE_KEYS } from '@stopaccess/state';
import { FocusSessionRecord } from '@stopaccess/types';
import { VMPlatformDependencies } from './types';

export async function loadFocusData(deps: VMPlatformDependencies) {
  const { storage } = deps;
  const storageRes = await storage.getMultiple([
    STORAGE_KEYS.SESSION,
    STORAGE_KEYS.FOCUS_END,
    STORAGE_KEYS.SESSION_START,
  ]);

  const activeSession = storageRes[
    STORAGE_KEYS.SESSION
  ] as FocusSessionRecord | null;

  const focusEnd =
    (activeSession?.status === 'focusing'
      ? (activeSession.startedAt || 0) + (activeSession.duration || 0) * 60000
      : (storageRes[STORAGE_KEYS.FOCUS_END] as number) || 0) ?? 0;

  const focusStart =
    (activeSession?.status === 'focusing'
      ? activeSession.startedAt || 0
      : (storageRes[STORAGE_KEYS.SESSION_START] as number) ||
        focusEnd - 1500000) ?? 0;

  const now = Date.now();
  const isFocusing = focusEnd > now;

  let totalDuration = 0;
  let remaining = 0;
  if (isFocusing) {
    totalDuration = focusEnd - focusStart;
    remaining = focusEnd - now;
  }

  return {
    activeSession,
    focusEnd,
    focusStart,
    isFocusing,
    totalDuration,
    remaining,
  };
}

export function stopFocusSessionAction(
  deps: VMPlatformDependencies,
): Promise<any> {
  return deps.sendCommand('stopFocus');
}

export async function startFocusSessionAction(
  deps: VMPlatformDependencies,
  minutes: number,
) {
  const { storage, sendCommand } = deps;
  const startTime = Date.now();
  await storage.set(STORAGE_KEYS.SESSION_START, startTime);

  return sendCommand('startFocus', { minutes });
}
