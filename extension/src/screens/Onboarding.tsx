declare var chrome: any;

import React, { useEffect, useMemo, useState } from 'react';
import {
  extensionAdapter as storage,
  nextDNSApi,
  STORAGE_KEYS,
} from '../background/platformAdapter';
import { Button, Card } from '../ui/react/FocusComponents';

type SetupStep = 'welcome' | 'mode' | 'credentials' | 'browser' | 'ready';

function detectBrowserGuide() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('firefox')) {
    return {
      browser: 'Firefox',
      steps: [
        'Open Settings > Privacy & Security.',
        'Scroll to DNS over HTTPS.',
        'Choose Max Protection.',
        'Select Custom and paste your NextDNS endpoint.',
      ],
    };
  }

  return {
    browser: 'Chrome / Brave / Edge',
    steps: [
      'Open Settings > Privacy and security > Security.',
      'Find Use secure DNS.',
      'Choose Custom.',
      'Paste your NextDNS endpoint and save the browser setting.',
    ],
  };
}

export const OnboardingReact: React.FC<{
  onComplete: (tab?: string) => void;
}> = ({ onComplete }) => {
  const [step, setStep] = useState<SetupStep>('welcome');
  const [profileId, setProfileId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const guide = useMemo(() => detectBrowserGuide(), []);
  const dohUrl = profileId.trim()
    ? `https://dns.nextdns.io/${profileId.trim()}`
    : 'https://dns.nextdns.io/YOUR_PROFILE_ID';

  useEffect(() => {
    let cancelled = false;

    const loadExistingConfig = async () => {
      const config = await nextDNSApi.getConfig();
      if (cancelled) {
        return;
      }

      setProfileId(config.profileId || '');
      setApiKey(config.apiKey || '');
    };

    loadExistingConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const openExternal = (url: string) => {
    if (chrome?.windows?.create) {
      chrome.windows.create({
        url,
        type: 'popup',
        width: 1180,
        height: 900,
        focused: true,
      });
      return;
    }

    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url });
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveBrowserMode = async () => {
    setError('');
    setSuccess('');
    await storage.set(STORAGE_KEYS.SYNC_MODE, 'browser');
    await storage.set('fg_onboarding_done', 'true');
    setStep('ready');
  };

  const saveProfileMode = async () => {
    const trimmedProfile = profileId.trim();
    const trimmedKey = apiKey.trim();

    if (!trimmedProfile || !trimmedKey) {
      setError('Enter both your Profile ID and API Key.');
      setSuccess('');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await storage.set(STORAGE_KEYS.PROFILE_ID, trimmedProfile);
      await storage.set(STORAGE_KEYS.API_KEY, trimmedKey);

      const ok = await nextDNSApi.testConnection();
      if (!ok) {
        setError('Connection failed. Check the Profile ID and API Key.');
        return;
      }

      await storage.set(STORAGE_KEYS.SYNC_MODE, 'profile');
      chrome?.runtime?.sendMessage?.({ action: 'manualSync' });
      setSuccess('Credentials verified. Finish the browser DNS step next.');
      setStep('browser');
    } catch (err: any) {
      setError(err?.message || 'Could not save your NextDNS connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyDohUrl = async () => {
    try {
      setIsCopying(true);
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(dohUrl);
      setError('');
      setSuccess('DNS endpoint copied.');
    } catch {
      setError('Clipboard access failed. Copy the DNS endpoint manually.');
    } finally {
      setIsCopying(false);
    }
  };

  const finishProfileSetup = async () => {
    await storage.set('fg_onboarding_done', 'true');
    setStep('ready');
  };

  if (step === 'welcome') {
    return (
      <div className="fg-flex fg-min-h-[520px] fg-flex-col fg-items-center fg-justify-center fg-p-10 fg-text-center">
        <div className="fg-mb-6 fg-flex fg-h-20 fg-w-20 fg-items-center fg-justify-center fg-rounded-[28px] fg-bg-sky-300/10 fg-text-4xl fg-text-sky-200">
          FG
        </div>
        <div className="fg-kicker fg-mb-3">Welcome</div>
        <h1 className="fg-text-[34px] fg-font-black fg-tracking-tight fg-text-white">
          FocusGate for deep work
        </h1>
        <p className="fg-mt-3 fg-max-w-[420px] fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-400">
          Set up your workspace once, then let the extension handle blocking,
          focus sessions, and daily awareness.
        </p>
        <Button
          className="fg-mt-8 fg-w-full fg-max-w-[260px]"
          onClick={() => setStep('mode')}
        >
          Get started
        </Button>
      </div>
    );
  }

  if (step === 'mode') {
    return (
      <div className="fg-flex fg-min-h-[520px] fg-flex-col fg-p-8 md:fg-p-10">
        <div className="fg-kicker fg-mb-3">Setup mode</div>
        <h1 className="fg-text-[28px] fg-font-black fg-tracking-tight fg-text-white">
          Choose how you want to set up FocusGate
        </h1>
        <p className="fg-mt-3 fg-max-w-[680px] fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-400">
          Browser mode works locally right away. NextDNS mode adds synced
          blocking, analytics, and network-level protection across devices.
        </p>

        <div className="fg-mt-8 fg-grid fg-w-full fg-gap-4 md:fg-grid-cols-2">
          <Card
            className="fg-cursor-pointer fg-p-6"
            hover
            onClick={saveBrowserMode}
          >
            <div className="fg-kicker fg-mb-3">Local only</div>
            <div className="fg-text-xl fg-font-black fg-text-white">
              Standard browser mode
            </div>
            <div className="fg-mt-2 fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-400">
              Quick setup with no credentials. Rules apply inside this browser.
            </div>
          </Card>

          <Card
            className="fg-cursor-pointer fg-border-sky-200/20 fg-p-6"
            hover
            onClick={() => setStep('credentials')}
          >
            <div className="fg-kicker fg-mb-3">Cross-device</div>
            <div className="fg-text-xl fg-font-black fg-text-white">
              Strong sync mode
            </div>
            <div className="fg-mt-2 fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-400">
              Connect NextDNS for network-level protection and shared policy.
            </div>
          </Card>
        </div>

        <button
          className="fg-mt-6 fg-text-[11px] fg-font-black fg-uppercase fg-tracking-[0.18em] fg-text-slate-500 fg-transition-colors hover:fg-text-slate-200"
          onClick={() => setStep('welcome')}
        >
          Back
        </button>
      </div>
    );
  }

  if (step === 'credentials') {
    return (
      <div className="fg-flex fg-min-h-[520px] fg-flex-col fg-p-8 md:fg-p-10">
        <div className="fg-kicker fg-mb-3">NextDNS setup</div>
        <h1 className="fg-text-[28px] fg-font-black fg-tracking-tight fg-text-white">
          Connect your NextDNS profile
        </h1>
        <p className="fg-mt-3 fg-max-w-[700px] fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-400">
          Go to NextDNS, copy your Profile ID from the setup page, then copy an
          API Key from the account page. Save both here before finishing the
          browser DNS step.
        </p>

        <div className="fg-mt-8 fg-grid fg-gap-4 md:fg-grid-cols-2">
          <Card className="fg-p-6">
            <div className="fg-kicker fg-mb-3">Step 1</div>
            <div className="fg-text-lg fg-font-black fg-text-white">
              Open NextDNS
            </div>
            <div className="fg-mt-2 fg-text-sm fg-leading-relaxed fg-text-slate-400">
              Use the setup page for the Profile ID and the account page for the
              API Key.
            </div>
            <div className="fg-mt-3 fg-text-xs fg-font-semibold fg-text-slate-500">
              Opens in a dedicated browser window so you can keep onboarding in
              view while copying values back.
            </div>
            <div className="fg-mt-5 fg-flex fg-flex-wrap fg-gap-3">
              <Button
                size="sm"
                onClick={() => openExternal('https://my.nextdns.io/setup')}
              >
                Open setup page
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openExternal('https://my.nextdns.io/account')}
              >
                Open account page
              </Button>
            </div>
          </Card>

          <Card className="fg-p-6">
            <div className="fg-kicker fg-mb-3">Step 2</div>
            <div className="fg-text-lg fg-font-black fg-text-white">
              Paste and verify
            </div>
            <div className="fg-mt-2 fg-text-sm fg-leading-relaxed fg-text-slate-400">
              FocusGate tests the connection before moving you to browser DNS
              setup.
            </div>

            <div className="fg-mt-5 fg-space-y-4">
              <label className="fg-block">
                <div className="fg-mb-2 fg-text-[11px] fg-font-black fg-uppercase fg-tracking-[0.16em] fg-text-slate-400">
                  Profile ID
                </div>
                <input
                  className="fg-w-full fg-rounded-[14px] fg-border-0 fg-bg-white/[0.03] fg-px-4 fg-py-3 fg-text-sm fg-font-semibold fg-text-white fg-outline-none fg-shadow-none [appearance:none] focus:fg-border-0 focus:fg-outline-none focus:fg-shadow-none placeholder:fg-text-slate-500"
                  onChange={(event) => setProfileId(event.target.value)}
                  placeholder="abc123"
                  value={profileId}
                />
              </label>

              <label className="fg-block">
                <div className="fg-mb-2 fg-text-[11px] fg-font-black fg-uppercase fg-tracking-[0.16em] fg-text-slate-400">
                  API Key
                </div>
                <input
                  className="fg-w-full fg-rounded-[14px] fg-border-0 fg-bg-white/[0.03] fg-px-4 fg-py-3 fg-text-sm fg-font-semibold fg-text-white fg-outline-none fg-shadow-none [appearance:none] focus:fg-border-0 focus:fg-outline-none focus:fg-shadow-none placeholder:fg-text-slate-500"
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Paste your NextDNS API key"
                  type="password"
                  value={apiKey}
                />
              </label>

              {error ? (
                <div className="fg-rounded-[14px] fg-bg-red-500/10 fg-px-4 fg-py-3 fg-text-sm fg-font-semibold fg-text-red-200">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="fg-rounded-[14px] fg-bg-emerald-500/10 fg-px-4 fg-py-3 fg-text-sm fg-font-semibold fg-text-emerald-200">
                  {success}
                </div>
              ) : null}

              <div className="fg-flex fg-flex-wrap fg-gap-3">
                <Button onClick={saveProfileMode}>
                  {isSaving ? 'Saving...' : 'Save & Test'}
                </Button>
                <Button
                  onClick={() => setStep('mode')}
                  size="sm"
                  variant="ghost"
                >
                  Back
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'browser') {
    return (
      <div className="fg-flex fg-min-h-[520px] fg-flex-col fg-p-8 md:fg-p-10">
        <div className="fg-kicker fg-mb-3">Browser DNS</div>
        <h1 className="fg-text-[28px] fg-font-black fg-tracking-tight fg-text-white">
          Finish the {guide.browser} browser setting
        </h1>
        <p className="fg-mt-3 fg-max-w-[720px] fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-400">
          Add the same NextDNS endpoint to your browser settings so FocusGate
          and DNS protection stay aligned.
        </p>

        <div className="fg-mt-8 fg-grid fg-gap-4 md:fg-grid-cols-[1.2fr_1fr]">
          <Card className="fg-p-6">
            <div className="fg-kicker fg-mb-3">DNS endpoint</div>
            <div className="fg-rounded-[16px] fg-bg-white/[0.03] fg-p-4">
              <div className="fg-break-all fg-text-sm fg-font-bold fg-text-white">
                {dohUrl}
              </div>
            </div>
            <div className="fg-mt-4 fg-flex fg-flex-wrap fg-gap-3">
              <Button size="sm" onClick={copyDohUrl}>
                {isCopying ? 'Copying...' : 'Copy URL'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openExternal('https://my.nextdns.io/setup')}
              >
                Open NextDNS setup
              </Button>
            </div>
          </Card>

          <Card className="fg-p-6">
            <div className="fg-kicker fg-mb-3">What to do</div>
            <div className="fg-space-y-3 fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-300">
              {guide.steps.map((item, index) => (
                <div
                  key={item}
                  className="fg-flex fg-items-start fg-gap-3 fg-rounded-[14px] fg-bg-white/[0.02] fg-p-3"
                >
                  <span className="fg-mt-[2px] fg-text-xs fg-font-black fg-text-sky-200">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {error ? (
          <div className="fg-mt-4 fg-rounded-[14px] fg-bg-red-500/10 fg-px-4 fg-py-3 fg-text-sm fg-font-semibold fg-text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="fg-mt-4 fg-rounded-[14px] fg-bg-emerald-500/10 fg-px-4 fg-py-3 fg-text-sm fg-font-semibold fg-text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="fg-mt-8 fg-flex fg-flex-wrap fg-gap-3">
          <Button onClick={finishProfileSetup}>Finish setup</Button>
          <Button
            onClick={() => setStep('credentials')}
            size="sm"
            variant="ghost"
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fg-flex fg-min-h-[520px] fg-flex-col fg-items-center fg-justify-center fg-p-10 fg-text-center">
      <div className="fg-mb-6 fg-flex fg-h-20 fg-w-20 fg-items-center fg-justify-center fg-rounded-[28px] fg-bg-emerald-400/12 fg-text-3xl fg-font-black fg-text-emerald-200">
        OK
      </div>
      <div className="fg-kicker fg-mb-3">Ready</div>
      <h1 className="fg-text-[30px] fg-font-black fg-tracking-tight fg-text-white">
        Your workspace is set
      </h1>
      <p className="fg-mt-3 fg-max-w-[320px] fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-400">
        You can start blocking distractions immediately and fine-tune the setup
        later from the dashboard settings page.
      </p>
      <Button
        className="fg-mt-8 fg-w-full fg-max-w-[240px]"
        onClick={() => onComplete('dash')}
      >
        Open dashboard
      </Button>
    </div>
  );
};
