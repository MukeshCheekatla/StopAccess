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
  variant = 'primary',
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const variants = {
    primary:
      'fg-bg-[var(--fg-text)] fg-text-[var(--fg-bg)] hover:fg-opacity-90 active:fg-scale-[0.98]',
    secondary:
      'fg-bg-[var(--fg-surface)] fg-text-[var(--fg-text)] fg-border fg-border-[var(--fg-glass-border)] hover:fg-bg-[var(--fg-surface-hover)] active:fg-scale-[0.98]',
    ghost:
      'fg-bg-transparent fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`fg-rounded-[14px] fg-h-[52px] fg-px-8 fg-text-[13px] fg-font-bold fg-tracking-wide fg-flex fg-items-center fg-justify-center fg-transition-all fg-duration-200 fg-cursor-pointer disabled:fg-opacity-40 disabled:fg-cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Field with label + button ───────────────────────────────────────────────
function Field({
  label,
  buttonLabel,
  value,
  onChange,
  placeholder,
  type = 'text',
  onButtonClick,
  isShort = false,
  maxLength,
}: {
  label: string;
  buttonLabel: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  onButtonClick: () => void;
  isShort?: boolean;
  maxLength?: number;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = isShort
    ? value.trim().length === 6
    : value.trim().length > 3;

  return (
    <div className="fg-group">
      <div className="fg-flex fg-justify-between fg-items-center fg-mb-1.5 fg-px-0.5">
        <label className="fg-text-[12px] fg-font-bold fg-text-[var(--fg-text)]">
          {label}
        </label>
      </div>
      <div className="fg-flex fg-items-center fg-gap-5">
        <div className="fg-flex fg-items-center fg-gap-2.5 fg-w-[305px] fg-shrink-0">
          <div className="fg-relative">
            <input
              type={type}
              value={value}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              maxLength={maxLength}
              className={`fg-box-border fg-bg-[var(--fg-glass-bg)] fg-rounded-[12px] fg-px-4 fg-h-[44px] fg-text-[14px] fg-font-bold fg-text-[var(--fg-text)] fg-outline-none fg-transition-all fg-duration-200 ${
                isShort ? 'fg-w-[100px] fg-text-center' : 'fg-w-[260px]'
              }`}
              style={{
                border: `1.5px solid ${
                  isFocused ? 'var(--fg-text)' : 'rgba(128, 128, 128, 0.3)'
                }`,
              }}
            />
          </div>

          {hasValue && !isFocused && (
            <div className="fg-shrink-0 fg-animate-in fg-zoom-in fg-duration-300">
              <div className="fg-w-6 fg-h-6 fg-bg-[var(--fg-green)] fg-rounded-full fg-flex fg-items-center fg-justify-center fg-shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onButtonClick}
          className="fg-flex fg-items-center fg-justify-center fg-gap-1.5 fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-text-[var(--fg-text)] fg-text-[11px] fg-font-black fg-uppercase fg-tracking-wider fg-px-4 fg-h-[44px] fg-rounded-[12px] hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all fg-duration-200 active:fg-scale-95"
        >
          <span>{buttonLabel}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Alert strip ──────────────────────────────────────────────────────────────
function Alert({ msg, tone }: { msg: string; tone: 'error' | 'success' }) {
  return (
    <div
      className={`fg-rounded-[14px] fg-px-5 fg-py-4 fg-text-[13px] fg-font-semibold fg-border fg-flex fg-items-center fg-gap-3 fg-animate-in fg-fade-in fg-slide-in-from-top-2 ${
        tone === 'error'
          ? 'fg-bg-red-500/10 fg-text-red-400 fg-border-red-500/20'
          : 'fg-bg-emerald-500/10 fg-text-emerald-400 fg-border-emerald-500/20'
      }`}
    >
      <div
        className={`fg-w-1.5 fg-h-1.5 fg-rounded-full ${
          tone === 'error' ? 'fg-bg-red-500' : 'fg-bg-emerald-500'
        }`}
      />
      {msg}
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fg-min-h-screen fg-flex fg-flex-col fg-items-center fg-justify-center fg-px-5 fg-py-12 fg-relative">
      <div className="fg-w-full fg-max-w-[540px] fg-relative fg-z-10">
        {children}
      </div>
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
  const [copied, setCopied] = useState(false);

  // detectBrowser reserved for future platform-specific hints

  useEffect(() => {
    nextDNSApi.getConfig().then((cfg) => {
      if (cfg.profileId) {
        setProfileId(cfg.profileId);
      }
      if (cfg.apiKey) {
        setApiKey(cfg.apiKey);
      }

      // Resume step based on available data
      if (cfg.profileId && cfg.apiKey) {
        setStep('done');
      } else if (cfg.profileId) {
        setStep('connect');
      }
    });

    const listener = (changes: any) => {
      if (changes[STORAGE_KEYS.PROFILE_ID]) {
        setProfileId(changes[STORAGE_KEYS.PROFILE_ID].newValue || '');
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
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

  const dohUrl = profileId.trim()
    ? `https://dns.nextdns.io/${profileId.trim()}`
    : 'https://dns.nextdns.io/your-profile-id';

  const copyDohUrl = async () => {
    try {
      await navigator.clipboard.writeText(dohUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable in some extension contexts.
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
          'Could not connect - double-check your Profile ID and API Key.',
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
    // Mark onboarding done without NextDNS; the extension can still block locally.
    onComplete('dash');
  };

  // ── WELCOME ─────────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <Shell>
        <div className="fg-text-center">
          <div className="fg-mb-5">
            <img
              src={chrome?.runtime?.getURL('assets/icon-128.png')}
              alt="StopAccess"
              className="fg-w-[70px] fg-h-[70px] fg-rounded-[20px] fg-mx-auto fg-object-contain fg-shadow-2xl"
            />
          </div>

          <div className="fg-text-[11px] fg-font-black fg-tracking-[0.2em] fg-uppercase fg-text-[var(--fg-muted)] fg-mb-3">
            Total Access Control
          </div>

          <h1 className="fg-text-[30px] fg-font-black fg-text-[var(--fg-text)] fg-tracking-tight fg-leading-[1.1] fg-mb-4">
            Block sites, services, <br />
            and bypass loops.
          </h1>

          <p className="fg-text-[14px] fg-text-[var(--fg-muted)] fg-leading-relaxed fg-mb-6 fg-max-w-[440px] fg-mx-auto">
            StopAccess combines browser blocking with NextDNS sync for
            profile-wide protection across all your devices.
          </p>

          <div className="fg-grid fg-grid-cols-1 sm:fg-grid-cols-3 fg-gap-3 fg-mb-7">
            {[
              {
                title: 'Block sites',
                desc: 'Browser rules & domains',
              },
              {
                title: 'Sync NextDNS',
                desc: 'Profile-wide services',
              },
              { title: 'Lock down', desc: 'Strict mode & PIN' },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[14px] fg-p-3 fg-text-left fg-transition-colors hover:fg-border-[var(--fg-text)]"
              >
                <div className="fg-text-[13px] fg-font-bold fg-text-[var(--fg-text)] fg-mb-1">
                  {title}
                </div>
                <div className="fg-text-[12px] fg-text-[var(--fg-muted)] fg-leading-tight">
                  {desc}
                </div>
              </div>
            ))}
          </div>

          <OBtn
            className="fg-w-full fg-h-[48px] fg-text-[14px]"
            onClick={() => setStep('connect')}
          >
            Get Started
          </OBtn>

          <button
            onClick={skip}
            className="fg-bg-transparent fg-border-0 fg-text-[var(--fg-muted)] fg-text-[12px] fg-font-bold fg-tracking-wider fg-uppercase fg-cursor-pointer fg-mt-4 hover:fg-text-[var(--fg-text)] fg-transition-colors"
          >
            Skip for now
          </button>
        </div>
      </Shell>
    );
  }

  // ── CONNECT ─────────────────────────────────────────────────────────────────
  if (step === 'connect') {
    return (
      <Shell>
        <div className="fg-mb-5">
          <div className="fg-text-[11px] fg-font-black fg-tracking-[0.2em] fg-uppercase fg-text-[var(--fg-muted)] fg-mb-3">
            Step 2: Integration
          </div>
          <h1 className="fg-text-[28px] fg-font-black fg-text-[var(--fg-text)] fg-tracking-tight fg-mb-2">
            Connect NextDNS
          </h1>
          <p className="fg-text-[14px] fg-text-[var(--fg-muted)] fg-leading-relaxed">
            Sync your service blocks, custom domains, and privacy settings
            through your NextDNS profile.
          </p>
        </div>

        <div className="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[18px] fg-p-5 fg-flex fg-flex-col fg-gap-4 fg-shadow-xl">
          <Field
            label="Profile ID"
            buttonLabel="Find ID"
            value={profileId}
            onChange={setProfileId}
            placeholder="e.g. abc123"
            isShort={true}
            maxLength={6}
            onButtonClick={() =>
              openWithIntent('https://my.nextdns.io/setup', 'setup')
            }
          />
          <Field
            label="API Key"
            buttonLabel="Get Key"
            value={apiKey}
            onChange={setApiKey}
            placeholder="NextDNS API Token"
            type="password"
            onButtonClick={() =>
              openWithIntent('https://my.nextdns.io/account', 'api')
            }
          />

          {error && <Alert msg={error} tone="error" />}

          <div className="fg-mt-2">
            <OBtn
              className="fg-w-full fg-h-[48px] fg-text-[14px]"
              onClick={saveAndVerify}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="fg-flex fg-items-center fg-gap-2">
                  <svg
                    className="fg-animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Save & Connect Profile'
              )}
            </OBtn>
          </div>
        </div>

        <div className="fg-flex fg-justify-between fg-mt-5 fg-px-2">
          <button
            onClick={() => setStep('welcome')}
            className="fg-flex fg-items-center fg-gap-2 fg-text-[var(--fg-muted)] fg-text-[13px] fg-font-bold hover:fg-text-[var(--fg-text)] fg-transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <button
            onClick={skip}
            className="fg-text-[var(--fg-muted)] fg-text-[13px] fg-font-bold hover:fg-text-[var(--fg-text)] fg-transition-colors"
          >
            Skip this step
          </button>
        </div>
      </Shell>
    );
  }

  // ── DONE ────────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div className="fg-text-center">
        <div className="fg-mb-8">
          <div className="fg-text-[11px] fg-font-black fg-tracking-[0.2em] fg-uppercase fg-text-emerald-500 fg-mb-3">
            Last Step to Freedom
          </div>
          <h1 className="fg-text-[32px] fg-font-black fg-text-[var(--fg-text)] fg-tracking-tight fg-mb-3">
            Enforce Protection.
          </h1>
          <p className="fg-text-[14px] fg-text-[var(--fg-muted)] fg-leading-relaxed fg-max-w-[460px] fg-mx-auto">
            Profile is synced, but this browser is still vulnerable. Follow
            these 3 steps to lock it down completely.
          </p>
        </div>

        <div className="fg-flex fg-flex-col fg-gap-6 fg-text-left fg-max-w-[520px] fg-mx-auto">
          {/* Step 1: Copy */}
          <div className="fg-relative fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[24px] fg-p-6 fg-shadow-lg">
            <div className="fg-absolute -fg-top-3 -fg-left-3 fg-w-8 fg-h-8 fg-bg-[var(--fg-text)] fg-text-[var(--fg-bg)] fg-rounded-full fg-flex fg-items-center fg-justify-center fg-font-black fg-text-[14px]">
              1
            </div>
            <div className="fg-mb-4">
              <div className="fg-text-[13px] fg-font-black fg-text-[var(--fg-text)] fg-uppercase fg-tracking-wider">
                Copy Enrollment Link
              </div>
              <div className="fg-text-[12px] fg-text-[var(--fg-muted)] fg-mt-0.5">
                Generic browser filtering relies on this private endpoint.
              </div>
            </div>
            <div className="fg-flex fg-items-center fg-gap-3 fg-bg-[var(--fg-bg)] fg-p-1.5 fg-pl-4 fg-rounded-[14px] fg-border fg-border-[var(--fg-glass-border)]">
              <code className="fg-flex-1 fg-font-mono fg-text-[12px] fg-text-[var(--fg-text)] fg-truncate fg-opacity-70">
                {dohUrl}
              </code>
              <button
                onClick={copyDohUrl}
                className="fg-bg-[var(--fg-text)] fg-text-[var(--fg-bg)] fg-px-5 fg-h-10 fg-rounded-[10px] fg-text-[11px] fg-font-black fg-uppercase fg-tracking-widest hover:fg-opacity-90 fg-transition-all active:fg-scale-95"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Step 2: Configure */}
          <div className="fg-relative fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[24px] fg-p-6 fg-shadow-lg">
            <div className="fg-absolute -fg-top-3 -fg-left-3 fg-w-8 fg-h-8 fg-bg-[var(--fg-text)] fg-text-[var(--fg-bg)] fg-rounded-full fg-flex fg-items-center fg-justify-center fg-font-black fg-text-[14px]">
              2
            </div>
            <div className="fg-mb-4">
              <div className="fg-text-[13px] fg-font-black fg-text-[var(--fg-text)] fg-uppercase fg-tracking-wider">
                Update Browser Settings
              </div>
              <div className="fg-text-[12px] fg-text-[var(--fg-muted)] fg-mt-0.5">
                Choose your platform to open its DNS security panel.
              </div>
            </div>

            <div className="fg-grid fg-grid-cols-2 fg-gap-3">
              <button
                onClick={() =>
                  openWithIntent('chrome://settings/security', 'setup')
                }
                className="fg-flex fg-items-center fg-gap-3 fg-bg-[var(--fg-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-p-3 fg-rounded-[16px] hover:fg-border-[var(--fg-muted)] fg-transition-all active:fg-scale-[0.98]"
              >
                <div className="fg-w-8 fg-h-8 fg-bg-emerald-500/10 fg-rounded-lg fg-flex fg-items-center fg-justify-center fg-text-emerald-500">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                    <line x1="21.17" y1="8" x2="12" y2="8" />
                    <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                    <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
                  </svg>
                </div>
                <div className="fg-text-left">
                  <div className="fg-text-[12px] fg-font-black fg-text-[var(--fg-text)]">
                    Chrome / Edge
                  </div>
                  <div className="fg-text-[10px] fg-text-[var(--fg-muted)] fg-uppercase fg-font-black fg-tracking-tighter">
                    Open Settings →
                  </div>
                </div>
              </button>

              <button
                onClick={() =>
                  openWithIntent('about:preferences#general', 'setup')
                }
                className="fg-flex fg-items-center fg-gap-3 fg-bg-[var(--fg-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-p-3 fg-rounded-[16px] hover:fg-border-[var(--fg-muted)] fg-transition-all active:fg-scale-[0.98]"
              >
                <div className="fg-w-8 fg-h-8 fg-bg-orange-500/10 fg-rounded-lg fg-flex fg-items-center fg-justify-center fg-text-orange-500">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 7v5l3 3" />
                  </svg>
                </div>
                <div className="fg-text-left">
                  <div className="fg-text-[12px] fg-font-black fg-text-[var(--fg-text)]">
                    Firefox / Other
                  </div>
                  <div className="fg-text-[10px] fg-text-[var(--fg-muted)] fg-uppercase fg-font-black fg-tracking-tighter">
                    Open Settings →
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Step 3: Finish */}
          <div className="fg-relative fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[24px] fg-p-6 fg-shadow-lg fg-mb-4">
            <div className="fg-absolute -fg-top-3 -fg-left-3 fg-w-8 fg-h-8 fg-bg-[var(--fg-text)] fg-text-[var(--fg-bg)] fg-rounded-full fg-flex fg-items-center fg-justify-center fg-font-black fg-text-[14px]">
              3
            </div>
            <div className="fg-mb-5">
              <div className="fg-text-[13px] fg-font-black fg-text-[var(--fg-text)] fg-uppercase fg-tracking-wider">
                Finalize Setup
              </div>
              <div className="fg-text-[12px] fg-text-[var(--fg-muted)] fg-mt-0.5">
                Once pasted and saved, your browser is 100% armed.
              </div>
            </div>

            <OBtn
              className="fg-w-full fg-h-[52px] fg-text-[14px] fg-font-black fg-uppercase fg-tracking-widest"
              onClick={() => onComplete('settings')}
            >
              Verify & Complete Setup
            </OBtn>
          </div>
        </div>

        <div className="fg-mt-4">
          <button
            onClick={() => onComplete('dash')}
            className="fg-text-[11px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)] fg-transition-all fg-uppercase fg-tracking-widest"
          >
            I'll figure it out later (Not Secure)
          </button>
        </div>
      </div>
    </Shell>
  );
};
