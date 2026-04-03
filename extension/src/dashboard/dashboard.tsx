import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { renderDashboardPage as renderDashboard } from '../screens/dashboard/DashboardPage';
import { renderAppsPage } from '../screens/AppsPage';
import { renderFocusPage as renderFocusScreen } from '../screens/focus/FocusPage';
import { renderSchedulePage as renderScheduleScreen } from '../screens/schedule/SchedulePage';
import { renderInsightsPage as renderInsightsScreen } from '../screens/insights/InsightsPage';
import { renderSettingsPage as renderSettingsScreen } from '../screens/settings/SettingsPage';
import { renderOnboarding } from '../screens/OnboardingScreen';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter';
import {
  DashboardShell,
  type ShellStatus,
  type ShellTab,
} from '../ui/react/ExtensionShell';

type TabId =
  | 'dash'
  | 'apps'
  | 'focus'
  | 'schedule'
  | 'insights'
  | 'security'
  | 'privacy'
  | 'settings';

const PAGE_TITLES: Record<TabId, string> = {
  dash: 'Overview',
  apps: 'Block List',
  focus: 'Focus',
  schedule: 'Schedules',
  insights: 'Reports',
  security: 'Security',
  privacy: 'Privacy',
  settings: 'Settings',
};

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
    id: 'schedule',
    label: 'Schedules',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
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
      >
        <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" />
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

async function renderTab(container: HTMLElement, tabId: TabId) {
  switch (tabId) {
    case 'dash':
      await renderDashboard(container);
      return;
    case 'apps': {
      await renderAppsPage(container);
      return;
    }
    case 'focus':
      await renderFocusScreen(container);
      return;
    case 'schedule':
      await renderScheduleScreen(container);
      return;
    case 'insights':
      await renderInsightsScreen(container);
      return;
    case 'security': {
      const { renderSecurityPage } = await import(
        '../screens/security/SecurityPage'
      );
      await renderSecurityPage(container);
      return;
    }
    case 'privacy': {
      const { renderPrivacyPage } = await import(
        '../screens/privacy/PrivacyPage'
      );
      await renderPrivacyPage(container);
      return;
    }
    case 'settings':
      await renderSettingsScreen(container);
      return;
    default:
      container.innerHTML = '<div class="loader">Coming Soon</div>';
  }
}

function DashboardApp() {
  const [activeTab, setActiveTab] = useState<TabId>(() => resolveInitialTab());
  const [status, setStatus] = useState<ShellStatus>({
    label: 'Initializing...',
    tone: 'default',
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [ready, setReady] = useState(false);

  const pageTitle = useMemo(
    () => PAGE_TITLES[activeTab] || 'FocusGate',
    [activeTab],
  );

  useEffect(() => {
    document.body.classList.add('is-full-page');
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const isSet = await nextDNSApi.isConfigured();
      const isOnboardingDone =
        (await storage.getString('fg_onboarding_done')) === 'true';

      if (cancelled) {
        return;
      }

      setShowOnboarding(!isSet && !isOnboardingDone);
      setReady(true);
    };

    initialize();

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
            setStatus({ label: 'Not Set Up', tone: 'error' });
          }
          return;
        }

        const connection = await storage.getString('nextdns_connection_status');
        if (cancelled) {
          return;
        }

        if (connection === 'connected') {
          setStatus({ label: 'ON', tone: 'active' });
        } else if (connection === 'browser_mode') {
          setStatus({ label: 'LOCAL', tone: 'muted' });
        } else if (connection === 'error') {
          setStatus({ label: 'Error', tone: 'error' });
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

  const renderContent = useCallback(
    async ({
      container,
      activeTab: tabId,
    }: {
      container: HTMLElement;
      activeTab: TabId;
    }) => {
      if (showOnboarding) {
        renderOnboarding(container, (targetTab?: string) => {
          storage.set('fg_onboarding_done', 'true');
          setShowOnboarding(false);
          setActiveTab(
            TAB_SET.has(targetTab || '') ? (targetTab as TabId) : 'dash',
          );
        });
        return;
      }

      if (!ready) {
        container.innerHTML = '<div class="loader">Loading...</div>';
        return;
      }

      await renderTab(container, tabId);
    },
    [ready, showOnboarding],
  );

  return (
    <DashboardShell
      activeTab={activeTab}
      footer="FocusGate v1.0.0"
      hiddenSidebar={showOnboarding}
      onTabChange={(tab) => setActiveTab(tab)}
      pageTitle={showOnboarding ? 'Welcome' : pageTitle}
      renderContent={renderContent}
      status={status}
      tabs={TABS}
    />
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<DashboardApp />);
}
