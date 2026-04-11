import {
  getAppIconUrl as getSmartIcon,
  fmtTime,
  buildDashboardTabPath,
  getRootDomain,
} from '@focusgate/core';
import { nextDNSApi } from '../../background/platformAdapter';
import { appsController } from '../../lib/appsController';
import { getCachedIcon, saveIconToCache } from '../../lib/iconCache';

declare var chrome: any;

const iconActivity =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
const iconShield =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
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
    totalQueries = 0,
    blockedQueries = 0,
    protectionRate = 0,
  } = data as any;

  // Build local icon lookup for instant render
  const iconLookup: Record<string, string> = {};
  for (const log of blockedLogs) {
    if (log.domain) {
      iconLookup[log.domain] = (await getCachedIcon(log.domain)) || '';
    }
  }
  for (const item of topBlocked) {
    if (item.domain || item.id) {
      iconLookup[item.domain || item.id] =
        (await getCachedIcon(item.domain || item.id)) || '';
    }
  }

  const weeklySnapshots = [...(snapshots as any[])].slice(-7);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const weeklyMaxMins = Math.max(
    1,
    ...weeklySnapshots.map((s: any) => s.screenTimeMinutes || 0),
  );

  container.innerHTML = `
    <div class="insights-shell fg-animate-in fg-fade-in fg-duration-500">
      ${!isConfigured ? _renderLocalModeBanner() : ''}
      
      <!-- Normalized Hero Stat Deck -->
      <div class="fg-grid fg-grid-cols-3 fg-gap-4 fg-mb-10">
        <!-- Total Traffic -->
        <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden">
          <div class="fg-flex fg-items-center fg-gap-2 fg-mb-3">
            <span class="fg-text-[var(--accent)]">${iconActivity}</span>
            <span class="fg-text-[10px] fg-font-bold fg-uppercase fg-tracking-widest fg-text-[var(--fg-text)] fg-opacity-40">Total Activity</span>
          </div>
          <div class="fg-text-2xl fg-font-black fg-text-[var(--fg-text)]">${totalQueries.toLocaleString()}</div>
          <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-50 fg-mt-1 fg-font-bold fg-uppercase fg-tracking-wider">All Requests</div>
        </div>

        <!-- Blocked Intelligence -->
        <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden">
          <div class="fg-flex fg-items-center fg-justify-between fg-mb-3">
            <div class="fg-flex fg-items-center fg-gap-2">
              <span class="fg-text-[var(--red)]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></span>
              <span class="fg-text-[10px] fg-font-bold fg-uppercase fg-tracking-widest fg-text-[var(--fg-text)] fg-opacity-40">Blocked Activity</span>
            </div>
            <span class="fg-text-[8px] fg-font-black fg-bg-[var(--green)]/10 fg-text-[var(--green)] fg-px-2 fg-py-0.5 fg-rounded-md">ACTIVE</span>
          </div>
          <div class="fg-text-2xl fg-font-black fg-text-[var(--fg-text)]">${blockedQueries.toLocaleString()}</div>
          <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-50 fg-mt-1 fg-font-bold fg-uppercase fg-tracking-wider">Shielded Hits</div>
        </div>

        <!-- Safety Performance -->
        <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden">
          <div class="fg-flex fg-items-center fg-gap-2 fg-mb-3">
            <span class="fg-text-[var(--green)]">${iconShield}</span>
            <span class="fg-text-[10px] fg-font-bold fg-uppercase fg-tracking-widest fg-text-[var(--fg-text)] fg-opacity-40">Safety Score</span>
          </div>
          <div class="fg-text-2xl fg-font-black fg-text-[var(--green)]">${protectionRate}%</div>
          <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-opacity-50 fg-mt-1 fg-font-bold fg-uppercase fg-tracking-wider">Shield Efficiency</div>
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
            ${_renderTopBlocked(isConfigured, topBlocked as any[], iconLookup)}
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
            ${_renderLogsList(isConfigured, blockedLogs as any[], iconLookup)}
          </div>
        </section>
      </div>
    </div>
  `;

  if (!isConfigured) {
    container
      .querySelector('#btn_upgrade_cloud_insights')
      ?.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(buildDashboardTabPath('settings')),
        });
      });
  }
  container.querySelectorAll('.block-log-domain').forEach((button) => {
    button.addEventListener('click', async () => {
      const domain = (button as HTMLButtonElement).dataset.domain;
      if (!domain) {
        return;
      }
      const result = await appsController.addDomainRule(domain);
      if (result.ok) {
        await _renderPage(container);
      }
    });
  });

  _wireInsightsIcons(container);
}

function _wireInsightsIcons(container: HTMLElement) {
  container.querySelectorAll('.insights-logo-container').forEach((wrapper) => {
    const img = wrapper.querySelector('img');
    const fallback = wrapper.querySelector('.logo-fallback') as HTMLElement;
    if (!img || !fallback || img.dataset.fgBound === 'true') {
      return;
    }

    img.dataset.fgBound = 'true';

    img.addEventListener('load', () => {
      // Check if image is valid (not a 1x1 or empty)
      if (img.naturalWidth > 1) {
        img.style.opacity = '1';
        fallback.style.opacity = '0';

        // Save to cache
        if (img.dataset.domain) {
          saveIconToCache(img.dataset.domain, img.src);
        }
      } else {
        img.dispatchEvent(new Event('error'));
      }
    });

    img.addEventListener('error', () => {
      const currentUrl = img.src;
      const domain = img.dataset.domain;

      // If Clearbit fails, try Google as last resort
      if (currentUrl.includes('logo.clearbit.com') && domain) {
        img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
          domain,
        )}&sz=128`;
      } else {
        img.style.display = 'none';
        fallback.style.opacity = '1';
      }
    });

    // Handle cached images
    if (img.complete && img.naturalHeight > 1) {
      img.style.opacity = '1';
      fallback.style.opacity = '0';
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

function _renderLogsList(
  isConfigured: boolean,
  blockedLogs: any[],
  iconLookup: Record<string, string> = {},
): string {
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
      const label = log.domain;
      const rootDomain = getRootDomain(label);
      const cached = iconLookup[label];

      // Use cached URL if available, otherwise primary fallback loop
      const primaryIconUrl =
        cached || `https://logo.clearbit.com/${rootDomain}`;

      return `
        <div class="glass-card fg-flex fg-items-center fg-gap-5 fg-p-4 fg-rounded-2xl fg-transition-transform fg-duration-200 hover:fg-translate-x-1">
          <div class="insights-logo-container fg-shrink-0 fg-relative fg-flex fg-items-center fg-justify-center" style="width: 32px; height: 32px;">
            <div class="logo-fallback fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[10px] fg-font-black fg-text-[var(--muted)] fg-transition-opacity" style="opacity: ${
              cached ? 0 : 1
            }">
              ${label.slice(0, 2).toUpperCase()}
            </div>
            <img src="${primaryIconUrl}" data-domain="${rootDomain}"
                 style="width: 32px; height: 32px; object-fit: contain; opacity: ${
                   cached ? 1 : 0
                 }; z-index: 2; position: relative;" 
                 class="fg-transition-opacity">
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
          <div class="fg-flex fg-items-center fg-gap-2 fg-shrink-0">
            <button class="block-log-domain fg-flex fg-h-8 fg-w-8 fg-items-center fg-justify-center fg-rounded-full fg-bg-[var(--fg-accent-soft)] fg-text-[var(--fg-accent)]" data-domain="${
              log.domain
            }" title="Block ${log.domain}">
              +
            </button>
            <div class="fg-text-[11px] fg-text-[var(--fg-text)] fg-font-black" style="font-family: monospace;">${_formatTimeAgo(
              log.timestamp,
            )}</div>
          </div>
        </div>`;
    })
    .join('');
}

function _renderTopBlocked(
  isConfigured: boolean,
  topBlocked: any[],
  iconLookup: Record<string, string> = {},
): string {
  if (!isConfigured || topBlocked.length === 0) {
    return `<div class="glass-card fg-p-8 fg-text-center fg-text-[var(--fg-text)] fg-opacity-60">
      <div class="fg-text-[11px] fg-font-bold fg-uppercase">Awaiting stats...</div>
    </div>`;
  }
  return topBlocked
    .map((item: any) => {
      const label = item.domain || item.id || item.name || 'Unknown Target';
      const rootDomain = getRootDomain(label);
      const cached = iconLookup[label];
      const primaryIconUrl =
        cached || `https://logo.clearbit.com/${rootDomain}`;

      return `
        <div class="glass-card fg-flex fg-items-center fg-gap-4 fg-p-4 fg-rounded-2xl">
          <div class="insights-logo-container fg-shrink-0 fg-relative fg-flex fg-items-center fg-justify-center" style="width: 28px; height: 28px;">
            <div class="logo-fallback fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[8px] fg-font-black fg-text-[var(--muted)] fg-transition-opacity" style="opacity: ${
              cached ? 0 : 1
            }">
              ${label.slice(0, 2).toUpperCase()}
            </div>
            <img src="${primaryIconUrl}" data-domain="${rootDomain}"
                 style="width: 28px; height: 28px; object-fit: contain; opacity: ${
                   cached ? 1 : 0
                 }; z-index: 2; position: relative;" 
                 class="fg-transition-opacity">
          </div>
          <div class="fg-flex-1 fg-min-w-0">
            <div class="fg-font-black fg-text-[13px] fg-text-[var(--fg-text)] fg-truncate">${label}</div>
            <div class="fg-text-[11px] fg-font-black fg-mt-1 fg-text-[var(--fg-text)] fg-opacity-50 fg-uppercase fg-tracking-wide">${
              item.queries
            } Blocks</div>
          </div>
          <div class="fg-shrink-0 fg-text-right fg-min-w-[50px]">
             <div class="fg-text-[12px] fg-font-black fg-text-[var(--accent)]">${Math.round(
               (item.queries / topBlocked[0].queries) * 100,
             )}%</div>
             <div class="fg-text-[8px] fg-font-black fg-text-[var(--fg-text)] fg-opacity-30 fg-uppercase fg-tracking-tighter">INTENSITY</div>
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

function _renderLocalModeBanner(): string {
  return `
    <div class="glass-card fg-mb-8 fg-p-8 fg-flex fg-items-center fg-justify-between" style="border-color: var(--fg-accent); background: rgba(59, 130, 246, 0.05);">
      <div class="fg-flex fg-items-center fg-gap-5">
        <div class="fg-w-12 fg-h-12 fg-rounded-2xl fg-bg-[var(--fg-accent)]/10 fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-accent)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div>
          <div class="fg-text-lg fg-font-black fg-text-white">Cloud Logic Inactive</div>
          <div class="fg-text-sm fg-text-[var(--fg-text)] fg-opacity-70 fg-mt-1">Deep network intelligence and threat monitoring requires a cloud connection. Activate to see your full history.</div>
        </div>
      </div>
      <button class="btn-premium fg-px-8" id="btn_upgrade_cloud_insights" style="background: var(--fg-accent); color: #fff; font-weight: 900;">
        Activate Cloud
      </button>
    </div>
  `;
}
