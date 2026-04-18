import Chart from 'chart.js/auto';
import {
  fmtTime,
  formatMinutes,
  buildDashboardTabPath,
  findServiceIdByDomain,
} from '@stopaccess/core';
import { appsController } from '../../lib/appsController';
import { getCachedIcon } from '../../lib/iconCache';
import {
  UI_TOKENS,
  renderBrandLogo,
  attachGlobalIconListeners,
} from '../../lib/ui';
import { CHART_COLORS, COLORS } from '../../lib/designTokens';
import { attachCalendarWidget } from './CalendarWidget';

// This function opens the extension settings page
function openSettingsPage() {
  const url = chrome.runtime.getURL(buildDashboardTabPath('settings'));
  chrome.tabs.create({ url });
}

// Key rendering function for the Dashboard (Overview) page
export async function renderDashboardPage(
  container: HTMLElement,
  selectedDate?: string,
) {
  if (!container) {
    return;
  }
  if (
    !container.innerHTML ||
    container.innerHTML === '<div class="empty-state"></div>'
  ) {
    container.innerHTML = '<div class="fg-animate-fade-in fg-py-12"></div>';
  }

  try {
    const { loadDashboardData } = await import(
      '../../../../packages/viewmodels/src/useDashboardVM'
    );
    const data = await loadDashboardData(selectedDate);
    const { rules, allTotalMs, domainList, isNew } = data;
    const { focusEnd } = data;

    // Load icon cache for instant render
    const iconLookup: Record<string, string> = {};
    for (const d of domainList) {
      iconLookup[d.domain] = (await getCachedIcon(d.domain)) || '';
    }

    const isFocusing = focusEnd > Date.now();
    let timerDisplay = '25:00';
    let timerStatusText = 'Ready';
    let timerDotColor = 'var(--fg-muted)';
    let timerTextColor = 'var(--fg-text)';

    if (isFocusing) {
      const remainingMs = Math.max(0, focusEnd - Date.now());
      const m = Math.floor(remainingMs / 60000);
      const s = Math.floor((remainingMs % 60000) / 1000);
      timerDisplay = `${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
      timerStatusText = 'Active';
      timerDotColor = 'var(--fg-green)'; // Use a more distinct local color for active state
      timerTextColor = 'var(--fg-text)';
    }

    // Live update helper
    const updateTimer = () => {
      const displayEl = container.querySelector('#timerDisplay') as HTMLElement;
      const statusEl = container.querySelector('#timerStatus') as HTMLElement;
      const dotEl = container.querySelector('#timerDot') as HTMLElement;
      if (!displayEl || !statusEl || !dotEl) {
        return;
      }

      const now = Date.now();
      const isActive = focusEnd > now;
      if (!isActive) {
        displayEl.textContent = '25:00';
        statusEl.textContent = 'Ready';
        displayEl.style.color = 'var(--fg-text)';
        statusEl.style.color = 'var(--fg-text)';
        statusEl.style.fontWeight = '900';
        dotEl.style.background = 'var(--fg-muted)';
        dotEl.style.boxShadow = 'none';
        if ((window as any).__dashTimerInterval) {
          clearInterval((window as any).__dashTimerInterval);
          (window as any).__dashTimerInterval = null;
        }
        return;
      }

      const rem = Math.max(0, focusEnd - now);
      const mm = Math.floor(rem / 60000);
      const ss = Math.floor((rem % 60000) / 1000);
      displayEl.textContent = `${mm.toString().padStart(2, '0')}:${ss
        .toString()
        .padStart(2, '0')}`;
      displayEl.style.color = 'var(--fg-text)';
      displayEl.style.fontWeight = '950';
      statusEl.textContent = 'Active';
      statusEl.style.color = 'var(--fg-text)';
      statusEl.style.fontWeight = '950';
      dotEl.style.background = 'var(--fg-green)';
      dotEl.style.boxShadow = '0 0 10px var(--fg-green)';
    };

    if (isFocusing && !(window as any).__dashTimerInterval) {
      (window as any).__dashTimerInterval = window.setInterval(
        updateTimer,
        1000,
      );
    } else if (!isFocusing && (window as any).__dashTimerInterval) {
      clearInterval((window as any).__dashTimerInterval);
      (window as any).__dashTimerInterval = null;
    }

    if (!container.querySelector('#dashboardShell')) {
      container.innerHTML = `
        <div id="dashboardShell">
          <div id="setupGuardSlot"></div>

          <div class="fg-flex fg-items-center fg-justify-between fg-mb-6 fg-px-1">
             <div class="section-label" style="${UI_TOKENS.TEXT.LABEL} margin: 0; font-size: 16px; letter-spacing: -0.01em;">Overview</div>
             <div id="dateSelectorWidget" style="padding: 2px; display: flex; align-items: center; gap: 4px; border-radius: 10px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);"></div>
          </div>

          <div class="widget-grid" style="grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
            <div class="glass-card widget-card" id="avgUsageWidget"></div>
            <div class="glass-card widget-card" id="engagementWidget"></div>
            <div class="glass-card widget-card" id="sessionsWidget"></div>
            <div class="glass-card widget-card" id="timerWidget"></div>
          </div>

          <div class="fg-grid fg-gap-8" style="grid-template-columns: 1fr 1fr; align-items: start;">
            <div>
              <div class="section-label" style="${UI_TOKENS.TEXT.LABEL} margin-bottom: 6px;">Current Activity</div>
              <div id="sa-current-activity-subtitle" style="${UI_TOKENS.TEXT.LABEL} opacity: 0.55; margin-bottom: 20px;">${data.focusSummary.completedSessions} focus sessions completed, ${data.focusSummary.totalMinutes} focus minutes on ${data.targetDate}</div>
              <div class="service-grid fg-gap-3" id="activityGrid" style="grid-template-columns: 1fr;"></div>
            </div>
            <div>
               <div class="section-label" style="${UI_TOKENS.TEXT.LABEL} margin-bottom: 20px;">Usage Breakdown</div>
               <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden fg-flex fg-items-center fg-justify-center" id="chartSlot" style="border-radius: 20px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); height: 280px; transition: opacity 0.4s ease-out; opacity: 1;">
                  <canvas id="liveUsageChart" style="width: 100% !important; height: 230px !important;"></canvas>
               </div>
               <div class="fg-mt-5 fg-text-xs fg-text-[var(--fg-text)] fg-opacity-80 fg-leading-normal fg-font-semibold">
                 Data reflects time recorded by the browser gate for the selected period.
               </div>
            </div>
          </div>
        </div>
      `;

      // Event Delegation for quick-block buttons (attached only once)
      container.addEventListener('click', async (e) => {
        const btn = (e.target as HTMLElement).closest(
          '.quick-block-btn',
        ) as HTMLButtonElement;
        if (!btn || btn.disabled) {
          return;
        }

        const domain = btn.dataset.domain;
        if (!domain) {
          return;
        }

        btn.textContent = '…';
        btn.disabled = true;
        try {
          await appsController.addDomainRule(domain);
          chrome.runtime.sendMessage({ action: 'manualSync' });
        } catch (err) {
          btn.textContent = '+';
          btn.disabled = false;
          console.error('[StopAccess] Quick-block failed:', err);
        }
      });
    }

    // Dynamic Updates (runs every call)
    const setupSlot = container.querySelector('#setupGuardSlot');
    if (setupSlot) {
      const newSetupHtml = isNew
        ? `<div class="glass-card fg-p-10 fg-text-center fg-mb-8" style="background: var(--fg-glass-bg); border-color: var(--fg-glass-border);">
          <div style="${UI_TOKENS.TEXT.STAT_LARGE} opacity: 0.4; letter-spacing: -2px; margin-bottom: 24px;">FG</div>
          <div style="${UI_TOKENS.TEXT.HERO}; margin-bottom: 8px;">Setup Required</div>
          <div style="${UI_TOKENS.TEXT.SUBTEXT} max-width: 400px; line-height: 1.6; margin: 0 auto 32px;">No block rules detected. Add a domain or link a profile to begin.</div>
          <div class="fg-flex fg-gap-4 fg-justify-center">
            <button class="btn-premium fg-justify-center" id="wb_settings" style="min-width: 180px;">Link Profile</button>
            <button class="btn-premium fg-justify-center" id="wb_apps" style="background:var(--fg-glass-bg); color:var(--fg-text); border-color: var(--fg-glass-border); box-shadow:none; min-width: 180px;">Add Rules</button>
          </div>
        </div>`
        : '';
      if (setupSlot.innerHTML !== newSetupHtml) {
        setupSlot.innerHTML = newSetupHtml;
        setupSlot
          .querySelector('#wb_settings')
          ?.addEventListener('click', openSettingsPage);
        setupSlot.querySelector('#wb_apps')?.addEventListener('click', () => {
          (
            document.querySelector('.nav-item[data-tab="apps"]') as HTMLElement
          )?.click();
        });
      }
    }

    const avgW = container.querySelector('#avgUsageWidget');
    if (avgW) {
      const { globalAvgMs, globalAvgSessions } = data;
      avgW.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div class="widget-title" style="${
            UI_TOKENS.TEXT.WIDGET_LABEL
          }">Daily Average</div>
          <div style="margin-top: 12px;">
            <div style="${UI_TOKENS.TEXT.STAT}">${fmtTime(
        globalAvgMs || 0,
      )}</div>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            } opacity: 0.5; font-size: 11px; margin-top: 4px;">GLOBAL BASELINE</div>
          </div>
          <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash);">
             <div style="${
               UI_TOKENS.TEXT.LABEL
             } opacity: 0.8; font-size: 12px;">${Math.round(
        globalAvgSessions || 0,
      )} <span style="opacity: 0.5; font-weight: 400;">sessions/day</span></div>
          </div>
        </div>
      `;
    }

    const engagementW = container.querySelector('#engagementWidget');
    if (engagementW) {
      const usageTone =
        data.usageDeltaPct > 0
          ? `+${data.usageDeltaPct}%`
          : `${data.usageDeltaPct}%`;
      const isPositive = data.usageDeltaPct <= 0;
      const deltaColor = isPositive ? 'var(--fg-green)' : 'var(--fg-red)';

      engagementW.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div class="widget-title" style="${UI_TOKENS.TEXT.WIDGET_LABEL}">${
        data.isToday ? 'Today Usage' : 'Selected Day'
      }</div>
          <div style="margin-top: 12px;">
            <div style="${UI_TOKENS.TEXT.STAT}">${fmtTime(
        allTotalMs as number,
      )}</div>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            } color: ${deltaColor}; font-size: 11px; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
              ${isPositive ? '↓' : '↑'} ${usageTone.replace(/[-+]/, '')} 
              <span style="opacity: 0.5; color: var(--fg-text); font-weight: 400;">vs yesterday</span>
            </div>
          </div>
          <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash);">
             <div style="${
               UI_TOKENS.TEXT.LABEL
             } opacity: 0.8; font-size: 11px; letter-spacing: 0.05em;">TRACKING ACTIVE</div>
          </div>
        </div>
      `;
    }

    const sessionsW = container.querySelector('#sessionsWidget');
    if (sessionsW) {
      sessionsW.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div class="widget-title" style="${
            UI_TOKENS.TEXT.WIDGET_LABEL
          }">Sessions</div>
          <div style="margin-top: 12px;">
            <div style="${UI_TOKENS.TEXT.STAT}">${data.totalSessions}</div>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            } opacity: 0.5; font-size: 11px; margin-top: 4px;">INTERACTIONS TODAY</div>
          </div>
          <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash);">
             <div style="${
               UI_TOKENS.TEXT.LABEL
             } opacity: 0.8; font-size: 12px;">avg ${fmtTime(
        data.averageSessionMs || 0,
      )} <span style="opacity: 0.5; font-weight: 400;">per session</span></div>
          </div>
        </div>
      `;
    }
    const timerW = container.querySelector('#timerWidget');
    if (timerW) {
      const sessionTone =
        data.sessionsDeltaPct > 0
          ? `+${data.sessionsDeltaPct}%`
          : `${data.sessionsDeltaPct}%`;
      timerW.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div class="widget-title" style="${
            UI_TOKENS.TEXT.WIDGET_LABEL
          }">Focus Status</div>
          <div style="margin-top: 12px;">
            <div id="timerDisplay" style="${
              UI_TOKENS.TEXT.STAT
            }; font-variant-numeric: tabular-nums; color: ${timerTextColor}; transition: color 0.3s;">${timerDisplay}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
               <div id="timerDot" style="width: 8px; height: 8px; border-radius: 50%; background: ${timerDotColor}; box-shadow: ${
        isFocusing ? `0 0 10px ${timerDotColor}` : 'none'
      }; transition: background 0.3s, box-shadow 0.3s;"></div>
               <span id="timerStatus" style="${
                 UI_TOKENS.TEXT.LABEL
               }; font-size: 11px; color: var(--fg-text); font-weight: 700;">${timerStatusText.toUpperCase()}</span>
            </div>
          </div>
          <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash);">
             <div style="${
               UI_TOKENS.TEXT.LABEL
             } opacity: 0.5; font-size: 11px;">${sessionTone} sessions vs yest.</div>
          </div>
        </div>
      `;
    }
    const dateW = container.querySelector('#dateSelectorWidget');
    if (dateW) {
      const { targetDate, isToday } = data;
      const date = new Date(targetDate);
      const friendly = isToday
        ? 'Today'
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      dateW.innerHTML = `
        <div class="fg-flex fg-items-center fg-gap-1">
          <button class="date-nav-prev" style="width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; background:transparent; border:none; color:var(--fg-muted); cursor:pointer; transition:all 0.2s;">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          
          <div style="display: flex; flex-direction: column; align-items: center; min-width: 80px; cursor:pointer;" class="date-picker-trigger" id="sa-date-trigger">
            <div style="${
              UI_TOKENS.TEXT.CARD_TITLE
            }; color:var(--fg-text); font-weight:800; font-size: 12px;">${friendly}</div>
            <div style="font-size:9px; color:var(--fg-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: -1px;">${targetDate}</div>
          </div>

          <button class="date-nav-next" ${
            isToday ? 'disabled' : ''
          } style="width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; background:transparent; border:none; color:var(--fg-muted); cursor:${
        isToday ? 'default' : 'pointer'
      }; opacity:${isToday ? '0.2' : '1'}; transition:all 0.2s;">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      `;

      (dateW as any).__dashTargetDate = targetDate;

      if (!(dateW as any).__dateListenerAttached) {
        dateW.addEventListener('click', (e: MouseEvent) => {
          const currentTargetDate = (dateW as any).__dashTargetDate;
          const prevBtn = (e.target as HTMLElement).closest('.date-nav-prev');
          const nextBtn = (e.target as HTMLElement).closest('.date-nav-next');

          if (prevBtn && !prevBtn.hasAttribute('disabled')) {
            (prevBtn as HTMLElement).style.opacity = '0.5';
            const d = new Date(currentTargetDate);
            d.setDate(d.getDate() - 1);
            if (document.getElementById('chartSlot')) {
              (
                document.getElementById('chartSlot') as HTMLElement
              ).style.opacity = '0.4';
            }
            renderDashboardPage(container, d.toLocaleDateString('en-CA'));
          }
          if (nextBtn && !nextBtn.hasAttribute('disabled')) {
            (nextBtn as HTMLElement).style.opacity = '0.5';
            const d = new Date(currentTargetDate);
            d.setDate(d.getDate() + 1);
            if (document.getElementById('chartSlot')) {
              (
                document.getElementById('chartSlot') as HTMLElement
              ).style.opacity = '0.4';
            }
            renderDashboardPage(container, d.toLocaleDateString('en-CA'));
          }
          if ((e.target as HTMLElement).closest('#sa-date-trigger')) {
            attachCalendarWidget(
              dateW.querySelector('#sa-date-trigger') as HTMLElement,
              container,
              currentTargetDate,
              (newDateStr: string) =>
                renderDashboardPage(container, newDateStr),
            );
          }
        });
        (dateW as any).__dateListenerAttached = true;
      }
    }

    const activitySubtitle = container.querySelector(
      '#sa-current-activity-subtitle',
    );
    if (activitySubtitle) {
      activitySubtitle.textContent = `${data.focusSummary.completedSessions} focus sessions completed, ${data.focusSummary.totalMinutes} focus minutes on ${data.targetDate}`;
    }

    const activityG = container.querySelector('#activityGrid');
    if (activityG) {
      if (domainList.length === 0) {
        activityG.innerHTML = `
        <div class="glass-card fg-text-center fg-p-10 fg-text-[13px] fg-text-[var(--muted)]" style="border-style: dashed; background: transparent;">
          No activity recorded in this session.
        </div>`;
      } else {
        if (activityG.querySelector('.glass-card')) {
          activityG.innerHTML = '';
        }

        domainList.forEach((d) => {
          const isBlocked = rules.some((r: any) => {
            const active = r.blockedToday || r.mode === 'block';
            if (!active) {
              return false;
            }
            if ((r.customDomain || r.packageName) === d.domain) {
              return true;
            }
            if (r.type === 'service') {
              const svcId = findServiceIdByDomain(d.domain);
              if (svcId === r.packageName) {
                return true;
              }
            }
            return false;
          });

          const cached = iconLookup[d.domain];

          const existingItem = activityG.querySelector(
            `.rule-item[data-domain="${d.domain}"]`,
          ) as HTMLElement;
          const badgeHtml = isBlocked
            ? '<div style="font-size:9px; font-weight:900; color:var(--red); background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); border-radius:6px; padding:3px 7px; text-transform:uppercase; letter-spacing:0.5px;">Blocked</div>'
            : `<button class="quick-block-btn" data-domain="${d.domain}" title="Block ${d.domain}" style="width:26px; height:26px; border-radius:8px; background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); color:var(--accent); font-size:16px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;">+</button>`;
          const statusLabelHtml = `<span style="opacity: 0.7;">${
            d.sessions || 0
          } Session${d.sessions !== 1 ? 's' : ''}</span>`;

          const cardInner = `
                 <div class="fg-flex fg-items-center fg-gap-3 fg-min-w-0">
                    ${renderBrandLogo(d.domain, d.domain, 38, cached)}
                   <div class="fg-min-w-0 fg-flex-1">
                     <div style="${
                       UI_TOKENS.TEXT.CARD_TITLE
                     }; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${
            d.domain
          }</div>
                     <div class="row-status" style="${
                       UI_TOKENS.TEXT.LABEL
                     }; color: var(--fg-muted); margin-top: 4px;">
                       ${statusLabelHtml}
                     </div>
                   </div>
                   <div class="fg-flex fg-items-center fg-gap-[8px] fg-shrink-0">
                     <div class="row-time" style="${
                       UI_TOKENS.TEXT.CARD_TITLE
                     }">${fmtTime(d.timeMs)}</div>
                     <div class="row-action">${badgeHtml}</div>
                   </div>
                 </div>
                `;

          if (existingItem) {
            const statusNode = existingItem.querySelector('.row-status');
            const currentLabel = statusNode?.textContent?.trim();
            if (
              currentLabel !== statusLabelHtml.replace(/<[^>]*>/g, '').trim()
            ) {
              existingItem.innerHTML = cardInner;
              existingItem.style.borderLeftColor = isBlocked
                ? 'var(--red)'
                : 'transparent';
            } else {
              const tDisp = existingItem.querySelector('.row-time');
              if (tDisp && tDisp.textContent !== fmtTime(d.timeMs)) {
                tDisp.textContent = fmtTime(d.timeMs);
              }
              const actionArea = existingItem.querySelector('.row-action');
              if (actionArea && actionArea.innerHTML !== badgeHtml) {
                actionArea.innerHTML = badgeHtml;
              }
            }
          } else {
            const div = document.createElement('div');
            div.className = 'rule-item';
            div.setAttribute('data-domain', d.domain);
            div.setAttribute(
              'style',
              `padding: 12px 16px; background: var(--fg-glass-bg); border-radius: 12px; margin-bottom: 8px; border-left: 3px solid ${
                isBlocked ? 'var(--red)' : 'transparent'
              }; transition: border-color 0.2s; max-width: 100%;`,
            );
            div.innerHTML = cardInner;
            activityG.appendChild(div);
          }
        });
      }
    }

    const chartSlot = container.querySelector('#chartSlot') as HTMLElement;
    if (chartSlot) {
      chartSlot.style.opacity = '1';
      if (domainList.length === 0) {
        if (!chartSlot.querySelector('.chart-empty')) {
          chartSlot.innerHTML +=
            '<div class="chart-empty fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-text)] fg-opacity-60 fg-text-[13px] fg-font-bold">No activity found.</div>';
        }
      } else {
        chartSlot.querySelector('.chart-empty')?.remove();
      }
    }

    // Chart and icon logic
    const canvas = container.querySelector(
      '#liveUsageChart',
    ) as HTMLCanvasElement;
    attachGlobalIconListeners(container);

    const ctx = canvas?.getContext('2d');
    if (ctx && domainList.length > 0) {
      if (window.__dashPulseChart) {
        window.__dashPulseChart.destroy();
      }

      // Wire directly from main file tokens but resolve them to computed CSS for ChartJS
      const docStyle = getComputedStyle(document.documentElement);
      const resolveToken = (token: string) => {
        const match = token.match(/var\(([^)]+)\)/);
        return match ? docStyle.getPropertyValue(match[1]).trim() : token;
      };

      const chartTextColor = resolveToken(UI_TOKENS.COLORS.TEXT) || COLORS.text;

      const pastelColors = [...CHART_COLORS];
      const bgColors = domainList.map(
        (_, i) => pastelColors[i % pastelColors.length],
      );
      const borderColor =
        docStyle.getPropertyValue('--fg-glass-bg').trim() || COLORS.surface;

      window.__dashPulseChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: domainList.map((d) => d.domain),
          datasets: [
            {
              data: domainList.map((d) => Math.floor(d.timeMs / 60000)),
              backgroundColor: bgColors,
              borderColor: borderColor,
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          layout: {
            padding: 10,
          },
          plugins: {
            legend: {
              display: true,
              position: 'left',
              labels: {
                color: chartTextColor,
                usePointStyle: true,
                padding: 16,
                font: { size: 12, weight: '600' as any },
              },
            },
            tooltip: {
              displayColors: false,
              callbacks: {
                title: () => '',
                label: function (context: any) {
                  const label = context.label || '';
                  const value = context.raw as number;
                  return `${label}: ${formatMinutes(value)}`;
                },
              },
            },
          },
        },
      });
    }

    (window as any).__dashActiveContainer = container;

    if (!window.__dashStorageListener) {
      window.__dashStorageListener = (changes: any) => {
        const activeContainer = (window as any).__dashActiveContainer;

        // Listen to relevant keys including rules aliases
        const rulesChanged = !!(changes.rules || changes.fg_rules);
        const usageChanged = !!changes.usage;
        const focusChanged = !!(
          changes.focus_mode_end_time || changes.fg_active_session
        );
        const configChanged = !!(
          changes.nextdns_api_key ||
          changes.nextdns_profile_id ||
          changes.fg_cloud_blocked_queries
        );

        if (rulesChanged || usageChanged || focusChanged || configChanged) {
          if (activeContainer && document.contains(activeContainer)) {
            const isDashActive = !!document.querySelector(
              '.nav-item[data-tab="dash"].active',
            );
            if (isDashActive) {
              renderDashboardPage(activeContainer);
            }
          }
        }
      };
      chrome.storage.onChanged.addListener(window.__dashStorageListener);
    }

    if (!(window as any).__dashThemeObserver) {
      const observer = new MutationObserver((mutations) => {
        if (mutations.some((m) => m.attributeName === 'class')) {
          const chart = (window as any).__dashPulseChart;
          if (chart) {
            const currentStyle = getComputedStyle(document.documentElement);
            const freshResolve = (token: string) => {
              const match = token.match(/var\(([^)]+)\)/);
              return match
                ? currentStyle.getPropertyValue(match[1]).trim()
                : token;
            };
            const freshText =
              freshResolve(UI_TOKENS.COLORS.TEXT) || COLORS.text;

            if (chart.data.datasets?.[0]) {
              const borderCol =
                currentStyle.getPropertyValue('--fg-glass-bg').trim() ||
                COLORS.surface;
              chart.data.datasets[0].borderColor = borderCol;
            }
            if (chart.options.plugins?.legend?.labels) {
              chart.options.plugins.legend.labels.color = freshText;
            }
            chart.update();
          }
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
      (window as any).__dashThemeObserver = observer;
    }
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}
