import React, { startTransition, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderDashboardPopup as renderDashboardScreen } from '../screens/dashboard/DashboardPopup';
import { renderAppsPopup } from '../screens/AppsPopup';
import { renderFocusPopup as renderFocusScreen } from '../screens/focus/FocusPopup';
import { renderSettingsPopup as renderSettingsScreen } from '../screens/settings/SettingsPopup';
import { renderScheduleScreen as renderSchedule } from '../screens/schedule/ScheduleScreen';
import { renderInsightsScreen as renderInsights } from '../screens/insights/InsightsScreen';
import { renderSecurityScreen as renderSecurity } from '../screens/security/SecurityScreen';
import { renderPrivacyScreen as renderPrivacy } from '../screens/privacy/PrivacyScreen';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter';
import { STORAGE_KEYS } from '@focusgate/state';
import {
  PopupShell,
  type ShellStatus,
  type ShellTab,
} from '../ui/react/ExtensionShell';

type TabId =
  | 'dash'
  | 'apps'
  | 'focus'
  | 'schedule'
  | 'insights'
  | 'privacy'
  | 'security'
  | 'settings';

type PassEntry = {
  domain: string;
  expiresAt: number;
};

const TABS: Array<ShellTab<TabId>> = [
  { id: 'dash', label: 'DASHBOARD' },
  { id: 'apps', label: 'BLOCK LIST' },
  { id: 'focus', label: 'FOCUS TIMER' },
  { id: 'schedule', label: 'SCHEDULE' },
  { id: 'insights', label: 'INSIGHTS' },
  { id: 'privacy', label: 'PRIVACY' },
  { id: 'security', label: 'SECURITY' },
  { id: 'settings', label: 'SETTINGS' },
];

const TAB_SET = new Set<string>(TABS.map((tab) => tab.id));

const clockSvg = (
  <svg
    className="pass-timer-clock"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

function resolveInitialTab(): TabId {
  const params = new URLSearchParams(window.location.search);
  const deepTab = params.get('tab');
  const storedTab = localStorage.getItem('fg_tab');
  const candidate = deepTab || storedTab || 'dash';
  return TAB_SET.has(candidate) ? (candidate as TabId) : 'dash';
}

function formatCountdown(expiresAt: number) {
  const diffMs = expiresAt - Date.now();
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function renderTab(container: HTMLElement, tabId: TabId) {
  switch (tabId) {
    case 'dash': {
      await renderDashboardScreen(container);
      return;
    }
    case 'apps': {
      await renderAppsPopup(container);
      return;
    }
    case 'focus':
      await renderFocusScreen(container);
      return;
    case 'schedule':
      await renderSchedule(container);
      return;
    case 'insights':
      await renderInsights(container);
      return;
    case 'privacy':
      await renderPrivacy(container);
      return;
    case 'security':
      await renderSecurity(container);
      return;
    case 'settings':
      await renderSettingsScreen(container);
      return;
    default:
      container.innerHTML = '';
  }
}

function PopupApp() {
  const [activeTab, setActiveTab] = useState<TabId>(() => resolveInitialTab());
  const [status, setStatus] = useState<ShellStatus>({
    label: 'LOCAL',
    tone: 'muted',
  });
  const [passEntries, setPassEntries] = useState<PassEntry[]>([]);

  useEffect(() => {
    localStorage.setItem('fg_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;

    const updateStatus = async () => {
      try {
        const isConfigured = await nextDNSApi.isConfigured();
        if (!isConfigured) {
          if (!cancelled) {
            setStatus({ label: 'LOCAL', tone: 'muted' });
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
          setStatus({ label: 'SYNC', tone: 'active' });
        } else if (nextStatus === 'error') {
          setStatus({ label: 'ERROR', tone: 'error' });
        } else {
          setStatus({ label: 'LOCAL', tone: 'muted' });
        }
      } catch (error) {
        console.error('[FocusGate] Status Check Error:', error);
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
      const res = await chrome.storage.local.get([STORAGE_KEYS.TEMP_PASSES]);
      const passes = res[STORAGE_KEYS.TEMP_PASSES] || {};
      const activeEntries = Object.entries(passes)
        .map(([domain, data]: [string, any]) => ({
          domain,
          expiresAt: data?.expiresAt ?? 0,
        }))
        .filter((entry) => entry.expiresAt > Date.now())
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

  return (
    <PopupShell
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab)}
      passHud={
        passEntries.length > 0 ? (
          <div id="passHUD" style={{ display: 'flex' }}>
            {passEntries.map((entry) => (
              <div className="pass-item" key={entry.domain}>
                <div className="pass-domain">{entry.domain}</div>
                <div className="pass-timer-wrap">
                  {clockSvg}
                  <div className="pass-timer-val">
                    {formatCountdown(entry.expiresAt)}
                  </div>
                  <div className="pass-label">PASS</div>
                </div>
              </div>
            ))}
          </div>
        ) : undefined
      }
      renderContent={({ container, activeTab: tabId }) =>
        renderTab(container, tabId as TabId)
      }
      status={status}
      tabs={TABS}
      topbarRight={
        <button
          onClick={() =>
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })
          }
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'var(--accent)',
            border: 'none',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 900,
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
          type="button"
        >
          PORTAL
        </button>
      }
    />
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<PopupApp />);
}
