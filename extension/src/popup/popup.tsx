import { startTransition, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '@/background/platformAdapter';
import { STORAGE_KEYS } from '@stopaccess/state';
// import { getBrandLogoUrl } from '@/ui/ui';
import {
  PopupShell,
  type ShellStatus,
  type ShellTab,
} from '@/ui/react/ExtensionShell';
import { FocusPopup } from '@/screens/focus/FocusPopup';
import { AppsPopup } from '@/screens/apps/AppsPopup';
import { DashboardPopup } from '@/screens/dashboard/DashboardPopup';
import { applyTheme, setupThemeListener } from '@/ui/theme/theme';
import { UI_ICONS } from '@/ui/ui';

type TabId = 'dash' | 'apps' | 'focus';

type PassEntry = {
  domain: string;
  expiresAt: number;
};

const TABS: Array<ShellTab<TabId>> = [
  { id: 'dash', label: 'Dashboard' },
  { id: 'apps', label: 'Block List' },
  { id: 'focus', label: 'Focus Timer' },
];

const TAB_SET = new Set<string>(TABS.map((tab) => tab.id));

function resolveInitialTab(): TabId {
  const params = new URLSearchParams(window.location.search);
  const deepTab = params.get('tab');
  const storedTab = localStorage.getItem('fg_tab');
  const candidate = deepTab || storedTab || 'dash';
  return TAB_SET.has(candidate) ? (candidate as TabId) : 'dash';
}

function PopupApp() {
  const [activeTab, setActiveTab] = useState<TabId>(() => resolveInitialTab());
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [status, setStatus] = useState<ShellStatus>({
    label: 'Local',
    tone: 'muted',
  });
  const [, setPassEntries] = useState<PassEntry[]>([]);

  useEffect(() => {
    applyTheme();
    const cleanup = setupThemeListener();
    return cleanup;
  }, []);

  useEffect(() => {
    localStorage.setItem('fg_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    const checkOnboarding = async () => {
      const isConfigured = await nextDNSApi.isConfigured();
      const isOnboardingDone =
        (await storage.getString('fg_onboarding_done')) === 'true';

      if (!cancelled) {
        setNeedsOnboarding(!isConfigured && !isOnboardingDone);
        setReady(true);
      }
    };

    checkOnboarding();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const updateStatus = async () => {
      try {
        const isConfigured = await nextDNSApi.isConfigured();
        if (!isConfigured) {
          if (!cancelled) {
            setStatus({ label: 'Local', tone: 'muted' });
          }
          return;
        }

        const nextStatus = await storage.getString(
          STORAGE_KEYS.CONNECTION_STATUS,
        );
        if (cancelled) {
          return;
        }

        if (nextStatus === 'connected') {
          setStatus({ label: 'Sync', tone: 'active' });
        } else if (nextStatus === 'error') {
          setStatus({ label: 'Offline', tone: 'error' });
        } else {
          setStatus({ label: 'Local', tone: 'muted' });
        }
      } catch (error) {
        console.error('[StopAccess] Status Check Error:', error);
      }
    };

    updateStatus();
    const intervalId = window.setInterval(updateStatus, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const updatePassHUD = async () => {
      const res = await chrome.storage.local.get([
        STORAGE_KEYS.TEMP_PASSES,
        STORAGE_KEYS.RULES,
      ]);
      const passes = res[STORAGE_KEYS.TEMP_PASSES] || {};
      const rulesRaw = res[STORAGE_KEYS.RULES] || '[]';
      let rules: any[] = [];
      try {
        rules = typeof rulesRaw === 'string' ? JSON.parse(rulesRaw) : rulesRaw;
      } catch (e) {
        rules = [];
      }

      // Get current tab domain for deduplication
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentHost = tab?.url
        ? new URL(tab.url).hostname.toLowerCase()
        : '';

      const activeEntries = Object.entries(passes)
        .map(([domain, data]: [string, any]) => ({
          domain,
          expiresAt: data?.expiresAt ?? 0,
        }))
        .filter((entry) => {
          // 1. Must not be expired
          const diff = entry.expiresAt - Date.now();
          if (diff <= 0) {
            return false;
          }

          // 2. ONLY show short-term passes in the HUD (< 2 hours)
          // Long passes like "Turned off for today" should NOT clutter the premium HUD.
          if (diff > 2 * 60 * 60 * 1000) {
            return false;
          }

          // 2. Must still have a corresponding active rule
          const hasActiveRule = rules.some((r) => {
            const ruleDomainRaw = r.customDomain || r.packageName;
            if (!ruleDomainRaw) {
              return false;
            }

            const ruleDomain = ruleDomainRaw.toLowerCase();
            const entryDomain = entry.domain.toLowerCase();

            const matches =
              entryDomain === ruleDomain ||
              entryDomain.endsWith('.' + ruleDomain);

            if (!matches) {
              return false;
            }

            // Rule must be active. If desiredBlockingState is explicitly false, it's OFF.
            return r.desiredBlockingState !== false;
          });

          if (!hasActiveRule) {
            return false;
          }

          // 3. Deduplication: Don't show in HUD if we are already showing it in the main card
          const isViewingThisSite =
            currentHost === entry.domain.toLowerCase() ||
            currentHost.endsWith('.' + entry.domain.toLowerCase());

          return !isViewingThisSite;
        })
        .sort((a, b) => a.expiresAt - b.expiresAt);

      if (!cancelled) {
        startTransition(() => {
          setPassEntries(activeEntries);
        });
      }
    };

    updatePassHUD();
    const intervalId = window.setInterval(updatePassHUD, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (!ready) {
    return (
      <div className="fg-main fg-shell-bg fg-flex fg-h-screen fg-w-full fg-items-center fg-justify-center fg-text-[var(--fg-text)]">
        <div className="fg-h-8 fg-w-8 fg-animate-spin fg-rounded-full fg-border-4 fg-border-[var(--fg-glass-border)] fg-border-t-[var(--fg-accent)]" />
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="fg-main fg-shell-bg fg-flex fg-h-screen fg-w-full fg-items-center fg-justify-center fg-p-5 fg-text-[var(--fg-text)]">
        <div className="fg-w-full fg-max-w-[320px] fg-rounded-xl fg-border fg-border-[var(--fg-glass-border)] fg-bg-[var(--fg-surface)] fg-p-5 fg-text-center">
          <img
            src={chrome.runtime.getURL('assets/icon-48.png')}
            alt="StopAccess"
            className="fg-mx-auto fg-mb-4 fg-h-12 fg-w-12 fg-rounded-lg"
          />
          <div className="fg-mb-2 fg-text-[18px] fg-font-black">
            Finish setup
          </div>
          <p className="fg-mb-5 fg-text-[14px] fg-leading-relaxed fg-text-[var(--fg-muted)]">
            Complete onboarding once to connect NextDNS or choose browser-only
            blocking.
          </p>
          <button
            type="button"
            className="fg-w-full fg-rounded-lg fg-border-0 fg-bg-[var(--fg-accent)] fg-px-4 fg-py-3 fg-text-[14px] fg-font-bold fg-text-[var(--fg-on-accent)]"
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('dashboard.html'),
              })
            }
          >
            Open setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <PopupShell
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab)}
      status={status}
      tabs={TABS}
      topbarRight={
        <div className="fg-flex fg-items-center fg-gap-2">
          <button
            onClick={() =>
              chrome.tabs.create({
                url: chrome.runtime.getURL('dashboard.html'),
              })
            }
            className="fg-popup-action fg-appearance-none fg-border-0 fg-outline-none fg-shadow-none fg-px-3 fg-py-1.5 fg-rounded-md fg-transition-all fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-glass-bg)] hover:fg-bg-[var(--fg-surface)]"
            style={{
              color: 'var(--fg-text)',
              background: 'var(--fg-glass-bg)',
              border: '1px solid var(--fg-glass-border)',
            }}
            type="button"
            title="Open full dashboard"
            dangerouslySetInnerHTML={{ __html: UI_ICONS.EXTERNAL_LINK }}
          />
        </div>
      }
    >
      <div
        className={`fg-h-full fg-w-full ${
          activeTab === 'focus' ? 'fg-block' : 'fg-hidden'
        }`}
      >
        <FocusPopup />
      </div>
      <div
        className={`fg-h-full fg-w-full ${
          activeTab === 'dash' ? 'fg-block' : 'fg-hidden'
        }`}
      >
        <DashboardPopup />
      </div>
      <div
        className={`fg-h-full fg-w-full ${
          activeTab === 'apps' ? 'fg-block' : 'fg-hidden'
        }`}
      >
        <AppsPopup />
      </div>
    </PopupShell>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<PopupApp />);
}
