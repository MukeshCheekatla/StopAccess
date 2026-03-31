import { renderDashboardPopup as renderDashboard } from '../screens/DashboardPopup.js';
import { renderAppsPopup as renderAppsScreen } from '../screens/AppsPopup.js';
import { renderFocusPopup as renderFocusScreen } from '../screens/FocusPopup.js';
import { renderSettingsPopup as renderSettingsScreen } from '../screens/SettingsPopup.js';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter.js';
import { buildExtensionPagePath } from '@focusgate/core';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('mainContent');
  const navItems = document.querySelectorAll('.nav-item');

  if (!container) {
    return;
  }

  // ── Status badge ──────────────────────────────────
  async function updateStatus() {
    try {
      const isConfigured = await nextDNSApi.isConfigured();
      if (!isConfigured) {
        return;
      }
      await storage.getString('nextdns_connection_status');
    } catch (e) {
      console.error('[FocusGate] Status Check Error:', e);
    }
  }

  // ── Navigation ────────────────────────────────────
  async function navigate(tabId) {
    localStorage.setItem('fg_tab', tabId);

    navItems.forEach((n) =>
      n.classList.toggle('active', n.getAttribute('data-tab') === tabId),
    );

    // No Loader. Direct mounting for better performance.
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
        case 'settings':
          await renderSettingsScreen(container);
          break;
        default:
          container.innerHTML = '';
      }
    } catch (e) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:14px; font-weight:900; color:var(--red);">SYNC FAIL</div>
          <div style="font-weight:800;">Navigation Error</div>
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

  // ── Open Portal Master ────────────────────────────
  document
    .getElementById('btn_open_portal_master')
    ?.addEventListener('click', (e) => {
      e.preventDefault();
      const url = chrome.runtime.getURL(
        buildExtensionPagePath('dashboard.html'),
      );
      chrome.tabs.create({ url });
    });

  // ── Initial load ─────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const deepTab = params.get('tab');
  const initTab = deepTab || localStorage.getItem('fg_tab') || 'dash';
  navigate(initTab);

  // ── Core Sync Polling ────────────────────────────
  setInterval(updateStatus, 15 * 1000);
});
