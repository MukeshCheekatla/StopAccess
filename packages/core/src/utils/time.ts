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
