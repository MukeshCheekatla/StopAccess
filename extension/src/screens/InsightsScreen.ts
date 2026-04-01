import {
  getRecentSnapshots,
  resolveIconUrl as getDomainIcon,
} from '@focusgate/core';
import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter';

function formatTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'Just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTimeShort(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

export async function renderInsightsScreen(container) {
  container.innerHTML = '<div class="loader">Compiling Engine Logs...</div>';

  try {
    const isConfigured = await nextDNSApi.isConfigured();
    const isSyncModeFull =
      (await storage.getString('fg_sync_mode')) !== 'browser';

    let snapshots = await getRecentSnapshots(storage, 14); // 2 weeks trend
    if (!Array.isArray(snapshots)) {
      snapshots = [];
    }

    let blockedLogs = [];
    let topBlocked = [];

    if (isConfigured && isSyncModeFull) {
      try {
        const [logsRes, domainsRes] = await Promise.all([
          nextDNSApi.getLogs('blocked', 8),
          nextDNSApi.getTopBlockedDomains(5),
        ]);
        blockedLogs = logsRes || [];
        topBlocked = domainsRes || [];
      } catch (e) {
        console.warn('NextDNS insights fetch failed', e);
      }
    }

    const { usage = {} } = (await chrome.storage.local.get(['usage'])) as any;
    const allTotalMs = Object.values(usage).reduce(
      (a: number, b: any) => a + (b.time || 0),
      0,
    );
    const avgMins = snapshots.length
      ? Math.round(
          snapshots.reduce((sum, s) => sum + (s.screenTimeMinutes || 0), 0) /
            snapshots.length,
        )
      : Math.round((allTotalMs as number) / 60000);
    const maxMins = snapshots.length
      ? Math.max(...snapshots.map((s) => s.screenTimeMinutes || 0), 60)
      : 60;

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-val">${
            formatTimeShort(avgMins * 60000) || '0m'
          }</div>
          <div class="stat-lbl">Daily Average</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color: var(--accent);">
            ${Math.round(
              (snapshots.filter((s) => (s.screenTimeMinutes || 0) < 60).length /
                Math.max(1, snapshots.length)) *
                100,
            )}%
          </div>
          <div class="stat-lbl">Focus Consistency</div>
        </div>
      </div>

      <div class="app-card" style="margin-bottom: 24px; padding: 16px; display: flex; align-items: center; gap: 16px; background: rgba(124, 111, 247, 0.04); border-color: rgba(124, 111, 247, 0.2);">
        <div style="font-size: 32px;">📊</div>
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 13px; color: var(--accent); margin-bottom: 2px;">Your Deep Work Summary</div>
          <div style="font-size: 11px; color: var(--muted); line-height: 1.4;">
            ${
              snapshots.length > 3
                ? `Over the last ${
                    snapshots.length
                  } days, you stayed focused on average for <strong>${formatTimeShort(
                    avgMins * 60000,
                  )}</strong> per day. `
                : 'Keep using FocusGate to build your concentration history and see weekly insights.'
            }
          </div>
        </div>
      </div>

      <div class="section-title">Focus Consistency (14 Days)</div>
      <div class="chart-container" style="height: 140px; margin-bottom: 24px;">
        ${
          snapshots.length === 0
            ? '<div class="empty-state" style="height:100%; border:none;">Collecting usage data...</div>'
            : `
        <div class="bar-chart">
          ${[...snapshots]
            .reverse()
            .map(
              (s, i) => `
            <div class="bar-col">
              <div class="bar-track">
                <div class="bar-fill ${
                  i === snapshots.length - 1 ? 'active' : ''
                }" style="height: ${Math.max(
                2,
                (s.screenTimeMinutes / maxMins) * 100,
              )}%;"></div>
              </div>
              <span class="bar-label">${s.date.slice(8, 10)}</span>
            </div>
          `,
            )
            .join('')}
        </div>
        `
        }
      </div>

      ${
        isConfigured && isSyncModeFull
          ? `
      <div class="section-title">Network-Level Enforcement</div>
      
      ${
        topBlocked.length > 0
          ? `
        <div class="app-list" style="margin-bottom: 20px;">
          ${topBlocked
            .map(
              (d) => `
            <div class="app-card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding: 10px 14px; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <img src="${getDomainIcon(
                  d.domain,
                )}" alt="" class="app-icon" style="width: 20px; height: 20px;">
                <div style="font-weight: 700; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${
                  d.domain
                }</div>
              </div>
              <div class="badge" style="background: rgba(255, 71, 87, 0.1); color: var(--red); border: 1px solid rgba(255, 71, 87, 0.2); flex-shrink: 0;">
                ${d.queries} BLOCKS
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      `
          : ''
      }

      <div class="section-title" style="margin-top: 24px;">Live Intercepts</div>
      <div class="app-list">
        ${
          blockedLogs.length === 0
            ? '<div class="empty-state" style="height: 80px; font-size: 11px;">Network is clean. No recent blocks.</div>'
            : blockedLogs
                .map(
                  (log) => `
            <div style="padding: 10px 0; border-bottom: 1px dashed var(--border); display: flex; justify-content: space-between; margin-bottom: 4px; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <img src="${getDomainIcon(
                  log.domain,
                )}" alt="" class="app-icon" style="width: 16px; height: 16px; opacity: 0.8;">
                <div style="display: flex; flex-direction: column; gap: 1px; min-width: 0;">
                  <span style="font-weight: 700; color: var(--red); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${
                    log.domain
                  }</span>
                  <span style="color: var(--muted); font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${
                      log.reasons?.[0]?.name ||
                      log.reasons?.[0]?.id ||
                      'Parental Control'
                    }
                  </span>
                </div>
              </div>
              <div style="font-size: 9px; color: var(--muted); font-weight: 800; flex-shrink: 0;">
                ${formatTimeAgo(log.timestamp)}
              </div>
            </div>
          `,
                )
                .join('')
        }
      </div>
      <div style="font-size: 9px; color: var(--muted); text-align: center; margin-top: 12px; opacity: 0.6;">
        POWERED BY NEXTDNS LOGS
      </div>
      `
          : `
      <div class="app-card" style="background: rgba(255, 184, 0, 0.05); border-color: rgba(255, 184, 0, 0.2); text-align: center; padding: 24px;">
        <div style="font-size: 24px; margin-bottom: 8px;">☁️</div>
        <div style="font-size: 12px; font-weight: 700; color: var(--yellow); margin-bottom: 4px;">Network Insights Off</div>
        <div style="font-size: 10px; color: var(--muted); max-width: 200px; margin: 0 auto;">
          Enable Level 2 or Level 3 Enforcement in Settings to view deep network-level intercepts and global block attempts.
        </div>
      </div>
      `
      }
    `;
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Error loading insights: ${e.message}</div>`;
  }
}
