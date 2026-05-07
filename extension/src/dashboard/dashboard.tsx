import { useEffect, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { OnboardingReact } from '@/screens/Onboarding';
import {
  extensionAdapter as storage,
  nextDNSApi,
  STORAGE_KEYS,
} from '@/background/platformAdapter';
import {
  DashboardShell,
  type ShellStatus,
  type ShellTab,
} from '@/ui/react/ExtensionShell';
import { LegacyBridge } from '@/ui/react/LegacyBridge';
import { renderDashboardPage } from '@/screens/dashboard/DashboardPage';
import { renderFocusPage } from '@/screens/focus/FocusPage';
// import { renderSchedulePage } from '@/screens/schedule/SchedulePage';
import { renderInsightsPage } from '@/screens/insights/InsightsPage';
import { renderSettingsPage } from '@/screens/settings/SettingsPage';
import { renderSecurityPage } from '@/screens/security/SecurityPage';
import { renderPrivacyPage } from '@/screens/privacy/PrivacyPage';
import { renderAppsPage } from '@/screens/apps/AppsPage';
import { renderInAppBlockingPage } from '@/screens/in_app/InAppBlockingPage';
import { renderDomainUsage } from '@/screens/dashboard/components/DomainUsage';
import { renderTypingMastery } from '@/screens/dashboard/components/TypingMastery';
import { applyTheme, setupThemeListener } from '@/ui/theme/theme';
import { UI_ICONS } from '@/ui/ui';
import { supabase } from '@/lib/supabase';
import {
  setThemeAction,
  loadSettingsData,
} from '@stopaccess/viewmodels/useSettingsVM';

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
  | 'in_app'
  | 'account'
  | 'cloud_account'
  | 'nextdns_account'
  | 'byte_settings';

const TABS: Array<ShellTab<TabId>> = [
  {
    id: 'dash',
    label: 'Overview',
    icon: UI_ICONS.LAYOUT_GRID,
  },
  {
    id: 'apps',
    label: 'Block List',
    icon: UI_ICONS.CLOCK,
  },
  {
    id: 'focus',
    label: 'Focus',
    icon: UI_ICONS.TARGET,
  },
  {
    id: 'in_app',
    label: 'In App Blocking',
    icon: UI_ICONS.PAUSE_CIRCLE,
  },
  {
    id: 'insights',
    label: 'Reports',
    icon: UI_ICONS.CHART,
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: UI_ICONS.LOCK,
  },
  {
    id: 'security',
    label: 'Security',
    icon: UI_ICONS.SHIELD,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: UI_ICONS.SETTINGS,
  },
];

const TAB_SET = new Set<string>([
  ...TABS.map((tab) => tab.id),
  'domain_usage',
  'typing_mastery',
  'account',
  'cloud_account',
  'nextdns_account',
  'byte_settings',
]);

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
  const [authVersion, setAuthVersion] = useState(0);
  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    image?: string;
  } | null>(() => {
    try {
      const cached = localStorage.getItem('sa_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    document.body.classList.add('is-full-page');
    applyTheme();
    const cleanup = setupThemeListener();

    // Catch Supabase session from URL hash
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        console.log('[Supabase] Auth state changed, refreshing UI...');
        setAuthVersion((v) => v + 1);
      }
    });

    // Listen for postMessage from auth callback page
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH') {
        const { setSessionFromUrl } = await import('@/background/authManager');
        const { error } = await setSessionFromUrl(
          window.location.origin + '#' + event.data.hash,
        );
        if (!error) {
          console.log('[Supabase] Session set via postMessage');
        }
      }
    };
    window.addEventListener('message', handleAuthMessage);

    // Also check for tokens in the current URL (direct redirect)
    if (window.location.hash.includes('access_token')) {
      import('@/background/authManager').then(({ setSessionFromUrl }) => {
        setSessionFromUrl(window.location.href).then(({ error }) => {
          if (!error) {
            console.log('[Supabase] Session detected in URL, restored.');
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname,
            );
          }
        });
      });
    }

    const fetchUser = async () => {
      const { getCloudUserSafe } = await import('@/lib/supabase');
      const u = await getCloudUserSafe();
      if (u) {
        const userData = {
          name: u.user_metadata?.full_name || u.email?.split('@')[0],
          email: u.email,
          image: u.user_metadata?.avatar_url,
        };
        setUser(userData);
        localStorage.setItem('sa_cached_user', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('sa_cached_user');
      }
    };

    fetchUser();

    return () => {
      cleanup();
      subscription.unsubscribe();
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [authVersion]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const { extensionVMDeps } = await import('@/lib/vmDeps');
      const isOnboardingDone =
        (await storage.getString(STORAGE_KEYS.ONBOARDING_DONE)) === 'true';
      const settings = await loadSettingsData(extensionVMDeps);

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
          const { CHANGELOG } = await import('@stopaccess/core');
          const release = CHANGELOG.find((c) => c.version === currentVer);
          if (release) {
            const { showWhatsNew } = await import('@/ui/ui');
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
      } else if (tab === 'cloud_account') {
        setActiveTab('cloud_account');
      } else if (tab === 'nextdns_account') {
        setActiveTab('nextdns_account');
      } else if (tab === 'byte_settings') {
        setActiveTab('byte_settings');
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
        const res = await storage.getMultiple([STORAGE_KEYS.SESSION]);
        const session = res[STORAGE_KEYS.SESSION] as any;
        if (
          session &&
          (session.status === 'focusing' || session.status === 'paused')
        ) {
          if (!cancelled) {
            setStatus({ label: 'Focusing', tone: 'active' });
          }
          return;
        }

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
      { id: 'account' as TabId, label: 'Account' },
      { id: 'cloud_account' as TabId, label: 'Cloud' },
      { id: 'nextdns_account' as TabId, label: 'NextDNS' },
      { id: 'byte_settings' as TabId, label: 'Byte' },
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
            renderDomainUsage(container, currentDomain || '');
          break;
        case 'typing_mastery':
          renderFn = renderTypingMastery;
          break;
        case 'account':
        case 'cloud_account':
          renderFn = async (container: HTMLElement) => {
            const { renderCloudAccountPage } = await import(
              '@/screens/settings/components/CloudAccountPage'
            );
            return renderCloudAccountPage(container);
          };
          break;
        case 'nextdns_account':
          renderFn = async (container: HTMLElement) => {
            const { renderNextDNSAccountPage } = await import(
              '@/screens/settings/components/NextDNSAccountPage'
            );
            return renderNextDNSAccountPage(container);
          };
          break;
        case 'byte_settings':
          renderFn = async (container: HTMLElement) => {
            const { renderByteSettingsPage } = await import(
              '@/screens/settings/components/ByteSettingsPage'
            );
            return renderByteSettingsPage(container);
          };
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
            storage.set(
              'last_seen_version',
              chrome.runtime.getManifest().version,
            );
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
              <LegacyBridge
                key={`bridge-${tab.id}`}
                renderFn={tab.renderFn}
                isVisible={activeTab === tab.id}
                refreshKey={authVersion}
              />
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
        const { extensionVMDeps } = await import('@/lib/vmDeps');
        setCurrentTheme(theme);
        await setThemeAction(extensionVMDeps, theme);
        applyTheme(theme);
      }}
      user={user}
      onSignOut={async () => {
        const { showConfirmDialog } = await import('@/ui/ui');
        const confirmed = await showConfirmDialog({
          title: 'Sign Out',
          body: 'Are you sure you want to sign out? Your settings will no longer be backed up to the cloud.',
          confirmLabel: 'Sign Out',
          cancelLabel: 'Keep Signed In',
          isDestructive: true,
        });

        if (!confirmed) {
          return;
        }

        const { signOutAction } = await import(
          '@stopaccess/viewmodels/useSettingsVM'
        );
        const { extensionVMDeps } = await import('@/lib/vmDeps');
        await signOutAction(extensionVMDeps);

        // Force update everything
        setUser(null);
        localStorage.removeItem('sa_cached_user');
        setAuthVersion((v) => v + 1);

        // Notify other parts of the app
        window.postMessage({ type: 'SA_AUTH_CHANGED' }, '*');
      }}
      onSignIn={() => {
        setActiveTab('account');
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
