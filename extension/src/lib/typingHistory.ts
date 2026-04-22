import { extensionAdapter as storage } from '../background/platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';

export interface TypingSession {
  timestamp: number;
  duration: number; // in seconds
  wpm: number;
  netWpm?: number;
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
  const totalTimeSeconds = history.reduce((sum, s) => sum + s.duration, 0);

  // Time-weighted averages (long tests carry more weight)
  const avgWpm = Math.round(
    history.reduce((sum, s) => sum + s.wpm * s.duration, 0) / totalTimeSeconds,
  );

  const avgAccuracy = Math.round(
    history.reduce((sum, s) => sum + s.accuracy * s.duration, 0) /
      totalTimeSeconds,
  );

  // Average Net WPM (ignoring sessions where it's missing)
  const netSessions = history.filter((s) => s.netWpm !== undefined);
  const avgNetWpm =
    netSessions.length > 0
      ? Math.round(
          netSessions.reduce((sum, s) => sum + (s.netWpm as number), 0) /
            netSessions.length,
        )
      : 0;

  return {
    peakWpm,
    avgWpm,
    avgNetWpm,
    avgAccuracy,
    totalSessions: history.length,
    totalTimeSeconds,
  };
}
