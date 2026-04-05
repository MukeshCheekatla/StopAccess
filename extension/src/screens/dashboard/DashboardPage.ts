import Chart from 'chart.js/auto';
import {
  fmtTime,
  buildDashboardTabPath,
  resolveFaviconUrl,
  findServiceIdByDomain,
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
            <div class="glass-card widget-card" style="position: relative; overflow: hidden;" id="timerWidget"></div>
            <div class="glass-card widget-card" id="connectionWidget"></div>
            <div class="glass-card widget-card" id="blockedWidget"></div>
          </div>

          <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 32px;">
            <div>
              <div class="section-label" style="font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-bottom: 20px;">CURRENT ACTIVITY</div>
              <div class="service-grid" id="activityGrid" style="grid-template-columns: 1fr; gap: 12px;"></div>
            </div>
            <div>
               <div class="section-label" style="font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-bottom: 20px;">USAGE BREAKDOWN</div>
               <div class="glass-card" style="padding: 24px; border-radius: 20px; background: rgba(0,0,0,0.1); height: 260px; position: relative; overflow: hidden; display:flex; align-items:center; justify-content:center;" id="chartSlot">
                  <canvas id="liveUsageChart" style="width: 100% !important; height: 210px !important;"></canvas>
               </div>
               <div style="margin-top: 20px; font-size: 12px; color: var(--muted); line-height: 1.5; font-weight: 600;">
                 Real-time monitoring enabled. Data represents actual time recorded by the browser gate.
               </div>
            </div>
          </div>
        </div>
      `;
    }

    const setupSlot = container.querySelector('#setupGuardSlot');
    if (setupSlot) {
      setupSlot.innerHTML = isNew
        ? `
        <div class="glass-card" style="padding: 40px; background: rgba(0,0,0,0.1); margin-bottom: 32px; text-align: center; border-color: var(--glass-border);">
          <div style="font-weight: 900; font-size: 24px; color: var(--muted); opacity: 0.1; margin-bottom: 12px; letter-spacing: -2px;">FG</div>
          <div style="font-size: 20px; font-weight: 800; margin-bottom: 12px; color: var(--text);">Setup Required</div>
          <div style="font-size: 13px; color: var(--muted); max-width: 400px; margin: 0 auto 32px auto; line-height: 1.6;">No block rules detected. Add a domain or link a profile to begin.</div>
          <div style="display:flex; gap:16px; justify-content:center;">
            <button class="btn-premium" id="wb_settings" style="min-width: 180px; justify-content: center;">Link Profile</button>
            <button class="btn-premium" style="background:rgba(255,255,255,0.02); color:var(--text); border-color: var(--glass-border); box-shadow:none; min-width: 180px; justify-content: center;" id="wb_apps">Add Rules</button>
          </div>
        </div>`
        : '';
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
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:8px; height:8px; border-radius:50%; background:${timerDotColor};"></div>
          <span style="font-size:10px; font-weight:800; color:var(--muted); text-transform: uppercase; letter-spacing: 1px;">${timerStatusText}</span>
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
        <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform: uppercase; margin-top: 4px;">
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
        <div class="glass-card" style="text-align:center; padding:60px; color:var(--muted); font-size:13px; border-style: dashed; background: transparent;">
          No activity recorded in this session.
        </div>`;
      } else {
        // Clear "No activity" message if it exists
        if (activityG.querySelector('.glass-card')) {
          activityG.innerHTML = '';
        }

        domainList.forEach((d) => {
          const isBlocked = rules.some((r) => {
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

          // Use the data-domain as a persistent key to avoid full card recreation
          const existingItem = activityG.querySelector(
            `.rule-item[data-domain="${d.domain}"]`,
          ) as HTMLElement;
          const badgeHtml = isBlocked
            ? '<div style="font-size:9px; font-weight:900; color:var(--red); background:rgba(255,71,87,0.1); border:1px solid rgba(255,71,87,0.2); border-radius:6px; padding:3px 7px; text-transform:uppercase; letter-spacing:0.5px;">BLOCKED</div>'
            : `<button class="quick-block-btn" data-domain="${d.domain}" title="Block ${d.domain}" style="width:26px; height:26px; border-radius:8px; background:rgba(108,71,255,0.1); border:1px solid rgba(108,71,255,0.3); color:var(--accent); font-size:16px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;">+</button>`;
          const statusLabelHtml = isBlocked ? '🔴 BLOCKED' : 'Monitoring';
          const timeColor = isBlocked ? 'rgba(255,255,255,0.3)' : 'var(--text)';

          const cardInner = `
                 <div style="display:flex; align-items:center; gap:16px; min-width:0;">
                   <div style="width: 36px; height: 36px; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
                     <img src="${iconUrl}" style="width: 20px; height:20px; object-fit: contain;">
                   </div>
                   <div style="min-width:0; flex: 1;">
                     <div style="font-size:14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${
                       d.domain
                     }</div>
                     <div class="row-status" style="font-size:10px; color:${
                       isBlocked ? 'var(--red)' : 'var(--muted)'
                     }; font-weight:700; text-transform: uppercase; margin-top: 2px;">
                       ${statusLabelHtml}
                     </div>
                   </div>
                   <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                     <div class="row-time" style="font-size:13px; font-weight:900; color:${timeColor}">${fmtTime(
            d.timeMs,
          )}</div>
                     <div class="row-action">${badgeHtml}</div>
                   </div>
                 </div>
                `;

          if (existingItem) {
            // Optimization: Only update inner if domain data changed
            const statusNode = existingItem.querySelector('.row-status');
            const currentLabel = statusNode?.textContent?.trim();
            if (currentLabel !== statusLabelHtml) {
              existingItem.innerHTML = cardInner;
              existingItem.style.borderLeftColor = isBlocked
                ? 'var(--red)'
                : 'transparent';
            } else {
              // Update time only
              const tDisp = existingItem.querySelector('.row-time');
              if (tDisp && tDisp.textContent !== fmtTime(d.timeMs)) {
                tDisp.textContent = fmtTime(d.timeMs);
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
          '<div class="chart-empty" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 13px; font-weight: 700;">No activity found.</div>';
      }
    } else if (chartSlot) {
      chartSlot.querySelector('.chart-empty')?.remove();
    }

    container
      .querySelector('#wb_settings')
      ?.addEventListener('click', openSettingsPage);
    container.querySelector('#wb_apps')?.addEventListener('click', () => {
      const btn = document.querySelector(
        '.nav-item[data-tab="apps"]',
      ) as HTMLElement;
      if (btn) {
        btn.click();
      }
    });

    // Quick-block buttons on usage rows
    container.querySelectorAll('.quick-block-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const btnElement = btn as HTMLButtonElement;
        const domain = btnElement.dataset.domain;
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
    });

    const canvas = container.querySelector(
      '#liveUsageChart',
    ) as HTMLCanvasElement;
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
