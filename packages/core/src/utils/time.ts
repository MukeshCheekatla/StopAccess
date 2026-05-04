/**
 * Time formatting and manipulation utilities
 */

export function fmtTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

export function formatMinutes(m: number): string {
  const total = Math.floor(m);
  if (total < 60) {
    return `${total}m`;
  }
  const h = Math.floor(total / 60);
  const mins = total % 60;
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
}

/**
 * Format a duration in minutes into a human-readable string (e.g., "1h 30m" or "45m").
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return '0m';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/**
 * Higher-level usage formatter that handles the "Not used today" case.
 */
export function formatUsage(minutes: number): string {
  if (minutes < 1) {
    return 'Not used today';
  }
  return formatDuration(minutes);
}
