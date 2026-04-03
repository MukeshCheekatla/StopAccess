import {
  getAppIconUrl as getSmartIcon,
  fmtTime,
  buildDashboardTabPath,
} from '@focusgate/core';
import { nextDNSApi } from '../../background/platformAdapter';

declare var chrome: any;

export async function renderInsightsPage(
  container: HTMLElement,
  context: 'page' | 'popup' = 'page',
): Promise<void> {
  if (!container) {
    return;
  }
  container.innerHTML = '<div class="loader">Analyzing engine logs...</div>';

  try {
    if (context === 'popup') {
      await _renderPopup(container);
    } else {
      await _renderPage(container);
    }
  } catch (e: any) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

// ─── Full Page View ───────────────────────────────────────────────────────────

async function _renderPage(container: HTMLElement): Promise<void> {
  const { loadInsightsData } = await import(
    '../../../../packages/viewmodels/src/useInsightsVM'
  );
  const {
    isConfigured,
    snapshots,
    blockedLogs,
    topBlocked,
    maxMins,
    avgFocusTime,
    focusConsistency,
  } = await loadInsightsData();

  const weeklySnapshots = [...(snapshots as any[])].slice(-7);
  const weeklyMaxMins = Math.max(
    1,
    ...weeklySnapshots.map((s: any) => s.screenTimeMinutes || 0),
  );
  const activeDays = weeklySnapshots.filter(
    (s: any) => (s.screenTimeMinutes || 0) > 0,
  ).length;

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); margin-bottom: var(--space-xl);">
      <div class="glass-card" style="padding: var(--space-lg);">
        <div class="field-label">Tracked Days</div>
        <div style="font-size: 18px; font-weight: 800; color: var(--text); margin-top: 4px;">${
          snapshots.length
        }</div>
      </div>
      <div class="glass-card" style="padding: var(--space-lg);">
        <div class="field-label">Average Focus Time</div>
        <div style="font-size: 18px; font-weight: 800; color: var(--text); margin-top: 4px;">${avgFocusTime}m / day</div>
      </div>
      <div class="glass-card" style="padding: var(--space-lg);">
        <div class="field-label">Days With Focus</div>
        <div style="font-size: 18px; font-weight: 800; color: var(--text); margin-top: 4px;">${focusConsistency}% consistency</div>
      </div>
    </div>

    <div class="glass-card" style="margin-bottom: var(--space-xl); padding: var(--space-xl);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
        <div>
          <div class="section-label" style="margin:0;">Last 7 Days Focus Minutes</div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">${activeDays} of ${Math.max(
            weeklySnapshots.length,
            1,
          )} tracked days had focus activity.</div>
        </div>
        <div style="font-size:12px; color:var(--text); font-weight:800;">${avgFocusTime}m avg</div>
      </div>
      ${
        weeklySnapshots.length === 0
          ? `<div style="height: 160px; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px; border: 1px dashed var(--glass-border); border-radius: 16px;">
              No focus history yet. Start a session to build the weekly report.
            </div>`
          : `<div class="bar-chart" style="height: 140px; display: flex; align-items: flex-end; gap: 16px; margin-top: 16px;">
              ${weeklySnapshots
                .map((s: any, i: number) => {
                  const height = Math.max(
                    8,
                    ((s.screenTimeMinutes || 0) / weeklyMaxMins) * 100,
                  );
                  const isLatest = i === weeklySnapshots.length - 1;
                  return `
                    <div class="bar-col" style="flex:1; height:100%; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:12px;">
                      <div class="bar-track" style="width:100%; flex:1; background:rgba(255,255,255,0.02); border-radius:6px; position:relative; overflow:hidden;">
                        <div class="bar-fill" style="height: ${height}%; width:100%; position:absolute; bottom:0; background:${
                    isLatest ? 'var(--accent)' : 'rgba(161,161,170,0.18)'
                  }; border-radius:6px; transition: height 0.6s cubic-bezier(0.4,0,0.2,1);"></div>
                      </div>
                      <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                        <span style="font-size:11px; font-weight:800; color:${isLatest ? 'var(--text)' : 'var(--muted)'};">${
                          s.screenTimeMinutes || 0
                        }m</span>
                        <span style="font-size:10px; font-weight:800; font-family: monospace; color: ${
                          isLatest ? 'var(--text)' : 'var(--muted)'
                        };">${new Date(s.date).toLocaleDateString([], {
                          weekday: 'short',
                        })}</span>
                      </div>
                    </div>`;
                })
                .join('')}
            </div>`
      }
    </div>

    <div style="display: grid; grid-template-columns: 3fr 2fr; gap: var(--space-xl);">
      <!-- Activity Logs -->
      <section>
        <div class="section-label">Recent Network Blocks</div>
        <div style="display:flex; flex-direction:column; gap: var(--space-sm); margin-top: 16px;">
          ${_renderLogsList(isConfigured, blockedLogs as any[])}
        </div>
      </section>

      <section>
        <div class="section-label">Most Blocked Targets</div>
        <div style="display:flex; flex-direction:column; gap: var(--space-sm); margin-top: 16px;">
          ${_renderTopBlocked(isConfigured, topBlocked as any[])}
        </div>
      </section>
    </div>
  `;
}

function _renderLogsList(isConfigured: boolean, blockedLogs: any[]): string {
  if (!isConfigured) {
    return `
      <div class="glass-card" style="padding: var(--space-xl); text-align:center; border-style: dashed; opacity: 0.8;">
        <div style="font-size:24px; margin-bottom:16px;">🔒</div>
        <div style="font-size:12px; font-weight:800; color:var(--text); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Advanced Inspection Locked</div>
        <div style="font-size:11px; color:var(--muted); line-height:1.6; max-width:280px; margin:0 auto;">Link your <strong>NextDNS Profile</strong> in Settings to enable deep-packet analysis and cloud-level threat detection.</div>
        <button class="btn-premium" style="margin-top: 20px; background: transparent; border: 1px solid var(--glass-border); box-shadow: none;" onclick="window.location.hash='#settings'">OPEN SETTINGS</button>
      </div>`;
  }
  if (blockedLogs.length === 0) {
    return `<div class="glass-card" style="padding: var(--space-xl); text-align:center; color:var(--muted);">
      <div style="font-size:20px; margin-bottom:12px; opacity:0.4;">🛡️</div>
      <div style="font-size:11px; font-weight:800; text-transform:uppercase;">No network threats detected recently</div>
    </div>`;
  }
  return blockedLogs
    .map((log: any) => {
      const iconUrl =
        getSmartIcon(log.domain) ||
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
          log.domain,
        )}&sz=64`;
      return `
        <div class="glass-card" style="display:flex; align-items:center; gap:16px; padding:16px; border-radius:16px;">
          <div style="width:40px; height:40px; border-radius:10px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; border:1px solid var(--glass-border); flex-shrink:0;">
            <img src="${iconUrl}" style="width:20px; height:20px; object-fit:contain;">
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:800; font-size:13px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${
              log.domain
            }</div>
            <div style="font-size:10px; color:var(--red); font-weight:700; margin-top:2px; text-transform:uppercase; letter-spacing:0.5px;">${
              log.reasons?.[0]?.name || 'INTERCEPTED'
            }</div>
          </div>
          <div style="font-size:10px; color:var(--muted); font-weight:800; font-family:monospace;">${_formatTimeAgo(
            log.timestamp,
          )}</div>
        </div>`;
    })
    .join('');
}

function _renderTopBlocked(isConfigured: boolean, topBlocked: any[]): string {
  if (!isConfigured) {
    return `<div class="glass-card" style="padding: var(--space-xl); text-align:center; border-style:dashed; opacity:0.8;">
      <div style="font-size:11px; font-weight:800; color:var(--muted); text-transform:uppercase;">Analytics Suspended</div>
    </div>`;
  }
  if (topBlocked.length === 0) {
    return `<div class="glass-card" style="padding: var(--space-xl); text-align:center; color:var(--muted);">
      <div style="font-size:11px; font-weight:800; text-transform:uppercase;">Compiling stats...</div>
    </div>`;
  }
  return topBlocked
    .map((item: any) => {
      const iconUrl =
        getSmartIcon(item.name) ||
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
          item.name,
        )}&sz=64`;
      return `
        <div class="glass-card" style="display:flex; align-items:center; gap:16px; padding:16px;">
          <div style="width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center; border:1px solid var(--glass-border);">
            <img src="${iconUrl}" style="width:18px; height:18px; object-fit:contain;">
          </div>
          <div style="flex:1;">
            <div style="font-weight:800; font-size:13px;">${
              item.name || 'Unknown'
            }</div>
            <div style="font-size:10px; color:var(--accent); font-weight:800; margin-top:2px;">${
              item.count
            } INTERCEPTS</div>
          </div>
        </div>`;
    })
    .join('');
}

// ─── Popup View ───────────────────────────────────────────────────────────────

async function _renderPopup(container: HTMLElement): Promise<void> {
  const isConfigured = await nextDNSApi.isConfigured();
  const { usage = {} } = await chrome.storage.local.get(['usage']);
  const allTotalMs = Object.values(usage).reduce(
    (a: number, b: any) => a + (b.time || 0),
    0,
  ) as number;
  const focusGoalMs = 120 * 60000;
  const focusPercent = Math.min(
    100,
    Math.round((allTotalMs / focusGoalMs) * 100),
  );

  let topBlocked: any[] = [];
  if (isConfigured) {
    try {
      const domainsRes = await nextDNSApi.getTopBlockedDomains(3);
      topBlocked = (domainsRes as any).ok ? (domainsRes as any).data : [];
    } catch (e) {
      console.warn(e);
    }
  }

  container.innerHTML = `
    <div class="widget-grid" style="grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <div class="glass-card widget-card" style="padding: 12px; text-align:center;">
        <div class="widget-title" style="font-size: 10px;">AVERAGE</div>
        <div style="font-size:16px; font-weight:800; margin-top:8px;">${fmtTime(
          allTotalMs as number,
        )}</div>
      </div>
      <div class="glass-card widget-card" style="padding: 12px; text-align:center;">
        <div class="widget-title" style="font-size: 10px;">GOAL</div>
        <div style="font-size:16px; font-weight:800; color:var(--accent); margin-top:8px;">${focusPercent}%</div>
      </div>
    </div>

    <div class="section-label" style="font-size: 10px; margin-bottom: 12px;">TOP BLOCKS</div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${
        topBlocked.length === 0
          ? '<div class="empty-state" style="padding:20px; font-size:11px;">No network threats today</div>'
          : topBlocked
              .map(
                (d) => `
              <div class="rule-item" style="padding: 10px 14px; border-radius: 12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <img src="${getSmartIcon(
                    d.domain,
                  )}" class="app-icon" style="width:20px; height:20px;">
                  <div style="font-size:11px; font-weight:800;">${
                    d.domain
                  }</div>
                </div>
                <div style="font-size:10px; font-weight:900; color:var(--red);">${
                  d.queries
                }</div>
              </div>`,
              )
              .join('')
      }
    </div>
    <button class="btn-premium" id="btn_full_insights" style="width:100%; margin-top:16px; font-size:11px; padding:10px; background:rgba(255,255,255,0.02); color:var(--text); box-shadow:none;">VIEW FULL ANALYTICS</button>
  `;

  container
    .querySelector('#btn_full_insights')
    ?.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL(buildDashboardTabPath('insights')),
      });
    });
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function _formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) {
    return 'NOW';
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}M`;
  }
  return `${Math.floor(diff / 3600000)}H`;
}
