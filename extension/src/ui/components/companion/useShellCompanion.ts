import React from 'react';
import { type CompanionMood } from './types';
import { type ShellStatus } from '../../react/ExtensionShell';

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
};

export const TAB_POOL: Record<string, string[]> = {
  dash: ['Plan the day.', "What's the mission?"],
  apps: ['Blocking distractions, nice.', 'Choose enemies wisely.'],
  insights: ["Data doesn't lie!", 'Look at that focus time.'],
  schedule: ['Stick to the routine.', 'Discipline = freedom.'],
  settings: ['Tweaking the setup?', 'Make it yours.'],
};

export function pickRandom(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Drives the companion state from shell context ──────────────
export function useShellCompanion(status: ShellStatus, activeTab: string) {
  const [show, setShow] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [action, setAction] = React.useState<
    'jump' | 'hide' | 'warning_hold' | 'fire_flare' | null
  >(null);

  // Load mascot toggle from storage once
  React.useEffect(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        chrome.storage.local.get(['fg_show_mascot'], (res) => {
          setShow(!!res.fg_show_mascot);
        });
        const onChange = (
          changes: Record<string, chrome.storage.StorageChange>,
        ) => {
          if ('fg_show_mascot' in changes) {
            setShow(!!changes.fg_show_mascot.newValue);
          }
          if ('session_completed_event' in changes) {
            setAction('fire_flare');
            setTimeout(() => setAction(null), 4000);
          } else if ('total_focus_xp' in changes) {
            setAction('jump');
            setTimeout(() => setAction(null), 1800);
          }
        };
        chrome.storage.onChanged.addListener(onChange);
        return () => chrome.storage.onChanged.removeListener(onChange);
      }
    } catch (_) {}
  }, []);

  // Trigger hide on sync error
  const prevToneRef = React.useRef(status.tone);
  React.useEffect(() => {
    if (status.tone === 'error' && prevToneRef.current !== 'error') {
      setAction('hide');
      setTimeout(() => setAction(null), 1800);
    }
    prevToneRef.current = status.tone;
  }, [status.tone]);

  // Contextual message on tab change
  React.useEffect(() => {
    const pool = TAB_POOL[activeTab];
    const mood: CompanionMood =
      action === 'jump'
        ? 'excited'
        : action === 'hide'
        ? 'sad'
        : action === 'warning_hold'
        ? 'scared'
        : status.tone === 'active'
        ? 'focused'
        : status.tone === 'error'
        ? 'judging'
        : status.tone === 'muted'
        ? 'sleepy'
        : 'happy';
    const msg = pool ? pickRandom(pool) : pickRandom(MOOD_POOL[mood]);
    setMessage(msg);
    const t = setTimeout(() => setMessage(''), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const mood: CompanionMood =
    action === 'jump'
      ? 'excited'
      : action === 'hide'
      ? 'sad'
      : action === 'warning_hold'
      ? 'scared'
      : status.tone === 'active'
      ? 'focused'
      : status.tone === 'error'
      ? 'judging'
      : status.tone === 'muted'
      ? 'sleepy'
      : 'happy';

  return { show, mood, message, action };
}
