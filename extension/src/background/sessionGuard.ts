/**
 * Session Guard for StopAccess Extension
 * Uses blockedAtStart snapshot to enforce immutability during focus.
 */

declare var chrome: any;
import { FocusSessionRecord } from '@stopaccess/types';

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
  const result = await chrome.storage.local.get([
    SESSION_KEY,
    'strict_mode_enabled',
  ]);
  const session = result[SESSION_KEY] as FocusSessionRecord | undefined;
  const strictEnabled = result.strict_mode_enabled === true;

  if (session && session.status === 'focusing') {
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
        `Locked during focus session. ${remaining}m remaining.`,
      endsAt,
    };
  }

  // Strict Mode Enforcement (outside focus)
  if (strictEnabled) {
    if (
      action === 'disable_blocking' ||
      action === 'remove_app' ||
      action === 'modify_blocklist'
    ) {
      return {
        allowed: false,
        reason: 'Strict Mode Enforced. Disable in Settings first.',
        endsAt: 0,
      };
    }
  }

  return { allowed: true };
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

  const locked = session.blockedAtStart || {
    denylist: [],
    services: [],
    categories: [],
  };

  // Also lock everything that we are explicitly blocking for THIS session
  if (session.blockedDomains && Array.isArray(session.blockedDomains)) {
    locked.denylist = Array.from(
      new Set([...locked.denylist, ...session.blockedDomains]),
    );
  }

  return locked;
}

/**
 * Returns a normalized (lowercase) list of all targets that are immutable.
 * Used by the frontend to disable toggles.
 */
export async function getLockedDomains(): Promise<string[]> {
  const { strict_mode_enabled, rules: rulesRaw } =
    await chrome.storage.local.get(['strict_mode_enabled', 'rules']);
  const sessionLocked = await getLockedTargets();
  const sessionDomains = [
    ...sessionLocked.denylist,
    ...sessionLocked.services,
    ...sessionLocked.categories,
  ];

  if (strict_mode_enabled === true) {
    let rules: any[] = [];
    try {
      rules =
        typeof rulesRaw === 'string' ? JSON.parse(rulesRaw) : rulesRaw || [];
    } catch {
      rules = [];
    }

    const activeRuleDomains = rules
      .filter((r: any) => {
        // A rule is "active" if it's explicitly blocked OR has a limit/package that is active.
        return (
          r.desiredBlockingState !== false &&
          (r.mode === 'block' || r.mode === 'limit' || r.blockedToday === true)
        );
      })
      .map((r: any) => (r.customDomain || r.packageName || '').toLowerCase());

    const all = [...sessionDomains, ...activeRuleDomains];
    return Array.from(new Set(all.map((s) => s.toLowerCase().trim())));
  }

  return Array.from(new Set(sessionDomains.map((s) => s.toLowerCase().trim())));
}

/**
 * Check if a specific target is locked based on the session snapshot.
 */
export async function isTargetLocked(
  kind: 'domain' | 'service' | 'category',
  id: string,
): Promise<boolean> {
  const locked = await getLockedDomains();
  return locked.includes(id.toLowerCase().trim());
}

/**
 * Compatibility wrapper for frontend. Check if a specific domain is locked.
 */
export async function isDomainLocked(domain: string): Promise<boolean> {
  return isTargetLocked('domain', domain);
}
