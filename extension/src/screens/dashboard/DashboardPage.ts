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
  setupDateSelectorWidget,
} from '../../lib/ui';
import { CHART_COLORS, COLORS } from '../../lib/designTokens';
import { attachCalendarWidget } from './CalendarWidget';
import { getTypingHistory } from '../../lib/typingHistory';

// Key icons
const iconPlay =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const iconPause =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

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
    container.innerHTML = '<div class="fg-py-12"></div>';
  }

  try {
    const { loadDashboardData } = await import(
      '../../../../packages/viewmodels/src/useDashboardVM'
    );
    const data = await loadDashboardData(selectedDate);
    container.removeAttribute('data-mastery-active');
    const { rules, allTotalMs, domainList, isNew } = data;
    const { focusEnd } = data;

    const typingHistory = await getTypingHistory();
    const latestType = typingHistory[0];

    // Load icon cache for instant render
    const iconLookup: Record<string, string> = {};
    for (const d of domainList) {
      iconLookup[d.domain] = (await getCachedIcon(d.domain)) || '';
    }

    const isFocusing = focusEnd > Date.now();
    let timerDisplay = '25:00';
    let timerDotColor: string = COLORS.muted;
    let timerTextColor: string = COLORS.text;

    if (isFocusing) {
      const remainingMs = Math.max(0, focusEnd - Date.now());
      const m = Math.floor(remainingMs / 60000);
      const s = Math.floor((remainingMs % 60000) / 1000);
      timerDisplay = `${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
      timerDotColor = COLORS.green; // Use a more distinct local color for active state
      timerTextColor = COLORS.text;
    }

    // Live update helper
    const updateTimer = () => {
      const displayEl = container.querySelector('#timerDisplay') as HTMLElement;
      const dotEl = container.querySelector('#timerDot') as HTMLElement;
      const toggleBtn = container.querySelector(
        '#btn_toggle_focus',
      ) as HTMLElement;

      if (!displayEl || !dotEl || !toggleBtn) {
        return;
      }

      const now = Date.now();
      const isActive = focusEnd > now;
      if (!isActive) {
        displayEl.textContent = '25:00';
        displayEl.style.color = COLORS.muted;
        dotEl.style.background = COLORS.muted;
        dotEl.style.boxShadow = 'none';
        toggleBtn.innerHTML = iconPlay;
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
      displayEl.style.color = COLORS.text;
      dotEl.style.background = COLORS.green;
      dotEl.style.boxShadow = `0 0 8px ${COLORS.green}`;
      toggleBtn.innerHTML = iconPause;
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
             <div class="fg-flex fg-items-center fg-gap-5">
                <div class="section-label" style="${
                  UI_TOKENS.TEXT.LABEL
                } margin: 0; font-size: 16px; letter-spacing: -0.01em;">Overview</div>
                
                <!-- Tiny Timer Card -->
                <div class="glass-card" style="padding: 6px 14px; display: flex; align-items: center; gap: 10px; background: ${
                  COLORS.glassBg
                }; border: 1px solid ${
        COLORS.glassBorder
      }; border-radius: 12px; height: 32px;">
                   <div id="timerDot" style="width: 6px; height: 6px; border-radius: 50%; background: ${timerDotColor}; transition: all 0.3s;"></div>
                   <div style="font-size: 11px; font-weight: 800; color: ${
                     COLORS.muted
                   }; letter-spacing: 0.05em; margin-right: -4px;">Focus</div>
                   <div id="timerDisplay" style="font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 800; color: ${
                     isFocusing ? timerTextColor : COLORS.muted
                   }; min-width: 42px;">${timerDisplay}</div>
                   
                   <button id="btn_toggle_focus" style="width: 20px; height: 20px; border-radius: 6px; background: transparent; border: none; color: ${
                     COLORS.text
                   }; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.6; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">
                      ${isFocusing ? iconPause : iconPlay}
                   </button>
                </div>
             </div>
             <div id="dateSelectorWidget" style="padding: 2px; display: flex; align-items: center; gap: 4px; border-radius: 10px; background: ${
               COLORS.glassBg
             }; border: 1px solid ${COLORS.glassBorder};"></div>
          </div>

          <div class="widget-grid" style="grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
            <div class="glass-card widget-card" id="avgUsageWidget"></div>
            <div class="glass-card widget-card" id="engagementWidget"></div>
            <div class="glass-card widget-card" id="sessionsWidget"></div>
            <div class="glass-card widget-card" id="timerWidget"></div>
          </div>

          <div class="fg-grid fg-gap-8" style="grid-template-columns: 1fr 1fr; align-items: start;">
            <div>
              <div class="section-label" style="${
                UI_TOKENS.TEXT.LABEL
              } margin-bottom: 6px;">Current Activity</div>
              <div class="service-grid fg-gap-3" id="activityGrid" style="grid-template-columns: 1fr;"></div>
            </div>
            <div>
               <div class="section-label" style="${
                 UI_TOKENS.TEXT.LABEL
               } margin-bottom: 20px;">Usage Breakdown</div>
               <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden fg-flex fg-items-center fg-justify-center" id="chartSlot" style="border-radius: 20px; background: ${
                 COLORS.glassBg
               }; border: 1px solid ${
        COLORS.glassBorder
      }; height: 280px; transition: opacity 0.4s ease-out; opacity: 1;">
                  <canvas id="liveUsageChart" style="width: 100% !important; height: 230px !important;"></canvas>
               </div>
               <div class="fg-mt-5 fg-text-xs fg-text-[${
                 COLORS.text
               }] fg-opacity-80 fg-leading-normal fg-font-semibold">
                 Data reflects time recorded by the browser gate for the selected period.
               </div>
            </div>
          </div>
        </div>
      `;

      // Event Delegation for quick-block and details buttons (attached only once)
      container.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;

        // Quick Block Logic
        const blockBtn = target.closest(
          '.quick-block-btn',
        ) as HTMLButtonElement;
        if (blockBtn && !blockBtn.disabled) {
          const domain = blockBtn.dataset.domain;
          if (!domain) {
            return;
          }

          blockBtn.textContent = '…';
          blockBtn.disabled = true;
          try {
            await appsController.addDomainRule(domain);
            chrome.runtime.sendMessage({ action: 'manualSync' });
          } catch (err) {
            blockBtn.textContent = '+';
            blockBtn.disabled = false;
            console.error('[StopAccess] Quick-block failed:', err);
          }
          return;
        }

        // Domain Card Click Logic
        const card = target.closest('.rule-item') as HTMLElement;
        if (card && !target.closest('.quick-block-btn')) {
          const domain = card.getAttribute('data-domain');
          if (domain) {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', 'domain_usage');
            url.searchParams.set('domain', domain);
            window.history.replaceState({}, '', url);
            window.dispatchEvent(
              new CustomEvent('sa_navigate', {
                detail: { tab: 'domain_usage', domain },
              }),
            );
          }
        }

        // Timer Toggle Logic
        const toggleBtn = target.closest(
          '#btn_toggle_focus',
        ) as HTMLButtonElement;
        if (toggleBtn) {
          const isFocusActive = focusEnd > Date.now();
          if (isFocusActive) {
            const { showConfirmDialog } = (await import('../../lib/ui')) as any;
            const confirmed = await showConfirmDialog({
              title: 'Stop Focus?',
              body: 'Ending your session early will disable active distractions blocking.',
              confirmLabel: 'Stop Session',
              cancelLabel: 'Keep Going',
            });
            if (confirmed) {
              chrome.runtime.sendMessage({ action: 'stopFocus' }, () => {
                renderDashboardPage(container, selectedDate);
              });
            }
          } else {
            const { showConfirmDialog } = (await import('../../lib/ui')) as any;
            const confirmed = await showConfirmDialog({
              title: 'Start 25m Focus?',
              body: 'Enter a deep work state. We will block all distractions during this time.',
              confirmLabel: 'Start Focus',
            });
            if (confirmed) {
              chrome.runtime.sendMessage(
                { action: 'startFocus', minutes: 25 },
                () => {
                  renderDashboardPage(container, selectedDate);
                },
              );
            }
          }
          return;
        }

        // Typing Mastery Card Click Logic
        const typingCard = target.closest('#timerWidget') as HTMLElement;
        if (typingCard) {
          const url = new URL(window.location.href);
          url.searchParams.set('tab', 'typing_mastery');
          window.history.replaceState({}, '', url);
          window.dispatchEvent(
            new CustomEvent('sa_navigate', {
              detail: { tab: 'typing_mastery' },
            }),
          );
          return;
        }
      });
    }

    // Dynamic Updates (runs every call)
    const setupSlot = container.querySelector('#setupGuardSlot');
    if (setupSlot) {
      const newSetupHtml = isNew
        ? `<div class="glass-card fg-p-10 fg-text-center fg-mb-8" style="background: ${COLORS.glassBg}; border-color: ${COLORS.glassBorder};">
          <div style="${UI_TOKENS.TEXT.STAT_LARGE} opacity: 0.4; letter-spacing: -2px; margin-bottom: 24px;">FG</div>
          <div style="${UI_TOKENS.TEXT.HERO}; margin-bottom: 8px;">Setup Required</div>
          <div style="${UI_TOKENS.TEXT.SUBTEXT} max-width: 400px; line-height: 1.6; margin: 0 auto 32px;">No block rules detected. Add a domain or link a profile to begin.</div>
          <div class="fg-flex fg-gap-4 fg-justify-center">
            <button class="btn-premium fg-justify-center" id="wb_settings" style="min-width: 180px;">Link Profile</button>
            <button class="btn-premium fg-justify-center" id="wb_apps" style="background:${COLORS.glassBg}; color:${COLORS.text}; border-color: ${COLORS.glassBorder}; box-shadow:none; min-width: 180px;">Add Rules</button>
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
      const deltaColor = isPositive ? COLORS.green : COLORS.red;

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
              <span style="opacity: 0.5; color: ${
                COLORS.text
              }; font-weight: 400;">vs yesterday</span>
            </div>
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
            } opacity: 0.5; font-size: 11px; margin-top: 4px;">Interactions Today</div>
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
      const wpmVal = latestType ? latestType.wpm : '--';
      const accVal = latestType
        ? `${latestType.accuracy}%`
        : 'Awaiting Data...';
      const isHigh = latestType && latestType.wpm > 65;

      timerW.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="widget-title" style="${
              UI_TOKENS.TEXT.WIDGET_LABEL
            } opacity: 0.8;">WPM Analysis</div>
            ${
              isHigh
                ? `<div style="${UI_TOKENS.TEXT.BADGE} color: var(--green); border: none; background: var(--green)/10; padding: 2px 6px;">Peak</div>`
                : ''
            }
          </div>
          <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 4px;">
            <div style="${
              UI_TOKENS.TEXT.STAT
            }; font-size: 28px; line-height: 1;">${wpmVal}</div>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            }; font-size: 11px; opacity: 0.6; font-weight: 700;">${accVal} accuracy</div>
          </div>
          <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash-border);">
             <div style="${
               UI_TOKENS.TEXT.LABEL
             } opacity: 0.5; font-size: 10px;">${
        latestType ? 'Last focus session' : 'History initializing...'
      }</div>
          </div>
        </div>
      `;
    }
    const dateW = container.querySelector('#dateSelectorWidget') as HTMLElement;
    if (dateW) {
      setupDateSelectorWidget(
        container,
        dateW,
        data,
        (newDateStr: string) => {
          if (document.getElementById('chartSlot')) {
            (
              document.getElementById('chartSlot') as HTMLElement
            ).style.opacity = '0.4';
          }
          renderDashboardPage(container, newDateStr);
        },
        attachCalendarWidget,
      );
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
            ? `<div style="${UI_TOKENS.TEXT.BADGE} color:var(--red); background:${COLORS.glassBg}; border:1px solid ${COLORS.glassBorder}; border-radius:6px; padding:3px 7px; text-transform:uppercase;">Blocked</div>`
            : `<button class="quick-block-btn" data-domain="${d.domain}" title="Block ${d.domain}" style="width:26px; height:26px; border-radius:8px; background:${COLORS.glassBg}; border:1px solid ${COLORS.glassBorder}; color:var(--accent); font-size:16px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;">+</button>`;
          const statusLabelHtml = `<span style="opacity: 0.7;">${
            d.sessions || 0
          } Session${d.sessions !== 1 ? 's' : ''}</span>`;

          const cardInner = `
                 <div class="fg-flex fg-items-center fg-gap-3 fg-min-w-0">
                    <div style="position: relative; flex-shrink: 0;">
                      ${renderBrandLogo(d.domain, d.domain, 38, cached)}
                    </div>
                   <div class="fg-min-w-0 fg-flex-1">
                     <div style="${
                       UI_TOKENS.TEXT.CARD_TITLE
                     }; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${
            d.domain
          }</div>
                     <div class="row-status" style="${
                       UI_TOKENS.TEXT.LABEL
                     }; color: ${COLORS.muted}; margin-top: 4px;">
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
            // Surgical updates to prevent blinking/re-flicker of icons
            const statusNode = existingItem.querySelector('.row-status');
            const timeNode = existingItem.querySelector('.row-time');
            const actionNode = existingItem.querySelector('.row-action');

            if (statusNode) {
              const newLabel = statusLabelHtml.replace(/<[^>]*>/g, '').trim();
              if (statusNode.textContent?.trim() !== newLabel) {
                statusNode.innerHTML = statusLabelHtml;
              }
            }
            if (timeNode) {
              const newTime = fmtTime(d.timeMs);
              if (timeNode.textContent !== newTime) {
                timeNode.textContent = newTime;
              }
            }
            if (actionNode) {
              if (actionNode.innerHTML !== badgeHtml) {
                actionNode.innerHTML = badgeHtml;
              }
            }
            // Update border indicator
            existingItem.style.borderLeftColor = isBlocked
              ? 'var(--red)'
              : 'transparent';
          } else {
            const div = document.createElement('div');
            div.className = 'rule-item domain-activity-card';
            div.setAttribute('data-domain', d.domain);
            div.setAttribute(
              'style',
              `padding: 12px 16px; background: ${
                COLORS.glassBg
              }; border-radius: 12px; margin-bottom: 8px; border-left: 3px solid ${
                isBlocked ? 'var(--red)' : 'transparent'
              }; transition: all 0.2s; cursor: pointer; max-width: 100%;`,
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
            '<div class="chart-empty fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[${COLORS.text}] fg-opacity-60 fg-text-[13px] fg-font-bold">No activity found.</div>';
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

      const pastelColors = CHART_COLORS.map((c) => resolveToken(c));
      const bgColors = domainList.map(
        (_, i) => pastelColors[i % pastelColors.length],
      );
      const chartBorderColor =
        resolveToken(COLORS.glassBg) ||
        resolveToken('--fg-white-wash') ||
        '#ffffff';
      const chartBorderWidth = 1;

      window.__dashPulseChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: domainList.map((d) => d.domain),
          datasets: [
            {
              data: domainList.map((d) => Math.floor(d.timeMs / 60000)),
              backgroundColor: bgColors,
              borderColor: chartBorderColor,
              borderWidth: chartBorderWidth,
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
        const typingChanged = !!changes.fg_typing_mastery_log;
        const configChanged = !!(
          changes.nextdns_api_key ||
          changes.nextdns_profile_id ||
          changes.fg_cloud_blocked_queries
        );

        if (
          rulesChanged ||
          usageChanged ||
          focusChanged ||
          configChanged ||
          typingChanged
        ) {
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
                freshResolve(COLORS.glassBg) ||
                freshResolve('--fg-white-wash') ||
                '#ffffff';
              chart.data.datasets[0].borderColor = borderCol;
              chart.data.datasets[0].borderWidth = 1;
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
