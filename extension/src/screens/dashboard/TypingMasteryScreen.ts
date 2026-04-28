import Chart from 'chart.js/auto';
import { UI_TOKENS } from '../../lib/ui';
import { COLORS } from '../../lib/designTokens';
import { getTypingHistory, getTypingStats } from '../../lib/typingHistory';

export async function renderTypingMasteryScreen(container: HTMLElement) {
  if (!container) {
    return;
  }

  const stats = await getTypingStats();
  const history = await getTypingHistory();

  container.setAttribute('data-mastery-active', 'true');
  container.innerHTML = `
    <div class="fg-animate-in fg-fade-in fg-duration-500">
      <div class="fg-flex fg-items-center fg-gap-5 fg-mb-10">
        <button id="backToDashFromTyping" class="fg-flex fg-items-center fg-justify-center fg-w-10 fg-h-10 fg-rounded-xl fg-bg-[${
          COLORS.glassBg
        }] fg-border fg-border-[${COLORS.glassBorder}] fg-text-[${
    COLORS.text
  }] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <div style="${
            UI_TOKENS.TEXT.HERO
          }" class="fg-text-[26px] fg-tracking-tight">Typing Mastery</div>
          <div style="${
            UI_TOKENS.TEXT.LABEL
          }" class="fg-text-sm">Detailed typing & performance metrics</div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="fg-grid fg-grid-cols-4 fg-gap-5 fg-mb-12">
        ${_renderStat('Peak Speed', `${stats.peakWpm}`, 'WPM', COLORS.green)}
        ${_renderStat('Avg. Speed', `${stats.avgWpm}`, 'WPM', COLORS.accent)}
        ${_renderStat(
          'Avg. Accuracy',
          `${stats.avgAccuracy}`,
          '%',
          COLORS.blue,
        )}
        ${_renderStat(
          'Total Tests',
          `${stats.totalSessions}`,
          'Tests',
          COLORS.muted,
        )}
      </div>

      <!-- Analysis Area -->
      <div class="fg-grid fg-grid-cols-12 fg-gap-6">
        <!-- History Table -->
        <div class="fg-col-span-12 lg:fg-col-span-7 glass-card fg-p-0 fg-overflow-hidden" style="border-radius: 24px;">
          <div class="fg-px-8 fg-py-6 fg-border-b fg-border-[var(--fg-glass-border)]">
             <div style="${
               UI_TOKENS.TEXT.LABEL
             }" class="fg-font-extrabold fg-tracking-widest fg-text-base">Session log</div>
          </div>
          
          <table class="fg-w-full fg-border-collapse">
            <thead>
              <tr style="background: ${COLORS.glassBg};">
                <th class="fg-text-left fg-px-8 fg-py-4 fg-text-[11px]" style="${
                  UI_TOKENS.TEXT.LABEL
                }">Time</th>
                <th class="fg-text-left fg-px-8 fg-py-4 fg-text-[11px]" style="${
                  UI_TOKENS.TEXT.LABEL
                }">WPM</th>
                <th class="fg-text-left fg-px-8 fg-py-4 fg-text-[11px]" style="${
                  UI_TOKENS.TEXT.LABEL
                }">Accuracy</th>
                <th class="fg-text-left fg-px-8 fg-py-4 fg-text-[11px]" style="${
                  UI_TOKENS.TEXT.LABEL
                }">Duration</th>
                <th class="fg-text-right fg-px-8 fg-py-4 fg-text-[11px]" style="${
                  UI_TOKENS.TEXT.LABEL
                }">Mistakes</th>
              </tr>
            </thead>
            <tbody>
              ${
                history.length > 0
                  ? history
                      .map(
                        (s) => `
                <tr class="fg-border-b fg-border-[var(--fg-glass-border)] hover:fg-bg-[var(--fg-white-wash-border)]/20 fg-transition-colors">
                  <td class="fg-px-8 fg-py-5 fg-text-[13px]" style="${
                    UI_TOKENS.TEXT.CARD_TITLE
                  }">${_formatTs(s.timestamp)}</td>
                  <td class="fg-px-8 fg-py-5">
                    <div style="${UI_TOKENS.TEXT.CARD_TITLE}; color: ${
                          s.wpm > 65 ? COLORS.green : COLORS.text
                        }">${s.wpm}</div>
                  </td>
                  <td class="fg-px-8 fg-py-5 fg-font-bold" style="${
                    UI_TOKENS.TEXT.LABEL
                  }; color: ${s.accuracy > 95 ? COLORS.green : COLORS.text}">${
                          s.accuracy
                        }%</td>
                  <td class="fg-px-8 fg-py-5 fg-opacity-80" style="${
                    UI_TOKENS.TEXT.LABEL
                  }">${_formatDuration(s.duration)}</td>
                  <td class="fg-px-8 fg-py-5 fg-text-right" style="${
                    UI_TOKENS.TEXT.LABEL
                  }; color: ${s.mistakes > 5 ? COLORS.red : COLORS.muted}">${
                          s.mistakes
                        }</td>
                </tr>
              `,
                      )
                      .join('')
                  : `
                <tr>
                  <td colspan="5" class="fg-px-8 fg-py-20 fg-text-center" style="${UI_TOKENS.TEXT.SUBTEXT}">No typing history recorded yet. Complete a challenge to see your data.</td>
                </tr>
              `
              }
            </tbody>
          </table>
        </div>

        <!-- Trend Chart -->
        <div class="fg-col-span-12 lg:fg-col-span-5 glass-card fg-p-8 fg-flex fg-flex-col" style="border-radius: 24px; min-height: 480px;">
           <div style="${
             UI_TOKENS.TEXT.LABEL
           }" class="fg-font-extrabold fg-tracking-widest fg-text-base fg-mb-6">Performance trend</div>
           <div class="fg-flex-1 fg-relative fg-flex fg-items-center fg-justify-center">
             ${
               history.length < 2
                 ? `
                <div class="fg-text-center fg-flex fg-flex-col fg-items-center fg-gap-4">
                  <div class="fg-w-16 fg-h-16 fg-rounded-full fg-bg-[var(--fg-glass-bg)] fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-muted)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                  </div>
                  <div style="${UI_TOKENS.TEXT.SUBTEXT}; font-size: 13px; max-width: 200px; line-height: 1.6;">Complete more typing tests to visualize your speed trend.</div>
                </div>
             `
                 : '<canvas id="typingTrendChart"></canvas>'
             }
           </div>
        </div>
      </div>
    </div>
  `;

  container
    .querySelector('#backToDashFromTyping')
    ?.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'dash');
      window.history.replaceState({}, '', url);
      window.dispatchEvent(
        new CustomEvent('sa_navigate', {
          detail: { tab: 'dash' },
        }),
      );
    });

  // Initialize Chart
  const canvas = container.querySelector(
    '#typingTrendChart',
  ) as HTMLCanvasElement;
  if (canvas) {
    // Explicitly set dimensions to ensure ChartJS has space
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    canvas.style.minHeight = '320px';
    canvas.style.border = '1px solid rgba(255,0,0,0.05)';

    setTimeout(() => {
      if (!document.contains(canvas)) {
        return;
      }

      const chartData = [...history].reverse();

      if ((window as any).__typingTrendChart) {
        (window as any).__typingTrendChart.destroy();
        (window as any).__typingTrendChart = null;
      }

      (window as any).__typingTrendChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: chartData.map((s) =>
            new Date(s.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          ),
          datasets: [
            {
              label: 'WPM',
              data: chartData.map((s) => s.wpm),
              borderColor: '#4f46e5', // Indigo primary
              backgroundColor: 'rgba(79, 70, 229, 0.08)', // Very subtle fill
              borderWidth: 2,
              tension: 0.1, // Sharp stock-market style
              pointRadius: 3,
              pointBackgroundColor: '#4f46e5',
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              display: true,
              grid: { display: false },
              ticks: {
                color: '#94a3b8',
                font: { size: 10, weight: '600' as any },
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0,0,0,0.05)' },
              ticks: {
                color: '#64748b',
                font: { size: 10, weight: '600' as any },
                padding: 8,
              },
            },
          },
        },
      });
    }, 100);
  }

  // Live Update Listener
  if (!(window as any).__typingStorageListener) {
    (window as any).__typingStorageListener = (changes: any) => {
      if (changes.fg_typing_mastery_log) {
        // Find the active dashboard container and re-render if visible
        const currentContainer = document.querySelector(
          '.dashboard-content-slot',
        ) as HTMLElement;
        const isMasteryActive = !!document.querySelector(
          '[data-mastery-active="true"]',
        );

        if (currentContainer && isMasteryActive) {
          renderTypingMasteryScreen(currentContainer);
        }
      }
    };
    chrome.storage.onChanged.addListener(
      (window as any).__typingStorageListener,
    );
  }
}

function _renderStat(
  label: string,
  value: string,
  unit: string,
  color: string,
) {
  return `
    <div class="glass-card fg-p-6 fg-flex fg-flex-col fg-gap-3" style="border-radius: 20px;">
      <div style="${
        UI_TOKENS.TEXT.LABEL
      }" class="fg-text-[13px] fg-font-extrabold">${label}</div>
      <div class="fg-flex fg-items-baseline fg-gap-1.5">
        <div style="${UI_TOKENS.TEXT.STAT}; color: ${
    value === '0' ? COLORS.muted : color
  }">${value}</div>
        <div style="${
          UI_TOKENS.TEXT.LABEL
        }" class="fg-text-[11px] fg-font-extrabold fg-opacity-70">${unit}</div>
      </div>
    </div>
  `;
}

function _formatTs(ts: number) {
  const d = new Date(ts);
  return (
    d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) +
    ', ' +
    d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  );
}

function _formatDuration(seconds: number) {
  const s = Math.floor(seconds);
  if (s < 60) {
    return `${s}s`;
  }
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}
