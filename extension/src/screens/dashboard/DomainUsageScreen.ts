import Chart from 'chart.js/auto';
import { fmtTime, formatMinutes } from '@stopaccess/core';
import {
  UI_TOKENS,
  renderBrandLogo,
  attachGlobalIconListeners,
  setupDateSelectorWidget,
} from '../../lib/ui';
import { COLORS } from '../../lib/designTokens';
import { attachCalendarWidget } from './CalendarWidget';

export async function renderDomainUsageScreen(
  container: HTMLElement,
  domain?: string,
  selectedDate?: string,
) {
  if (!container || !domain) {
    return;
  }

  // Check if we are already showing this domain to prevent re-flicker on data refresh
  const isAlreadyLoaded = container.getAttribute('data-domain-view') === domain;

  try {
    const { loadDomainUsageDetails } = await import(
      '../../../../packages/viewmodels/src/useDashboardVM'
    );
    const data = await loadDomainUsageDetails(domain, selectedDate);

    // Only update the outer structure if needed
    if (!isAlreadyLoaded) {
      container.setAttribute('data-domain-view', domain);
      container.innerHTML = `
        <div>
          <div class="fg-flex fg-items-center fg-justify-between fg-mb-8">
            <div class="fg-flex fg-items-center fg-gap-4">
              <button id="backToDash" class="fg-flex fg-items-center fg-justify-center fg-w-10 fg-h-10 fg-rounded-xl fg-bg-[${
                COLORS.glassBg
              }] fg-border fg-border-[${COLORS.glassBorder}] fg-text-[${
        COLORS.text
      }] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div class="fg-flex fg-items-center fg-gap-3">
                 ${renderBrandLogo(domain, domain, 44)}
                 <div>
                   <div style="${
                     UI_TOKENS.TEXT.HERO
                   }; font-size: 24px; letter-spacing: -0.02em;">${domain}</div>
                   <div id="usageStatusLabel" style="${
                     UI_TOKENS.TEXT.LABEL
                   }; opacity: 0.5;">Detailed Activity Report</div>
                 </div>
              </div>
            </div>
            
            <div id="dateSelectorWidget" style="padding: 2px; display: flex; align-items: center; gap: 4px; border-radius: 10px; background: ${
              COLORS.glassBg
            }; border: 1px solid ${COLORS.glassBorder};"></div>
          </div>

          <div id="domainUsageContentSlot" style="transition: all 0.3s ease-out;">
          </div>
        </div>
      `;

      // Re-attach back button listener immediately
      container.querySelector('#backToDash')?.addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'dash');
        url.searchParams.delete('domain');
        window.history.replaceState({}, '', url);
        window.dispatchEvent(
          new CustomEvent('sa_navigate', {
            detail: { tab: 'dash' },
          }),
        );
      });
    }

    const {
      series,
      totalTimeMs,
      totalSessions,
      avgTimePerSession,
      usageDeltaPct,
      targetDate,
      isToday,
    } = data;

    const isPositive = usageDeltaPct <= 0;
    const deltaColor = isPositive ? COLORS.green : COLORS.red;

    // Wire up Date Selector Widget
    const dateW = container.querySelector('#dateSelectorWidget') as HTMLElement;
    if (dateW) {
      setupDateSelectorWidget(
        container,
        dateW,
        { targetDate, isToday },
        (newDateStr: string) =>
          renderDomainUsageScreen(container, domain, newDateStr),
        attachCalendarWidget,
      );
    }

    const slot = container.querySelector('#domainUsageContentSlot');
    if (slot) {
      slot.innerHTML = `
        <div class="widget-grid fg-grid fg-grid-cols-4 fg-gap-4 fg-mb-8">
          <!-- Card 1: Daily Average -->
          <div class="glass-card fg-p-6" style="background: ${
            COLORS.glassBg
          }; border: 1px solid ${
        COLORS.glassBorder
      }; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; min-height: 140px;">
            <div style="${UI_TOKENS.TEXT.WIDGET_LABEL}">Daily Average</div>
            <div style="margin-top: 12px;">
              <div style="${UI_TOKENS.TEXT.STAT}">${fmtTime(
        totalTimeMs / 7,
      )}</div>
            </div>
            <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash);">
               <div style="${
                 UI_TOKENS.TEXT.LABEL
               } opacity: 0.8; font-size: 11px;">${Math.round(
        totalSessions / 7,
      )} <span style="opacity: 0.5; font-weight: 400;">sessions/day</span></div>
            </div>
          </div>

          <!-- Card 2: Today Usage -->
          <div class="glass-card fg-p-6" style="background: ${
            COLORS.glassBg
          }; border: 1px solid ${
        COLORS.glassBorder
      }; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; min-height: 140px;">
            <div style="${UI_TOKENS.TEXT.WIDGET_LABEL}">Today Usage</div>
            <div style="margin-top: 12px;">
              <div style="${UI_TOKENS.TEXT.STAT}">${fmtTime(
        series[series.length - 1]?.timeMs || 0,
      )}</div>
              <div style="${
                UI_TOKENS.TEXT.LABEL
              } color: ${deltaColor}; font-size: 11px; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                ${isPositive ? '↓' : '↑'} ${Math.abs(usageDeltaPct)}% 
                <span style="opacity: 0.5; color: ${
                  COLORS.text
                }; font-weight: 400;">vs yesterday</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Sessions -->
          <div class="glass-card fg-p-6" style="background: ${
            COLORS.glassBg
          }; border: 1px solid ${
        COLORS.glassBorder
      }; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; min-height: 140px;">
            <div style="${UI_TOKENS.TEXT.WIDGET_LABEL}">Sessions</div>
            <div style="margin-top: 12px;">
              <div style="${UI_TOKENS.TEXT.STAT}">${totalSessions}</div>
              <div style="${
                UI_TOKENS.TEXT.LABEL
              } opacity: 0.5; font-size: 11px; margin-top: 4px;">Total Interactions</div>
            </div>
            <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash);">
               <div style="${
                 UI_TOKENS.TEXT.LABEL
               } opacity: 0.8; font-size: 11px;">avg ${fmtTime(
        avgTimePerSession,
      )} <span style="opacity: 0.5; font-weight: 400;">per session</span></div>
            </div>
          </div>

          <!-- Card 4: Status -->
          <div class="glass-card fg-p-6" style="background: ${
            COLORS.glassBg
          }; border: 1px solid ${
        COLORS.glassBorder
      }; border-radius: 20px; display: flex; flex-direction: column; justify-content: space-between; min-height: 140px;">
            <div style="${UI_TOKENS.TEXT.WIDGET_LABEL}">App Status</div>
            <div style="margin-top: 12px;">
              <div style="${UI_TOKENS.TEXT.STAT}; color: ${
        isPositive ? COLORS.green : COLORS.text
      };">Active</div>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                 <div style="width: 8px; height: 8px; border-radius: 50%; background: ${
                   isPositive ? COLORS.green : COLORS.muted
                 };"></div>
                 <span style="${
                   UI_TOKENS.TEXT.LABEL
                 }; font-size: 11px; color: ${
        COLORS.text
      }; font-weight: 700;">Normal</span>
              </div>
            </div>
            <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--fg-white-wash);">
               <div style="${
                 UI_TOKENS.TEXT.LABEL
               } opacity: 0.5; font-size: 11px;">Rule is functioning</div>
            </div>
          </div>
        </div>

        <div class="glass-card fg-p-6" style="background: ${
          COLORS.glassBg
        }; border: 1px solid ${COLORS.glassBorder}; border-radius: 20px;">
          <div class="fg-flex fg-items-center fg-justify-between fg-mb-6">
            <div style="${
              UI_TOKENS.TEXT.HEADING
            }; font-size: 16px;">Usage History</div>
            <div style="${
              UI_TOKENS.TEXT.LABEL
            }; opacity: 0.4; font-size: 10px; letter-spacing: 0.05em;">Daily Usage</div>
          </div>
          <div style="height: 220px; width: 100%;">
            <canvas id="domainUsageChart"></canvas>
          </div>
        </div>
      `;

      // Update the status label
      const statusLabel = container.querySelector('#usageStatusLabel');
      if (statusLabel) {
        statusLabel.textContent = 'Detailed Activity Report';
      }

      // Smooth transition
      (slot as HTMLElement).style.opacity = '1';
      (slot as HTMLElement).style.filter = 'none';
    }

    const canvas = container.querySelector(
      '#domainUsageChart',
    ) as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      const docStyle = getComputedStyle(document.documentElement);
      const resolveToken = (token: string) => {
        const match = token.match(/var\(([^)]+)\)/);
        return match ? docStyle.getPropertyValue(match[1]).trim() : token;
      };

      const chartTextColor = resolveToken(UI_TOKENS.COLORS.TEXT) || COLORS.text;
      const accentColor = resolveToken('--fg-accent') || '#3b82f6';

      // Advanced Time-Based Scaling Logic
      const rawValues = series.map((s) => Math.round(s.timeMs / 60000));
      const maxVal = Math.max(...rawValues, 5);
      let stepSize = 1;
      if (maxVal <= 10) {
        stepSize = 2;
      } else if (maxVal <= 30) {
        stepSize = 10;
      } else if (maxVal <= 90) {
        stepSize = 30;
      } // Every 30 mins
      else if (maxVal <= 480) {
        stepSize = 60;
      } // Every 1 hour (up to 8h)
      else if (maxVal <= 960) {
        stepSize = 120;
      } // Every 2 hours (up to 16h)
      else {
        stepSize = 240;
      } // Every 4 hours

      const chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: series.map((s) => {
            const date = new Date(s.date + 'T00:00:00');
            return date.toLocaleDateString('en-US', { weekday: 'short' });
          }),
          datasets: [
            {
              label: 'Minutes',
              data: series.map((s) => Math.round(s.timeMs / 60000)),
              backgroundColor: accentColor,
              borderRadius: 8,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => formatMinutes(context.parsed.y),
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: chartTextColor, font: { weight: 600 } },
            },
            y: {
              beginAtZero: true,
              suggestedMax: stepSize * 4,
              grid: { color: resolveToken('--fg-white-wash') },
              border: { display: false },
              ticks: {
                color: chartTextColor,
                font: { weight: 600 },
                precision: 0,
                stepSize: stepSize,
                maxTicksLimit: 12,
                padding: 10,
                callback: (value: any) => formatMinutes(value),
              },
            },
          },
        },
      });
      console.log('Domain chart loaded:', chart.id);
    }

    attachGlobalIconListeners(container);
  } catch (e: any) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}
