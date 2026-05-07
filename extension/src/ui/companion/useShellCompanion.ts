import React from 'react';
import { type CompanionMood } from './types';
import { type ShellStatus } from '@/ui/react/ExtensionShell';
import { STORAGE_KEYS } from '@stopaccess/state';
import { findServiceIdByDomain, sanitizeDomain } from '@stopaccess/core';
import { getUsageSummary, type UsageSummary } from '@/lib/usageSummary';

type QueuedToast = {
  msg: string;
  icon?: string;
  mood?: string;
  priority: number;
};

type BytePrefs = {
  defaultMood: CompanionMood;
  nightStart: number;
  nightEnd: number;
};

const DEFAULT_PREFS: BytePrefs = {
  defaultMood: 'happy',
  nightStart: 22,
  nightEnd: 6,
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isCompanionMood(value: any): value is CompanionMood {
  return [
    'happy',
    'focused',
    'judging',
    'sleepy',
    'shame',
    'victory',
    'thinking',
    'surprised',
    'sad',
    'scared',
    'excited',
    'aiming',
    'angry',
    'annoyed',
    'laughing',
  ].includes(value);
}

function formatDomainLabel(domain: string) {
  const norm = sanitizeDomain(domain);
  if (!norm) {
    return domain || '';
  }

  // 1. Try core service alias (e.g. x.com -> twitter)
  const serviceId = findServiceIdByDomain(norm);
  if (serviceId) {
    return serviceId.charAt(0).toUpperCase() + serviceId.slice(1);
  }

  // 2. Fallback to capitalized root (e.g. google.com -> Google)
  const root = norm.split('.')[0];
  return root.charAt(0).toUpperCase() + root.slice(1);
}

function isNightWindow(start: number, end: number) {
  const hour = new Date().getHours();
  if (start === end) {
    return true;
  }
  if (start < end) {
    return hour >= start && hour < end;
  }
  return hour >= start || hour < end;
}

function buildDataMessages(
  activeTab: string,
  stats: UsageSummary | null,
  isFocusActive: boolean,
) {
  const messages: Array<{ msg: string; icon: string }> = [];

  // 1. GLOBAL STATE OVERRIDES (Prioritize active sessions)
  if (isFocusActive) {
    if (activeTab === 'focus') {
      messages.push({
        msg: 'Session in progress/nDo not touch the timer',
        icon: 'ZAP',
      });
    } else {
      messages.push({
        msg: 'Focus session active/nStay away from distractions',
        icon: 'TARGET',
      });
    }
  }

  if (!stats) {
    return messages;
  }

  // 1.5 ZERO ACTIVITY STATE (Focus on today's lack of data)
  const isZeroToday = stats.totalTime === '0m' && stats.focusTimeToday === '0m';

  if (isZeroToday && !isFocusActive) {
    if (activeTab === 'dash' || activeTab === 'focus') {
      messages.push({
        msg: 'Nothing tracked yet/nStart your first session',
        icon: 'TARGET',
      });
      return messages;
    }
  }

  const topSite = formatDomainLabel(stats.topApp || '');

  // 2. TAB-SPECIFIC CONTEXTUAL MESSAGES
  switch (activeTab) {
    case 'dash':
      messages.push({
        msg: 'I am Byte/nYour focus companion',
        icon: 'TARGET',
      });
      if (stats.totalTime !== '0m') {
        messages.push({
          msg: `Today's Usage/n${stats.totalTime} total`,
          icon: 'CHART',
        });
      }
      if (stats.totalSessions > 0) {
        messages.push({
          msg: `Sessions/n${stats.totalSessions} times opened`,
          icon: 'ZAP',
        });
      }
      if (stats.focusTimeToday !== '0m') {
        messages.push({
          msg: `Focused today/n${stats.focusTimeToday}`,
          icon: 'TARGET',
        });
      }
      if (topSite && stats.topTime !== '0m') {
        messages.push({
          msg: `Top site/n${topSite} ${stats.topTime}`,
          icon: stats.topApp,
        });
      }
      if (stats.avgWpm > 0) {
        messages.push({
          msg: `Mastery/n${stats.avgWpm} WPM average`,
          icon: 'KEYBOARD',
        });
      }
      if (stats.maxStreak > 0) {
        const streakApp = formatDomainLabel(stats.maxStreakApp || '');
        messages.push({
          msg: `${streakApp} Free!/n${stats.maxStreak} day streak`,
          icon: stats.maxStreakApp,
        });
      }
      if (stats.diffPercent !== 0) {
        const trend = stats.diffPercent > 0 ? 'higher' : 'lower';
        messages.push({
          msg: `Daily Trend/n${Math.abs(stats.diffPercent)}% ${trend} usage`,
          icon: 'CHART',
        });
      }
      break;

    case 'apps':
      messages.push({
        msg: 'Shield & Rules/nManage your focus',
        icon: 'SETTINGS',
      });

      // 1. Redirect Suggestion
      if (!stats.redirectUrl) {
        messages.push({
          msg: 'Setup Redirect/nSend blocked sites to focus.com',
          icon: 'TARGET',
        });
      }

      // 2. Block Suggestions (Top unblocked sites)
      if (stats.topUnblockedSites && stats.topUnblockedSites.length > 0) {
        const topOne = formatDomainLabel(stats.topUnblockedSites[0]);
        messages.push({
          msg: `High Usage/nConsider shielding ${topOne}`,
          icon: stats.topUnblockedSites[0],
        });
      }

      // 3. Specific App Count (not categories)
      const appRulesCount = stats.activeRules;
      if (appRulesCount > 0) {
        const appLabel = appRulesCount === 1 ? 'App' : 'Apps';
        messages.push({
          msg: `Shield Active/n${appRulesCount} ${appLabel.toLowerCase()} blocked`,
          icon: stats.topApp || 'ZAP',
        });
      }

      // 4. Category Recommendations
      if (stats.activeCategories === 0) {
        messages.push({
          msg: 'App Categories/nFilter by topic for faster setup',
          icon: 'SETTINGS',
        });
      }

      // 5. Streaks
      if (stats.maxStreak > 0) {
        const streakApp = formatDomainLabel(stats.maxStreakApp || '');
        messages.push({
          msg: `${streakApp} Free/n${stats.maxStreak} day streak`,
          icon: stats.maxStreakApp,
        });
      }

      if (stats.isStrictModeEnabled) {
        messages.push({
          msg: 'Strict Mode/nNo cheating possible',
          icon: 'TARGET',
        });
      }
      break;

    case 'focus':
      if (!isFocusActive) {
        if (stats.focusTimeToday === '0m') {
          messages.push({
            msg: 'No focus yet/nReady to start a session?',
            icon: 'ZAP',
          });
        } else {
          messages.push({
            msg: 'Take a short break/nThen start another session',
            icon: 'TARGET',
          });
        }
      }
      break;

    case 'insights':
      if (stats.activeRules > 0) {
        messages.push({
          msg: 'Insights ready/nReview your blocking patterns',
          icon: 'CHART',
        });
      } else {
        messages.push({
          msg: 'Analytics empty/nData appears as you browse',
          icon: 'CHART',
        });
      }
      break;

    case 'settings':
      if (stats.nextDnsStatus === 'inactive') {
        messages.push({
          msg: 'NextDNS off/nLocal blocking only',
          icon: 'LOCK',
        });
      }
      if (stats.isStrictModeEnabled) {
        messages.push({
          msg: 'Strict Mode on/nRules are locked now',
          icon: 'SETTINGS',
        });
      }
      break;

    case 'security':
      messages.push({
        msg: 'Security is tight/nAll guardrails are active',
        icon: 'SHIELD',
      });
      break;

    case 'privacy':
      messages.push({
        msg: 'Privacy is priority/nTracking is minimized',
        icon: 'LOCK',
      });
      break;

    case 'typing_mastery':
      messages.push({
        msg: 'Typing stats ready/nTrack your daily progress',
        icon: 'KEYBOARD',
      });
      break;

    case 'byte_settings':
      messages.push({
        msg: 'I am Byte/nTune my behavior here',
        icon: 'SETTINGS',
      });
      break;
  }

  return messages;
}

export function useShellCompanion(status: ShellStatus, activeTab: string) {
  const [show, setShow] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [currentIcon, setCurrentIcon] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<
    'jump' | 'hide' | 'warning_hold' | 'fire_flare' | null
  >(null);
  const [stats, setStats] = React.useState<UsageSummary | null>(null);
  const [rotationIdx, setRotationIdx] = React.useState(0);
  const [nextRotationDelay, setNextRotationDelay] = React.useState(20000);
  const [isNavigating, setIsNavigating] = React.useState(true);
  const [prevTab, setPrevTab] = React.useState(activeTab);
  const [isFocusActive, setIsFocusActive] = React.useState(false);
  const [prefs, setPrefs] = React.useState<BytePrefs>(DEFAULT_PREFS);
  const [activeToast, setActiveToast] = React.useState<QueuedToast | null>(
    null,
  );
  const [previewMood, setPreviewMood] = React.useState<CompanionMood | null>(
    null,
  );
  const queueRef = React.useRef<QueuedToast[]>([]);
  const focusGreetingShown = React.useRef(false);
  const isFirstLoad = React.useRef(true);
  const lastMessageRef = React.useRef('');

  const refreshContext = React.useCallback(async () => {
    const data = await getUsageSummary();
    setStats(data);
    const res = await chrome.storage.local.get([
      STORAGE_KEYS.BYTE_DEFAULT_MOOD,
      STORAGE_KEYS.BYTE_NIGHT_START,
      STORAGE_KEYS.BYTE_NIGHT_END,
    ]);
    const storedMood = res[STORAGE_KEYS.BYTE_DEFAULT_MOOD] as unknown;
    setPrefs({
      defaultMood: isCompanionMood(storedMood)
        ? storedMood
        : DEFAULT_PREFS.defaultMood,
      nightStart: Number(
        res[STORAGE_KEYS.BYTE_NIGHT_START] ?? DEFAULT_PREFS.nightStart,
      ),
      nightEnd: Number(
        res[STORAGE_KEYS.BYTE_NIGHT_END] ?? DEFAULT_PREFS.nightEnd,
      ),
    });
  }, []);

  const enqueueToast = React.useCallback(
    (nextToast: QueuedToast) => {
      if (!nextToast.msg) {
        return;
      }
      if (activeToast?.msg === nextToast.msg) {
        return;
      }
      if (queueRef.current.some((item) => item.msg === nextToast.msg)) {
        return;
      }
      if (!activeToast) {
        setActiveToast(nextToast);
        return;
      }
      queueRef.current = [...queueRef.current, nextToast].sort(
        (left, right) => right.priority - left.priority,
      );
    },
    [activeToast],
  );

  if (activeTab !== prevTab) {
    setPrevTab(activeTab);
    setIsNavigating(true);
    setRotationIdx(0);
    setNextRotationDelay(20000);
  }

  React.useEffect(() => {
    setPreviewMood(null);
  }, [activeTab]);

  React.useEffect(() => {
    const handler = (e: any) => {
      const { mood } = e.detail || {};
      if (isCompanionMood(mood)) {
        setPreviewMood(mood);
      } else if (mood === null) {
        setPreviewMood(null);
      }
    };
    window.addEventListener('sa_preview_mood', handler);
    return () => window.removeEventListener('sa_preview_mood', handler);
  }, []);

  React.useEffect(() => {
    const handler = (e: any) => {
      const { msg, icon, mood, priority } = e.detail || {};
      enqueueToast({
        msg,
        icon,
        mood,
        priority: Number(priority) || 100,
      });
    };
    window.addEventListener('fg_companion_toast' as any, handler);
    return () =>
      window.removeEventListener('fg_companion_toast' as any, handler);
  }, [enqueueToast]);

  React.useEffect(() => {
    if (!activeToast) {
      if (queueRef.current.length > 0) {
        const [nextToast, ...rest] = queueRef.current;
        queueRef.current = rest;
        setActiveToast(nextToast);
      }
      return;
    }
    const timeoutId = setTimeout(() => setActiveToast(null), 3500);
    return () => clearTimeout(timeoutId);
  }, [activeToast]);

  React.useEffect(() => {
    if (!isFocusActive) {
      focusGreetingShown.current = false;
    }
  }, [isFocusActive]);

  React.useEffect(() => {
    if (!isNavigating) {
      return;
    }
    const timeoutId = setTimeout(async () => {
      await refreshContext();
      setIsNavigating(false);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [activeTab, isNavigating, refreshContext]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!document.hidden) {
        setRotationIdx((prev) => prev + 1);
      }
    }, nextRotationDelay);

    const handleVisibility = () => {
      if (!document.hidden) {
        setIsNavigating(true);
        setRotationIdx((prev) => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [nextRotationDelay, rotationIdx]);

  React.useEffect(() => {
    try {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
        return;
      }

      chrome.storage.local.get(
        ['fg_show_mascot', STORAGE_KEYS.SESSION],
        async (res) => {
          setShow(res.fg_show_mascot !== false);
          const session = res[STORAGE_KEYS.SESSION] as any;
          const active = !!(
            session &&
            (session.status === 'focusing' || session.status === 'paused')
          );
          setIsFocusActive(active);
          if (active && isFirstLoad.current) {
            focusGreetingShown.current = true;
          }
          isFirstLoad.current = false;
          await refreshContext();
        },
      );

      const onChange = (
        changes: Record<string, chrome.storage.StorageChange>,
      ) => {
        if ('fg_show_mascot' in changes) {
          setShow(changes.fg_show_mascot.newValue !== false);
        }
        if (STORAGE_KEYS.SESSION in changes) {
          const session = changes[STORAGE_KEYS.SESSION].newValue as any;
          const active = !!(
            session &&
            (session.status === 'focusing' || session.status === 'paused')
          );
          setIsFocusActive(active);
          if (active && !focusGreetingShown.current) {
            enqueueToast({
              msg: 'Focus started/nStay on one task',
              icon: 'ZAP',
              mood: 'focused',
              priority: 300,
            });
          }
        }
        if (
          changes[STORAGE_KEYS.USAGE] ||
          changes[STORAGE_KEYS.REDIRECT_URL] ||
          changes[STORAGE_KEYS.BYTE_DEFAULT_MOOD] ||
          changes[STORAGE_KEYS.BYTE_NIGHT_START] ||
          changes[STORAGE_KEYS.BYTE_NIGHT_END] ||
          changes[STORAGE_KEYS.STRICT_MODE]
        ) {
          refreshContext();
        }
        if ('session_completed_event' in changes) {
          setAction('fire_flare');
          enqueueToast({
            msg: 'Session complete/nNice work',
            icon: 'ZAP',
            mood: 'victory',
            priority: 400,
          });
          setTimeout(() => setAction(null), 4000);
        } else if ('total_focus_xp' in changes) {
          setAction('jump');
          setTimeout(() => setAction(null), 1800);
        }
      };

      chrome.storage.onChanged.addListener(onChange);
      return () => chrome.storage.onChanged.removeListener(onChange);
    } catch {}
  }, [enqueueToast, refreshContext]);

  const prevToneRef = React.useRef(status.tone);
  React.useEffect(() => {
    if (status.tone === 'error' && prevToneRef.current !== 'error') {
      setAction('hide');
      enqueueToast({
        msg: 'Sync issue/nCheck connection',
        icon: 'LOCK',
        mood: 'judging',
        priority: 250,
      });
      setTimeout(() => setAction(null), 1800);
    }
    prevToneRef.current = status.tone;
  }, [enqueueToast, status.tone]);

  React.useEffect(() => {
    if (isNavigating) {
      setMessage('');
      setCurrentIcon(null);
      return;
    }

    const dataMessages = buildDataMessages(activeTab, stats, isFocusActive);

    let msg = '';
    let icon = 'TARGET';

    if (activeToast) {
      msg = activeToast.msg;
      icon = activeToast.icon || 'TARGET';
    } else if (isFocusActive && !focusGreetingShown.current) {
      msg = 'Focus started/nStay on one task';
      icon = 'ZAP';
      focusGreetingShown.current = true;
    } else if (dataMessages.length > 0) {
      const pool =
        dataMessages.length > 1
          ? dataMessages.filter((entry) => entry.msg !== lastMessageRef.current)
          : dataMessages;

      if (pool.length > 0) {
        const picked = pickRandom(pool);
        msg = picked.msg;
        icon = picked.icon;
      }
    }

    if (msg) {
      setMessage(msg);
      setCurrentIcon(icon);
      setNextRotationDelay(activeToast ? 12000 : 20000);
      lastMessageRef.current = msg;
      const timeoutId = setTimeout(
        () => {
          if (!activeToast) {
            setMessage('');
            setCurrentIcon(null);
          }
        },
        activeToast ? 3500 : 5200,
      );
      return () => clearTimeout(timeoutId);
    }

    setMessage('');
    setCurrentIcon(null);
  }, [activeTab, activeToast, isFocusActive, isNavigating, rotationIdx, stats]);

  const mood: CompanionMood = previewMood
    ? previewMood
    : isFocusActive
    ? 'focused'
    : isNavigating
    ? prefs.defaultMood
    : activeToast?.mood && isCompanionMood(activeToast.mood)
    ? activeToast.mood
    : action === 'fire_flare'
    ? 'victory'
    : action === 'jump'
    ? 'excited'
    : action === 'hide'
    ? 'sad'
    : action === 'warning_hold'
    ? 'scared'
    : prefs.defaultMood;

  return {
    show,
    mood,
    message,
    action,
    icon: currentIcon,
    isNightTime: isNightWindow(prefs.nightStart, prefs.nightEnd),
  };
}
