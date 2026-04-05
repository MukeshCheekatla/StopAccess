import React, { useState } from 'react';
import { extensionAdapter as storage } from '../background/platformAdapter';
import { Button, Card } from '../ui/react/FocusComponents';

export const OnboardingReact: React.FC<{
  onComplete: (tab?: string) => void;
}> = ({ onComplete }) => {
  const [step, setStep] = useState(1);

  if (step === 1) {
    return (
      <div className="fg-flex fg-min-h-[520px] fg-flex-col fg-items-center fg-justify-center fg-p-10 fg-text-center">
        <div className="fg-mb-6 fg-flex fg-h-20 fg-w-20 fg-items-center fg-justify-center fg-rounded-[28px] fg-bg-sky-300/10 fg-text-4xl fg-text-sky-200">
          FG
        </div>
        <div className="fg-kicker fg-mb-3">Welcome</div>
        <h1 className="fg-text-[34px] fg-font-black fg-tracking-tight fg-text-white">
          FocusGate for deep work
        </h1>
        <p className="fg-mt-3 fg-max-w-[360px] fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-400">
          Set up your workspace once, then let the extension handle blocking,
          focus sessions, and daily awareness.
        </p>
        <Button
          className="fg-mt-8 fg-w-full fg-max-w-[260px]"
          onClick={() => setStep(2)}
        >
          Get started
        </Button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="fg-flex fg-min-h-[520px] fg-flex-col fg-items-center fg-justify-center fg-p-10">
        <div className="fg-kicker fg-mb-3">Choose protection mode</div>
        <h1 className="fg-text-center fg-text-[28px] fg-font-black fg-tracking-tight fg-text-white">
          How should FocusGate enforce rules?
        </h1>

        <div className="fg-mt-8 fg-grid fg-w-full fg-max-w-[760px] fg-gap-4 md:fg-grid-cols-2">
          <Card
            className="fg-cursor-pointer fg-p-6"
            hover
            onClick={async () => {
              await storage.set('fg_sync_mode', 'browser');
              await storage.set('fg_onboarding_done', 'true');
              setStep(3);
            }}
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
            onClick={() => {
              onComplete('settings');
            }}
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
          onClick={() => setStep(1)}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="fg-flex fg-min-h-[520px] fg-flex-col fg-items-center fg-justify-center fg-p-10 fg-text-center">
      <div className="fg-mb-6 fg-flex fg-h-20 fg-w-20 fg-items-center fg-justify-center fg-rounded-[28px] fg-bg-emerald-400/12 fg-text-4xl fg-text-emerald-200">
        ✓
      </div>
      <div className="fg-kicker fg-mb-3">Ready</div>
      <h1 className="fg-text-[30px] fg-font-black fg-tracking-tight fg-text-white">
        Your workspace is set
      </h1>
      <p className="fg-mt-3 fg-max-w-[300px] fg-text-sm fg-font-medium fg-leading-relaxed fg-text-slate-400">
        You can start blocking distractions immediately and fine-tune the setup
        later.
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
