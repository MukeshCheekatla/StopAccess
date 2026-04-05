import { startTransition, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
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
import { FocusPopupView } from '../screens/focus/FocusPopupView';
import { AppsPopupView } from '../screens/apps/AppsPopupView';
import { DashboardPopupView } from '../screens/dashboard/DashboardPopupView';

type TabId = 'dash' | 'apps' | 'focus';

type PassEntry = {
  domain: string;
  expiresAt: number;
};

const TABS: Array<ShellTab<TabId>> = [
  { id: 'dash', label: 'DASHBOARD' },
  { id: 'apps', label: 'BLOCK LIST' },
  { id: 'focus', label: 'FOCUS TIMER' },
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
          <div
            id="passHUD"
            className="fg-flex fg-gap-2 fg-px-4 fg-py-2 fg-bg-transparent fg-no-scrollbar fg-overflow-x-auto"
          >
            {passEntries.map((entry) => (
              <div
                key={entry.domain}
                className="fg-flex fg-items-center fg-gap-2 fg-px-2 fg-py-1 fg-rounded-lg fg-shrink-0 fg-bg-white/5"
              >
                <div className="fg-text-[9px] fg-font-black fg-text-slate-400 fg-uppercase fg-tracking-[0.18em]">
                  {entry.domain}
                </div>
                <div className="fg-flex fg-items-center fg-gap-1.5 fg-text-[10px] fg-font-black fg-text-sky-200">
                  {clockSvg}
                  {formatCountdown(entry.expiresAt)}
                </div>
              </div>
            ))}
          </div>
        ) : undefined
      }
      status={status}
      tabs={TABS}
      topbarRight={
        <button
          onClick={() =>
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })
          }
          className="fg-popup-action fg-appearance-none fg-border-0 fg-outline-none fg-shadow-none fg-px-3 fg-py-1.5 fg-text-[9px] fg-font-black fg-rounded-md fg-tracking-[0.16em] fg-whitespace-nowrap hover:fg-bg-[#2d2d34] focus:fg-scale-[0.98] fg-transition-all"
          type="button"
        >
          PORTAL
        </button>
      }
    >
      {activeTab === 'focus' && <FocusPopupView />}
      {activeTab === 'dash' && <DashboardPopupView />}
      {activeTab === 'apps' && <AppsPopupView />}
    </PopupShell>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<PopupApp />);
}
