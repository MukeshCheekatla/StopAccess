import { getRecentSnapshots, getFocusStreak } from '@focusgate/core';
import { getRules } from '@focusgate/state/rules';
import { extensionAdapter as storage } from '../background/platformAdapter.js';

// --- Accurate Time Formatter (StayFree Logic) ---
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

let cachedUsage = null;

export async function renderDashboard(container) {
  // 1. Loading Tone Change
  if (!cachedUsage) {
    container.innerHTML = '<div class="loader">Loading...</div>';
  }

  try {
    let snapshots = await getRecentSnapshots(storage, 7);
    if (!Array.isArray(snapshots)) {
      snapshots = [];
    }

    const streak = await getFocusStreak(storage);
    const rules = await getRules(storage);
    const blockedCount = rules.filter(
      (r) => r.mode === 'block' || r.blockedToday,
    ).length;

    // Domain usage from local storage (Accuracy Layer)
    const { usage = {} } = await chrome.storage.local.get(['usage']);
    cachedUsage = usage;

    const allTotalMs = Object.values(usage).reduce(
      (a, b) => a + (b.time || 0),
      0,
    );

    const domainList = Object.entries(usage)
      .map(([domain, data]) => ({
        domain,
        timeMs: data.time || 0,
        sessions: data.sessions || 0,
      }))
      .filter((d) => d.timeMs > 0)
      .sort((a, b) => b.timeMs - a.timeMs)
      .slice(0, 5);

    const totalMs = domainList.reduce((sum, d) => sum + d.timeMs, 0);
    const maxMins =
      snapshots.length > 0
        ? Math.max(...snapshots.map((s) => s.screenTimeMinutes || 0), 60)
        : 60;

    const syncStatus = await storage.getString('nextdns_connection_status');
    const syncMode = (await storage.getString('fg_sync_mode')) || 'hybrid';
    const lastSyncAt = (await storage.getString('fg_last_sync_at')) || 'Never';

    let shieldClass = 'shield-inactive';
    let shieldText = 'ENGINE INACTIVE';
    if (syncStatus === 'connected') {
      shieldClass = 'shield-active';
      shieldText = 'ENGINE ACTIVE';
    } else if (syncStatus === 'error') {
      shieldClass = 'shield-error';
      shieldText = 'AUTH FAILED';
    } else if (!syncStatus) {
      shieldText = 'NOT CONFIGURED';
    }

    container.innerHTML = `
      <div class="shield-status ${shieldClass}">
        <div class="shield-icon">🛡️</div>
        <div class="shield-info">
          <div class="shield-title">${shieldText}</div>
          <div class="shield-sync">Mode: ${syncMode.toUpperCase()} &bull; Last Sync: ${lastSyncAt}</div>
        </div>
      </div>

      <div class="dash-hero">
        <div class="hero-info">
          <div class="title">Current Streak</div>
          <div class="sub">Keep it up! You're doing great.</div>
        </div>
        <div class="hero-stat">
          <div class="val">${streak}</div>
          <div class="lbl">DAYS FOCUS</div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-val">${
            Math.floor(allTotalMs / 3600000) > 0
              ? `${Math.floor(allTotalMs / 3600000)}h ${Math.floor(
                  (allTotalMs % 3600000) / 60000,
                )}m`
              : `${Math.round(allTotalMs / 60000)}m`
          }</span>
          <span class="stat-lbl">Usage Today</span>
        </div>
        <div class="stat-card">
          <span class="stat-val" style="color: var(--red);">${blockedCount}</span>
          <span class="stat-lbl">Targets Blocked</span>
        </div>
      </div>

      <div class="section-title">Dominant Domains</div>
      <div class="app-list">
        ${
          domainList.length === 0
            ? '<div class="empty-state">No domain activity tracked yet.</div>'
            : ''
        }
        ${domainList
          .map(
            (d) => `
          <div class="app-card" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; flex-direction: column;">
              <div style="font-weight: 700;">${d.domain}</div>
              <div style="font-size: 11px; color: var(--muted);">${
                d.sessions
              } sessions</div>
            </div>
            <div style="width: 120px;">
              <div style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
                <div style="
                  height: 100%;
                  width: ${totalMs ? (d.timeMs / totalMs) * 100 : 0}%;
                  background: var(--accent);
                  border-radius: 4px;
                "></div>
              </div>
              <div style="font-size: 10px; margin-top: 4px; text-align: right; color: var(--muted); font-weight: 700;">
                ${formatTime(d.timeMs)}
              </div>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>

      <div class="chart-container">
        <div class="section-title" style="margin-top: 0;">Weekly Productivity</div>
        <div class="bar-chart">
          ${[...snapshots]
            .reverse()
            .map(
              (s, i) => `
            <div class="bar-col">
              <div class="bar-track">
                <div class="bar-fill ${
                  i === snapshots.length - 1 ? 'active' : ''
                }" 
                     style="height: ${Math.max(
                       2,
                       (s.screenTimeMinutes / maxMins) * 100,
                     )}%;">
                </div>
              </div>
              <span class="bar-label">${s.date.slice(8, 10)}</span>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;

    // 2. Real-Time Refresh (StayFree Feel)
    if (window.__dashInterval) {
      clearInterval(window.__dashInterval);
    }
    window.__dashInterval = setInterval(() => {
      if (document.querySelector('[data-tab="dash"].active')) {
        renderDashboard(container);
      }
    }, 2000);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error loading dashboard: ${e.message}</div>`;
  }
}
