import Chart from 'chart.js/auto';
import {
  fmtTime,
  buildDashboardTabPath,
  resolveFaviconUrl,
  findServiceIdByDomain,
  getRootDomain,
} from '@focusgate/core';
import { appsController } from '../../lib/appsController';

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
    container.innerHTML = '<div class="loader">Loading...</div>';
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
      syncMode,
      isNew,
      cloudBlockedQueries,
      focusEnd,
    } = data;

    const isFocusing = focusEnd > Date.now();
    let timerDisplay = '25:00';
    let timerStatusText = 'READY';
    let timerDotColor = 'var(--muted)';
    let timerTextColor = 'var(--text)';

    if (isFocusing) {
      const remainingMs = Math.max(0, focusEnd - Date.now());
      const m = Math.floor(remainingMs / 60000);
      const s = Math.floor((remainingMs % 60000) / 1000);
      timerDisplay = `${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
      timerStatusText = 'ACTIVE';
      timerDotColor = 'var(--accent)';
      timerTextColor = 'var(--accent)';
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

          <div class="fg-grid fg-gap-8" style="grid-template-columns: 3fr 2fr;">
            <div>
              <div class="section-label fg-text-[13px] fg-font-extrabold fg-tracking-[1px] fg-mb-5">CURRENT ACTIVITY</div>
              <div class="service-grid fg-gap-3" id="activityGrid" style="grid-template-columns: 1fr;"></div>
            </div>
            <div>
               <div class="section-label fg-text-[13px] fg-font-extrabold fg-tracking-[1px] fg-mb-5">USAGE BREAKDOWN</div>
               <div class="glass-card fg-p-6 fg-relative fg-overflow-hidden fg-flex fg-items-center fg-justify-center" id="chartSlot" style="border-radius: 20px; background: rgba(0,0,0,0.1); height: 260px;">
                  <canvas id="liveUsageChart" style="width: 100% !important; height: 210px !important;"></canvas>
               </div>
               <div class="fg-mt-5 fg-text-xs fg-text-[var(--muted)] fg-leading-normal fg-font-semibold">
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
          console.error('[FocusGate] Quick-block failed:', err);
        }
      });
    }

    // Dynamic Updates (runs every call)
    const setupSlot = container.querySelector('#setupGuardSlot');
    if (setupSlot) {
      const newSetupHtml = isNew
        ? `
        <div class="glass-card fg-p-10 fg-text-center fg-mb-8" style="background: rgba(0,0,0,0.1); border-color: var(--glass-border);">
          <div class="fg-font-black fg-text-[24px] fg-text-[var(--muted)] fg-mb-3" style="opacity: 0.1; letter-spacing: -2px;">FG</div>
          <div class="fg-text-[20px] fg-font-extrabold fg-text-[var(--text)] fg-mb-3">Setup Required</div>
          <div class="fg-text-[13px] fg-text-[var(--muted)] fg-max-w-[400px] fg-leading-relaxed fg-mb-8" style="margin-left: auto; margin-right: auto;">No block rules detected. Add a domain or link a profile to begin.</div>
          <div class="fg-flex fg-gap-4 fg-justify-center">
            <button class="btn-premium fg-justify-center" id="wb_settings" style="min-width: 180px;">Link Profile</button>
            <button class="btn-premium fg-justify-center" id="wb_apps" style="background:rgba(255,255,255,0.02); color:var(--text); border-color: var(--glass-border); box-shadow:none; min-width: 180px;">Add Rules</button>
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
        <div class="widget-title">Today Usage</div>
        <div>
          <div style="font-size:20px; font-weight:900; letter-spacing: -0.5px;">${fmtTime(
            allTotalMs as number,
          )}</div>
          <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform: uppercase; margin-top: 4px;">Recorded today</div>
        </div>
      `;
    }

    const timerW = container.querySelector('#timerWidget');
    if (timerW) {
      timerW.innerHTML = `
        <div class="widget-title">Timer Status</div>
        <div class="timer-display" style="font-size: 36px; letter-spacing: -2px; color: ${timerTextColor}; font-variant-numeric: tabular-nums;">${timerDisplay}</div>
        <div class="fg-flex fg-items-center fg-gap-2">
          <div style="width:8px; height:8px; border-radius:50%; background:${timerDotColor};"></div>
          <span class="fg-text-[10px] fg-font-extrabold fg-text-[var(--muted)] fg-uppercase fg-tracking-[1px]">${timerStatusText}</span>
        </div>
      `;
    }

    const connectionW = container.querySelector('#connectionWidget');
    if (connectionW) {
      connectionW.innerHTML = `
        <div class="widget-title">Connection</div>
        <div style="font-size:24px; font-weight:900; color:${
          syncStatus === 'connected' ? '#FFFFFF' : 'var(--muted)'
        }; opacity: 0.9;">
          ${syncStatus === 'connected' ? 'READY' : 'OFFLINE'}
        </div>
        <div class="fg-text-[10px] fg-text-[var(--muted)] fg-font-bold fg-uppercase fg-mt-1">
          Mode: ${(syncMode as string).toUpperCase()}
        </div>
      `;
    }

    const blockedW = container.querySelector('#blockedWidget');
    if (blockedW) {
      blockedW.innerHTML = `
        <div class="widget-title">Blocked Attempts</div>
        <div style="font-size:32px; font-weight:900; color:var(--text); opacity: 0.8;">${cloudBlockedQueries.toLocaleString()}</div>
        <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform: uppercase;">Verifiable Blocks Today</div>
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
          const iconUrl = resolveFaviconUrl(d.domain);
          const existingItem = activityG.querySelector(
            `.rule-item[data-domain="${d.domain}"]`,
          ) as HTMLElement;
          const badgeHtml = isBlocked
            ? '<div style="font-size:9px; font-weight:900; color:var(--red); background:rgba(255,71,87,0.1); border:1px solid rgba(255,71,87,0.2); border-radius:6px; padding:3px 7px; text-transform:uppercase; letter-spacing:0.5px;">BLOCKED</div>'
            : `<button class="quick-block-btn" data-domain="${d.domain}" title="Block ${d.domain}" style="width:26px; height:26px; border-radius:8px; background:rgba(108,71,255,0.1); border:1px solid rgba(108,71,255,0.3); color:var(--accent); font-size:16px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;">+</button>`;
          const statusLabelHtml = isBlocked
            ? '<span style="display:inline-flex; align-items:center; gap:4px;"><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style="color:var(--red);"><circle cx="12" cy="12" r="12"/></svg> BLOCKED</span>'
            : 'Monitoring';
          const timeColor = isBlocked ? 'rgba(255,255,255,0.3)' : 'var(--text)';

          const cardInner = `
                 <div class="fg-flex fg-items-center fg-gap-4 fg-min-w-0">
                    <div class="fg-shrink-0 fg-relative fg-flex fg-items-center fg-justify-center" style="width: 44px; height: 44px;">
                       <div class="placeholder-icon fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[var(--muted)]" style="opacity: 0.3;">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                       </div>
                       <img src="${iconUrl}" data-domain="${
            d.domain
          }" style="width: 36px; height:36px; object-fit: contain; z-index: 2; position: relative; display: none; border-radius: 20%;">
                    </div>
                   <div class="fg-min-w-0 fg-flex-1">
                     <div class="fg-text-sm fg-font-extrabold fg-truncate">${
                       d.domain
                     }</div>
                     <div class="row-status fg-text-[10px] fg-font-bold fg-uppercase fg-mt-[2px]" style="color: ${
                       isBlocked ? 'var(--red)' : 'var(--muted)'
                     }">
                       ${statusLabelHtml}
                     </div>
                   </div>
                   <div class="fg-flex fg-items-center fg-gap-[10px] fg-shrink-0">
                     <div class="row-time fg-text-[13px] fg-font-black" style="color:${timeColor}">${fmtTime(
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
              `padding: 14px 20px; background: rgba(255,255,255,0.01); border-left: 3px solid ${
                isBlocked ? 'var(--red)' : 'transparent'
              }; transition: border-color 0.2s;`,
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
          '<div class="chart-empty fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center fg-text-[var(--muted)] fg-text-[13px] fg-font-bold">No activity found.</div>';
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
        (e) => {
          const target = e.target as HTMLImageElement;
          if (
            target.tagName === 'IMG' &&
            target.parentElement?.classList.contains('fg-shrink-0')
          ) {
            target.style.display = 'block';
            (target.previousElementSibling as HTMLElement).style.display =
              'none';
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
            if (domain && !target.dataset.triedFallback) {
              target.dataset.triedFallback = 'true';
              target.src = `https://www.google.com/s2/favicons?domain=${getRootDomain(
                domain,
              )}&sz=64`;
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
              backgroundColor: '#3F3F46',
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
              ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: {
                color: '#FFFFFF',
                font: { size: 12, weight: '800' as any },
              },
            },
          },
        },
      });
    }

    if (!window.__dashStorageListener) {
      window.__dashStorageListener = (changes) => {
        if (changes.usage || changes.focus_mode_end_time || changes.rules) {
          if (document.querySelector('.nav-item[data-tab="dash"].active')) {
            renderDashboardPage(container);
          }
        }
      };
      chrome.storage.onChanged.addListener(window.__dashStorageListener);
    }
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}
