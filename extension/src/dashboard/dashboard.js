import { renderDashboard } from '../screens/DashboardScreen.js';
import { renderAppsScreen } from '../screens/AppsScreen.js';
import { renderFocusScreen } from '../screens/FocusScreen.js';
import { renderScheduleScreen } from '../screens/ScheduleScreen.js';
import { renderInsightsScreen } from '../screens/InsightsScreen.js';
import { renderSettingsScreen } from '../screens/SettingsScreen.js';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter.js';

const PAGE_TITLES = {
  dash: 'Dashboard',
  apps: 'Block Rules',
  focus: 'Focus Mode',
  schedule: 'Schedule',
  insights: 'Insights',
  settings: 'Settings',
};

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('mainContent');
  const statusBadge = document.getElementById('statusBadge');
  const pageTitle = document.getElementById('pageTitle');
  const navItems = document.querySelectorAll('.nav-item');

  if (!container) {
    return;
  }

  // ── Status badge ──────────────────────────────────
  async function updateStatus() {
    try {
      const isConfigured = await nextDNSApi.isConfigured();
      if (!isConfigured) {
        statusBadge.textContent = 'Not Set Up';
        statusBadge.className = 'status-pill error';
        return;
      }
      const conn = await storage.getString('nextdns_connection_status');
      if (conn === 'connected') {
        statusBadge.textContent = 'Shield Active';
        statusBadge.className = 'status-pill active';
      } else {
        statusBadge.textContent = 'Syncing…';
        statusBadge.className = 'status-pill';
      }
    } catch {
      statusBadge.textContent = 'Offline';
      statusBadge.className = 'status-pill error';
    }
  }

  // ── Navigation ────────────────────────────────────
  async function navigate(tabId) {
    // We don't use localStorage here for the full dashboard to avoid conflicting with popup state directly,
    // although it's fine. We use URL params instead.
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);

    navItems.forEach((n) =>
      n.classList.toggle('active', n.getAttribute('data-tab') === tabId),
    );

    if (pageTitle) {
      pageTitle.textContent = PAGE_TITLES[tabId] || 'FocusGate';
    }

    container.innerHTML = '<div class="loader">Loading…</div>';

    try {
      switch (tabId) {
        case 'dash':
          await renderDashboard(container);
          break;
        case 'apps':
          await renderAppsScreen(container);
          break;
        case 'focus':
          await renderFocusScreen(container);
          break;
        case 'schedule':
          await renderScheduleScreen(container);
          break;
        case 'insights':
          await renderInsightsScreen(container);
          break;
        case 'settings':
          await renderSettingsScreen(container);
          break;
        default:
          container.innerHTML = '<div class="loader">Coming Soon</div>';
      }
    } catch (e) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:32px;">⚠️</div>
          <div style="font-weight:800;">Failed to load</div>
          <div style="font-size:11px; color:var(--muted);">${e.message}</div>
        </div>`;
    } finally {
      updateStatus();
    }
  }

  // ── Nav click handlers ────────────────────────────
  navItems.forEach((item) => {
    item.addEventListener('click', () =>
      navigate(item.getAttribute('data-tab')),
    );
  });

  // ── Deep-link check ──────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const initTab = params.get('tab') || 'dash';
  navigate(initTab);

  // ── Poll status every 4s ─────────────────────────
  setInterval(updateStatus, 4000);
  updateStatus();
});
