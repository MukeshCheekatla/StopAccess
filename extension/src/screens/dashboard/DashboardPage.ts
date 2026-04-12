import Chart from 'chart.js/auto';
import {
  fmtTime,
  buildDashboardTabPath,
  findServiceIdByDomain,
  getRootDomain,
} from '@stopaccess/core';
import { appsController } from '../../lib/appsController';
import { getCachedIcon, saveIconToCache } from '../../lib/iconCache';
import { UI_TOKENS, renderLoader } from '../../lib/ui';

// This function opens the extension settings page
function openSettingsPage() {
  const url = chrome.runtime.getURL(buildDashboardTabPath('settings'));
  chrome.tabs.create({ url });
}

// Key rendering function for the Dashboard (Overview) page
export async function renderDashboardPage(container) {
  if (!container) {
    return;
  }
  if (
    !container.innerHTML ||
    container.innerHTML === '<div class="empty-state"></div>'
  ) {
    container.innerHTML = renderLoader();
  }

  try {
    const { loadDashboardData } = await import(
      '../../../../packages/viewmodels/src/useDashboardVM'
    );
    const data = await loadDashboardData();
    const {
      rules,
      allTotalMs,
      domainList,
      syncStatus,
      isNew,
      cloudBlockedQueries,
      focusEnd,
    } = data;

    // Load icon cache for instant render
    const iconLookup: Record<string, string> = {};
    for (const d of domainList) {
      iconLookup[d.domain] = (await getCachedIcon(d.domain)) || '';
    }

    const isFocusing = focusEnd > Date.now();
    let timerDisplay = '25:00';
    let timerStatusText = 'READY';
    let timerDotColor = 'var(--fg-muted)';
    let timerTextColor = 'var(--fg-text)';

    if (isFocusing) {
      const remainingMs = Math.max(0, focusEnd - Date.now());
      const m = Math.floor(remainingMs / 60000);
      const s = Math.floor((remainingMs % 60000) / 1000);
      timerDisplay = `${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
      timerStatusText = 'ACTIVE';
      timerDotColor = 'var(--fg-green)'; // Use a more distinct local color for active state
      timerTextColor = 'var(--fg-text)';
    }

    // Live update helper
    const updateTimer = () => {
      const displayEl = container.querySelector('#timerDisplay');
      const statusEl = container.querySelector('#timerStatus');
      const dotEl = container.querySelector('#timerDot');
      if (!displayEl || !statusEl || !dotEl) {
        return;
      }

      const now = Date.now();
      const isActive = focusEnd > now;
      if (!isActive) {
        displayEl.textContent = '25:00';
        statusEl.textContent = 'READY';
        displayEl.style.color = 'var(--fg-text)';
        statusEl.style.color = 'var(--fg-text)';
        statusEl.style.fontWeight = '900';
        dotEl.style.background = 'var(--fg-muted)';
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
      statusEl.textContent = 'ACTIVE';
      statusEl.style.color = 'var(--fg-text)';
      statusEl.style.fontWeight = '950';
      dotEl.style.background = 'var(--fg-green)';
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

          <div class="widget-grid">
            <div class="glass-card widget-card" id="engagementWidget"></div>
            <div class="glass-card widget-card fg-relative fg-overflow-hidden" id="timerWidget"></div>
            <div class="glass-card widget-card" id="connectionWidget"></div>
            <div class="glass-card widget-card" id="blockedWidget"></div>
          </div>

          <div class="fg-grid fg-gap-8" style="grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start;">
            <div>
              <div class="section-label" style="${UI_TOKENS.TEXT.LABEL} margin-bottom: 20px;">CURRENT ACTIVITY</div>
              <div class="service-grid fg-gap-3" id="activityGrid" style="grid-template-columns: 1fr;"></div>
            </div>
            <div>
               <div class="section-label" style="${UI_TOKENS.TEXT.LABEL} margin-bottom: 20px;">USAGE BREAKDOWN</div>
               <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden fg-flex fg-items-center fg-justify-center" id="chartSlot" style="border-radius: 20px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); height: 260px;">
                  <canvas id="liveUsageChart" style="width: 100% !important; height: 210px !important;"></canvas>
               </div>
               <div class="fg-mt-5 fg-text-xs fg-text-[var(--fg-text)] fg-opacity-80 fg-leading-normal fg-font-semibold">
                 Real-time monitoring enabled. Data represents actual time recorded by the browser gate.
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
        ? `
        <div class="glass-card fg-p-10 fg-text-center fg-mb-8" style="background: var(--fg-glass-bg); border-color: var(--fg-glass-border);">
          <div class="fg-font-black fg-text-[24px] fg-text-[var(--fg-text)] fg-mb-3" style="opacity: 0.4; letter-spacing: -2px;">FG</div>
          <div class="fg-text-[20px] fg-font-extrabold fg-text-[var(--fg-text)] fg-mb-3">Setup Required</div>
          <div class="fg-text-sm fg-text-[var(--fg-text)] fg-opacity-70 fg-max-w-[400px] fg-leading-relaxed fg-mb-8" style="margin-left: auto; margin-right: auto;">No block rules detected. Add a domain or link a profile to begin.</div>
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

    const engagementW = container.querySelector('#engagementWidget');
    if (engagementW) {
      engagementW.innerHTML = `
        <div class="widget-title" style="color: var(--fg-text); font-weight: 950; font-size: 11px; letter-spacing: 0.1em; opacity: 1;">TODAY USAGE</div>
        <div>
          <div style="font-size:24px; font-weight:900; letter-spacing: -0.5px; color: var(--fg-text);">${fmtTime(
            allTotalMs as number,
          )}</div>
          <div style="font-size:11px; color:var(--fg-text); opacity: 0.6; font-weight:700; text-transform: uppercase; margin-top: 4px;">Recorded today</div>
        </div>
      `;
    }

    const timerW = container.querySelector('#timerWidget');
    if (timerW) {
      timerW.innerHTML = `
        <div class="widget-title" style="color: var(--fg-text); font-weight: 950; font-size: 11px; letter-spacing: 0.1em; opacity: 1;">TIMER STATUS</div>
        <div class="timer-display" id="timerDisplay" style="font-size: 48px; font-weight: 950; letter-spacing: -3px; color: ${timerTextColor}; font-variant-numeric: tabular-nums;">${timerDisplay}</div>
        <div class="fg-flex fg-items-center fg-gap-2">
          <div id="timerDot" style="width:10px; height:10px; border-radius:50%; background:${timerDotColor};"></div>
          <span id="timerStatus" style="font-size: 12px; font-weight: 950; color: var(--fg-text); text-transform: uppercase; letter-spacing: 1.5px;">${timerStatusText}</span>
        </div>
      `;
    }

    const connectionW = container.querySelector('#connectionWidget');
    if (connectionW) {
      connectionW.innerHTML = `
        <div class="widget-title" style="color: var(--fg-text); font-weight: 950; font-size: 11px; letter-spacing: 0.1em; opacity: 1;">CONNECTION</div>
        <div style="font-size:24px; font-weight:950; color:${
          syncStatus === 'connected' ? 'var(--fg-text)' : 'var(--fg-muted)'
        };">
          ${syncStatus === 'connected' ? 'READY' : 'OFFLINE'}
        </div>
        <div class="fg-text-[10px] fg-text-[var(--fg-text)] fg-font-black fg-uppercase fg-mt-1">
          CLOUD SYNC
        </div>
      `;
    }

    const blockedW = container.querySelector('#blockedWidget');
    if (blockedW) {
      blockedW.innerHTML = `
        <div class="widget-title" style="color: var(--fg-text); font-weight: 950; font-size: 11px; letter-spacing: 0.1em; opacity: 1;">DNS BLOCKS</div>
        <div style="font-size:32px; font-weight:950; color:var(--fg-text);">${cloudBlockedQueries.toLocaleString()}</div>
        <div style="font-size:11px; color:var(--fg-text); opacity: 0.6; font-weight:700; text-transform: uppercase; margin-top: 4px;">Reported from DNS analytics</div>
      `;
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

          const rootDomain = getRootDomain(d.domain);
          const cached = iconLookup[d.domain];
          const iconUrl = cached || `https://logo.clearbit.com/${rootDomain}`;

          const existingItem = activityG.querySelector(
            `.rule-item[data-domain="${d.domain}"]`,
          ) as HTMLElement;
          const badgeHtml = isBlocked
            ? '<div style="font-size:9px; font-weight:900; color:var(--red); background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); border-radius:6px; padding:3px 7px; text-transform:uppercase; letter-spacing:0.5px;">BLOCKED</div>'
            : `<button class="quick-block-btn" data-domain="${d.domain}" title="Block ${d.domain}" style="width:26px; height:26px; border-radius:8px; background:var(--fg-glass-bg); border:1px solid var(--fg-glass-border); color:var(--accent); font-size:16px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;">+</button>`;
          const statusLabelHtml = isBlocked
            ? '<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style="color:var(--red);"><circle cx="12" cy="12" r="12"/></svg> BLOCKED</span>'
            : '<span style="color: var(--fg-text); opacity: 0.7;">Monitoring</span>';
          const timeColor = 'var(--fg-text)';

          const cardInner = `
                 <div class="fg-flex fg-items-center fg-gap-3 fg-min-w-0">
                    <div class="fg-shrink-0 fg-relative fg-flex fg-items-center fg-justify-center" style="width: 38px; height: 38px;">
                       <div class="placeholder-icon fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-text)]" style="opacity: 0.5;">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                       </div>
                       <img src="${iconUrl}" data-domain="${
            d.domain
          }" style="width: 30px; height:30px; object-fit: contain; z-index: 2; position: relative; display: ${
            cached ? 'block' : 'none'
          }; border-radius: 20%;">
                    </div>
                   <div class="fg-min-w-0 fg-flex-1">
                     <div class="fg-text-[13px] fg-font-extrabold fg-truncate">${
                       d.domain
                     }</div>
                     <div class="row-status fg-text-[11px] fg-font-bold fg-uppercase fg-mt-[2px]" style="color: ${
                       isBlocked ? 'var(--red)' : 'var(--fg-text)'
                     }; opacity: 1;">
                       ${statusLabelHtml}
                     </div>
                   </div>
                   <div class="fg-flex fg-items-center fg-gap-[8px] fg-shrink-0">
                     <div class="row-time fg-text-[12px] fg-font-black" style="color:${timeColor}">${fmtTime(
            d.timeMs,
          )}</div>
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

    const chartSlot = container.querySelector('#chartSlot');
    if (chartSlot && domainList.length === 0) {
      if (!chartSlot.querySelector('.chart-empty')) {
        chartSlot.innerHTML +=
          '<div class="chart-empty fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-text)] fg-opacity-60 fg-text-[13px] fg-font-bold">No activity found.</div>';
      }
    } else if (chartSlot) {
      chartSlot.querySelector('.chart-empty')?.remove();
    }

    // Chart and icon logic
    const canvas = container.querySelector(
      '#liveUsageChart',
    ) as HTMLCanvasElement;
    if (!container.__iconListenersAttached) {
      container.addEventListener(
        'load',
        async (e) => {
          const target = e.target as HTMLImageElement;
          if (
            target.tagName === 'IMG' &&
            target.parentElement?.classList.contains('fg-shrink-0')
          ) {
            if (target.naturalWidth > 1) {
              target.style.display = 'block';
              (target.previousElementSibling as HTMLElement).style.display =
                'none';
              const domain = target.dataset.domain;
              if (domain) {
                saveIconToCache(domain, target.src);
              }
            } else {
              target.dispatchEvent(new Event('error'));
            }
          }
        },
        true,
      );
      container.addEventListener(
        'error',
        (e) => {
          const target = e.target as HTMLImageElement;
          if (
            target.tagName === 'IMG' &&
            target.parentElement?.classList.contains('fg-shrink-0')
          ) {
            const domain = target.dataset.domain;
            const currentUrl = target.src;
            if (currentUrl.includes('logo.clearbit.com') && domain) {
              target.src = `https://www.google.com/s2/favicons?domain=${getRootDomain(
                domain,
              )}&sz=128`;
            } else {
              target.style.display = 'none';
              (target.previousElementSibling as HTMLElement).style.display =
                'flex';
            }
          }
        },
        true,
      );
      container.__iconListenersAttached = true;
    }

    const ctx = canvas?.getContext('2d');
    if (ctx && domainList.length > 0) {
      if (window.__dashPulseChart) {
        window.__dashPulseChart.destroy();
      }
      window.__dashPulseChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: domainList.map((d) => d.domain),
          datasets: [
            {
              data: domainList.map((d) => Math.floor(d.timeMs / 60000)),
              backgroundColor:
                getComputedStyle(document.documentElement)
                  .getPropertyValue('--fg-chart-bar')
                  .trim() || '#E2E8F0',
              borderRadius: 6,
              barThickness: 20,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              beginAtZero: true,
              grid: { display: false },
              ticks: { color: 'var(--fg-muted)', font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: {
                color: 'var(--fg-text)',
                font: { size: 12, weight: '800' as any },
              },
            },
          },
        },
      });
    }

    (window as any).__dashActiveContainer = container;

    if (!window.__dashStorageListener) {
      window.__dashStorageListener = (changes) => {
        const activeContainer = (window as any).__dashActiveContainer;
        if (changes.usage || changes.focus_mode_end_time || changes.rules) {
          if (
            activeContainer &&
            document.contains(activeContainer) &&
            document.querySelector('.nav-item[data-tab="dash"].active')
          ) {
            renderDashboardPage(activeContainer);
          }
        }
      };
      chrome.storage.onChanged.addListener(window.__dashStorageListener);
    }
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}
