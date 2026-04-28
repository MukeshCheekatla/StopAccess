import React, { useEffect, useState } from 'react';
import { getRemainingMs } from '../../lib/sessionTimer';
import { UI_TOKENS } from '../../lib/ui';
import {
  extensionAdapter as storage,
  STORAGE_KEYS,
} from '../../background/platformAdapter';

const PRESETS = [
  { m: 15, t: 'Quick' },
  { m: 25, t: 'Pomo' },
  { m: 45, t: 'Deep' },
  { m: 60, t: 'Hour' },
  { m: 90, t: 'Flow' },
];

export function FocusPopupView() {
  const [rem, setRem] = useState(0);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string>('idle');
  const [abortModal, setAbortModal] = useState(false);
  const [wait, setWait] = useState<number | null>(null);

  const fetchState = async () => {
    const res = await chrome.storage.local.get(['fg_active_session']);
    const session = res.fg_active_session as any;
    if (session?.status === 'focusing' || session?.status === 'paused') {
      const remainingMs = getRemainingMs(session);
      const totalMs = session.duration * 60000;

      setRem(remainingMs);
      setTotal(totalMs);
      setStatus(session.status);
    } else {
      const end = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);
      const start =
        (await storage.getNumber('fg_focus_session_start', 0)) || end - 1500000;
      setRem(Math.max(0, end - Date.now()));
      setTotal(end - start || 1);
      setStatus('idle');
    }
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
    bg: 'linear-gradient(180deg, var(--fg-surface), var(--fg-bg))',
    text: { color: 'var(--fg-text)', opacity: 1 },
    dim: { color: 'var(--fg-muted)', opacity: 1 },
    accent: 'var(--fg-accent)',
    tickBase: 'var(--fg-glass-border)',
  };

  if (rem > 0) {
    return (
      <div
        className="fg-flex fg-h-full fg-flex-col fg-items-center fg-justify-center fg-p-6 fg-animate-fade-in-up"
        style={{ background: ringStyles.bg }}
      >
        <div className="fg-relative fg-mb-6 fg-flex fg-h-80 fg-w-80 fg-items-center fg-justify-center">
          <svg
            className="fg-absolute fg-inset-0 fg-h-full fg-w-full"
            viewBox="0 0 380 380"
          >
            <circle
              cx="190"
              cy="190"
              r="110"
              fill="var(--fg-glass-bg)"
              stroke="var(--fg-glass-border)"
              strokeWidth="1"
            />
            {Array.from({ length: 120 }).map((_, i) => {
              const angle = (i / 120) * Math.PI * 2 - Math.PI / 2;
              const inner = 150 - (i % 5 === 0 ? 16 : 10);
              const outer = 150;
              const x1 = 190 + inner * Math.cos(angle);
              const y1 = 190 + inner * Math.sin(angle);
              const x2 = 190 + outer * Math.cos(angle);
              const y2 = 190 + outer * Math.sin(angle);
              const active = i / 120 <= prog;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={
                    active ? 'var(--fg-accent)' : 'var(--fg-glass-border)'
                  }
                  strokeWidth={i % 5 === 0 ? 3.5 : 2.5}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="fg-text-center fg-z-10">
            <div
              className="fg-text-6xl fg-font-light fg-tracking-tighter"
              style={{
                color: 'var(--fg-text)',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 0.95,
              }}
            >
              {fmt(rem)}
            </div>
            <div
              style={{
                marginTop: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--fg-muted)',
                fontSize: '10px',
                letterSpacing: '0.1em',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--fg-accent)',
                  boxShadow: '0 0 8px var(--fg-accent-soft)',
                }}
              />
              Session Running
            </div>
            <div
              className="fg-mt-2"
              style={{
                ...UI_TOKENS.TEXT.R.LABEL,
                color: 'var(--fg-muted)',
                opacity: 0.6,
                fontSize: '12px',
              }}
            >
              {Math.round(prog * 100)}% Complete
            </div>
          </div>
        </div>
        <div className="fg-flex fg-gap-3">
          <button
            onClick={() => {
              chrome.runtime.sendMessage(
                { action: status === 'paused' ? 'resumeFocus' : 'pauseFocus' },
                fetchState,
              );
            }}
            disabled={wait !== null}
            className={`fg-rounded-full fg-border fg-border-[var(--fg-glass-border)] fg-px-8 fg-py-3 fg-text-[10px] fg-font-black disabled:fg-opacity-50 fg-transition-all ${
              status === 'paused'
                ? 'fg-bg-[var(--fg-accent)] fg-text-[var(--fg-on-accent)]'
                : 'fg-bg-transparent fg-text-[var(--fg-text)]'
            }`}
            style={{
              letterSpacing: '1px',
              boxShadow: 'none',
            }}
          >
            {status === 'paused' ? 'RESUME' : 'PAUSE'}
          </button>
          <button
            onClick={() => setAbortModal(true)}
            disabled={wait !== null}
            className="fg-rounded-full fg-border fg-border-[var(--fg-glass-border)] fg-bg-transparent fg-px-8 fg-py-3 fg-text-[10px] fg-font-black fg-text-[var(--fg-red)] disabled:fg-opacity-50"
            style={{
              letterSpacing: '1px',
              boxShadow: 'none',
            }}
          >
            {wait !== null ? `ENDING IN ${wait}S...` : 'STOP'}
          </button>
        </div>
        {abortModal && (
          <div className="fg-fixed fg-inset-0 fg-z-[10000] fg-flex fg-items-center fg-justify-center fg-p-6">
            <div
              onClick={() => setAbortModal(false)}
              className="fg-absolute fg-inset-0 fg-bg-[rgba(0,0,0,0.6)] fg-backdrop-blur-md"
            />
            <div className="fg-relative fg-w-full fg-max-w-[280px] fg-rounded-[32px] fg-border fg-border-[var(--fg-glass-border)] fg-bg-[var(--fg-surface)] fg-p-8 fg-text-center fg-shadow-[0_40px_80px_rgba(0,0,0,0.7)] focus-modal-anim">
              <div style={UI_TOKENS.TEXT.R.MODAL_TITLE} className="fg-mb-3">
                Abort Session?
              </div>
              <div style={UI_TOKENS.TEXT.R.MODAL_BODY} className="fg-mb-8">
                Quitting early will end your current shield protection
                immediately.
              </div>
              <div className="fg-flex fg-gap-3">
                <button
                  onClick={() => setAbortModal(false)}
                  className="fg-flex-1 fg-rounded-2xl fg-bg-[var(--fg-glass-bg)] fg-py-3.5 fg-border fg-border-[var(--fg-glass-border)] fg-transition-all hover:fg-bg-[var(--fg-surface-hover)]"
                  style={UI_TOKENS.TEXT.R.BUTTON_TEXT}
                >
                  Cancel
                </button>
                <button
                  onClick={stopFocus}
                  className="fg-flex-1 fg-rounded-2xl fg-bg-[var(--fg-red)] fg-py-3.5 fg-transition-all hover:fg-scale-[1.05] active:fg-scale-[0.95] fg-shadow-[0_0_20px_var(--fg-red-glow)]"
                  style={{
                    ...UI_TOKENS.TEXT.R.BUTTON_TEXT,
                    color: 'var(--fg-on-accent)',
                  }}
                >
                  Abort
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
      className="fg-flex fg-h-full fg-flex-col fg-items-center fg-justify-center fg-p-4 fg-animate-fade-in-up"
      style={{
        background: 'linear-gradient(160deg, var(--fg-surface), var(--fg-bg))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="fg-mb-4 fg-text-left fg-w-full fg-max-w-[340px] fg-px-2">
        <div
          style={{
            ...UI_TOKENS.TEXT.R.LABEL,
            color: 'var(--fg-muted)',
            marginBottom: '4px',
          }}
        >
          Focus Mode
        </div>
        <div
          style={{
            ...UI_TOKENS.TEXT.R.SUBTEXT,
            fontSize: '12px',
            lineHeight: '1.5',
          }}
          className="fg-opacity-90"
        >
          Pick a session length and Focus will start a real countdown.
        </div>
      </div>

      <div className="fg-relative fg-mb-4 fg-flex fg-h-56 fg-w-56 fg-items-center fg-justify-center">
        <svg
          className="fg-absolute fg-inset-0 fg-h-full fg-w-full"
          viewBox="0 0 380 380"
        >
          <circle
            cx="190"
            cy="190"
            r="110"
            fill="var(--fg-glass-bg)"
            stroke="var(--fg-glass-border)"
            strokeWidth="1"
          />
          {Array.from({ length: 120 }).map((_, i) => {
            const angle = (i / 120) * Math.PI * 2 - Math.PI / 2;
            const inner = 150 - (i % 5 === 0 ? 16 : 10);
            const outer = 150;
            const x1 = 190 + inner * Math.cos(angle);
            const y1 = 190 + inner * Math.sin(angle);
            const x2 = 190 + outer * Math.cos(angle);
            const y2 = 190 + outer * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--fg-glass-border)"
                strokeWidth={i % 5 === 0 ? 3.5 : 2.5}
                strokeLinecap="round"
                className="fg-opacity-40"
              />
            );
          })}
        </svg>
        <div className="fg-text-center fg-z-10">
          <div
            className="fg-text-4xl fg-font-bold fg-tracking-tighter fg-opacity-40"
            style={{
              color: 'var(--fg-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            --:--
          </div>
          <div
            style={{
              marginTop: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--fg-muted)',
              fontSize: '8px',
              letterSpacing: '0.1em',
            }}
          >
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: 'var(--fg-accent)',
              }}
              className="fg-opacity-60"
            />
          </div>
        </div>
      </div>

      <div className="fg-flex fg-w-full fg-gap-1.5 fg-max-w-[340px] fg-px-2">
        {PRESETS.map((p) => (
          <button
            key={p.m}
            onClick={() => startFocus(p.m)}
            className="btn-premium start-focus fg-flex fg-flex-1 fg-flex-col fg-items-center fg-justify-center fg-gap-0 fg-rounded-[12px] fg-transition-all hover:fg-scale-[1.05] active:fg-scale-[0.95]"
            style={{
              padding: '8px 2px',
              height: '52px',
              background: 'var(--fg-glass-bg)',
              border: '1px solid var(--fg-glass-border)',
              boxShadow: 'none',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 900,
                color: 'var(--fg-text)',
                lineHeight: 1.2,
              }}
            >
              {p.m}m
            </span>
            <span
              className="fg-text-[9px] fg-font-black fg-tracking-[0.05em] fg-opacity-80"
              style={{ color: 'var(--fg-muted)' }}
            >
              {p.t}
            </span>
          </button>
        ))}
      </div>
      <style>{`
        @keyframes modalIn { from { opacity: 0; transform: translate(-50%, -40%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        .focus-modal-anim { animation: modalIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
}
