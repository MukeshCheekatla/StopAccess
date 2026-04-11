declare var chrome: any;
import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../../../extension/src/background/platformAdapter';
import { FocusSessionRecord } from '@stopaccess/types';

export async function loadFocusData() {
  const activeSessionResults = await chrome.storage.local.get([
    'fg_active_session',
  ]);
  const activeSession =
    activeSessionResults.fg_active_session as FocusSessionRecord | null;

  const focusEnd =
    (activeSession?.status === 'focusing'
      ? activeSession.startedAt + activeSession.duration * 60000
      : await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0)) ?? 0;

  const focusStart =
    (activeSession?.status === 'focusing'
      ? activeSession.startedAt
      : (await storage.getNumber('fg_focus_session_start', 0)) ||
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

export function stopFocusSessionAction(): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'stopFocus' }, (res: any) => {
      resolve(res);
    });
  });
}

export async function startFocusSessionAction(minutes: number) {
  const startTime = Date.now();
  await chrome.storage.local.set({ fg_focus_session_start: startTime });

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'startFocus', minutes }, () => {
      resolve(true);
    });
  });
}
