/**
 * time.ts -- Utilities for formatting minute-based durations.
 */

export function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return '0m';
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function formatUsage(minutes: number): string {
  if (minutes < 1) {
    return 'Not used today';
  }
  return formatDuration(minutes);
}
