import { FocusSessionRecord } from '@stopaccess/types';
import { syncDNRRules } from './dnrAdapter';
import { getEffectiveElapsed } from '../lib/sessionTimer';
import { nextDNSApi } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
import { RAW_COLORS } from '../lib/designTokens';
import { notifyFocusComplete } from './notifications';
/**
 * Starts a new focus session.
 * Snapshots current blocked state and optionally enables NextDNS block bypass protection.
 */
export async function startSession(config: {
  duration: number;
  breakDuration?: number;
  blockedDomains: string[];
  enableBlockBypass?: boolean;
}): Promise<FocusSessionRecord> {
  // 0. Session Guard: Prevent starting if one is already active
  const existing = await getActiveSession();
  if (existing) {
    throw new Error('A focus session is already active.');
  }

  // 1. Snapshot current NextDNS state for the guard
  const snapshotRes = await nextDNSApi.getRemoteSnapshot();
  if (!snapshotRes.ok) {
    throw new Error(
      'Failed to snapshot NextDNS state. Session aborted for safety.',
    );
  }

  const data = snapshotRes.data;
  const blockedAtStart = {
    denylist: (data.denylist || [])
      .filter((d: any) => d.active)
      .map((d: any) => d.id),
    services: (data.services || [])
      .filter((s: any) => s.active)
      .map((s: any) => s.id),
    categories: (data.categories || [])
      .filter((c: any) => c.active)
      .map((c: any) => c.id),
  };

  // 2. Enable NextDNS block bypass if requested
  if (config.enableBlockBypass) {
    await toggleBlockBypass(true);
  }

  const session: FocusSessionRecord = {
    id: crypto.randomUUID(),
    status: 'focusing',
    startedAt: Date.now(),
    duration: config.duration,
    breakDuration: config.breakDuration ?? 5,
    blockedDomains: config.blockedDomains,
    blockedAtStart,
    blockBypassEnabled: config.enableBlockBypass ?? false,
    elapsed: 0,
    lastActivatedAt: Date.now(),
  };

  // 3. Centralized Save
  await chrome.storage.local.set({
    [STORAGE_KEYS.SESSION]: session,
    [STORAGE_KEYS.SESSION_START]: session.startedAt,
    [STORAGE_KEYS.FOCUS_END]: session.startedAt + config.duration * 60000,
  });

  // Activate DNR rules
  await syncDNRRules(session.blockedDomains);

  // Start alarms
  await chrome.alarms.create('fg_session_tick', { periodInMinutes: 1 });
  await chrome.alarms.create('fg_session_end', {
    delayInMinutes: config.duration,
  });

  // Update badge UI
  await updateBadge(session);

  return session;
}

export async function getActiveSession(): Promise<FocusSessionRecord | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SESSION);
  return (result[STORAGE_KEYS.SESSION] as FocusSessionRecord) || null;
}

/**
 * Ends session and restores block bypass if it was enabled.
 */
export async function endSession(
  reason: 'completed' | 'cancelled' = 'completed',
) {
  const session = await getActiveSession();
  if (!session) {
    return;
  }

  // Restore blockBypass if we enabled it
  if (session.blockBypassEnabled) {
    await toggleBlockBypass(false);
  }

  // Clear DNR rules until the lifecycle engine reapplies the steady state.
  await syncDNRRules([]);

  // Clear alarms
  await chrome.alarms.clear('fg_session_tick');
  await chrome.alarms.clear('fg_session_end');

  // Save to history
  const historyRes = await chrome.storage.local.get(
    STORAGE_KEYS.SESSION_HISTORY,
  );
  const history = (historyRes[STORAGE_KEYS.SESSION_HISTORY] ||
    []) as FocusSessionRecord[];

  const endedAt = Date.now();
  const focusElapsedMins = Math.round(getEffectiveElapsed(session) / 60);

  history.push({
    ...session,
    status: reason,
    endedAt,
    actualMinutes:
      reason === 'completed'
        ? session.duration
        : Math.min(session.duration, focusElapsedMins),
  });

  await chrome.storage.local.set({
    [STORAGE_KEYS.SESSION_HISTORY]: history,
    [STORAGE_KEYS.SESSION]: null,
    [STORAGE_KEYS.SESSION_START]: 0,
    [STORAGE_KEYS.FOCUS_END]: 0,
  });

  // Clear badge
  await chrome.action.setBadgeText({ text: '' });
}

/**
 * Pauses the current focus session.
 */
export async function pauseSession() {
  const session = await getActiveSession();
  if (!session || session.status !== 'focusing') {
    return;
  }

  session.elapsed = getEffectiveElapsed(session);
  session.lastActivatedAt = undefined;
  session.status = 'paused';
  await chrome.storage.local.set({ [STORAGE_KEYS.SESSION]: session });

  // Clear DNR rules while paused
  await syncDNRRules([]);

  // Clear alarms
  await chrome.alarms.clear('fg_session_tick');
  await chrome.alarms.clear('fg_session_end');

  // Update badge
  await chrome.action.setBadgeText({ text: '||' });
}

/**
 * Resumes a paused focus session.
 */
export async function resumeSession() {
  const session = await getActiveSession();
  if (!session || session.status !== 'paused') {
    return;
  }

  session.status = 'focusing';
  session.lastActivatedAt = Date.now();
  const remainingSecs = session.duration * 60 - session.elapsed;

  await chrome.storage.local.set({
    [STORAGE_KEYS.SESSION]: session,
    [STORAGE_KEYS.FOCUS_END]: Date.now() + remainingSecs * 1000,
  });

  // Re-activate DNR rules
  await syncDNRRules(session.blockedDomains);

  // Restart alarms
  await chrome.alarms.create('fg_session_tick', { periodInMinutes: 1 });
  await chrome.alarms.create('fg_session_end', {
    delayInMinutes: remainingSecs / 60,
  });

  await updateBadge(session);
}

/**
 * Toggles NextDNS Parental Control 'blockBypass' setting via API.
 */
async function toggleBlockBypass(enabled: boolean) {
  try {
    await nextDNSApi.patchParentalControl({ blockBypass: enabled });
    console.log(`[StopAccess] NextDNS blockBypass set to: ${enabled}`);
  } catch (e) {
    console.warn('[StopAccess] Failed to toggle blockBypass:', e);
  }
}

export async function handleAlarm(
  alarm: chrome.alarms.Alarm,
): Promise<boolean> {
  if (alarm.name === 'fg_session_tick') {
    const session = await getActiveSession();
    if (session && session.status === 'focusing') {
      await chrome.storage.local.set({ [STORAGE_KEYS.SESSION]: session });
      await updateBadge(session);
    }
    return false;
  }

  if (alarm.name === 'fg_session_end') {
    const session = await getActiveSession();
    const duration = session?.duration ?? 0;
    await endSession('completed');
    notifyFocusComplete(duration);
    return true;
  }

  return false;
}

export async function updateBadge(session: FocusSessionRecord) {
  const elapsed = getEffectiveElapsed(session);
  const remaining = session.duration - Math.floor(elapsed / 60);
  const text = remaining > 0 ? `${remaining}m` : 'OK';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: RAW_COLORS.primaryBlue,
  });
}
