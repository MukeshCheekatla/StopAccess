/**
 * Session Guard for FocusGate Extension
 * Uses blockedAtStart snapshot to enforce immutability during focus.
 */

import { FocusSessionRecord } from '@focusgate/types';

const SESSION_KEY = 'fg_active_session';

export type GuardResult =
  | { allowed: true }
  | { allowed: false; reason: string; endsAt: number };

/**
 * Call this BEFORE any mutation that could reduce blocking
 * (unblocking apps, disabling DNS rules, shrinking lists).
 */
export async function checkGuard(
  action:
    | 'remove_app'
    | 'disable_blocking'
    | 'modify_blocklist'
    | 'change_settings',
): Promise<GuardResult> {
  const result = await chrome.storage.local.get(SESSION_KEY);
  const session = result[SESSION_KEY] as FocusSessionRecord | undefined;

  if (!session || session.status !== 'focusing') {
    return { allowed: true };
  }

  const endsAt = session.startedAt + session.duration * 60000;

  // Session expired but wasn't cleaned up
  if (Date.now() > endsAt) {
    return { allowed: true };
  }

  const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 60000));

  const messages: Record<string, string> = {
    remove_app: `Can't remove blocked apps during focus. ${remaining}m remaining.`,
    disable_blocking: `Blocking is locked during focus. ${remaining}m remaining.`,
    modify_blocklist: `Blocklist is locked during focus. ${remaining}m remaining.`,
    change_settings: `Settings locked during focus. ${remaining}m remaining.`,
  };

  return {
    allowed: false,
    reason:
      messages[action] ||
      `🔒 Locked during focus session. ${remaining}m remaining.`,
    endsAt,
  };
}

/**
 * Returns lists of targets (domains, services, categories)
 * that were blocked at the start of the current session.
 */
export async function getLockedTargets(): Promise<{
  denylist: string[];
  services: string[];
  categories: string[];
}> {
  const result = await chrome.storage.local.get(SESSION_KEY);
  const session = result[SESSION_KEY] as FocusSessionRecord | undefined;

  if (!session || session.status !== 'focusing') {
    return { denylist: [], services: [], categories: [] };
  }

  return (
    session.blockedAtStart || { denylist: [], services: [], categories: [] }
  );
}

/**
 * Compatibility wrapper for frontend. Returns list of domains
 * that are currently immutable due to active session.
 */
export async function getLockedDomains(): Promise<string[]> {
  const targets = await getLockedTargets();
  return targets.denylist;
}

/**
 * Check if a specific target is locked based on the session snapshot.
 */
export async function isTargetLocked(
  kind: 'domain' | 'service' | 'category',
  id: string,
): Promise<boolean> {
  const locked = await getLockedTargets();
  const normId = id.toLowerCase().trim();

  if (kind === 'service') {
    return locked.services.some((s) => s.toLowerCase().trim() === normId);
  }
  if (kind === 'category') {
    return locked.categories.some((c) => c.toLowerCase().trim() === normId);
  }
  return locked.denylist.some((d) => d.toLowerCase().trim() === normId);
}

/**
 * Compatibility wrapper for frontend. Check if a specific domain is locked.
 */
export async function isDomainLocked(domain: string): Promise<boolean> {
  return isTargetLocked('domain', domain);
}
