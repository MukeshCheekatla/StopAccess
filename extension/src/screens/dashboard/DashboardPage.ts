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
import { getRemainingMs, formatTime } from '../../lib/sessionTimer';

// Key icons
const iconPlay =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const iconPause =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
const iconStop =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>';

// This function opens the extension settings page
function openSettingsPage() {
  const url = chrome.runtime.getURL(buildDashboardTabPath('settings'));
  chrome.tabs.create({ url });
}

let lastViewedDate: string | undefined;
let activeRenderId: string | undefined;

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
    const actualDate = selectedDate || lastViewedDate;
    const renderId = (activeRenderId = Math.random().toString(36).slice(2));

    const { loadDashboardData } = await import(
      '../../../../packages/viewmodels/src/useDashboardVM'
    );
    const data = await loadDashboardData(actualDate);

    // If a new render has started for a different date, ignore this stale result
    if (activeRenderId !== renderId) {
      return;
    }

    lastViewedDate = data.targetDate;
    container.removeAttribute('data-mastery-active');
    const { rules, allTotalMs, domainList, isNew } = data;
    const { focusEnd } = data;
    (window as any).__dashFocusEnd = focusEnd;

    const typingHistory = await getTypingHistory();
    const latestType = typingHistory[0];

    // Load icon cache for instant render
    const iconLookup: Record<string, string> = {};
    for (const d of domainList) {
      iconLookup[d.domain] = (await getCachedIcon(d.domain)) || '';
    }

    const activeRes = await chrome.storage.local.get(['fg_active_session']);
    const activeSession = activeRes.fg_active_session as any;
    const isPaused = activeSession?.status === 'paused';
    const isFocusing = focusEnd > Date.now() || isPaused;

    let timerDisplay = '25:00';
    let timerDotColor: string = COLORS.text;
    let timerTextColor: string = COLORS.text;
    let focusStatusText = 'Focus';

    if (isFocusing) {
      const remainingMs = getRemainingMs(activeSession);
      timerDisplay = formatTime(remainingMs);
      timerDotColor = isPaused ? COLORS.yellow : COLORS.green;
      timerTextColor = COLORS.text;
      focusStatusText = isPaused ? 'Paused' : 'Focus';
    }

    // Live update helper
    const updateTimer = () => {
      const displayEl = container.querySelector('#timerDisplay') as HTMLElement;
      const dotEl = container.querySelector('#timerDot') as HTMLElement;
      const toggleBtn = container.querySelector(
        '#btn_toggle_focus',
      ) as HTMLElement;
      const stopBtn = container.querySelector('#btn_stop_focus') as HTMLElement;

      if (!displayEl || !dotEl || !toggleBtn || !stopBtn) {
        return;
      }

      const now = Date.now();
      const currentFocusEnd = (window as any).__dashFocusEnd || 0;
      const isActive = currentFocusEnd > now;

      // Fetch fresh session to check for 'paused' state
      chrome.storage.local.get(['fg_active_session'], (res) => {
        const session = res.fg_active_session as any;
        const _isPaused = session?.status === 'paused';

        if (!isActive && !_isPaused) {
          displayEl.textContent = '25:00';
          displayEl.style.color = COLORS.text;
          dotEl.style.background = COLORS.text;
          dotEl.style.boxShadow = 'none';
          toggleBtn.innerHTML = iconPlay;
          stopBtn.style.display = 'none';
          if ((window as any).__dashTimerInterval) {
            clearInterval((window as any).__dashTimerInterval);
            (window as any).__dashTimerInterval = null;
          }
          return;
        }

        const remMs = getRemainingMs(session);
        displayEl.textContent = formatTime(remMs);
        displayEl.style.color = COLORS.text;
        dotEl.style.background = _isPaused ? COLORS.yellow : COLORS.green;
        dotEl.style.boxShadow = `0 0 8px ${
          _isPaused ? COLORS.yellow : COLORS.green
        }`;
        const statusLabel = container.querySelector(
          '#focusStatusLabel',
        ) as HTMLElement;
        if (statusLabel) {
          statusLabel.textContent = _isPaused ? 'Paused' : 'Focus';
          statusLabel.style.color = _isPaused ? COLORS.yellow : COLORS.text;
        }
        toggleBtn.innerHTML = _isPaused ? iconPlay : iconPause;
        stopBtn.style.display = 'flex';
      });
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
                <div class="fg-hidden"></div>
                
                <!-- Expanded Timer Card -->
                <div class="glass-card" style="padding: 8px 18px; display: flex; align-items: center; gap: 14px; background: ${
                  COLORS.glassBg
                }; border: 1px solid ${
        COLORS.glassBorder
      }; border-radius: 14px; height: 42px;">
                   <div id="timerDot" style="width: 8px; height: 8px; border-radius: 50%; background: ${timerDotColor}; transition: all 0.3s; box-shadow: 0 0 10px ${timerDotColor}44;"></div>
                   <div id="focusStatusLabel" style="font-size: 18px; font-weight: 700; color: ${
                     isPaused ? COLORS.yellow : COLORS.text
                   }; letter-spacing: -0.01em; margin-right: -2px;">${focusStatusText}</div>
                   <div id="timerDisplay" style="font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; color: ${
                     isFocusing ? timerTextColor : COLORS.text
                   }; min-width: 52px; letter-spacing: -0.01em;">${timerDisplay}</div>
                   
                   <div style="display: flex; align-items: center; gap: 6px;">
                     <button id="btn_toggle_focus" style="width: 24px; height: 24px; border-radius: 8px; background: transparent; border: none; color: ${
                       COLORS.text
                     }; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" class="timer-control-btn timer-control-btn-toggle">
                        ${isFocusing ? iconPause : iconPlay}
                     </button>
                     <button id="btn_stop_focus" style="width: 24px; height: 24px; border-radius: 8px; background: transparent; border: none; color: ${
                       COLORS.red
                     }; cursor: pointer; display: ${
        isFocusing ? 'flex' : 'none'
      }; align-items: center; justify-content: center; transition: all 0.2s;" class="timer-control-btn timer-control-btn-stop">
                        ${iconStop}
                     </button>
                   </div>
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
              } margin-bottom: 6px;">${
        data.isToday ? "Today's Activity" : 'Daily Activity'
      }</div>
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

        // Timer Toggle (Pause/Resume) Logic
        const toggleBtn = target.closest(
          '#btn_toggle_focus',
        ) as HTMLButtonElement;
        if (toggleBtn) {
          chrome.storage.local.get(['fg_active_session'], async (res) => {
            const session = res.fg_active_session as any;
            const isFocusActive = !!session && session.status === 'focusing';
            const _isPaused = !!session && session.status === 'paused';

            if (isFocusActive) {
              chrome.runtime.sendMessage({ action: 'pauseFocus' }, () => {
                renderDashboardPage(container, selectedDate);
              });
            } else if (_isPaused) {
              chrome.runtime.sendMessage({ action: 'resumeFocus' }, () => {
                renderDashboardPage(container, selectedDate);
              });
            } else {
              const { showConfirmDialog } = (await import(
                '../../lib/ui'
              )) as any;
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
          });
          return;
        }

        // Timer Stop Logic
        const stopBtn = target.closest('#btn_stop_focus') as HTMLButtonElement;
        if (stopBtn) {
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
    // Sync the header timer state (since the shell template isn't re-injected on every render)
    const displayEl = container.querySelector('#timerDisplay') as HTMLElement;
    const dotEl = container.querySelector('#timerDot') as HTMLElement;
    const statusLabel = container.querySelector(
      '#focusStatusLabel',
    ) as HTMLElement;
    const toggleBtn = container.querySelector(
      '#btn_toggle_focus',
    ) as HTMLElement;
    const stopBtn = container.querySelector('#btn_stop_focus') as HTMLElement;

    if (displayEl) {
      displayEl.textContent = timerDisplay;
      displayEl.style.color = isFocusing ? timerTextColor : COLORS.text;
    }
    if (dotEl) {
      dotEl.style.background = timerDotColor;
    }
    if (statusLabel) {
      statusLabel.textContent = focusStatusText;
      statusLabel.style.color = isPaused ? COLORS.yellow : COLORS.text;
    }
    if (toggleBtn) {
      toggleBtn.innerHTML = isFocusing ? iconPause : iconPlay;
    }
    if (stopBtn) {
      stopBtn.style.display = isFocusing ? 'flex' : 'none';
    }

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
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="widget-title" style="${
              UI_TOKENS.TEXT.WIDGET_LABEL
            }">Daily Average</div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${
              COLORS.muted
            }" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
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

      // Determine the precise header label based on the selected date
      let headerLabel = 'Selected Day';
      if (data.isToday) {
        headerLabel = 'Today Usage';
      } else {
        const targetDate = new Date(data.targetDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday =
          targetDate.toDateString() === yesterday.toDateString();

        if (isYesterday) {
          headerLabel = 'Yesterday Usage';
        } else {
          headerLabel = `${targetDate.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          })} Usage`;
        }
      }

      engagementW.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="widget-title" style="${
              UI_TOKENS.TEXT.WIDGET_LABEL
            }">${headerLabel}</div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${
              COLORS.muted
            }" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div style="margin-top: 12px;">
            <div style="${UI_TOKENS.TEXT.STAT}">${fmtTime(
        allTotalMs as number,
      )}</div>
          </div>
          <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash);">
            <div style="${
              UI_TOKENS.TEXT.LABEL
            } color: ${deltaColor}; font-size: 11px; display: flex; align-items: center; gap: 4px;">
              ${isPositive ? '↓' : '↑'} ${usageTone.replace(/[-+]/, '')} 
              <span style="opacity: 0.5; color: ${
                COLORS.text
              }; font-weight: 400;">vs prev day</span>
            </div>
          </div>
        </div>
      `;
    }

    const sessionsW = container.querySelector('#sessionsWidget');
    if (sessionsW) {
      sessionsW.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="widget-title" style="${
              UI_TOKENS.TEXT.WIDGET_LABEL
            }">Sessions</div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${
              COLORS.muted
            }" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <div style="margin-top: 12px;">
            <div style="${UI_TOKENS.TEXT.STAT}">${data.totalSessions}</div>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            } opacity: 0.5; font-size: 11px; margin-top: 4px;">Interactions ${
        data.isToday ? 'Today' : ''
      }</div>
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
      const netWpmVal =
        latestType && (latestType as any).netWpm !== undefined
          ? (latestType as any).netWpm
          : '--';
      const grossWpmVal = latestType ? latestType.wpm : '--';
      const accVal = latestType
        ? `${latestType.accuracy}%`
        : 'Awaiting Data...';
      const isHigh =
        latestType && ((latestType as any).netWpm || latestType.wpm) > 65;

      timerW.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="widget-title" style="${
              UI_TOKENS.TEXT.WIDGET_LABEL
            } opacity: 0.8;">WPM Analysis</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${
                isHigh
                  ? `<div style="${UI_TOKENS.TEXT.BADGE} color: var(--green); border: none; background: var(--green)/10; padding: 2px 6px;">Peak</div>`
                  : ''
              }
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${
                COLORS.muted
              }" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
                <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01"/><path d="M10 9h.01"/><path d="M14 9h.01"/><path d="M18 9h.01"/><path d="M6 13h.01"/><path d="M18 13h.01"/><path d="M10 13h.01"/><path d="M14 13h.01"/><path d="M8 17h8"/>
              </svg>
            </div>
          </div>
          <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: baseline; gap: 6px;">
              <div style="${
                UI_TOKENS.TEXT.STAT
              }; font-size: 28px; line-height: 1;">${netWpmVal}</div>
              <div style="${
                UI_TOKENS.TEXT.LABEL
              } opacity: 0.5; font-size: 11px;">Net WPM</div>
            </div>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            }; font-size: 11px; opacity: 0.6; font-weight: 700;">${accVal} accuracy • ${grossWpmVal} Gross</div>
          </div>
          <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash-border);">
             <div style="${
               UI_TOKENS.TEXT.LABEL
             } opacity: 0.5; font-size: 10px;">${
        latestType ? 'Last typing test' : 'History initializing...'
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
        <div class="glass-card activity-empty-state fg-text-center fg-p-10 fg-text-[13px] fg-text-[var(--muted)]" style="border-style: dashed; background: transparent;">
          No activity found for this period.
        </div>`;
      } else {
        // Force a clear if the date has changed, container is out-of-sync, or we're moving from empty to non-empty
        const isFreshRender =
          !lastViewedDate ||
          container.getAttribute('data-last-date') !== lastViewedDate ||
          activityG.querySelector('.activity-empty-state');

        if (isFreshRender) {
          activityG.innerHTML = '';
          container.setAttribute('data-last-date', lastViewedDate || '');
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

      // Group domains into "Others" if the list is too long (Industry Standard)
      const MAX_CHART_ITEMS = 7;
      let chartData = [...domainList];
      if (domainList.length > MAX_CHART_ITEMS + 1) {
        const top = domainList.slice(0, MAX_CHART_ITEMS);
        const others = domainList.slice(MAX_CHART_ITEMS);
        const othersTimeMs = others.reduce((acc, d) => acc + d.timeMs, 0);
        chartData = [
          ...top,
          {
            domain: 'Others',
            timeMs: othersTimeMs,
            sessions: 0,
            sharePct: 0,
          } as any,
        ];
      }

      const pastelColors = CHART_COLORS.map((c) => resolveToken(c));
      const bgColors = chartData.map(
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
          labels: chartData.map((d) => d.domain),
          datasets: [
            {
              data: chartData.map((d) => d.timeMs / 60000),
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
            renderDashboardPage(activeContainer, lastViewedDate);
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
