import { FocusSessionRecord } from '@focusgate/types';
import { syncDNRRules } from './dnrAdapter';
import { nextDNSApi } from './platformAdapter';

const SESSION_KEY = 'fg_active_session';
const HISTORY_KEY = 'fg_session_history';

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
  // 1. Snapshot current NextDNS state for the guard
  let blockedAtStart = { denylist: [], services: [], categories: [] };
  try {
    const snapshot = await nextDNSApi.getRemoteSnapshot();
    blockedAtStart = {
      denylist: (snapshot.denylist || [])
        .filter((d) => d.active)
        .map((d) => d.id),
      services: (snapshot.services || [])
        .filter((s) => s.active)
        .map((s) => s.id),
      categories: (snapshot.categories || [])
        .filter((c) => c.active)
        .map((c) => c.id),
    };
  } catch (e) {
    console.warn('[FocusGate] Could not snapshot NextDNS state:', e);
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

  await chrome.storage.local.set({
    [SESSION_KEY]: session,
    fg_focus_session_start: session.startedAt,
    focus_end_time: session.startedAt + config.duration * 60000,
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
  const result = await chrome.storage.local.get(SESSION_KEY);
  return (result[SESSION_KEY] as FocusSessionRecord) || null;
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

  // Clear DNR rules
  await syncDNRRules([]);

  // Clear alarms
  await chrome.alarms.clear('fg_session_tick');
  await chrome.alarms.clear('fg_session_end');

  // Save to history
  const historyRes = await chrome.storage.local.get(HISTORY_KEY);
  const history = (historyRes[HISTORY_KEY] || []) as FocusSessionRecord[];

  const endedAt = Date.now();
  history.push({
    ...session,
    status: reason,
    endedAt,
    actualMinutes: Math.round((endedAt - session.startedAt) / 60000),
  });

  await chrome.storage.local.set({
    [HISTORY_KEY]: history,
    [SESSION_KEY]: null,
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
    console.log(`[FocusGate] NextDNS blockBypass set to: ${enabled}`);
  } catch (e) {
    console.warn('[FocusGate] Failed to toggle blockBypass:', e);
  }
}

export async function handleAlarm(alarm: chrome.alarms.Alarm) {
  if (alarm.name === 'fg_session_tick') {
    const session = await getActiveSession();
    if (session) {
      session.elapsed = Math.round((Date.now() - session.startedAt) / 1000);
      await chrome.storage.local.set({ [SESSION_KEY]: session });
      await updateBadge(session);
    }
  }

  if (alarm.name === 'fg_session_end') {
    await endSession('completed');
    chrome.notifications.create('fg_session_done', {
      type: 'basic',
      iconUrl: 'assets/icon.png',
      title: 'Focus Session Complete 🎯',
      message: 'Great work! Your focus session has ended.',
    });
  }
}

export async function updateBadge(session: FocusSessionRecord) {
  const remaining = session.duration - Math.floor(session.elapsed / 60);
  const text = remaining > 0 ? `${remaining}m` : '✓';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
}
