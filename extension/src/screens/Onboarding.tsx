declare var chrome: any;

import React, { useEffect, useState } from 'react';
import {
  extensionAdapter as storage,
  nextDNSApi,
  STORAGE_KEYS,
} from '../background/platformAdapter';

type Step = 'welcome' | 'connect' | 'done';

// ── Primary CTA button ───────────────────────────────────────────────────────
function OBtn({
  onClick,
  children,
  className = '',
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`fg-bg-[var(--fg-text)] fg-text-[var(--fg-bg)] fg-rounded-[14px] fg-px-8 fg-py-4 fg-text-[12px] fg-font-black fg-tracking-[0.14em] fg-uppercase fg-border-0 fg-cursor-pointer fg-transition-opacity hover:fg-opacity-80 fg-font-[inherit] disabled:fg-opacity-40 disabled:fg-cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

// ── Field with label + "open" link ───────────────────────────────────────────
function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
  onHintClick,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  onHintClick: () => void;
}) {
  const hasValue = value.trim().length > 3;
  return (
    <div>
      <div className="fg-flex fg-items-center fg-justify-between fg-mb-2">
        <div className="fg-text-[11px] fg-font-black fg-tracking-[0.16em] fg-uppercase fg-text-[var(--fg-text)]">
          {label}
        </div>
        <button
          onClick={onHintClick}
          className="fg-bg-transparent fg-border-0 fg-text-[var(--fg-muted)] fg-text-[11px] fg-font-bold fg-tracking-wide fg-cursor-pointer fg-font-[inherit] fg-underline hover:fg-text-[var(--fg-text)] fg-transition-colors fg-p-0"
        >
          {hint} →
        </button>
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="fg-w-full fg-box-border fg-bg-[var(--fg-glass-bg)] fg-rounded-[12px] fg-px-4 fg-py-3 fg-text-[13px] fg-font-semibold fg-text-[var(--fg-text)] fg-outline-none fg-font-[inherit]"
        style={{
          border: `1.5px solid ${
            hasValue ? 'rgba(16,185,129,0.45)' : 'var(--fg-glass-border)'
          }`,
          transition: 'border-color 0.2s',
        }}
      />
    </div>
  );
}

// ── Alert strip ──────────────────────────────────────────────────────────────
function Alert({ msg, tone }: { msg: string; tone: 'error' | 'success' }) {
  return (
    <div
      className={`fg-rounded-[12px] fg-px-4 fg-py-3 fg-text-[13px] fg-font-semibold fg-border ${
        tone === 'error'
          ? 'fg-bg-red-500/10 fg-text-red-400 fg-border-red-500/20'
          : 'fg-bg-emerald-500/10 fg-text-emerald-400 fg-border-emerald-500/20'
      }`}
    >
      {msg}
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fg-min-h-screen fg-bg-[var(--fg-bg)] fg-flex fg-flex-col fg-items-center fg-justify-center fg-px-6 fg-py-10 fg-relative fg-overflow-hidden">
      <div
        className="fg-absolute fg-inset-0 fg-pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 70%)',
        }}
      />
      <div className="fg-w-full fg-max-w-[520px] fg-relative">{children}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export const OnboardingReact: React.FC<{
  onComplete: (tab?: string) => void;
}> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [profileId, setProfileId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // detectBrowser reserved for future platform-specific hints

  useEffect(() => {
    nextDNSApi.getConfig().then((cfg) => {
      if (cfg.profileId) {
        setProfileId(cfg.profileId);
      }
      if (cfg.apiKey) {
        setApiKey(cfg.apiKey);
      }
    });
  }, []);

  const openWithIntent = (url: string, mode: 'setup' | 'api') => {
    chrome?.storage?.local?.set({
      fg_helper_intent: { mode, expiresAt: Date.now() + 10 * 60 * 1000 },
    });
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const openTab = (url: string) => {
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const saveAndVerify = async () => {
    const pid = profileId.trim();
    const key = apiKey.trim();
    if (!pid || !key) {
      setError('Both Profile ID and API Key are required.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await storage.set(STORAGE_KEYS.PROFILE_ID, pid);
      await storage.set(STORAGE_KEYS.API_KEY, key);
      const ok = await nextDNSApi.testConnection();
      if (!ok) {
        setError(
          'Could not connect — double-check your Profile ID and API Key.',
        );
        return;
      }
      chrome?.runtime?.sendMessage?.({ action: 'manualSync' });
      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Could not connect to NextDNS.');
    } finally {
      setIsSaving(false);
    }
  };

  const skip = () => {
    // Mark onboarding done without NextDNS — the app works in local mode
    onComplete('dash');
  };

  // ── WELCOME ─────────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <Shell>
        <div className="fg-text-center">
          <img
            src={chrome?.runtime?.getURL('assets/icon-128.png')}
            alt="FocusGate"
            className="fg-w-[68px] fg-h-[68px] fg-rounded-[20px] fg-mx-auto fg-mb-6 fg-object-contain"
          />

          <div className="fg-text-[10px] fg-font-black fg-tracking-[0.2em] fg-uppercase fg-text-[var(--fg-muted)] fg-mb-3">
            DNS-level focus control
          </div>

          <h1 className="fg-text-[30px] fg-font-black fg-text-[var(--fg-text)] fg-tracking-tighter fg-leading-tight fg-mb-4">
            Block sites that steal
            <br />
            your focus.
          </h1>

          <p className="fg-text-[14px] fg-text-[var(--fg-muted)] fg-leading-7 fg-mb-6 fg-max-w-[400px] fg-mx-auto">
            FocusGate blocks YouTube, Reddit, Twitter and any site you pick — at
            the <strong className="fg-text-[var(--fg-text)]">DNS level</strong>,
            so it works across every app, not just the browser.
          </p>

          <div className="fg-grid fg-grid-cols-3 fg-gap-2.5 fg-mb-8">
            {[
              {
                title: 'Block any site',
                desc: 'DNS-level, impossible to bypass',
              },
              { title: 'Time-based rules', desc: 'Auto-enforced limits' },
              { title: 'Live analytics', desc: 'See exactly what was blocked' },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[14px] fg-p-3 fg-text-left"
              >
                <div className="fg-text-[12px] fg-font-black fg-text-[var(--fg-text)] fg-mb-0.5">
                  {title}
                </div>
                <div className="fg-text-[11px] fg-text-[var(--fg-muted)] fg-leading-snug">
                  {desc}
                </div>
              </div>
            ))}
          </div>

          <OBtn className="fg-w-full" onClick={() => setStep('connect')}>
            Connect NextDNS — takes 2 min
          </OBtn>

          <button
            onClick={skip}
            className="fg-bg-transparent fg-border-0 fg-text-[var(--fg-muted)] fg-text-[11px] fg-font-bold fg-tracking-widest fg-uppercase fg-cursor-pointer fg-font-[inherit] hover:fg-text-[var(--fg-text)] fg-transition-colors fg-mt-4 fg-block fg-mx-auto"
          >
            Skip for now — use local blocking only
          </button>
        </div>
      </Shell>
    );
  }

  // ── CONNECT ─────────────────────────────────────────────────────────────────
  if (step === 'connect') {
    return (
      <Shell>
        <div className="fg-text-[10px] fg-font-black fg-tracking-[0.2em] fg-uppercase fg-text-[var(--fg-muted)] fg-mb-2">
          Connect NextDNS
        </div>
        <h1 className="fg-text-[24px] fg-font-black fg-text-[var(--fg-text)] fg-tracking-tight fg-mb-2">
          Paste your credentials
        </h1>
        <p className="fg-text-[13px] fg-text-[var(--fg-muted)] fg-leading-relaxed fg-mb-6">
          Click each link to open NextDNS, copy the value, switch back and
          paste. Both open in a new tab.
        </p>

        <div className="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[18px] fg-p-5 fg-flex fg-flex-col fg-gap-4">
          <Field
            label="Profile ID"
            hint="Find on nextdns.io/setup"
            value={profileId}
            onChange={setProfileId}
            placeholder="e.g. abc123"
            onHintClick={() =>
              openWithIntent('https://my.nextdns.io/setup', 'setup')
            }
          />
          <Field
            label="API Key"
            hint="Get on nextdns.io/account"
            value={apiKey}
            onChange={setApiKey}
            placeholder="Long API token"
            type="password"
            onHintClick={() =>
              openWithIntent('https://my.nextdns.io/account', 'api')
            }
          />

          {error && <Alert msg={error} tone="error" />}

          <OBtn
            className="fg-w-full"
            onClick={saveAndVerify}
            disabled={isSaving}
          >
            {isSaving ? 'Verifying...' : 'Save & Connect'}
          </OBtn>
        </div>

        <div className="fg-flex fg-justify-between fg-mt-5">
          <button
            onClick={() => setStep('welcome')}
            className="fg-bg-transparent fg-border-0 fg-text-[var(--fg-muted)] fg-text-[11px] fg-font-bold fg-tracking-widest fg-uppercase fg-cursor-pointer fg-font-[inherit] hover:fg-text-[var(--fg-text)] fg-transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={skip}
            className="fg-bg-transparent fg-border-0 fg-text-[var(--fg-muted)] fg-text-[11px] fg-font-bold fg-tracking-widest fg-uppercase fg-cursor-pointer fg-font-[inherit] hover:fg-text-[var(--fg-text)] fg-transition-colors"
          >
            Skip
          </button>
        </div>
      </Shell>
    );
  }

  // ── DONE ────────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div className="fg-text-center">
        <div
          className="fg-w-[68px] fg-h-[68px] fg-rounded-full fg-mx-auto fg-mb-6 fg-flex fg-items-center fg-justify-center fg-bg-emerald-500/10 fg-border fg-border-emerald-500/20"
          style={{ boxShadow: '0 0 40px rgba(16,185,129,0.1)' }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="fg-text-emerald-400"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="fg-text-[10px] fg-font-black fg-tracking-[0.2em] fg-uppercase fg-text-emerald-500 fg-mb-3">
          Connected
        </div>
        <h1 className="fg-text-[28px] fg-font-black fg-text-[var(--fg-text)] fg-tracking-tight fg-mb-3">
          FocusGate is live.
        </h1>
        <p className="fg-text-[13px] fg-text-[var(--fg-muted)] fg-leading-7 fg-mb-4 fg-max-w-[340px] fg-mx-auto">
          DNS-level blocking is active. To also protect browser traffic, add
          your NextDNS endpoint in browser settings — find it in{' '}
          <strong className="fg-text-[var(--fg-text)]">
            Settings → Cloud Identity
          </strong>
          .
        </p>

        {/* Quick tip */}
        <div className="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[14px] fg-p-4 fg-text-left fg-mb-7">
          <div className="fg-text-[11px] fg-font-black fg-tracking-[0.12em] fg-uppercase fg-text-[var(--fg-muted)] fg-mb-2">
            Quick tour
          </div>
          {[
            ['Block List', 'Add any site to block or set a daily time limit'],
            ['Focus', 'Start a timed focus session — blocks everything'],
            ['Reports', 'See live analytics on what was blocked'],
          ].map(([label, desc]) => (
            <div
              key={label}
              className="fg-flex fg-gap-2 fg-items-start fg-py-1.5"
            >
              <div className="fg-w-1 fg-h-1 fg-rounded-full fg-bg-emerald-400 fg-mt-2 fg-shrink-0" />
              <span className="fg-text-[12px] fg-text-[var(--fg-text)]">
                <strong>{label}</strong> — {desc}
              </span>
            </div>
          ))}
        </div>

        <OBtn
          className="fg-w-full fg-max-w-[260px]"
          onClick={() => onComplete('settings')}
        >
          Open dashboard
        </OBtn>

        <button
          onClick={() => openTab('https://my.nextdns.io/setup')}
          className="fg-bg-transparent fg-border-0 fg-text-[var(--fg-muted)] fg-text-[11px] fg-font-bold fg-tracking-widest fg-uppercase fg-cursor-pointer fg-font-[inherit] hover:fg-text-[var(--fg-text)] fg-transition-colors fg-mt-4 fg-block fg-mx-auto"
        >
          Open NextDNS setup →
        </button>
      </div>
    </Shell>
  );
};
