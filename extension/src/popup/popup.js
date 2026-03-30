import { renderDashboard } from '../screens/DashboardScreen.js';
import { renderAppsScreen } from '../screens/AppsScreen.js';
import { renderSettingsScreen } from '../screens/SettingsScreen.js';
import { renderFocusScreen } from '../screens/FocusScreen.js';
import { renderScheduleScreen } from '../screens/ScheduleScreen.js';
import { renderInsightsScreen } from '../screens/InsightsScreen.js';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter.js';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('mainContent');
  const pageTitle = document.getElementById('pageTitle');
  const statusBadge = document.getElementById('statusBadge');
  const navItems = document.querySelectorAll('.nav-item');

  // --- Dynamic Status Monitoring (Mobile Parity) ---
  async function updateStatus() {
    try {
      const isConfigured = await nextDNSApi.isConfigured();
      if (!isConfigured) {
        statusBadge.innerText = 'NOT CONFIGURED';
        statusBadge.style.background = 'rgba(255, 71, 87, 0.1)';
        statusBadge.style.color = 'var(--red)';
        statusBadge.style.border = '1px solid rgba(255, 71, 87, 0.2)';
        return;
      }

      // Check real-time heartbeat from background
      const connStatus = await storage.getString('nextdns_connection_status');
      if (connStatus === 'connected') {
        statusBadge.innerText = 'SHIELD ACTIVE';
        statusBadge.style.background = 'rgba(0, 196, 140, 0.1)';
        statusBadge.style.color = 'var(--green)';
        statusBadge.style.border = '1px solid rgba(0, 196, 140, 0.2)';
      } else if (connStatus === 'error') {
        statusBadge.innerText = 'AUTH FAILED';
        statusBadge.style.background = 'rgba(255, 184, 0, 0.1)';
        statusBadge.style.color = 'var(--yellow)';
        statusBadge.style.border = '1px solid rgba(255, 184, 0, 0.2)';
      } else {
        statusBadge.innerText = 'WAITING FOR SYNC...';
        statusBadge.style.color = 'var(--muted)';
      }
    } catch (e) {
      statusBadge.innerText = 'OFFLINE';
    }
  }

  async function navigate(tabId) {
    if (container) {
      container.style.opacity = 0;
    }
    localStorage.setItem('fg_tab', tabId);

    navItems.forEach((n) => {
      const active = n.getAttribute('data-tab') === tabId;
      n.classList.toggle('active', active);
      if (active && pageTitle) {
        const span = n.querySelector('span');
        pageTitle.innerText = span ? span.innerText : 'FocusGate';
      }
    });

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
          container.innerHTML = '<div class="empty-state">Coming Soon</div>';
      }
    } catch (e) {
      console.error('[FocusGate] Navigation error:', e);
      container.innerHTML = `<div class="empty-state" style="color: var(--red);">Navigation failed: ${e.message}</div>`;
    } finally {
      if (container) {
        container.style.opacity = 1;
      }
      updateStatus();
    }
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () =>
      navigate(item.getAttribute('data-tab')),
    );
  });

  // Initial Sync
  const savedTab = localStorage.getItem('fg_tab') || 'dash';
  navigate(savedTab);

  // Kickstart sync if status is unknown on first open
  const existingStatus = await storage.getString('nextdns_connection_status');
  if (!existingStatus) {
    chrome.runtime.sendMessage({ action: 'manualSync' });
  }

  // Real-time updates
  setInterval(updateStatus, 3000);
  updateStatus();
});
