import React, { useEffect, useState } from 'react';
import { UI_TOKENS } from '../../lib/ui';
import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../../background/platformAdapter';

const PRESETS = [
  { m: 15, t: 'Quick' },
  { m: 25, t: 'Pomo' },
  { m: 45, t: 'Deep' },
  { m: 90, t: 'Flow' },
];

export function FocusPopupView() {
  const [rem, setRem] = useState(0);
  const [total, setTotal] = useState(0);
  const [abortModal, setAbortModal] = useState(false);
  const [wait, setWait] = useState<number | null>(null);

  const fetchState = async () => {
    const res = await chrome.storage.local.get(['fg_active_session']);
    const session = res.fg_active_session as any;
    let end = 0,
      start = 0;
    if (session?.status === 'focusing') {
      end = session.startedAt + session.duration * 60000;
      start = session.startedAt;
    } else {
      end = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);
      start =
        (await storage.getNumber('fg_focus_session_start', 0)) || end - 1500000;
    }
    setRem(Math.max(0, end - Date.now()));
    setTotal(end - start || 1);
  };

  useEffect(() => {
    fetchState();
    const id = setInterval(fetchState, 1000);
    return () => clearInterval(id);
  }, []);

  const startFocus = (minutes: number) => {
    chrome.storage.local.set({ fg_focus_session_start: Date.now() }, () => {
      chrome.runtime.sendMessage({ action: 'startFocus', minutes }, fetchState);
    });
  };

  const stopFocus = () => {
    setAbortModal(false);
    setWait(5);
    const id = setInterval(() => {
      setWait((p) => {
        if (p && p > 1) {
          return p - 1;
        }
        clearInterval(id);
        chrome.runtime.sendMessage({ action: 'stopFocus' }, () => {
          setWait(null);
          fetchState();
        });
        return 0;
      });
    }, 1000);
  };

  const prog = Math.max(0, Math.min(1, 1 - rem / total));
  const fmt = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)
      .toString()
      .padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const ringStyles = {
    bg: 'linear-gradient(180deg, #070708, #0c0d12)',
    text: { color: '#fefefe', opacity: 1 },
    dim: { color: 'rgba(255,255,255,0.5)', opacity: 1 },
  };

  if (rem > 0) {
    return (
      <div
        className="fg-flex fg-h-full fg-flex-col fg-items-center fg-justify-center fg-p-6"
        style={{ background: ringStyles.bg }}
      >
        <div className="fg-relative fg-flex fg-h-60 fg-w-60 fg-items-center fg-justify-center">
          <svg
            className="fg-absolute fg-inset-0 fg-h-full fg-w-full"
            viewBox="0 0 320 320"
          >
            {Array.from({ length: 60 }).map((_, i) => {
              const a = (i * 6 - 90) * (Math.PI / 180);
              const x1 = 160 + 135 * Math.cos(a),
                y1 = 160 + 135 * Math.sin(a);
              const x2 = 160 + 148 * Math.cos(a),
                y2 = 160 + 148 * Math.sin(a);
              const active = i / 60 <= prog;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={active ? '#84ffe4' : 'rgba(255,255,255,0.08)'}
                  strokeWidth={active ? 2.5 : 1.5}
                />
              );
            })}
          </svg>
          <div className="fg-text-center fg-z-10">
            <div
              className="fg-text-5xl fg-font-black fg-tracking-tighter"
              style={ringStyles.text}
            >
              {fmt(rem)}
              <div style={{ ...UI_TOKENS.TEXT.R.LABEL, opacity: 0.5 }}>
                {Math.round(prog * 100)}% COMPLETE
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setAbortModal(true)}
          disabled={wait !== null}
          className="fg-mt-6 fg-rounded-full fg-border fg-border-white/40 fg-bg-transparent fg-px-6 fg-py-2.5 fg-text-xs fg-font-bold disabled:fg-opacity-50"
          style={ringStyles.text}
        >
          {wait !== null ? `WAIT ${wait}S` : 'ABORT SESSION'}
        </button>
        {abortModal && (
          <div className="fg-fixed fg-inset-0 fg-z-[1000] fg-flex fg-items-center fg-justify-center fg-backdrop-blur-sm">
            <div
              onClick={() => setAbortModal(false)}
              className="fg-absolute fg-inset-0 fg-bg-black/80"
            />
            <div className="fg-relative fg-w-72 fg-rounded-3xl fg-border fg-border-white/10 fg-bg-[#0c0d12] fg-p-7 fg-text-center fg-shadow-2xl">
              <div
                className="fg-mb-3 fg-text-lg fg-font-black"
                style={ringStyles.text}
              >
                ABORT?
              </div>
              <div className="fg-mb-6 fg-text-sm" style={ringStyles.dim}>
                Quitting early will end your current shield.
              </div>
              <div className="fg-flex fg-gap-3">
                <button
                  onClick={() => setAbortModal(false)}
                  className="fg-flex-1 fg-rounded-xl fg-bg-white/5 fg-py-2.5 fg-text-[11px] fg-font-bold fg-border fg-border-white/10"
                  style={ringStyles.text}
                >
                  CANCEL
                </button>
                <button
                  onClick={stopFocus}
                  className="fg-flex-1 fg-rounded-xl fg-bg-red-500 fg-py-2.5 fg-text-[11px] fg-font-bold"
                  style={{ color: 'white' }}
                >
                  ABORT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="fg-flex fg-h-full fg-flex-col fg-items-center fg-justify-center fg-p-6"
      style={{ background: ringStyles.bg }}
    >
      <div className="fg-mb-7 fg-text-center">
        <div style={{ ...UI_TOKENS.TEXT.R.LABEL, color: '#84ffe4' }}>
          IGNITE DEEP FOCUS
        </div>
        <div style={UI_TOKENS.TEXT.R.CARD_TITLE}>Ready TO START</div>
      </div>
      <div className="fg-relative fg-mb-6 fg-flex fg-h-48 fg-w-48 fg-items-center fg-justify-center fg-opacity-30">
        <svg
          className="fg-absolute fg-inset-0 fg-h-full fg-w-full"
          viewBox="0 0 320 320"
        >
          {Array.from({ length: 60 }).map((_, i) => (
            <line
              key={i}
              x1="160"
              y1="20"
              x2="160"
              y2="35"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1.5"
              transform={`rotate(${i * 6} 160 160)`}
            />
          ))}
        </svg>
        <div
          className="fg-text-4xl fg-font-black"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          --:--
        </div>
      </div>
      <div className="fg-grid fg-w-full fg-grid-cols-2 fg-gap-2.5">
        {PRESETS.map((p) => (
          <button
            key={p.m}
            onClick={() => startFocus(p.m)}
            className="fg-rounded-[24px] fg-border fg-border-white/[0.03] fg-bg-[#18181b] fg-p-5 fg-transition-all hover:fg-bg-[#27272a] hover:fg-scale-[1.02] active:fg-scale-[0.98]"
          >
            <div style={{ ...UI_TOKENS.TEXT.R.STAT, color: 'white' }}>
              {p.m}M
            </div>
            <div
              style={{
                ...UI_TOKENS.TEXT.R.LABEL,
                color: '#84ffe4',
                marginTop: '4px',
              }}
            >
              {p.t.toUpperCase()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
