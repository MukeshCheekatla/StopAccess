import { renderDashboardPage as renderDashboard } from '../screens/DashboardPage.js';
import { renderAppsPage as renderAppsScreen } from '../screens/AppsPage.js';
import { renderFocusPage as renderFocusScreen } from '../screens/FocusPage.js';
import { renderSchedulePage as renderScheduleScreen } from '../screens/SchedulePage.js';
import { renderInsightsPage as renderInsightsScreen } from '../screens/InsightsPage.js';
import { renderSettingsPage as renderSettingsScreen } from '../screens/SettingsPage.js';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter.js';

const PAGE_TITLES = {
  dash: 'Overview',
  apps: 'Block List',
  focus: 'Focus Mode',
  schedule: 'Schedule',
  insights: 'Reports',
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

  // 1. Determine initial tab from URL BEFORE any async work to prevent flicker
  const params = new URLSearchParams(window.location.search);
  const initTab = params.get('tab') || 'dash';

  // 2. Set active nav item and title immediately (Sync)
  navItems.forEach((n) =>
    n.classList.toggle('active', n.getAttribute('data-tab') === initTab),
  );
  if (pageTitle) {
    pageTitle.textContent = PAGE_TITLES[initTab] || 'FocusGate';
  }

  // Set page mode for responsive CSS
  document.body.classList.add('is-full-page');

  // 3. Navigation Function
  async function navigate(tabId) {
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);

    navItems.forEach((n) =>
      n.classList.toggle('active', n.getAttribute('data-tab') === tabId),
    );

    if (pageTitle) {
      pageTitle.textContent = PAGE_TITLES[tabId] || 'FocusGate';
    }

    container.innerHTML = '<div class="loader">Harnessing Focus...</div>';

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
          <div style="font-size: 14px; font-weight: 900; color: var(--red); margin-bottom: 8px;">FAIL</div>
          <div style="font-weight:800;">Navigation Error</div>
          <div style="font-size:11px; color:var(--muted);">${e.message}</div>
        </div>`;
    } finally {
      updateStatus();
    }
  }

  // 4. Status badge logic
  async function updateStatus() {
    try {
      const isSet = await nextDNSApi.isConfigured();
      if (!isSet) {
        statusBadge.textContent = 'Not Set Up';
        statusBadge.className = 'status-pill error';
        return;
      }
      const conn = await storage.getString('nextdns_connection_status');
      if (conn === 'connected') {
        statusBadge.textContent = 'ON';
        statusBadge.className = 'status-pill active';
      } else {
        statusBadge.textContent = 'Syncing...';
        statusBadge.className = 'status-pill';
      }
    } catch {
      statusBadge.textContent = 'Offline';
      statusBadge.className = 'status-pill error';
    }
  }

  // 5. Click handlers
  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navigate(item.getAttribute('data-tab'));
    });
  });

  // 6. Onboarding & Initial load
  const isOnboardingDone = await storage.getString('fg_onboarding_done');
  if (isOnboardingDone !== 'true') {
    const { renderOnboarding } = await import('../screens/OnboardingScreen.js');
    renderOnboarding(container, async (targetTab) => {
      await storage.set('fg_onboarding_done', 'true');
      navigate(targetTab || 'dash');
    });
  } else {
    navigate(initTab);
  }

  setInterval(updateStatus, 4000);
  updateStatus();
});
