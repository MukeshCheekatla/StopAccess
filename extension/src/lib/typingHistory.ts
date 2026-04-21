import { extensionAdapter as storage } from '../background/platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';

export interface TypingSession {
  timestamp: number;
  duration: number; // in seconds
  wpm: number;
  accuracy: number;
  textLength: number;
  mistakes: number;
}

/**
 * Persists typing performance data to local storage.
 * Mirroring the 'usage' structure style.
 */
export async function saveTypingSession(session: TypingSession) {
  const history = await getTypingHistory();
  history.unshift(session);

  // Keep only the last 50 session for the 'usage' style log
  const limitedHistory = history.slice(0, 50);
  await storage.set(
    STORAGE_KEYS.TYPING_MASTERY_LOG,
    JSON.stringify(limitedHistory),
  );
}

export async function getTypingHistory(): Promise<TypingSession[]> {
  const raw = await storage.getString(STORAGE_KEYS.TYPING_MASTERY_LOG);
  if (!raw) {
    return [];
  }
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

export async function getTypingStats() {
  const history = await getTypingHistory();
  if (history.length === 0) {
    return {
      peakWpm: 0,
      avgWpm: 0,
      avgAccuracy: 0,
      totalSessions: 0,
      totalTimeSeconds: 0,
    };
  }

  const peakWpm = Math.max(...history.map((s) => s.wpm));
  const totalWpm = history.reduce((sum, s) => sum + s.wpm, 0);
  const totalAccuracy = history.reduce((sum, s) => sum + s.accuracy, 0);
  const totalTimeSeconds = history.reduce((sum, s) => sum + s.duration, 0);

  return {
    peakWpm,
    avgWpm: Math.round(totalWpm / history.length),
    avgAccuracy: Math.round(totalAccuracy / history.length),
    totalSessions: history.length,
    totalTimeSeconds,
  };
}
