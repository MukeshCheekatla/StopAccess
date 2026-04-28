import { fmtTime, buildDashboardTabPath } from '@stopaccess/core';
import { COLORS } from '../../lib/designTokens';
import { nextDNSApi } from '../../background/platformAdapter';
import { appsController } from '../../lib/appsController';
import { getCachedIcon } from '../../lib/iconCache';
import {
  renderCloudBanner,
  renderErrorCard,
  renderLoader,
  renderStatCard,
  UI_TOKENS,
  renderBrandLogo,
  attachGlobalIconListeners,
} from '../../lib/ui';

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
    container.innerHTML = renderLoader(
      'Analyzing denied traffic...',
      'fg-py-20',
    );
  }

  try {
    if (context === 'popup') {
      await _renderPopup(container);
    } else {
      await _renderPage(container);
    }
    attachGlobalIconListeners(container);
  } catch (e: any) {
    container.innerHTML = renderErrorCard(e.message, 'retry_insights');
    container
      .querySelector('#retry_insights')
      ?.addEventListener('click', () => renderInsightsPage(container, context));
  }
}

async function _renderPage(container: HTMLElement): Promise<void> {
  const { loadInsightsData } = await import(
    '../../../../packages/viewmodels/src/useInsightsVM'
  );
  const data = (await loadInsightsData()) || {};

  const {
    isConfigured = false,
    isOffline = false,
    snapshots = [],
    blockedLogs = [],
    topBlocked = [],
    totalQueries = 0,
    blockedQueries = 0,
    protectionRate = 0,
  } = data as any;

  if (isOffline && isConfigured) {
    container.innerHTML = `
      <div class="fg-max-w-[400px] fg-mx-auto fg-mt-24 fg-text-center fg-animate-in fg-fade-in fg-duration-500">
        <div class="fg-w-16 fg-h-16 fg-rounded-2xl fg-bg-[var(--red)]/10 fg-flex fg-items-center fg-justify-center fg-text-[var(--red)] fg-mx-auto fg-mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
        </div>
        <h2 style="${UI_TOKENS.TEXT.HEADING}; margin-bottom: 8px;">You are offline</h2>
        <p style="${UI_TOKENS.TEXT.SUBTEXT}; margin-bottom: 24px;">Cloud Intelligence reports require an active internet connection to sync with NextDNS.</p>
        <button id="retry_insights_offline" class="btn-premium fg-w-full">Try Reconnect</button>
      </div>
    `;
    container
      .querySelector('#retry_insights_offline')
      ?.addEventListener('click', () => renderInsightsPage(container));
    return;
  }

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
        ${renderStatCard(
          'Total Activity',
          iconActivity,
          'var(--accent)',
          totalQueries.toLocaleString(),
          'All Requests',
        )}
        ${renderStatCard(
          'Denied Requests',
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
          'var(--red)',
          blockedQueries.toLocaleString(),
          'Stopped Attempts',
          '<span style="' +
            UI_TOKENS.TEXT.BADGE +
            ' border: 1px solid ${COLORS.green}; padding: 2px 8px; border-radius: 6px; color: ${COLORS.green};">Active</span>',
        )}
        ${renderStatCard(
          'Safety Score',
          iconShield,
          'var(--green)',
          `<span style="color: ${COLORS.green};">${protectionRate}%</span>`,
          'Shield Efficiency',
        )}
      </div>

      <!-- Detail Sections -->
      <div class="fg-grid fg-gap-10" style="grid-template-columns: 2fr 3fr;">
        <!-- Top Obstacles -->
        <section>
          <div class="fg-flex fg-items-center fg-gap-3 fg-mb-6">
            <div class="fg-w-8 fg-h-8 fg-rounded-xl fg-bg-[var(--red)]/10 fg-flex fg-items-center fg-justify-center fg-text-[var(--red)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            </div>
            <div class="section-label" style="${
              UI_TOKENS.TEXT.HEADING
            }">Top Denied Threats</div>
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
              <div class="section-label" style="${
                UI_TOKENS.TEXT.HEADING
              }">Real-Time Denial Feed</div>
            </div>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            }; color: var(--green); display: flex; align-items: center; gap: 8px;">
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
          url: chrome.runtime.getURL(buildDashboardTabPath('nextdns_account')),
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
}

// _renderFocusChart removed as it was dead code.

function _renderLogsList(
  isConfigured: boolean,
  blockedLogs: any[],
  iconLookup: Record<string, string> = {},
): string {
  if (!isConfigured) {
    return `
      <div class="glass-card fg-p-10 fg-text-center fg-opacity-90" style="border: 1px dashed ${COLORS.glassBorder}; background: ${COLORS.glassBg};">
        <div class="fg-mb-4 fg-text-[${COLORS.text}] fg-opacity-50 fg-flex fg-justify-center">${iconShield}</div>
        <div class="fg-text-xs fg-font-extrabold fg-text-[${COLORS.text}]  fg-tracking-wider fg-mb-2">Advanced Protection Locked</div>
        <div class="fg-text-[11px] fg-text-[${COLORS.text}] fg-opacity-60 fg-leading-relaxed fg-max-w-[280px] fg-mx-auto">Connect your NextDNS Profile in Settings to enable deep traffic analysis.</div>
      </div>`;
  }
  if (blockedLogs.length === 0) {
    return `<div class="glass-card fg-p-8 fg-text-center fg-text-[${COLORS.text}] fg-opacity-60">
      <div class="fg-text-[11px] fg-font-bold  fg-tracking-widest">No denials recorded</div>
    </div>`;
  }
  return blockedLogs
    .map((log: any) => {
      const label = log.domain;

      const cached = iconLookup[label];

      return `
        <div class="glass-card fg-flex fg-items-center fg-gap-5 fg-p-4 fg-rounded-2xl fg-transition-transform fg-duration-200 hover:fg-translate-x-1">
          ${renderBrandLogo(label, label, 32, cached)}
           <div class="fg-flex-1 fg-min-w-0">
             <div style="${UI_TOKENS.TEXT.CARD_TITLE}" class="fg-truncate">${
        log.domain
      }</div>
             <div class="fg-flex fg-items-center fg-gap-2 fg-mt-1">
               <span style="${
                 UI_TOKENS.TEXT.BADGE
               } color: var(--red); background: var(--red)/10; padding: 2px 8px; border-radius: 6px;">Blocked</span>
               <span style="${
                 UI_TOKENS.TEXT.SUBTEXT
               }; border: none; opacity: 0.6;">${
        log.reasons?.[0]?.name || 'NextDNS Firewall'
      }</span>
             </div>
           </div>
          <div class="fg-flex fg-items-center fg-gap-2 fg-shrink-0">
            <button class="block-log-domain fg-flex fg-h-8 fg-w-8 fg-items-center fg-justify-center fg-rounded-full fg-bg-[${
              COLORS.accentSoft
            }] fg-text-[${COLORS.accent}]" data-domain="${
        log.domain
      }" title="Block ${log.domain}">
              +
            </button>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            }; opacity: 0.4;">${_formatTimeAgo(log.timestamp)}</div>
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
    return `<div class="glass-card fg-p-8 fg-text-center fg-text-[${COLORS.text}] fg-opacity-60">
      <div class="fg-text-[11px] fg-font-bold ">Awaiting stats...</div>
    </div>`;
  }
  return topBlocked
    .map((item: any) => {
      const label = item.domain || item.id || item.name || 'Unknown Target';

      const cached = iconLookup[label];

      return `
        <div class="glass-card fg-flex fg-items-center fg-gap-4 fg-p-4 fg-rounded-2xl">
          ${renderBrandLogo(label, label, 28, cached)}
           <div class="fg-flex-1 fg-min-w-0">
             <div style="${
               UI_TOKENS.TEXT.CARD_TITLE
             }" class="fg-truncate">${label}</div>
             <div style="${
               UI_TOKENS.TEXT.LABEL
             }; opacity: 0.5; margin-top: 4px;">${item.queries} Blocks</div>
           </div>
          <div class="fg-shrink-0 fg-text-right fg-min-w-[50px]">
             <div class="fg-text-[12px] fg-font-black fg-text-[var(--accent)]">${Math.round(
               (item.queries / topBlocked[0].queries) * 100,
             )}%</div>
             <div class="fg-text-[8px] fg-font-black fg-text-[${
               COLORS.text
             }] fg-opacity-30  fg-tracking-tighter">Intensity</div>
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
          <div class="widget-title" style="font-size: 9px; opacity: 0.6;">Average</div>
          <div class="fg-text-sm fg-font-black fg-mt-1">${fmtTime(
            allTotalMs as number,
          )}</div>
        </div>
        <div class="glass-card fg-p-3 fg-text-center">
          <div class="widget-title" style="font-size: 9px; opacity: 0.6;">Goal</div>
          <div class="fg-text-sm fg-font-black fg-text-[var(--accent)] fg-mt-1">${focusPercent}%</div>
        </div>
      </div>

      <div class="fg-flex fg-items-center fg-justify-between fg-mb-4">
        <div class="fg-text-[11px] fg-font-black fg-text-[${
          COLORS.text
        }] fg-opacity-60  fg-tracking-widest">Top Denied</div>
        <div class="fg-text-[10px] fg-font-bold fg-text-[var(--green)] ">Healthy</div>
      </div>
      <div class="fg-flex fg-flex-col fg-gap-2">
        ${
          topBlocked.length === 0
            ? '<div class="glass-card fg-p-8 fg-text-center fg-text-[10px] fg-text-[var(--muted)]">No threats denied</div>'
            : topBlocked
                .map((d) => {
                  const label = d.domain || d.id || d.name || 'Unknown Target';
                  return `
                <div class="glass-card fg-flex fg-items-center fg-justify-between fg-py-3 fg-px-4 fg-rounded-xl">
                  <div class="fg-flex fg-items-center fg-gap-3 fg-min-w-0">
                    ${renderBrandLogo(label, label, 20)}
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
      <button class="btn fg-w-full fg-mt-4 fg-text-[11px] fg-font-black fg-py-3" id="btn_full_insights" style="background: ${
        COLORS.glassBg
      }; border: 1px solid ${COLORS.glassBorder}; color: ${
    COLORS.text
  };">View Full Dashboard</button>
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
    return 'Now';
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}M`;
  }
  return `${Math.floor(diff / 3600000)}H`;
}

function _renderLocalModeBanner(): string {
  return renderCloudBanner(
    'Cloud Logic Inactive',
    'Deep network intelligence and threat monitoring requires a cloud connection. Activate to see your full history.',
    'btn_upgrade_cloud_insights',
    'Activate Cloud',
  );
}
