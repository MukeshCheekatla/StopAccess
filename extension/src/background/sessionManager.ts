import { FocusSessionRecord, NextDNSEntity } from '@stopaccess/types';
import { syncDNRRules } from './dnrAdapter';
import { nextDNSApi } from './platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
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
  let blockedAtStart = { denylist: [], services: [], categories: [] };
  try {
    const snapshotRes = await nextDNSApi.getRemoteSnapshot();
    const data = snapshotRes.ok
      ? snapshotRes.data
      : { denylist: [], services: [], categories: [] };
    blockedAtStart = {
      denylist: (data.denylist || [])
        .filter((d: NextDNSEntity) => d.active)
        .map((d: NextDNSEntity) => d.id),
      services: (data.services || [])
        .filter((s: NextDNSEntity) => s.active)
        .map((s: NextDNSEntity) => s.id),
      categories: (data.categories || [])
        .filter((c: NextDNSEntity) => c.active)
        .map((c: NextDNSEntity) => c.id),
    };
  } catch (e) {
    console.warn('[StopAccess] Could not snapshot NextDNS state:', e);
  }

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
  history.push({
    ...session,
    status: reason,
    endedAt,
    actualMinutes: Math.round((endedAt - session.startedAt) / 60000),
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
 * Toggles NextDNS Parental Control 'blockBypass' setting via API.
 */
async function toggleBlockBypass(enabled: boolean) {
  try {
    const cfg = await nextDNSApi.getConfig();
    if (!cfg.profileId || !cfg.apiKey) {
      return;
    }

    await fetch(
      `https://api.nextdns.io/profiles/${cfg.profileId}/parentalControl`,
      {
        method: 'PATCH',
        headers: {
          'X-Api-Key': cfg.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockBypass: enabled }),
      },
    );
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
    if (session) {
      session.elapsed = Math.round((Date.now() - session.startedAt) / 1000);
      await chrome.storage.local.set({ [STORAGE_KEYS.SESSION]: session });
      await updateBadge(session);
    }
    return false;
  }

  if (alarm.name === 'fg_session_end') {
    await endSession('completed');
    chrome.notifications.create('fg_session_done', {
      type: 'basic',
      iconUrl: 'assets/icon.png',
      title: 'Focus Session Complete',
      message: 'Great work! Your focus session has ended.',
    });
    return true;
  }

  return false;
}

export async function updateBadge(session: FocusSessionRecord) {
  const remaining = session.duration - Math.floor(session.elapsed / 60);
  const text = remaining > 0 ? `${remaining}m` : 'OK';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
}
