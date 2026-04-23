import { useEffect, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { OnboardingReact } from '../screens/Onboarding';
import {
  extensionAdapter as storage,
  nextDNSApi,
  STORAGE_KEYS,
} from '../background/platformAdapter';
import {
  DashboardShell,
  type ShellStatus,
  type ShellTab,
} from '../ui/react/ExtensionShell';
import { LegacyBridge } from '../ui/react/LegacyBridge';
import { renderDashboardPage } from '../screens/dashboard/DashboardPage';
import { renderFocusPage } from '../screens/focus/FocusPage';
// import { renderSchedulePage } from '../screens/schedule/SchedulePage';
import { renderInsightsPage } from '../screens/insights/InsightsPage';
import { renderSettingsPage } from '../screens/settings/SettingsPage';
import { renderSecurityPage } from '../screens/security/SecurityPage';
import { renderPrivacyPage } from '../screens/privacy/PrivacyPage';
import { renderAppsPage } from '../screens/apps/AppsPage';
import { renderDomainUsageScreen } from '../screens/dashboard/DomainUsageScreen';
import { renderInAppBlockingPage } from '../screens/in_app/InAppBlockingPage';
import { renderTypingMasteryScreen } from '../screens/dashboard/TypingMasteryScreen';
import { applyTheme, setupThemeListener } from '../lib/theme';
import {
  setThemeAction,
  loadSettingsData,
} from '../../../packages/viewmodels/src/useSettingsVM';

type TabId =
  | 'dash'
  | 'apps'
  | 'focus'
  // | 'schedule'
  | 'insights'
  | 'security'
  | 'privacy'
  | 'settings'
  | 'domain_usage'
  | 'typing_mastery'
  | 'in_app';

const TABS: Array<ShellTab<TabId>> = [
  {
    id: 'dash',
    label: 'Overview',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'apps',
    label: 'Block List',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    id: 'focus',
    label: 'Focus',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'in_app',
    label: 'In App Blocking',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
  },
  // {
  //   id: 'schedule',
  //   label: 'Schedules',
  //   icon: (
  //     <svg
  //       viewBox="0 0 24 24"
  //       fill="none"
  //       stroke="currentColor"
  //       strokeWidth="2"
  //     >
  //       <rect x="3" y="4" width="18" height="18" rx="2" />
  //       <line x1="16" y1="2" x2="16" y2="6" />
  //       <line x1="8" y1="2" x2="8" y2="6" />
  //       <line x1="3" y1="10" x2="21" y2="10" />
  //     </svg>
  //   ),
  // },
  {
    id: 'insights',
    label: 'Reports',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: 'security',
    label: 'Security',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const TAB_SET = new Set<string>(TABS.map((tab) => tab.id));

function resolveInitialTab(): TabId {
  const params = new URLSearchParams(window.location.search);
  const candidate = params.get('tab') || 'dash';
  return TAB_SET.has(candidate) ? (candidate as TabId) : 'dash';
}

function DashboardApp() {
  const [activeTab, setActiveTab] = useState<TabId>(() => resolveInitialTab());
  const [status, setStatus] = useState<ShellStatus>({
    label: 'Initializing...',
    tone: 'default',
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light' | 'system'>(
    () => (localStorage.getItem('sa_theme') as any) || 'system',
  );

  useEffect(() => {
    document.body.classList.add('is-full-page');
    applyTheme();
    const cleanup = setupThemeListener();
    return cleanup;
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const isOnboardingDone =
        (await storage.getString(STORAGE_KEYS.ONBOARDING_DONE)) === 'true';
      const settings = await loadSettingsData();

      if (cancelled) {
        return;
      }

      setShowOnboarding(!isOnboardingDone);

      // Discovery Logic: Handle version updates
      if (isOnboardingDone) {
        const manifest = chrome.runtime.getManifest();
        const currentVer = manifest.version;
        const lastSeen = await storage.getString('last_seen_version');

        if (!lastSeen) {
          // Initial transition to this system, just mark version
          await storage.set('last_seen_version', currentVer);
        } else if (currentVer !== lastSeen) {
          const { CHANGELOG } = await import(
            '../../../packages/core/src/changelog'
          );
          const release = CHANGELOG.find((c) => c.version === currentVer);
          if (release) {
            const { showWhatsNew } = await import('../lib/ui');
            // Delay slightly for smooth transition after load
            setTimeout(
              () => showWhatsNew(release.version, release.features),
              800,
            );
          }
          await storage.set('last_seen_version', currentVer);
        }
      }

      setCurrentTheme(settings.theme || 'system');
      setReady(true);
    };

    initialize();

    const handleNavigate = (e: any) => {
      const { tab } = e.detail;
      if (tab === 'domain_usage') {
        setActiveTab('domain_usage');
      } else if (tab === 'typing_mastery') {
        setActiveTab('typing_mastery');
      } else if (TAB_SET.has(tab)) {
        setActiveTab(tab as TabId);
      }
    };

    window.addEventListener('sa_navigate', handleNavigate);

    return () => {
      cancelled = true;
      window.removeEventListener('sa_navigate', handleNavigate);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const updateStatus = async () => {
      try {
        const isConfigured = await nextDNSApi.isConfigured();
        if (!isConfigured) {
          if (!cancelled) {
            setStatus({ label: 'Not Set Up', tone: 'muted' });
          }
          return;
        }

        const connection = await storage.getString('nextdns_connection_status');
        if (cancelled) {
          return;
        }

        if (connection === 'connected') {
          setStatus({ label: 'On', tone: 'active' });
        } else if (connection === 'browser_mode') {
          setStatus({ label: 'Local', tone: 'muted' });
        } else if (connection === 'error') {
          setStatus({ label: 'Offline', tone: 'error' });
        } else {
          setStatus({ label: 'Syncing...', tone: 'default' });
        }
      } catch {
        if (!cancelled) {
          setStatus({ label: 'Offline', tone: 'error' });
        }
      }
    };

    updateStatus();
    const intervalId = window.setInterval(updateStatus, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const searchParams = new URLSearchParams(window.location.search);
  const currentDomain = searchParams.get('domain');

  const stabilizedTabs = useMemo(() => {
    return [
      ...TABS,
      { id: 'domain_usage' as TabId, label: 'Usage' },
      { id: 'typing_mastery' as TabId, label: 'Mastery' },
    ].map((tab) => {
      let renderFn: any = null;
      switch (tab.id) {
        case 'focus':
          renderFn = (container: HTMLElement) =>
            renderFocusPage(container, 'page');
          break;
        case 'apps':
          renderFn = renderAppsPage;
          break;
        case 'dash':
          renderFn = renderDashboardPage;
          break;
        case 'insights':
          renderFn = (container: HTMLElement) =>
            renderInsightsPage(container, 'page');
          break;
        case 'settings':
          renderFn = renderSettingsPage;
          break;
        case 'security':
          renderFn = renderSecurityPage;
          break;
        case 'privacy':
          renderFn = renderPrivacyPage;
          break;
        case 'in_app':
          renderFn = renderInAppBlockingPage;
          break;
        case 'domain_usage':
          renderFn = (container: HTMLElement) =>
            renderDomainUsageScreen(container, currentDomain || '');
          break;
        case 'typing_mastery':
          renderFn = renderTypingMasteryScreen;
          break;
      }
      return { ...tab, renderFn };
    });
  }, [currentDomain]);

  const renderCurrentContent = () => {
    if (showOnboarding) {
      return (
        <OnboardingReact
          onComplete={(targetTab?: string) => {
            storage.set(STORAGE_KEYS.ONBOARDING_DONE, 'true');
            setShowOnboarding(false);
            setActiveTab(
              TAB_SET.has(targetTab || '') ? (targetTab as TabId) : 'dash',
            );
          }}
        />
      );
    }

    if (!ready) {
      return (
        <div className="fg-flex fg-items-center fg-justify-center fg-h-full">
          <div className="fg-animate-spin fg-w-10 fg-h-10 fg-border-4 fg-border-[var(--fg-white-wash)] fg-border-t-[var(--fg-blue)] fg-rounded-full" />
        </div>
      );
    }

    return (
      <div className="fg-relative fg-h-full fg-w-full">
        {/* Persistent tab containers */}
        {stabilizedTabs.map((tab) => {
          if (!tab.renderFn) {
            return null;
          }

          return (
            <div
              key={tab.id}
              className={`fg-absolute fg-inset-0 ${
                activeTab === tab.id ? 'fg-block' : 'fg-hidden'
              }`}
            >
              <LegacyBridge renderFn={tab.renderFn} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <DashboardShell
      activeTab={activeTab}
      hiddenSidebar={showOnboarding}
      onTabChange={(tab) => setActiveTab(tab)}
      status={status}
      tabs={TABS}
      theme={currentTheme}
      onThemeChange={async (theme) => {
        setCurrentTheme(theme);
        await setThemeAction(theme);
        applyTheme(theme);
      }}
    >
      {renderCurrentContent()}
    </DashboardShell>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<DashboardApp />);
}
