import {
  getAppIconUrl as getSmartIcon,
  fmtTime,
  buildDashboardTabPath,
} from '@focusgate/core';
import { nextDNSApi } from '../../background/platformAdapter';

declare var chrome: any;

const iconActivity =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
const iconShield =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
const iconZap =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';

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
    container.innerHTML = `
      <div class="fg-flex fg-flex-col fg-items-center fg-justify-center fg-py-20 fg-animate-pulse">
        <div class="loader fg-mb-4"></div>
        <div class="fg-text-xs fg-font-bold fg-text-[var(--fg-text)] fg-opacity-80 fg-uppercase fg-tracking-widest">Compiling network intelligence...</div>
      </div>
    `;
  }

  try {
    if (context === 'popup') {
      await _renderPopup(container);
    } else {
      await _renderPage(container);
    }
  } catch (e: any) {
    container.innerHTML = `
      <div class="app-card fg-text-center fg-py-20">
        <div class="fg-text-[var(--red)] fg-mb-4"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <div class="fg-text-sm fg-font-black fg-mb-2">Analysis Interrupted</div>
        <div class="fg-text-xs fg-text-[var(--muted)]">${e.message}</div>
      </div>
    `;
  }
}

async function _renderPage(container: HTMLElement): Promise<void> {
  const { loadInsightsData } = await import(
    '../../../../packages/viewmodels/src/useInsightsVM'
  );
  const data = (await loadInsightsData()) || {};

  const {
    isConfigured = false,
    snapshots = [],
    blockedLogs = [],
    topBlocked = [],
    avgFocusTime = 0,
    totalQueries = 0,
    blockedQueries = 0,
    protectionRate = 0,
  } = data as any;

  const weeklySnapshots = [...(snapshots as any[])].slice(-7);
  const weeklyMaxMins = Math.max(
    1,
    ...weeklySnapshots.map((s: any) => s.screenTimeMinutes || 0),
  );

  container.innerHTML = `
    <div class="insights-shell fg-animate-in fg-fade-in fg-duration-500">
      <!-- Hero Stat Cards -->
      <div class="fg-grid fg-grid-cols-3 fg-gap-4 fg-mb-8">
        <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden">
          <div class="fg-flex fg-items-center fg-gap-2 fg-mb-2">
            <span class="fg-text-[var(--accent)]">${iconActivity}</span>
            <span class="field-label" style="margin: 0;">Total Activity</span>
          </div>
          <div class="fg-text-2xl fg-font-black fg-text-[var(--fg-text)]">${totalQueries.toLocaleString()}</div>
          <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-60 fg-mt-1 fg-uppercase fg-font-bold fg-tracking-wider">All Requests</div>
        </div>

        <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden">
          <div class="fg-flex fg-items-center fg-gap-2 fg-mb-2">
            <span class="fg-text-[var(--green)]">${iconShield}</span>
            <span class="field-label" style="margin: 0;">Safety Score</span>
          </div>
          <div class="fg-text-2xl fg-font-black fg-text-[var(--green)]">${protectionRate}%</div>
          <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-60 fg-mt-1 fg-uppercase fg-font-bold fg-tracking-wider">Shield Efficiency</div>
        </div>

        <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden">
          <div class="fg-flex fg-items-center fg-gap-2 fg-mb-2">
            <span class="fg-text-[var(--yellow)]">${iconZap}</span>
            <span class="field-label" style="margin: 0;">Daily Focus</span>
          </div>
          <div class="fg-text-2xl fg-font-black fg-text-[var(--fg-text)]">${avgFocusTime}m</div>
          <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-60 fg-mt-1 fg-uppercase fg-font-bold fg-tracking-wider">Average Deep Work</div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="fg-grid fg-grid-cols-2 fg-gap-8 fg-mb-10">
        <!-- Focus Trend -->
        <div class="glass-card fg-p-8">
          <div class="fg-flex fg-justify-between fg-items-center fg-mb-8">
            <div class="section-label" style="margin: 0;">Focus Trends</div>
            <div class="fg-text-[11px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-60 fg-uppercase">Weekly History</div>
          </div>
          ${_renderFocusChart(weeklySnapshots, weeklyMaxMins)}
        </div>

        <!-- Network Mix -->
        <div class="glass-card fg-p-8 fg-flex fg-flex-col">
          <div class="fg-flex fg-justify-between fg-items-center fg-mb-8">
            <div class="section-label" style="margin: 0;">Activity Breakdown</div>
            <div class="fg-text-[11px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-60 fg-uppercase">Traffic Mix</div>
          </div>
          <div class="fg-flex-1 fg-flex fg-flex-col fg-justify-center">
             <div class="fg-flex fg-justify-between fg-mb-3">
                <span class="fg-text-[11px] fg-font-bold">Blocked Activity</span>
                <span class="fg-text-[11px] fg-font-black fg-text-[var(--green)]">${blockedQueries.toLocaleString()}</span>
             </div>
             <div class="fg-h-3 fg-rounded-full fg-mb-8 fg-relative fg-overflow-hidden" style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);">
                <div class="fg-absolute fg-h-full fg-bg-[var(--green)] fg-rounded-full" style="width: ${protectionRate}%; transition: width 1s ease;"></div>
             </div>
             <div class="fg-grid fg-grid-cols-2 fg-gap-4">
                <div class="fg-p-4 fg-rounded-2xl" style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);">
                   <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-60 fg-uppercase fg-font-bold fg-mb-1">Efficiency</div>
                   <div class="fg-text-lg fg-font-black">${protectionRate}%</div>
                </div>
                <div class="fg-p-4 fg-rounded-2xl" style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);">
                   <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-60 fg-uppercase fg-font-bold fg-mb-1">Status</div>
                   <div class="fg-text-lg fg-font-black fg-text-[var(--green)]">ACTIVE</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <!-- Detail Sections -->
      <div class="fg-grid fg-gap-10" style="grid-template-columns: 2fr 3fr;">
        <!-- Top Obstacles -->
        <section>
          <div class="fg-flex fg-items-center fg-gap-3 fg-mb-6">
            <div class="fg-w-8 fg-h-8 fg-rounded-xl fg-bg-[var(--red)]/10 fg-flex fg-items-center fg-justify-center fg-text-[var(--red)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </div>
            <div class="section-label" style="margin: 0;">Most Blocked Targets</div>
          </div>
          <div class="fg-flex fg-flex-col fg-gap-3">
            ${_renderTopBlocked(isConfigured, topBlocked as any[])}
          </div>
        </section>

        <!-- Live Intelligence Feed -->
        <section>
          <div class="fg-flex fg-items-center fg-justify-between fg-mb-6">
            <div class="fg-flex fg-items-center fg-gap-3">
              <div class="fg-w-8 fg-h-8 fg-rounded-xl fg-bg-[var(--accent)]/10 fg-flex fg-items-center fg-justify-center fg-text-[var(--accent)]">
                ${iconActivity}
              </div>
              <div class="section-label" style="margin: 0;">Live Activity Log</div>
            </div>
            <div class="fg-flex fg-items-center fg-gap-2 fg-text-[11px] fg-font-bold fg-text-[var(--green)] fg-uppercase fg-tracking-widest">
              <span class="fg-w-1.5 fg-h-1.5 fg-bg-[var(--green)] fg-rounded-full fg-animate-pulse"></span> Live Monitoring
            </div>
          </div>
          <div class="fg-flex fg-flex-col fg-gap-2">
            ${_renderLogsList(isConfigured, blockedLogs as any[])}
          </div>
        </section>
      </div>
    </div>
  `;
}

function _renderFocusChart(
  weeklySnapshots: any[],
  weeklyMaxMins: number,
): string {
  if (weeklySnapshots.length === 0) {
    return `
      <div class="fg-flex fg-flex-col fg-items-center fg-justify-center fg-rounded-3xl fg-text-[var(--muted)] fg-text-xs fg-p-10" style="height: 180px; border: 1px dashed var(--fg-glass-border); background: var(--fg-glass-bg);">
        <div class="fg-mb-3"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-6M9 20v-10M12 20v-14M15 20v-8M18 20v-4"/></svg></div>
        No focus history yet. Start a session to build the report.
      </div>`;
  }

  return `
    <div class="bar-chart fg-flex fg-items-end fg-gap-4" style="height: 180px;">
      ${weeklySnapshots
        .map((s: any, i: number) => {
          const height = Math.max(
            8,
            ((s.screenTimeMinutes || 0) / weeklyMaxMins) * 100,
          );
          const isLatest = i === weeklySnapshots.length - 1;
          return `
            <div class="bar-col fg-flex-1 fg-flex fg-flex-col fg-justify-end fg-items-center fg-gap-3" style="height: 100%;">
              <div class="bar-track fg-w-full fg-flex-1 fg-rounded-xl fg-relative fg-overflow-hidden" style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);">
                <div class="bar-fill fg-w-full fg-absolute fg-transition-all fg-duration-1000" style="height: ${height}%; bottom: 0; background: ${
            isLatest ? 'var(--accent)' : 'var(--fg-muted)'
          }; opacity: ${isLatest ? '1' : '0.2'}; border-radius: 8px;"></div>
              </div>
              <div class="fg-flex fg-flex-col fg-items-center">
                <span class="fg-text-[11px] fg-font-extrabold fg-mb-[2px] ${
                  isLatest
                    ? 'fg-text-[var(--fg-text)]'
                    : 'fg-text-[var(--fg-text)] fg-opacity-60'
                }">${s.screenTimeMinutes || 0}m</span>
                <span class="fg-text-[10px] fg-font-bold fg-uppercase fg-tracking-wider" style="color: var(--fg-text); opacity: 0.5;">${new Date(
                  s.date,
                ).toLocaleDateString([], { weekday: 'short' })}</span>
              </div>
            </div>`;
        })
        .join('')}
    </div>`;
}

function _renderLogsList(isConfigured: boolean, blockedLogs: any[]): string {
  if (!isConfigured) {
    return `
      <div class="glass-card fg-p-10 fg-text-center fg-opacity-90" style="border: 1px dashed var(--fg-glass-border); background: var(--fg-glass-bg);">
        <div class="fg-mb-4 fg-text-[var(--fg-text)] fg-opacity-50 fg-flex fg-justify-center">${iconShield}</div>
        <div class="fg-text-xs fg-font-extrabold fg-text-[var(--fg-text)] fg-uppercase fg-tracking-wider fg-mb-2">Advanced Protection Locked</div>
        <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-60 fg-leading-relaxed fg-max-w-[280px] fg-mx-auto">Connect your NextDNS Profile in Settings to enable deep traffic analysis.</div>
      </div>`;
  }
  if (blockedLogs.length === 0) {
    return `<div class="glass-card fg-p-8 fg-text-center fg-text-[var(--fg-text)] fg-opacity-60">
      <div class="fg-text-[11px] fg-font-bold fg-uppercase fg-tracking-widest">No recent traffic blocked</div>
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
        <div class="glass-card fg-flex fg-items-center fg-gap-4 fg-p-4 fg-rounded-2xl fg-transition-transform fg-duration-200 hover:fg-translate-x-1">
          <div class="fg-shrink-0 fg-flex fg-items-center fg-justify-center fg-rounded-xl" style="width: 44px; height: 44px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);">
            <img src="${iconUrl}" style="width: 20px; height: 20px; object-fit: contain;" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${
        log.domain
      }'">
          </div>
          <div class="fg-flex-1 fg-min-w-0">
            <div class="fg-font-black fg-text-[13px] fg-text-[var(--fg-text)] fg-truncate">${
              log.domain
            }</div>
            <div class="fg-flex fg-items-center fg-gap-2 fg-mt-1">
              <span class="fg-text-[11px] fg-px-2 fg-py-0.5 fg-rounded-full fg-bg-[var(--red)]/10 fg-text-[var(--red)] fg-font-black fg-uppercase fg-tracking-wider">BLOCKED</span>
              <span class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-60 fg-font-bold">${
                log.reasons?.[0]?.name || 'NextDNS Firewall'
              }</span>
            </div>
          </div>
          <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-font-black fg-opacity-80" style="font-family: monospace;">${_formatTimeAgo(
            log.timestamp,
          )}</div>
        </div>`;
    })
    .join('');
}

function _renderTopBlocked(isConfigured: boolean, topBlocked: any[]): string {
  if (!isConfigured || topBlocked.length === 0) {
    return `<div class="glass-card fg-p-8 fg-text-center fg-text-[var(--fg-text)] fg-opacity-60">
      <div class="fg-text-[11px] fg-font-bold fg-uppercase">Awaiting stats...</div>
    </div>`;
  }
  return topBlocked
    .map((item: any) => {
      const label = item.domain || item.id || item.name || 'Unknown Target';
      const iconUrl =
        getSmartIcon(label) ||
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
          label,
        )}&sz=64`;
      return `
        <div class="glass-card fg-flex fg-items-center fg-gap-4 fg-p-4 fg-rounded-2xl">
          <div class="fg-shrink-0 fg-flex fg-items-center fg-justify-center fg-rounded-xl" style="width: 40px; height: 40px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);">
            <img src="${iconUrl}" style="width: 18px; height: 18px; object-fit: contain;" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${label}'">
          </div>
          <div class="fg-flex-1">
            <div class="fg-font-black fg-text-[13px] fg-truncate fg-max-w-[120px]">${label}</div>
            <div class="fg-text-[11px] fg-font-black fg-mt-1 fg-text-[var(--accent)] fg-uppercase fg-tracking-wide">${
              item.queries
            } Blocks</div>
          </div>
          <div class="fg-shrink-0">
             <div class="fg-h-1 fg-w-12 fg-bg-[var(--fg-glass-bg)] fg-rounded-full fg-relative">
                <div class="fg-absolute fg-h-full fg-bg-[var(--accent)] fg-rounded-full" style="width: ${Math.min(
                  100,
                  (item.queries / topBlocked[0].queries) * 100,
                )}%;"></div>
             </div>
          </div>
        </div>`;
    })
    .join('');
}

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
    <div class="insights-shell fg-animate-in fg-fade-in fg-duration-300">
      <div class="fg-grid fg-grid-cols-2 fg-gap-3 fg-mb-5">
        <div class="glass-card fg-p-3 fg-text-center">
          <div class="widget-title" style="font-size: 9px; opacity: 0.6;">AVERAGE</div>
          <div class="fg-text-sm fg-font-black fg-mt-1">${fmtTime(
            allTotalMs as number,
          )}</div>
        </div>
        <div class="glass-card fg-p-3 fg-text-center">
          <div class="widget-title" style="font-size: 9px; opacity: 0.6;">GOAL</div>
          <div class="fg-text-sm fg-font-black fg-text-[var(--accent)] fg-mt-1">${focusPercent}%</div>
        </div>
      </div>

      <div class="fg-flex fg-items-center fg-justify-between fg-mb-4">
        <div class="fg-text-[11px] fg-font-black fg-text-[var(--fg-text)] fg-opacity-60 fg-uppercase fg-tracking-widest">Most Blocked</div>
        <div class="fg-text-[10px] fg-font-bold fg-text-[var(--green)] fg-uppercase">Healthy</div>
      </div>
      <div class="fg-flex fg-flex-col fg-gap-2">
        ${
          topBlocked.length === 0
            ? '<div class="glass-card fg-p-8 fg-text-center fg-text-[10px] fg-text-[var(--muted)]">No obstacles detected</div>'
            : topBlocked
                .map((d) => {
                  const label = d.domain || d.id || d.name || 'Unknown Target';
                  return `
                <div class="glass-card fg-flex fg-items-center fg-justify-between fg-py-3 fg-px-4 fg-rounded-xl">
                  <div class="fg-flex fg-items-center fg-gap-3 fg-min-w-0">
                    <img src="${getSmartIcon(
                      label,
                    )}" class="fg-w-5 fg-h-5 fg-object-contain">
                    <div class="fg-text-[11px] fg-font-black fg-truncate">${label}</div>
                  </div>
                  <div class="fg-text-[11px] fg-font-black fg-text-[var(--red)]">${
                    d.queries
                  }</div>
                </div>`;
                })
                .join('')
        }
      </div>
      <button class="btn fg-w-full fg-mt-4 fg-text-[11px] fg-font-black fg-py-3" id="btn_full_insights" style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); color: var(--fg-text);">VIEW FULL DASHBOARD</button>
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

function _formatTimeAgo(ts: string | number): string {
  const time = typeof ts === 'string' ? new Date(ts).getTime() : ts;
  const diff = Date.now() - time;
  if (diff < 60000) {
    return 'NOW';
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}M`;
  }
  return `${Math.floor(diff / 3600000)}H`;
}
