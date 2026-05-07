declare var chrome: any;

import React, { useEffect, useState } from 'react';
import {
  extensionAdapter as storage,
  nextDNSApi,
  STORAGE_KEYS,
} from '@/background/platformAdapter';
import { COLORS, COLOR_CLASSES } from '@/ui/theme/designTokens';
import { ByteCompanion, CompanionMood } from '@/ui/companion';
import { extensionVMDeps } from '@/lib/vmDeps';
import {
  signInWithOtpAction,
  signInWithGoogleAction,
} from '@stopaccess/viewmodels/useSettingsVM';
import { UI_ICONS } from '@/ui/theme/uiTokens';

type Step = 'welcome' | 'cloud' | 'connect' | 'done';

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
      <div className="fg-flex fg-items-center fg-gap-3">
        <div className="fg-flex fg-items-center fg-gap-2 fg-flex-1">
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
                  isFocused ? COLORS.text : 'var(--fg-input-border-muted)'
                }`,
              }}
            />
          </div>

          {hasValue && !isFocused && (
            <div className="fg-shrink-0 fg-animate-in fg-zoom-in fg-duration-300">
              <div
                className={`fg-w-6 fg-h-6 fg-bg-[var(--fg-green)] fg-rounded-full fg-flex fg-items-center fg-justify-center ${COLOR_CLASSES.shadow.greenGlow}`}
                dangerouslySetInnerHTML={{ __html: UI_ICONS.CHECK }}
              />
            </div>
          )}
        </div>

        <button
          onClick={onButtonClick}
          className="fg-flex fg-items-center fg-justify-center fg-gap-1.5 fg-bg-[var(--fg-text)] fg-text-[var(--fg-bg)] fg-text-[12px] fg-font-black fg-px-3 fg-h-[38px] fg-rounded-[10px] hover:fg-opacity-90 fg-transition-all fg-duration-200 active:fg-scale-95 fg-shadow-sm"
        >
          <span>{buttonLabel}</span>
          <div
            className="fg-flex fg-items-center fg-justify-center"
            style={{ width: 12, height: 12 }}
            dangerouslySetInnerHTML={{ __html: UI_ICONS.EXTERNAL_LINK }}
          />
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
          ? 'fg-bg-[var(--fg-danger-soft)] fg-text-[var(--fg-red)] fg-border-[var(--fg-danger-border)]'
          : 'fg-bg-[var(--fg-emerald-soft)] fg-text-[var(--fg-green)] fg-border-[var(--fg-emerald-border)]'
      }`}
    >
      <div
        className={`fg-w-1.5 fg-h-1.5 fg-rounded-full ${
          tone === 'error' ? 'fg-bg-[var(--fg-red)]' : 'fg-bg-[var(--fg-green)]'
        }`}
      />
      {msg}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <div
      className="fg-flex fg-items-center fg-justify-center"
      style={{ width: 20, height: 20 }}
      dangerouslySetInnerHTML={{ __html: UI_ICONS.GOOGLE }}
    />
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────
function Shell({
  children,
  botMood,
  botMessage,
  botAction,
}: {
  children: React.ReactNode;
  botMood?: CompanionMood;
  botMessage?: string;
  botAction?: string | null;
}) {
  return (
    <div className="fg-min-h-screen fg-flex fg-flex-col fg-items-center fg-justify-center fg-px-5 fg-py-12 fg-relative">
      <div className="fg-hidden xl:fg-block fg-absolute fg-right-[calc(50%+380px)] fg-top-1/2 fg--translate-y-[60%] fg-w-[260px] fg-z-20">
        <ByteCompanion
          mood={botMood}
          message={botMessage}
          action={botAction}
          variant="sidebar"
        />
      </div>
      <div className="fg-w-full fg-max-w-[700px] fg-relative fg-z-10">
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
  const [email, setEmail] = useState('');
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  // detectBrowser reserved for future platform-specific hints

  const applyNextDnsConfig = (cfg: { profileId?: string; apiKey?: string }) => {
    const nextProfileId = cfg.profileId || '';
    const nextApiKey = cfg.apiKey || '';

    setProfileId(nextProfileId);
    setApiKey(nextApiKey);

    if (nextProfileId && nextApiKey) {
      setStep('done');
    } else if (nextProfileId) {
      setStep('connect');
    }
  };

  useEffect(() => {
    nextDNSApi.getConfig().then(applyNextDnsConfig);

    const listener = (changes: any) => {
      if (changes[STORAGE_KEYS.PROFILE_ID] || changes[STORAGE_KEYS.API_KEY]) {
        nextDNSApi.getConfig().then(applyNextDnsConfig);
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
      <Shell
        botMood="excited"
        botMessage={"Ready to crush/ndistractions? Let's go!"}
      >
        <div className="fg-text-center">
          <div className="fg-mb-10">
            <img
              src={chrome?.runtime?.getURL('assets/icon-128.png')}
              alt="StopAccess"
              className="fg-w-[120px] fg-h-[120px] fg-mx-auto fg-object-contain fg-shadow-2xl"
            />
          </div>

          <div className="fg-text-[18px] fg-font-bold fg-text-[var(--fg-muted)] fg-mb-4">
            Total Access Control
          </div>

          <h1 className="fg-text-[52px] fg-font-black fg-text-[var(--fg-text)] fg-leading-[1.05] fg-mb-6 fg-tracking-tight">
            Block sites, services, <br />
            and bypass loops.
          </h1>

          <p className="fg-text-[18px] fg-text-[var(--fg-muted)] fg-leading-relaxed fg-mb-10 fg-max-w-[580px] fg-mx-auto">
            StopAccess combines browser blocking with NextDNS sync for
            profile-wide protection across all your devices.
          </p>

          <div className="fg-grid fg-grid-cols-1 sm:fg-grid-cols-3 fg-gap-4 fg-mb-10">
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
                className="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[18px] fg-p-5 fg-text-left fg-transition-colors hover:fg-border-[var(--fg-text)]"
              >
                <div className="fg-text-[18px] fg-font-bold fg-text-[var(--fg-text)] fg-mb-1.5">
                  {title}
                </div>
                <div className="fg-text-[14px] fg-text-[var(--fg-muted)] fg-leading-snug">
                  {desc}
                </div>
              </div>
            ))}
          </div>

          <OBtn
            className="fg-w-full fg-h-[58px] fg-text-[16px]"
            onClick={() => {
              setError('');
              setStep('cloud');
            }}
          >
            Get Started
          </OBtn>

          <button
            onClick={skip}
            className="fg-bg-transparent fg-border-0 fg-text-[var(--fg-muted)] fg-text-[13px] fg-font-bold fg-cursor-pointer fg-mt-4 hover:fg-text-[var(--fg-text)] fg-transition-colors"
          >
            Skip for now
          </button>
        </div>
      </Shell>
    );
  }

  // ── CLOUD ACCOUNT ───────────────────────────────────────────────────────────
  if (step === 'cloud') {
    return (
      <Shell
        botMood={error ? 'sad' : 'focused'}
        botMessage={
          error
            ? "Oops, that/ndidn't work."
            : "First, let's setup/nyour cloud backup."
        }
      >
        <div className="fg-max-w-[480px] fg-mx-auto">
          <div className="fg-mb-8">
            <div className="fg-text-[16px] fg-font-bold fg-text-[var(--fg-muted)] fg-mb-3">
              Step 1: Account{' '}
              <span className="fg-text-[var(--fg-green)]">(Recommended)</span>
            </div>
            <h1 className="fg-text-[32px] fg-font-black fg-text-[var(--fg-text)] fg-mb-3 fg-tracking-tight">
              Cloud Sync
            </h1>
            <p className="fg-text-[16px] fg-text-[var(--fg-muted)] fg-leading-relaxed">
              Sign in to securely backup your rules, configurations, and
              productivity statistics across devices.
            </p>
          </div>

          <div className="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[24px] fg-p-6 fg-flex fg-flex-col fg-gap-6 fg-shadow-xl">
            <div className="fg-flex fg-flex-col fg-gap-5">
              <div className="fg-flex fg-flex-col fg-gap-2">
                <label className="fg-text-[12px] fg-font-bold fg-text-[var(--fg-text)]">
                  Email Address
                </label>
                <div className="fg-flex fg-items-center fg-gap-3 fg-h-[52px] fg-rounded-[14px] fg-px-4 fg-border fg-border-[var(--fg-glass-border)] fg-bg-[var(--fg-bg)] focus-within:fg-border-[var(--fg-text)] fg-transition-all">
                  <div
                    className="fg-w-8 fg-h-8 fg-rounded-[10px] fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-muted)] fg-shrink-0"
                    dangerouslySetInnerHTML={{ __html: UI_ICONS.MAIL }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="fg-flex-1 fg-h-full fg-bg-transparent fg-border-0 fg-outline-none fg-text-[14px] fg-font-semibold fg-text-[var(--fg-text)] placeholder:fg-text-[var(--fg-muted)]"
                  />
                </div>
              </div>

              {error && <Alert msg={error} tone="error" />}

              <OBtn
                className="fg-w-full fg-h-[54px] fg-text-[14px]"
                disabled={isCloudLoading}
                onClick={async () => {
                  if (!email || !email.includes('@')) {
                    setError('Please enter a valid email address.');
                    return;
                  }
                  setIsCloudLoading(true);
                  setError('');
                  try {
                    await signInWithOtpAction(extensionVMDeps, email);
                    setError('');
                    alert('Magic link sent! Please check your email.');
                    setStep('connect');
                  } catch (err: any) {
                    setError(err.message || 'Failed to send magic link.');
                  } finally {
                    setIsCloudLoading(false);
                  }
                }}
              >
                {isCloudLoading ? 'Sending...' : 'Send Magic Link'}
              </OBtn>

              <div className="fg-flex fg-items-center fg-gap-4 fg-my-1">
                <div className="fg-h-[1px] fg-flex-1 fg-bg-[var(--fg-glass-border)]" />
                <span className="fg-text-[10px] fg-font-black fg-opacity-30 uppercase">
                  Or
                </span>
                <div className="fg-h-[1px] fg-flex-1 fg-bg-[var(--fg-glass-border)]" />
              </div>

              <button
                className="fg-w-full fg-h-[56px] fg-rounded-[16px] fg-border fg-border-[var(--fg-glass-border)] fg-bg-[var(--fg-bg)] hover:fg-bg-[var(--fg-surface-hover)] fg-flex fg-items-center fg-justify-center fg-gap-3 fg-transition-all fg-text-[var(--fg-text)] fg-cursor-pointer disabled:fg-opacity-50"
                disabled={isCloudLoading}
                onClick={async () => {
                  setIsCloudLoading(true);
                  setError('');
                  try {
                    await signInWithGoogleAction(extensionVMDeps);
                    setStep('connect');
                  } catch (err: any) {
                    setError('Login with Google failed.');
                  } finally {
                    setIsCloudLoading(false);
                  }
                }}
              >
                <span className="fg-flex fg-items-center fg-justify-center fg-w-9 fg-h-9 fg-rounded-[10px] fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-shrink-0">
                  <GoogleGlyph />
                </span>
                <span className="fg-text-[13px] fg-font-bold fg-tracking-[0.02em]">
                  Continue with Google
                </span>
              </button>

              <button
                onClick={() => {
                  setError('');
                  setStep('connect');
                }}
                className="fg-bg-transparent fg-border-0 fg-text-[var(--fg-muted)] fg-text-[13px] fg-font-bold fg-cursor-pointer fg-mt-2 hover:fg-text-[var(--fg-text)] fg-transition-colors"
                disabled={isCloudLoading}
              >
                Skip this step
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ── CONNECT ─────────────────────────────────────────────────────────────────
  if (step === 'connect') {
    return (
      <Shell
        botMood={error ? 'sad' : 'focused'}
        botMessage={
          error
            ? "Oops, that/ndidn't work."
            : profileId.trim().length > 0
            ? "Paste your API key/nhere. I'll keep it safe."
            : 'Create a NextDNS account/nto get started.'
        }
      >
        <div className="fg-max-w-[480px] fg-mx-auto">
          <div className="fg-mb-8">
            <div className="fg-text-[16px] fg-font-bold fg-text-[var(--fg-muted)] fg-mb-3">
              Step 2: Integration{' '}
              <span className="fg-text-[var(--fg-green)]">(Recommended)</span>
            </div>
            <h1 className="fg-text-[32px] fg-font-black fg-text-[var(--fg-text)] fg-mb-3 fg-tracking-tight">
              Connect NextDNS
            </h1>
            <p className="fg-text-[16px] fg-text-[var(--fg-muted)] fg-leading-relaxed">
              Sync your service blocks and privacy settings through your NextDNS
              profile.
              <span className="fg-block fg-mt-2 fg-text-[14px] fg-font-bold fg-text-[var(--fg-text)]">
                Don't have an account? Create one for free at{' '}
                <button
                  onClick={() => openWithIntent('https://nextdns.io', 'setup')}
                  className="fg-text-[var(--fg-green)] hover:fg-underline fg-bg-transparent fg-border-0 fg-p-0 fg-font-bold fg-cursor-pointer"
                >
                  nextdns.io
                </button>
              </span>
            </p>
          </div>

          <div className="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[24px] fg-p-6 fg-flex fg-flex-col fg-gap-6 fg-shadow-xl">
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
                className="fg-w-full fg-h-[54px] fg-text-[16px]"
                onClick={saveAndVerify}
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="fg-flex fg-items-center fg-gap-2">
                    <div
                      className="fg-animate-spin fg-flex fg-items-center fg-justify-center"
                      style={{ width: 16, height: 16 }}
                      dangerouslySetInnerHTML={{ __html: UI_ICONS.SPINNER }}
                    />
                    Verifying...
                  </span>
                ) : (
                  'Save & Connect Profile'
                )}
              </OBtn>
            </div>
          </div>

          <div className="fg-flex fg-justify-between fg-mt-6 fg-px-2">
            <button
              onClick={() => setStep('welcome')}
              className="fg-flex fg-items-center fg-gap-2 fg-text-[var(--fg-muted)] fg-text-[14px] fg-font-bold hover:fg-text-[var(--fg-text)] fg-transition-colors"
            >
              <div
                className="fg-flex fg-items-center fg-justify-center"
                style={{ width: 16, height: 16 }}
                dangerouslySetInnerHTML={{ __html: UI_ICONS.BACK }}
              />
              Back
            </button>
            <button
              onClick={skip}
              className="fg-text-[var(--fg-muted)] fg-text-[14px] fg-font-bold hover:fg-text-[var(--fg-text)] fg-transition-colors"
            >
              Skip this step
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── DONE ────────────────────────────────────────────────────────────────────
  return (
    <Shell
      botMood="victory"
      botMessage={'Almost done! Copy the secure/nlink into your settings.'}
      botAction="fire_flare"
    >
      <div className="fg-relative fg-w-full fg-max-w-[1000px] fg-mx-auto">
        {/* HEADER - CENTERED */}
        <div className="fg-text-center fg-mb-6">
          <div className="fg-text-[14px] fg-font-bold fg-text-[var(--fg-green)] fg-mb-1">
            Almost Finished
          </div>
          <h1 className="fg-text-[28px] fg-font-black fg-text-[var(--fg-text)] fg-mb-2 fg-tracking-tight">
            Secure Your Browser
          </h1>
          <p className="fg-text-[14px] fg-text-[var(--fg-muted)] fg-leading-snug fg-max-w-[440px] fg-mx-auto">
            Your profile is connected, but we need to tell your browser to use
            it. Follow these 3 simple steps to finish.
          </p>
        </div>

        {/* MAIN CONTAINER */}
        <div className="fg-relative">
          {/* CENTERED MAIN CARD */}
          <div className="fg-flex fg-flex-col fg-gap-4 fg-w-full fg-max-w-[460px] fg-mx-auto fg-text-left">
            {/* Step 1: Copy */}
            <div className="fg-relative fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[20px] fg-p-4 fg-shadow-lg">
              <div className="fg-mb-3">
                <div className="fg-text-[16px] fg-font-bold fg-text-[var(--fg-text)]">
                  1. Copy Your Secure Link
                </div>
                <div className="fg-text-[13px] fg-text-[var(--fg-muted)] fg-mt-1">
                  This link tells your browser how to block the sites you've
                  chosen.
                </div>
              </div>
              <div className="fg-flex fg-items-center fg-gap-2 fg-bg-[var(--fg-bg)] fg-p-1 fg-pl-3 fg-rounded-[12px] fg-border fg-border-[var(--fg-glass-border)]">
                <code className="fg-flex-1 fg-font-mono fg-text-[11px] fg-text-[var(--fg-text)] fg-truncate fg-opacity-70">
                  {dohUrl}
                </code>
                <button
                  onClick={copyDohUrl}
                  className="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-text-[var(--fg-text)] fg-px-4 fg-h-9 fg-rounded-[8px] fg-text-[12px] fg-font-black hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all active:fg-scale-95"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Step 2: Configure */}
            <div className="fg-relative fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[20px] fg-p-4 fg-shadow-lg">
              <div className="fg-mb-3">
                <div className="fg-text-[16px] fg-font-bold fg-text-[var(--fg-text)]">
                  2. Paste Link into Settings
                </div>
                <div className="fg-text-[13px] fg-text-[var(--fg-muted)] fg-mt-1">
                  Pick your browser below to open the right settings page.
                </div>
              </div>

              <div className="fg-grid fg-grid-cols-1 fg-gap-2">
                <button
                  onClick={() =>
                    openWithIntent('chrome://settings/security', 'setup')
                  }
                  className="fg-flex fg-items-center fg-gap-3 fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-p-3 fg-rounded-[14px] hover:fg-bg-[var(--fg-surface-hover)] hover:fg-border-[var(--fg-text)] fg-transition-all active:fg-scale-[0.98] fg-group"
                >
                  <div
                    className="fg-w-8 fg-h-8 fg-bg-[var(--fg-emerald-soft)] fg-rounded-lg fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-green)] group-hover:fg-bg-[var(--fg-emerald-border)] fg-transition-colors"
                    dangerouslySetInnerHTML={{ __html: UI_ICONS.CHROME }}
                  />
                  <div className="fg-text-left">
                    <div className="fg-text-[15px] fg-font-bold fg-text-[var(--fg-text)]">
                      Chrome / Edge
                    </div>
                    <div className="fg-text-[12px] fg-text-[var(--fg-muted)] fg-font-medium">
                      Open security settings
                    </div>
                  </div>
                </button>

                <button
                  onClick={() =>
                    openWithIntent('about:preferences#general', 'setup')
                  }
                  className="fg-flex fg-items-center fg-gap-3 fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-p-3 fg-rounded-[14px] hover:fg-bg-[var(--fg-surface-hover)] hover:fg-border-[var(--fg-text)] fg-transition-all active:fg-scale-[0.98] fg-group"
                >
                  <div
                    className="fg-w-8 fg-h-8 fg-bg-[var(--fg-amber-soft)] fg-rounded-lg fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-amber-text)] group-hover:fg-bg-[var(--fg-amber-border)] fg-transition-colors"
                    dangerouslySetInnerHTML={{ __html: UI_ICONS.FIREFOX }}
                  />
                  <div className="fg-text-left">
                    <div className="fg-text-[15px] fg-font-bold fg-text-[var(--fg-text)]">
                      Firefox / Other
                    </div>
                    <div className="fg-text-[13px] fg-text-[var(--fg-muted)] fg-font-medium">
                      Open general settings
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 3: Finish */}
            <div className="fg-relative fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[20px] fg-p-4 fg-shadow-lg">
              <div className="fg-mb-3">
                <div className="fg-text-[16px] fg-font-bold fg-text-[var(--fg-text)]">
                  3. All Set!
                </div>
                <div className="fg-text-[14px] fg-text-[var(--fg-muted)] fg-mt-1">
                  Once you've pasted the link in settings, you're fully
                  protected.
                </div>
              </div>

              <OBtn
                className="fg-w-full fg-h-[46px] fg-text-[14px] fg-font-bold"
                onClick={() => onComplete('dash')}
              >
                I've Done It, Finish Setup
              </OBtn>
            </div>

            <div className="fg-mt-4 fg-text-center">
              <button
                onClick={() => onComplete('dash')}
                className="fg-text-[12px] fg-font-bold fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)] fg-transition-all"
              >
                I'll figure it out later
              </button>
            </div>
          </div>

          {/* SIDE GUIDE - ABSOLUTE TO THE RIGHT */}
          <div className="fg-hidden xl:fg-block fg-absolute fg-left-[calc(50%+250px)] fg-top-0 fg-w-[240px] fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[20px] fg-p-4 fg-text-left">
            <div className="fg-text-[15px] fg-font-bold fg-text-[var(--fg-text)] fg-mb-3">
              Quick Guide
            </div>
            <div className="fg-flex fg-flex-col fg-gap-4">
              {[
                { step: '1', text: "Copy link with 'Copy' button." },
                { step: '2', text: 'Open browser security settings.' },
                { step: '3', text: "Find 'Use secure DNS' section." },
                { step: '4', text: "Select 'With: Custom' dropdown." },
                { step: '5', text: 'Paste your link and save.' },
              ].map((item) => (
                <div key={item.step} className="fg-flex fg-gap-3">
                  <div className="fg-w-5 fg-h-5 fg-rounded-full fg-bg-[var(--fg-text)] fg-text-[var(--fg-bg)] fg-text-[11px] fg-font-black fg-flex fg-items-center fg-justify-center fg-shrink-0">
                    {item.step}
                  </div>
                  <div className="fg-text-[13px] fg-text-[var(--fg-muted)] fg-leading-tight">
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="fg-mt-4 fg-pt-4 fg-border-t fg-border-[var(--fg-glass-border)]">
              <div className="fg-text-[10px] fg-text-[var(--fg-muted)] fg-leading-relaxed">
                If stuck, look for <b>'Security'</b> in settings.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
};
