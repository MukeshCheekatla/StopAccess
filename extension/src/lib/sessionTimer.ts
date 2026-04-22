import { FocusSessionRecord } from '@stopaccess/types';

/**
 * Returns the total seconds spent focusing, including the current active segment.
 * Safely handles missing lastActivatedAt by falling back to startedAt.
 */
export function getEffectiveElapsed(
  session: FocusSessionRecord | null | undefined,
): number {
  if (!session) {
    return 0;
  }
  const elapsed = session.elapsed || 0;
  if (session.status !== 'focusing') {
    return elapsed;
  }
  const now = Date.now();
  const lastAct = session.lastActivatedAt || session.startedAt;
  return elapsed + Math.round((now - lastAct) / 1000);
}

/**
 * Returns the remaining time in milliseconds.
 */
export function getRemainingMs(
  session: FocusSessionRecord | null | undefined,
): number {
  if (!session) {
    return 0;
  }
  const elapsed = getEffectiveElapsed(session);
  const totalMs = (session.duration || 0) * 60000;
  return Math.max(0, totalMs - elapsed * 1000);
}

/**
 * Returns the progress fraction (0 to 1).
 */
export function getProgress(
  session: FocusSessionRecord | null | undefined,
): number {
  if (!session) {
    return 0;
  }
  const remainingMs = getRemainingMs(session);
  const totalMs = (session.duration || 1) * 60000;
  return Math.max(0, Math.min(1, 1 - remainingMs / totalMs));
}

/**
 * Formats milliseconds into MM:SS or HH:MM:SS.
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) {
    parts.push(h.toString().padStart(2, '0'));
  }
  parts.push(m.toString().padStart(2, '0'));
  parts.push(s.toString().padStart(2, '0'));
  return parts.join(':');
}

/**
 * Formats minutes into h/m string.
 */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return '0m';
  }
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
