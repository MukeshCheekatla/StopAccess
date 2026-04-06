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

  // Prevent blinking by only showing loader if container is empty
  const isInternalUpdate = container.querySelector('.insights-shell');
  if (!isInternalUpdate) {
    container.innerHTML = '<div class="loader">Analyzing engine logs...</div>';
  }

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
    <div class="insights-shell">
      <div class="fg-grid fg-grid-cols-3 fg-gap-4 fg-mb-8">
        <div class="glass-card fg-p-6">
          <div class="field-label">Tracked Days</div>
          <div class="fg-text-lg fg-font-extrabold fg-text-[var(--text)] fg-mt-1">${
            snapshots.length
          }</div>
        </div>
        <div class="glass-card fg-p-6">
          <div class="field-label">Average Focus Time</div>
          <div class="fg-text-lg fg-font-extrabold fg-text-[var(--text)] fg-mt-1">${avgFocusTime}m / day</div>
        </div>
        <div class="glass-card fg-p-6">
          <div class="field-label">Days With Focus</div>
          <div class="fg-text-lg fg-font-extrabold fg-text-[var(--text)] fg-mt-1">${focusConsistency}% consistency</div>
        </div>
      </div>

      <div class="glass-card fg-mb-8 fg-p-8">
        <div class="fg-flex fg-justify-between fg-items-center fg-mb-8">
          <div>
            <div class="section-label" style="margin: 0;">Last 7 Days Focus Minutes</div>
            <div class="fg-text-[11px] fg-text-[var(--muted)] fg-mt-1">${activeDays} of ${Math.max(
    weeklySnapshots.length,
    1,
  )} tracked days had focus activity.</div>
          </div>
          <div class="fg-text-xs fg-text-[var(--text)] fg-font-extrabold">${avgFocusTime}m avg</div>
        </div>
        ${
          weeklySnapshots.length === 0
            ? `<div class="fg-flex fg-items-center fg-justify-center fg-rounded-2xl fg-text-[var(--muted)] fg-text-xs" style="height: 160px; border: 1px dashed var(--glass-border);">
                No focus history yet. Start a session to build the weekly report.
              </div>`
            : `<div class="bar-chart fg-flex fg-items-end fg-gap-4 fg-mt-4" style="height: 140px;">
                ${weeklySnapshots
                  .map((s: any, i: number) => {
                    const height = Math.max(
                      8,
                      ((s.screenTimeMinutes || 0) / weeklyMaxMins) * 100,
                    );
                    const isLatest = i === weeklySnapshots.length - 1;
                    return `
                      <div class="bar-col fg-flex-1 fg-flex fg-flex-col fg-justify-end fg-items-center fg-gap-3" style="height: 100%;">
                        <div class="bar-track fg-w-full fg-flex-1 fg-rounded-[6px] fg-relative fg-overflow-hidden" style="background: rgba(255,255,255,0.02);">
                          <div class="bar-fill fg-w-full fg-absolute" style="height: ${height}%; bottom: 0; background: ${
                      isLatest ? 'var(--accent)' : 'rgba(161,161,170,0.18)'
                    }; border-radius: 6px; transition: height 0.6s cubic-bezier(0.4,0,0.2,1);"></div>
                        </div>
                        <div class="fg-flex fg-flex-col fg-items-center fg-gap-1">
                          <span class="fg-text-[11px] fg-font-extrabold" style="color: ${
                            isLatest ? 'var(--text)' : 'var(--muted)'
                          };">${s.screenTimeMinutes || 0}m</span>
                          <span class="fg-text-[10px] fg-font-extrabold" style="font-family: monospace; color: ${
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

      <div class="fg-grid fg-gap-8" style="grid-template-columns: 3fr 2fr;">
        <!-- Activity Logs -->
        <section>
          <div class="section-label">Recent Network Blocks</div>
          <div class="fg-flex fg-flex-col fg-gap-2 fg-mt-4">
            ${_renderLogsList(isConfigured, blockedLogs as any[])}
          </div>
        </section>

        <section>
          <div class="section-label">Most Blocked Targets</div>
          <div class="fg-flex fg-flex-col fg-gap-2 fg-mt-4">
            ${_renderTopBlocked(isConfigured, topBlocked as any[])}
          </div>
        </section>
      </div>
    </div>
  `;
}

function _renderLogsList(isConfigured: boolean, blockedLogs: any[]): string {
  if (!isConfigured) {
    return `
      <div class="glass-card fg-p-8 fg-text-center fg-opacity-80" style="border-style: dashed;">
        <div class="fg-mb-4" style="color:var(--muted); display:flex; justify-content:center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <div class="fg-text-xs fg-font-extrabold fg-text-[var(--text)] fg-uppercase fg-tracking-wide fg-mb-2">Advanced Inspection Locked</div>
        <div class="fg-text-[11px] fg-text-[var(--muted)] fg-leading-relaxed fg-max-w-[280px]" style="margin: 0 auto;">Link your <strong>NextDNS Profile</strong> in Settings to enable deep-packet analysis and cloud-level threat detection.</div>
        <button class="btn-premium fg-mt-5" style="background: transparent; border: 1px solid var(--glass-border); box-shadow: none;" onclick="window.location.hash='#settings'">OPEN SETTINGS</button>
      </div>`;
  }
  if (blockedLogs.length === 0) {
    return `<div class="glass-card fg-p-8 fg-text-center fg-text-[var(--muted)]">
      <div class="fg-mb-3" style="opacity: 0.4; display:flex; justify-content:center;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
      <div class="fg-text-[11px] fg-font-extrabold fg-uppercase">No network threats detected recently</div>
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
        <div class="glass-card fg-flex fg-items-center fg-gap-4 fg-p-4 fg-rounded-2xl">
          <div class="fg-shrink-0 fg-flex fg-items-center fg-justify-center fg-rounded-[10px]" style="width: 40px; height: 40px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);">
            <img src="${iconUrl}" style="width: 20px; height: 20px; object-fit: contain;">
          </div>
          <div class="fg-flex-1 fg-min-w-0">
            <div class="fg-font-extrabold fg-text-[13px] fg-text-[var(--text)] fg-truncate">${
              log.domain
            }</div>
            <div class="fg-text-[10px] fg-text-[var(--red)] fg-font-bold fg-mt-[2px] fg-uppercase fg-tracking-[0.5px]">${
              log.reasons?.[0]?.name || 'BLOCKED'
            }</div>
          </div>
          <div class="fg-text-[10px] fg-text-[var(--muted)] fg-font-extrabold" style="font-family: monospace;">${_formatTimeAgo(
            log.timestamp,
          )}</div>
        </div>`;
    })
    .join('');
}

function _renderTopBlocked(isConfigured: boolean, topBlocked: any[]): string {
  if (!isConfigured) {
    return `<div class="glass-card fg-p-8 fg-text-center fg-opacity-80" style="border-style: dashed;">
      <div class="fg-text-[11px] fg-font-extrabold fg-text-[var(--muted)] fg-uppercase">Analytics Suspended</div>
    </div>`;
  }
  if (topBlocked.length === 0) {
    return `<div class="glass-card fg-p-8 fg-text-center fg-text-[var(--muted)]">
      <div class="fg-text-[11px] fg-font-extrabold fg-uppercase">Compiling stats...</div>
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
        <div class="glass-card fg-flex fg-items-center fg-gap-4 fg-p-4">
          <div class="fg-shrink-0 fg-flex fg-items-center fg-justify-center fg-rounded-lg" style="width: 36px; height: 36px; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);">
            <img src="${iconUrl}" style="width: 18px; height: 18px; object-fit: contain;">
          </div>
          <div class="fg-flex-1">
            <div class="fg-font-extrabold fg-text-[13px]">${
              item.name || 'Unknown'
            }</div>
            <div class="fg-text-[10px] fg-font-extrabold fg-mt-[2px] fg-text-[var(--accent)]">${
              item.count
            } BLOCKS</div>
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
    <div class="insights-shell">
      <div class="widget-grid fg-mb-5" style="grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="glass-card widget-card fg-p-3 fg-text-center">
          <div class="widget-title" style="font-size: 10px;">AVERAGE</div>
          <div class="fg-text-base fg-font-extrabold fg-mt-2">${fmtTime(
            allTotalMs as number,
          )}</div>
        </div>
        <div class="glass-card widget-card fg-p-3 fg-text-center">
          <div class="widget-title" style="font-size: 10px;">GOAL</div>
          <div class="fg-text-base fg-font-extrabold fg-text-[var(--accent)] fg-mt-2">${focusPercent}%</div>
        </div>
      </div>

      <div class="section-label" style="font-size: 10px; margin-bottom: 12px;">TOP BLOCKS</div>
      <div class="fg-flex fg-flex-col fg-gap-2">
        ${
          topBlocked.length === 0
            ? '<div class="empty-state fg-p-5 fg-text-[11px]">No network threats today</div>'
            : topBlocked
                .map(
                  (d) => `
                <div class="rule-item fg-py-[10px] fg-px-[14px] fg-rounded-xl">
                  <div class="fg-flex fg-items-center fg-gap-[10px]">
                    <img src="${getSmartIcon(
                      d.domain,
                    )}" class="app-icon" style="width: 20px; height: 20px;">
                    <div class="fg-text-[11px] fg-font-extrabold">${
                      d.domain
                    }</div>
                  </div>
                  <div class="fg-text-[10px] fg-font-black fg-text-[var(--red)]">${
                    d.queries
                  }</div>
                </div>`,
                )
                .join('')
        }
      </div>
      <button class="btn-premium fg-w-full fg-mt-4 fg-text-[11px] fg-text-[var(--text)]" id="btn_full_insights" style="padding: 10px; background: rgba(255,255,255,0.02); box-shadow: none;">VIEW FULL ANALYTICS</button>
    </div>
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
