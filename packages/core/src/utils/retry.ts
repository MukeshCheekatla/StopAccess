/**
 * Retrying and Throttling Utilities
 */

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}
