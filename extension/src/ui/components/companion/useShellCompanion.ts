import React from 'react';
import { type CompanionMood } from './types';
import { type ShellStatus } from '../../react/ExtensionShell';
import { STORAGE_KEYS } from '@stopaccess/state';
import { getUsageSummary, type UsageSummary } from '../../../lib/usageSummary';

// ── Situational messages ───────────────────────────────────────
export const MOOD_POOL: Record<CompanionMood, string[]> = {
  happy: ["Hey! How's it going?", 'Looking productive!', 'Nice to see you.'],
  focused: ['Deep work mode.', 'Stay in the zone.', "You've got this."],
  judging: ['Really?', 'Is that the plan?', 'Focus up.'],
  sleepy: ['Zzz...', 'Resting...', "Wake me when it's time."],
  shame: ['...', "I'm disappointed.", 'We can do better.'],
  victory: ["LET'S GO!!", 'NICE ONE!', 'Keep it up!'],
  thinking: ['Processing...', 'Wait, let me think.', 'Hmm... interesting.'],
  surprised: ['Wait— what?!', 'Oh wow!', 'I did not see that coming.'],
  sad: ['Oh no...', "That's rough.", 'Hang in there.'],
  scared: [
    'This site is almost blocked!',
    'Uh oh... time running out!',
    'Should we leave?',
  ],
  excited: ['YES!! AMAZING!', "Let's gooo!", 'This is incredible!'],
  aiming: ['Target locked.', 'Initializing sequence.', 'Hold steady.'],
  angry: ['THAT IS IT!', 'Do NOT poke me again.', 'I warned you!'],
  annoyed: ['Stop that.', 'Seriously?', 'Not cool.'],
  laughing: ['Ha! Just kidding.', 'Got you!', "Can't stay mad."],
};

export const TAB_POOL: Record<string, { msgs: string[]; icon: string }> = {
  dash: { msgs: ['Plan the day.', "What's the mission?"], icon: 'TARGET' },
  apps: {
    msgs: ['Blocking distractions.', 'Choose enemies wisely.'],
    icon: 'LOCK',
  },
  insights: {
    msgs: ["Data doesn't lie!", 'Look at that focus!'],
    icon: 'CHART',
  },
  schedule: {
    msgs: ['Stick to the routine.', 'Discipline = freedom.'],
    icon: 'LOCK',
  },
  settings: {
    msgs: ['Tweaking the setup?', 'Make it yours.'],
    icon: 'SETTINGS',
  },
  security: {
    msgs: ['Hard mode engaged?', 'Keep the walls high.'],
    icon: 'LOCK',
  },
  privacy: {
    msgs: ['Your data, your rules.', 'Staying stealthy.'],
    icon: 'LOCK',
  },
  domain_usage: {
    msgs: ['Deep dive into data.', 'Patterns emerging...'],
    icon: 'CHART',
  },
  typing_mastery: {
    msgs: ['Speed and precision.', 'Master the keys.'],
    icon: 'KEYBOARD',
  },
  focus: {
    msgs: ['Time to grind.', 'Stay locked in.', 'Eyes on the prize.'],
    icon: 'TARGET',
  },
  in_app: {
    msgs: ['Mobile control.', 'Stay disciplined everywhere.'],
    icon: 'LOCK',
  },
};

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Drives the companion state from shell context ──────────────
export function useShellCompanion(status: ShellStatus, activeTab: string) {
  const [show, setShow] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [currentIcon, setCurrentIcon] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<
    'jump' | 'hide' | 'warning_hold' | 'fire_flare' | null
  >(null);
  const [stats, setStats] = React.useState<UsageSummary | null>(null);
  const [rotationIdx, setRotationIdx] = React.useState(0);
  const [nextRotationDelay, setNextRotationDelay] = React.useState(60000);
  const [isNavigating, setIsNavigating] = React.useState(true);
  const [prevTab, setPrevTab] = React.useState(activeTab);
  const [isFocusActive, setIsFocusActive] = React.useState(false);
  const focusGreetingShown = React.useRef(false);
  const isFirstLoad = React.useRef(true);
  const lastMessageRef = React.useRef('');
  const lastToastMsgRef = React.useRef(false);
  const [toastMsg, setToastMsg] = React.useState<{
    msg: string;
    icon?: string;
    mood?: string;
  } | null>(null);

  // Listen for global companion toasts
  React.useEffect(() => {
    const handler = (e: any) => {
      const { msg, icon, mood } = e.detail || {};
      if (msg) {
        setToastMsg({ msg, icon, mood });
      }
    };
    window.addEventListener('fg_companion_toast' as any, handler);
    return () =>
      window.removeEventListener('fg_companion_toast' as any, handler);
  }, []);

  // Clear toast after 3.5 seconds
  React.useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const refreshStats = React.useCallback(async () => {
    const data = await getUsageSummary();
    setStats(data);
  }, []);

  // Synchronous tab change handling
  if (activeTab !== prevTab) {
    setPrevTab(activeTab);
    setIsNavigating(true);
    // DO NOT clear message here if we want 'Main thing first'
    setRotationIdx(0);
    setNextRotationDelay(60000);
  }

  // Clear focus greeting ref when session ends
  React.useEffect(() => {
    if (!isFocusActive) {
      focusGreetingShown.current = false;
    }
  }, [isFocusActive]);

  // 2.0s Delay only for refreshing stats, not for messaging
  React.useEffect(() => {
    if (!isNavigating) {
      return;
    }
    const t = setTimeout(async () => {
      const data = await getUsageSummary();
      setStats(data);
      setIsNavigating(false);
    }, 2000);
    return () => clearTimeout(t);
  }, [activeTab, isNavigating]);

  // Rotation interval
  React.useEffect(() => {
    // We no longer lock rotation during navigation to allow immediate first message
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
  }, [rotationIdx, nextRotationDelay]);

  // Load mascot toggle and handle storage events
  React.useEffect(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.get(
          ['fg_show_mascot', STORAGE_KEYS.SESSION],
          (res) => {
            setShow(res.fg_show_mascot !== false);
            const active = !!res[STORAGE_KEYS.SESSION];
            setIsFocusActive(active);
            if (active && isFirstLoad.current) {
              focusGreetingShown.current = true;
            }
            isFirstLoad.current = false;
          },
        );
        const onChange = (
          changes: Record<string, chrome.storage.StorageChange>,
        ) => {
          if ('fg_show_mascot' in changes) {
            setShow(changes.fg_show_mascot.newValue !== false);
          }
          if (STORAGE_KEYS.SESSION in changes) {
            setIsFocusActive(!!changes[STORAGE_KEYS.SESSION].newValue);
          }
          if ('session_completed_event' in changes) {
            setAction('fire_flare');
            setTimeout(() => setAction(null), 4000);
          } else if ('total_focus_xp' in changes) {
            setAction('jump');
            setTimeout(() => setAction(null), 1800);
          }
          if (changes[STORAGE_KEYS.USAGE]) {
            refreshStats();
          }
        };
        chrome.storage.onChanged.addListener(onChange);
        return () => chrome.storage.onChanged.removeListener(onChange);
      }
    } catch (_) {}
  }, [refreshStats]);

  // Trigger hide on sync error
  const prevToneRef = React.useRef(status.tone);
  React.useEffect(() => {
    if (status.tone === 'error' && prevToneRef.current !== 'error') {
      setAction('hide');
      setTimeout(() => setAction(null), 1800);
    }
    prevToneRef.current = status.tone;
  }, [status.tone]);

  // 3. Core Message Logic - Pick a message based on tab and rotation
  React.useEffect(() => {
    if (isNavigating) {
      setMessage('');
      setCurrentIcon(null);
      return;
    }
    const tabConfig = TAB_POOL[activeTab] || TAB_POOL.dash;
    const combinedPool: { msg: string; icon: string }[] = [];

    // Build dynamic data messages - strictly tab-aware
    if (stats) {
      const tab = activeTab as string;
      if (tab === 'dash') {
        if (stats.topApp) {
          combinedPool.push({
            msg: `Top App/n${stats.topApp} (${stats.topTime})`,
            icon: 'TARGET',
          });
        }
        if (stats.focusTimeToday && stats.focusTimeToday !== '0m') {
          combinedPool.push({
            msg: `Focus Mode/n${stats.focusTimeToday} in the zone`,
            icon: 'ZAP',
          });
        }
        if (stats.totalTime) {
          combinedPool.push({
            msg: `Daily Usage/n${stats.totalTime} total`,
            icon: 'CHART',
          });
        }
      } else if (tab === 'apps') {
        if (stats.activeRules > 0) {
          combinedPool.push({
            msg: `App Rules/n${stats.activeRules} active blocks`,
            icon: 'TARGET',
          });
        }
        if (stats.activeCategories > 0) {
          combinedPool.push({
            msg: `Categories/n${stats.activeCategories} NextDNS filters`,
            icon: 'LOCK',
          });
        }
      } else if (tab === 'settings') {
        if (stats.nextDnsStatus === 'inactive') {
          combinedPool.push({
            msg: 'NextDNS/nSetup cloud shield',
            icon: 'LOCK',
          });
        }
      }
    }

    lastToastMsgRef.current = !!toastMsg;

    let msg = '';
    let icon = tabConfig.icon;

    if (toastMsg) {
      msg = toastMsg.msg;
      icon = toastMsg.icon || 'TARGET';
    } else if (isFocusActive && !focusGreetingShown.current) {
      // 1. FOCUS GREETING (TOP PRIORITY)
      msg = "Focus session started!/nLet's get to work.";
      icon = 'ZAP';
      focusGreetingShown.current = true;
    } else if (rotationIdx === 0) {
      // 2. INITIAL DATA MESSAGES ONLY (DELAY FLAVOR TEXT BY 1 MIN)
      if (combinedPool.length > 0) {
        const picked = pickRandom(combinedPool);
        msg = picked.msg;
        icon = picked.icon;
      }
    } else {
      // 3. ROTATION POOL (STRICTLY RELATED)
      const fullPool = isFocusActive
        ? [
            ...MOOD_POOL.focused.map((m) => ({ msg: m, icon: 'ZAP' })),
            ...tabConfig.msgs.map((m) => ({ msg: m, icon: tabConfig.icon })),
          ]
        : [
            ...combinedPool,
            ...tabConfig.msgs.map((m) => ({ msg: m, icon: tabConfig.icon })),
          ];

      const filteredPool =
        fullPool.length > 1
          ? fullPool.filter((p) => p.msg !== lastMessageRef.current)
          : fullPool;

      if (filteredPool.length > 0) {
        const picked = pickRandom(filteredPool);
        msg = picked.msg;
        icon = picked.icon;
      }
    }

    if (msg) {
      setMessage(msg);
      setCurrentIcon(icon);
      setNextRotationDelay(60000);
      lastMessageRef.current = msg;

      const t = setTimeout(
        () => {
          setMessage('');
          setCurrentIcon(null);
        },
        toastMsg ? 3500 : 6000,
      );
      return () => clearTimeout(t);
    } else {
      setMessage('');
      setCurrentIcon(null);
    }
  }, [activeTab, stats, rotationIdx, toastMsg, isFocusActive, isNavigating]);

  const mood: CompanionMood = isFocusActive
    ? 'focused'
    : isNavigating
    ? 'thinking'
    : toastMsg?.mood && isCompanionMood(toastMsg.mood)
    ? toastMsg.mood
    : action === 'fire_flare'
    ? 'victory'
    : action === 'jump'
    ? 'excited'
    : action === 'hide'
    ? 'sad'
    : action === 'warning_hold'
    ? 'scared'
    : stats && stats.diffPercent > 25
    ? 'shame'
    : isFocusActive
    ? 'focused'
    : status.tone === 'active'
    ? 'happy'
    : status.tone === 'error'
    ? 'judging'
    : status.tone === 'muted'
    ? 'sleepy'
    : 'happy';

  function isCompanionMood(m: any): m is CompanionMood {
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
    ].includes(m);
  }

  return {
    show,
    mood,
    message,
    action,
    icon: currentIcon,
  };
}
