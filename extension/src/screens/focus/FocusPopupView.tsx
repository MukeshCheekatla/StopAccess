import React, { useEffect, useState } from 'react';
import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../../background/platformAdapter';

const PRESETS = [
  { minutes: 15, tag: 'Quick' },
  { minutes: 25, tag: 'Pomo' },
  { minutes: 45, tag: 'Deep' },
  { minutes: 90, tag: 'Flow' },
];

export function FocusPopupView() {
  const [remaining, setRemaining] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isAbortModalOpen, setAbortModalOpen] = useState(false);
  const [abortCountdown, setAbortCountdown] = useState<number | null>(null);

  const fetchState = async () => {
    const res = await chrome.storage.local.get(['fg_active_session']);
    const session = res.fg_active_session as any | null;

    let end = 0;
    let start = 0;

    if (session?.status === 'focusing') {
      end = session.startedAt + session.duration * 60000;
      start = session.startedAt;
    } else {
      end = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);
      start =
        (await storage.getNumber('fg_focus_session_start', 0)) || end - 1500000;
    }

    const now = Date.now();
    setRemaining(Math.max(0, end - now));
    setTotalDuration(end - start || 1);
  };

  useEffect(() => {
    fetchState();
    const intervalId = setInterval(fetchState, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const startFocus = (minutes: number) => {
    chrome.storage.local.set({ fg_focus_session_start: Date.now() }, () => {
      chrome.runtime.sendMessage({ action: 'startFocus', minutes }, fetchState);
    });
  };

  const stopFocus = () => {
    setAbortModalOpen(false);
    setAbortCountdown(5);
    const intervalId = setInterval(() => {
      setAbortCountdown((prev) => {
        if (prev && prev > 1) {
          return prev - 1;
        }
        clearInterval(intervalId);
        chrome.runtime.sendMessage({ action: 'stopFocus' }, () => {
          setAbortCountdown(null);
          fetchState();
        });
        return 0;
      });
    }, 1000);
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (remaining > 0) {
    const progress = Math.max(0, Math.min(1, remaining / totalDuration));
    const circumference = 2 * Math.PI * 90;

    return (
      <div className="fg-flex fg-h-full fg-flex-col fg-items-center fg-justify-center fg-py-5">
        <div className="fg-relative fg-mb-6 fg-flex fg-h-[200px] fg-w-[200px] fg-items-center fg-justify-center">
          <svg
            className="fg-absolute fg-inset-0 fg-h-full fg-w-full -fg-rotate-90"
            viewBox="0 0 200 200"
          >
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              className="fg-stroke-white/[0.03]"
              strokeWidth="6"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="fg-transition-all fg-duration-1000"
            />
          </svg>
          <div className="fg-z-10 fg-flex fg-flex-col fg-items-center">
            <div className="fg-text-[2.5rem] fg-font-black fg-tabular-nums fg-tracking-[-0.04em] fg-text-white">
              {formatTime(remaining)}
            </div>
            <div className="fg-mt-1 fg-text-[8px] fg-font-black fg-uppercase fg-tracking-[0.25em] fg-text-[var(--muted)]">
              Shield Active
            </div>
          </div>
        </div>

        <button
          className="fg-inline-flex fg-appearance-none fg-items-center fg-rounded-[8px] fg-border-0 fg-bg-white/[0.05] fg-px-4 fg-py-2 fg-text-[10px] fg-font-semibold fg-text-[var(--muted)] fg-outline-none fg-shadow-none hover:fg-bg-white/[0.08]"
          onClick={() => setAbortModalOpen(true)}
          disabled={abortCountdown !== null}
          type="button"
        >
          {abortCountdown !== null
            ? `WAIT ${abortCountdown}S`
            : 'ABORT SESSION'}
        </button>

        {isAbortModalOpen ? (
          <div className="fg-fixed fg-inset-0 fg-z-[10000]">
            <button
              aria-label="Close abort modal"
              className="fg-absolute fg-inset-0 fg-appearance-none fg-border-0 fg-bg-black/80 fg-outline-none"
              onClick={() => setAbortModalOpen(false)}
              type="button"
            />
            <div className="fg-absolute fg-left-1/2 fg-top-1/2 fg-z-[10001] fg-w-[260px] -fg-translate-x-1/2 -fg-translate-y-1/2 fg-rounded-[20px] fg-bg-[rgba(20,20,20,0.98)] fg-p-6 fg-text-center fg-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="fg-mb-2 fg-text-[14px] fg-font-black fg-text-[var(--text)]">
                ABORT SESSION?
              </div>
              <div className="fg-mb-5 fg-text-[11px] fg-leading-[1.5] fg-text-[var(--muted)]">
                Quitting early will end your current shield.
              </div>
              <div className="fg-flex fg-gap-[10px]">
                <button
                  className="fg-flex-1 fg-appearance-none fg-rounded-[10px] fg-border-0 fg-bg-white/[0.08] fg-py-2 fg-text-[10px] fg-font-extrabold fg-text-[var(--text)] fg-outline-none fg-shadow-none"
                  onClick={() => setAbortModalOpen(false)}
                  type="button"
                >
                  CANCEL
                </button>
                <button
                  className="fg-flex-1 fg-appearance-none fg-rounded-[10px] fg-border-0 fg-bg-[var(--red)] fg-py-2 fg-text-[10px] fg-font-extrabold fg-text-white fg-outline-none fg-shadow-none"
                  onClick={stopFocus}
                  type="button"
                >
                  ABORT
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="fg-flex fg-h-full fg-flex-col fg-items-center fg-justify-center fg-px-4">
      <div className="fg-mb-6 fg-text-center">
        <div className="fg-mb-2 fg-text-[18px] fg-font-black fg-uppercase fg-tracking-[0.16em] fg-text-[var(--muted)]">
          Focus
        </div>
        <div className="fg-text-[14px] fg-font-extrabold fg-uppercase fg-text-white">
          IGNITE DEEP FOCUS
        </div>
        <div className="fg-mt-1 fg-text-[10px] fg-font-semibold fg-text-[var(--muted)]">
          Blocks synced across devices.
        </div>
      </div>

      <div className="fg-grid fg-w-full fg-grid-cols-2 fg-gap-[10px]">
        {PRESETS.map((preset) => (
          <button
            key={preset.minutes}
            className="fg-flex fg-appearance-none fg-flex-col fg-items-center fg-gap-2 fg-rounded-[24px] fg-border-0 fg-bg-white/[0.035] fg-px-[10px] fg-py-[14px] fg-outline-none fg-shadow-none hover:fg-bg-white/[0.05]"
            onClick={() => startFocus(preset.minutes)}
            type="button"
          >
            <div className="fg-text-[1.1rem] fg-font-black fg-text-white">
              {preset.minutes}M
            </div>
            <div className="fg-text-[8px] fg-font-black fg-uppercase fg-tracking-[0.15em] fg-text-[var(--muted)]">
              {preset.tag}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
