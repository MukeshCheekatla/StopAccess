/**
 * Strict Mode store
 *
 * When strict mode is on:
 *   - Downgrading a block/limit requires PIN + a 60-second confirmation cooldown.
 *   - Disabling strict mode itself requires PIN + cooldown.
 *   - All override attempts are logged regardless of outcome.
 *
 * Keys used in MMKV:
 *   strict_mode_enabled       boolean
 *   strict_mode_cooldown_until  number (ms timestamp, override pending until this time)
 */
import { storage } from './storageAdapter';
import { addLog } from '../services/logger';

const STRICT_KEY = 'strict_mode_enabled';
const COOLDOWN_KEY = 'strict_mode_cooldown_until';
export const STRICT_COOLDOWN_MS = 60_000; // 60 s

export function isStrictMode(): boolean {
  return storage.getBoolean(STRICT_KEY) ?? false;
}

export function setStrictMode(enabled: boolean): void {
  storage.set(STRICT_KEY, enabled);
  addLog(
    'warn',
    `Strict mode ${enabled ? 'enabled' : 'disabled'}`,
    enabled
      ? 'All downgrades now require cooldown confirmation'
      : 'Normal mode restored',
  );
}

/** Returns ms remaining in cooldown (0 = cooldown expired / not active). */
export function getCooldownRemaining(): number {
  const until = storage.getNumber(COOLDOWN_KEY) ?? 0;
  return Math.max(0, until - Date.now());
}

/** Start a fresh cooldown period. Call this before executing a protected action. */
export function startCooldown(): void {
  const until = Date.now() + STRICT_COOLDOWN_MS;
  storage.set(COOLDOWN_KEY, until);
  addLog(
    'warn',
    'Strict mode cooldown started',
    `Override pending for ${STRICT_COOLDOWN_MS / 1000}s`,
  );
}

/** Clear cooldown early (after confirmed action). */
export function clearCooldown(): void {
  storage.delete(COOLDOWN_KEY);
}
