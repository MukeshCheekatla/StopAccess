import { getRules, updateRule } from '@focusgate/state/rules';
import Chart from 'chart.js/auto';
import {
  extensionAdapter as storage,
  STORAGE_KEYS,
  nextDNSApi,
} from '../background/platformAdapter.js';
import { fmtTime, buildDashboardTabPath } from '@focusgate/core';

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
  container.innerHTML = '<div class="loader">Loading...</div>';

  try {
    const rules = await getRules(storage);
    const usageRes = await chrome.storage.local.get(['usage']);
    const usage = usageRes.usage || {};

    const allTotalMs = Object.values(usage).reduce(
      (a, b) => a + (b.time || 0),
      0,
    );
    const domainList = Object.entries(usage)
      .map(([domain, d]) => ({
        domain,
        timeMs: d.time || 0,
        sessions: d.sessions || 0,
      }))
      .filter((d) => d.timeMs >= 60000)
      .sort((a, b) => b.timeMs - a.timeMs);

    const syncStatus = await storage.getString('nextdns_connection_status');
    const syncMode = (await storage.getString('fg_sync_mode')) || 'browser';

    const isNew = rules.length === 0 && !syncStatus;

    const focusEnd = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);
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

    const focusGoalMs = 120 * 60000;
    const focusPercent = Math.min(
      100,
      Math.round((allTotalMs / focusGoalMs) * 100),
    );
    const circleOffset = 201 - (201 * focusPercent) / 100;

    let cloudBlockedQueries = 0;
    if (syncStatus === 'connected') {
      try {
        const countersRes = await nextDNSApi.getAnalyticsCounters();
        if (countersRes.ok) {
          cloudBlockedQueries = countersRes.data.blocked || 0;
        }
      } catch (e) {
        console.warn('Real-time sync failed. Using local state.', e);
      }
    }

    container.innerHTML = `
      <div class="page-intro" style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: var(--accent); letter-spacing: 2px; margin-bottom: 12px;">OVERVIEW</div>
          <div style="font-size: 40px; font-weight: 900; letter-spacing: -1.8px; line-height: 0.9;">USAGE DATA</div>
          <div style="font-size: 14px; color: var(--muted); margin-top: 12px; font-weight: 500;">Direct monitoring of your digital activity.</div>
        </div>
        <div style="text-align: right;">
           <div style="font-size: 24px; font-weight: 800; letter-spacing: -1px;">${new Date().toLocaleDateString(
             undefined,
             { month: 'long', day: 'numeric' },
           )}</div>
           <div style="font-size: 12px; color: var(--muted); font-weight: 700; text-transform: uppercase; margin-top: 4px;">TODAY</div>
        </div>
      </div>

      ${
        isNew
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
          : ''
      }

      <div class="widget-grid">
        <div class="glass-card widget-card">
          <div class="widget-title">Engagement Today</div>
          <div style="display:flex; align-items:center; gap:20px;">
            <div class="stat-circle-container">
              <svg class="stat-circle-svg" width="64" height="64">
                <circle class="stat-circle-bg" cx="32" cy="32" r="30"/>
                <circle class="stat-circle-val" cx="32" cy="32" r="30" style="stroke-dasharray: 201; stroke-dashoffset: ${circleOffset}; stroke: var(--accent);"/>
              </svg>
              <div class="stat-circle-text" style="font-size: 14px;">${focusPercent}%</div>
            </div>
            <div>
              <div style="font-size:20px; font-weight:900; letter-spacing: -0.5px;">${fmtTime(
                allTotalMs,
              )}</div>
              <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform: uppercase;">Time Tracked</div>
            </div>
          </div>
        </div>

        <div class="glass-card widget-card" style="position: relative; overflow: hidden;">
          <div class="widget-title">Timer Status</div>
          <div class="timer-display" style="font-size: 36px; letter-spacing: -2px; color: ${timerTextColor}; font-variant-numeric: tabular-nums;">${timerDisplay}</div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:8px; height:8px; border-radius:50%; background:${timerDotColor};"></div>
            <span style="font-size:10px; font-weight:800; color:var(--muted); text-transform: uppercase; letter-spacing: 1px;">${timerStatusText}</span>
          </div>
        </div>

        <div class="glass-card widget-card">
          <div class="widget-title">Connection</div>
          <div style="font-size:24px; font-weight:900; color:${
            syncStatus === 'connected' ? '#FFFFFF' : 'var(--muted)'
          }; opacity: 0.9;">
            ${syncStatus === 'connected' ? 'READY' : 'OFFLINE'}
          </div>
          <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform: uppercase; margin-top: 4px;">
            Mode: ${syncMode.toUpperCase()}
          </div>
        </div>

        <div class="glass-card widget-card">
          <div class="widget-title">Blocked Attempts</div>
          <div style="font-size:32px; font-weight:900; color:var(--text); opacity: 0.8;">${cloudBlockedQueries.toLocaleString()}</div>
          <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform: uppercase;">Verifiable Blocks Today</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 32px;">
        <div>
          <div class="section-label" style="font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-bottom: 20px;">CURRENT ACTIVITY</div>
          <div class="service-grid" style="grid-template-columns: 1fr; gap: 12px;">
            ${
              domainList.length === 0
                ? `
              <div class="glass-card" style="text-align:center; padding:60px; color:var(--muted); font-size:13px; border-style: dashed; background: transparent;">
                No activity recorded in this session.
              </div>`
                : domainList
                    .map((d) => {
                      const isBlocked = rules.some(
                        (r) =>
                          (r.customDomain || r.packageName) === d.domain &&
                          (r.blockedToday || r.mode === 'block'),
                      );
                      const iconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                        d.domain,
                      )}&sz=64`;
                      return `
                <div class="rule-item" style="padding: 14px 20px; background: rgba(255,255,255,0.01); border-left: 3px solid ${
                  isBlocked ? 'var(--red)' : 'transparent'
                }; transition: border-color 0.2s;">
                   <div style="display:flex; align-items:center; gap:16px; min-width:0;">
                     <div style="width: 36px; height: 36px; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
                       <img src="${iconUrl}" style="width: 20px; height:20px; object-fit: contain;">
                     </div>
                     <div style="min-width:0; flex: 1;">
                       <div style="font-size:14px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${
                         d.domain
                       }</div>
                       <div style="font-size:10px; color:${
                         isBlocked ? 'var(--red)' : 'var(--muted)'
                       }; font-weight:700; text-transform: uppercase; margin-top: 2px;">
                         ${isBlocked ? '🔴 BLOCKED' : 'Monitoring'}
                       </div>
                     </div>
                     <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
                       <div style="font-size:13px; font-weight:900; color:${
                         isBlocked ? 'rgba(255,255,255,0.3)' : 'var(--text)'
                       }; text-decoration: ${
                        isBlocked ? 'line-through' : 'none'
                      }">${fmtTime(d.timeMs)}</div>
                       ${
                         isBlocked
                           ? '<div style="font-size:9px; font-weight:900; color:var(--red); background:rgba(255,71,87,0.1); border:1px solid rgba(255,71,87,0.2); border-radius:6px; padding:3px 7px; text-transform:uppercase; letter-spacing:0.5px;">BLOCKED</div>'
                           : `<button class="quick-block-btn" data-domain="${d.domain}" title="Block ${d.domain}" style="width:26px; height:26px; border-radius:8px; background:rgba(108,71,255,0.1); border:1px solid rgba(108,71,255,0.3); color:var(--accent); font-size:16px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0;">+</button>`
                       }
                     </div>
                   </div>
                </div>`;
                    })
                    .join('')
            }
          </div>
        </div>

        <div>
           <div class="section-label" style="font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-bottom: 20px;">USAGE BREAKDOWN</div>
           <div class="glass-card" style="padding: 24px; border-radius: 20px; background: rgba(0,0,0,0.1); height: 260px; position: relative; overflow: hidden; display:flex; align-items:center; justify-content:center;">
              <canvas id="liveUsageChart" style="width: 100% !important; height: 210px !important;"></canvas>
              ${
                domainList.length === 0
                  ? '<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 13px; font-weight: 700;">No activity found.</div>'
                  : ''
              }
           </div>
           <div style="margin-top: 20px; font-size: 12px; color: var(--muted); line-height: 1.5; font-weight: 600;">
             Real-time monitoring enabled. Data represents actual time recorded by the browser gate.
           </div>
        </div>
      </div>
    `;

    container
      .querySelector('#wb_settings')
      ?.addEventListener('click', openSettingsPage);
    container.querySelector('#wb_apps')?.addEventListener('click', () => {
      const btn = document.querySelector('.nav-item[data-tab="apps"]');
      if (btn) {
        btn.click();
      }
    });

    // Quick-block buttons on usage rows
    container.querySelectorAll('.quick-block-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const domain = btn.dataset.domain;
        if (!domain) {
          return;
        }
        btn.textContent = '…';
        btn.disabled = true;
        try {
          const newRule = {
            appName: domain,
            packageName: domain,
            customDomain: domain,
            type: 'domain',
            scope: 'profile',
            mode: 'block',
            blockedToday: true,
            desiredBlockingState: true,
            addedByUser: true,
            updatedAt: Date.now(),
          };
          const isConfig = await nextDNSApi.isConfigured();
          if (isConfig) {
            await nextDNSApi.setTargetState('domain', domain, true);
          }
          await updateRule(storage, newRule);
          chrome.runtime.sendMessage({ action: 'manualSync' });
          // Refresh the dashboard to reflect the new blocked state
          renderDashboardPage(container);
        } catch (err) {
          btn.textContent = '+';
          btn.disabled = false;
          console.error('[FocusGate] Quick-block failed:', err);
        }
      });
    });

    const ctx = container.querySelector('#liveUsageChart')?.getContext('2d');
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
              horizontal: true,
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
              ticks: { color: '#FFFFFF', font: { size: 12, weight: '800' } },
            },
          },
        },
      });
    }

    if (!window.__dashStorageListener) {
      window.__dashStorageListener = (changes) => {
        if (
          changes.usage ||
          changes[STORAGE_KEYS.FOCUS_END] ||
          changes[STORAGE_KEYS.RULES]
        ) {
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
