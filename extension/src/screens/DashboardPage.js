import { getRules } from '@focusgate/state/rules';
import Chart from 'chart.js/auto';
import {
  extensionAdapter as storage,
  STORAGE_KEYS,
  nextDNSApi,
} from '../background/platformAdapter.js';
import { getAppIconUrl as getSmartIcon, fmtTime } from '@focusgate/core';

function openSettingsPage() {
  const url = chrome.runtime.getURL('dist/dashboard.html') + '?tab=settings';
  chrome.tabs.create({ url });
}

export async function renderDashboardPage(container) {
  if (!container) {
    return;
  }
  container.innerHTML = '<div class="loader">Gathering Insights...</div>';

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
    let timerStatusText = 'SYSTEM READY';
    let timerDotColor = 'var(--green)';
    let timerTextColor = 'var(--text)';

    if (isFocusing) {
      const remainingMs = Math.max(0, focusEnd - Date.now());
      const m = Math.floor(remainingMs / 60000);
      const s = Math.floor((remainingMs % 60000) / 1000);
      timerDisplay = `${m.toString().padStart(2, '0')}:${s
        .toString()
        .padStart(2, '0')}`;
      timerStatusText = 'ACTIVE FLOW';
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
        console.warn('Failed to fetch real cloud counters', e);
      }
    }

    container.innerHTML = `
      <div class="page-intro" style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: var(--accent); letter-spacing: 2px; margin-bottom: 8px;">DASHBOARD OVERVIEW</div>
          <div style="font-size: 40px; font-weight: 900; letter-spacing: -1.8px; line-height: 0.9;">FOCUS CONTROL</div>
          <div style="font-size: 14px; color: var(--muted); margin-top: 12px; font-weight: 500;">Monitor and manage your digital focus perimeter.</div>
        </div>
        <div style="text-align: right;">
           <div style="font-size: 24px; font-weight: 800; letter-spacing: -1px;">${new Date().toLocaleDateString(
             undefined,
             { month: 'long', day: 'numeric' },
           )}</div>
           <div style="font-size: 12px; color: var(--muted); font-weight: 700; text-transform: uppercase; margin-top: 4px;">Daily Stats</div>
        </div>
      </div>

      ${
        isNew
          ? `
        <div class="glass-card" style="padding: 40px; background: linear-gradient(135deg, rgba(148, 163, 184, 0.05), rgba(10, 10, 15, 0.2)); margin-bottom: 32px; text-align: center; border-color: rgba(148, 163, 184, 0.2);">
          <div style="font-size: 64px; margin-bottom: 24px; opacity: 0.8;">🛡️</div>
          <div style="font-size: 20px; font-weight: 800; margin-bottom: 12px; color: var(--text);">Initialize Your Defense</div>
          <div style="font-size: 13px; color: var(--muted); max-width: 400px; margin: 0 auto 32px auto; line-height: 1.6;">Your focus workspace is currently unsecured. Link your NextDNS cloud profile or define local block rules to begin.</div>
          <div style="display:flex; gap:16px; justify-content:center;">
            <button class="btn-premium" id="wb_settings" style="min-width: 180px; justify-content: center;">Link Cloud Profile</button>
            <button class="btn-premium" style="background:rgba(255,255,255,0.02); color:var(--text); border-color: var(--glass-border); box-shadow:none; min-width: 180px; justify-content: center;" id="wb_apps">Add Focus Rules</button>
          </div>
        </div>
      `
          : ''
      }

      <div class="widget-grid">
        <div class="glass-card widget-card">
          <div class="widget-title">Core Focus Vitality</div>
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
              <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform: uppercase;">Engagement Today</div>
            </div>
          </div>
        </div>

        <div class="glass-card widget-card">
          <div class="widget-title">Active Flow Timer</div>
          <div class="timer-display" style="font-size: 32px; color: ${timerTextColor};">${timerDisplay}</div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:10px; height:10px; border-radius:50%; background:${timerDotColor}; opacity: 0.8; box-shadow: 0 0 8px ${timerDotColor};"></div>
            <span style="font-size:11px; font-weight:800; color:var(--muted); text-transform: uppercase;">${timerStatusText}</span>
          </div>
        </div>

        <div class="glass-card widget-card" id="cardShieldIntegrity">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
             <div class="widget-title" style="margin-bottom: 0;">Shield integrity</div>
             <button class="btn-outline" id="btnDashSync" style="font-size: 8px; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; font-weight: 800; border-color: rgba(255,255,255,0.1);">PULL REMOTE</button>
          </div>
          <div style="font-size:24px; font-weight:900; color:${
            syncStatus === 'connected' ? 'var(--green)' : 'var(--red)'
          }; opacity: 0.9;">${
      syncStatus === 'connected' ? 'PROTECTED' : 'UNSECURED'
    }</div>
          <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform: uppercase;">${
            syncStatus === 'connected'
              ? `Cloud Sync: ${syncMode.toUpperCase()}`
              : 'Action Required'
          }</div>
        </div>

        <div class="glass-card widget-card">
          <div class="widget-title">Cloud Intercepts</div>
          <div style="font-size:32px; font-weight:900; color:var(--red); opacity: 0.8;">${cloudBlockedQueries.toLocaleString()}</div>
          <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform: uppercase;">Total Queries Blocked</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: 32px;">
        <div>
          <div class="section-label" style="font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-bottom: 20px;">ACTIVE SHIELD PARAMETERS</div>
          <div class="service-grid" style="grid-template-columns: 1fr; gap: 12px;">
            ${
              domainList.length === 0
                ? `
              <div class="glass-card" style="text-align:center; padding:60px; color:var(--muted); font-size:13px; border-style: dashed; background: transparent;">
                No active distractors identified in this session.
              </div>
            `
                : domainList
                    .map((d) => {
                      const isBlocked = rules.some(
                        (r) =>
                          (r.customDomain || r.packageName) === d.domain &&
                          (r.blockedToday || r.mode === 'block'),
                      );
                      const safeIconUrl =
                        getSmartIcon(d.domain) ||
                        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                          d.domain,
                        )}&sz=64`;
                      return `
                <div class="rule-item" style="padding: 20px; background: rgba(255,255,255,0.01);">
                   <div style="display:flex; align-items:center; gap:20px; min-width:0;">
                     <div class="brand-logo-container" style="position: relative; width: 40px; height: 40px; border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
                       <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: var(--muted); z-index: 1; opacity: 0;"></div>
                       <img src="${safeIconUrl}"
                            data-domain="${d.domain}"
                            data-fallback="https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                              d.domain,
                            )}&sz=64"
                            style="position: relative; width: 22px; height:22px; object-fit: contain; z-index: 2;"
                            alt="">
                     </div>
                     <div style="min-width:0;">
                       <div class="domain-name" style="font-size:15px; font-weight: 800; ${
                         isBlocked ? 'color:var(--red);' : ''
                       }">${d.domain}</div>
                       <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform: uppercase; margin-top: 4px;">
                         ${
                           isBlocked
                             ? 'Access Denied / Intercepted'
                             : 'Monitoring Traffic'
                         }
                       </div>
                     </div>
                   </div>
                   <div style="text-align: right;">
                      <div style="font-size:14px; font-weight:900; color:var(--text);">${fmtTime(
                        d.timeMs,
                      )}</div>
                   </div>
                </div>
              `;
                    })
                    .join('')
            }
          </div>
        </div>

        <div>
        <div>
           <div class="section-label" style="font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-bottom: 20px;">TOP DISTRACTORS (MINUTES USED TODAY)</div>
           <div class="glass-card" style="padding: 24px; border-radius: 24px; background: rgba(0,0,0,0.1); height: 260px; position: relative; overflow: hidden; display:flex; align-items:center; justify-content:center;">
              <canvas id="liveUsageChart" style="width: 100% !important; height: 210px !important;"></canvas>
              ${
                domainList.length === 0
                  ? '<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 13px; font-weight: 700;">No domain activity detected today.</div>'
                  : ''
              }
           </div>
           <div style="margin-top: 20px; font-size: 13px; color: var(--muted); line-height: 1.5; font-weight: 600;">
             Real-time monitoring enabled. Each bar represents actual time intercepted at the browser gate.
           </div>
        </div>
      </div>
    `;

    // Wire icon fallbacks via JS (CSP blocks inline onload/onerror in extensions)
    container.querySelectorAll('img[data-domain]').forEach((img) => {
      img.addEventListener('error', function () {
        const fallbackSrc = this.dataset.fallback;
        if (fallbackSrc && this.src !== fallbackSrc) {
          this.src = fallbackSrc;
        } else {
          this.style.display = 'none';
          const fallbackEl =
            this.parentElement?.querySelector('.logo-fallback');
          if (fallbackEl) {
            fallbackEl.style.opacity = '1';
            fallbackEl.innerText = (this.dataset.domain || '?')
              .slice(0, 2)
              .toUpperCase();
          }
        }
      });
    });

    container
      .querySelector('#wb_settings')
      ?.addEventListener('click', openSettingsPage);
    container.querySelector('#wb_apps')?.addEventListener('click', () => {
      const btn = document.querySelector('.nav-item[data-tab="apps"]');
      if (btn) {
        btn.click();
      }
    });

    container
      .querySelector('#btnDashSync')
      ?.addEventListener('click', async () => {
        const btn = container.querySelector('#btnDashSync');
        btn.innerText = 'SYNCING...';
        btn.disabled = true;
        chrome.runtime.sendMessage({ action: 'manualSync' }, () => {
          setTimeout(() => {
            renderDashboardPage(container);
          }, 1500);
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
              backgroundColor: domainList.map((d) => {
                const rule = rules.find(
                  (r) => (r.customDomain || r.packageName) === d.domain,
                );
                return rule?.blockedToday || rule?.mode === 'block'
                  ? '#52525B'
                  : '#71717A';
              }),
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
          plugins: { legend: { display: false }, tooltip: { enabled: true } },
          scales: {
            x: {
              display: true,
              beginAtZero: true,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: {
                color: 'rgba(255,255,255,0.4)',
                font: { size: 10, weight: '700' },
              },
            },
            y: {
              grid: { display: false },
              ticks: { color: '#FFFFFF', font: { size: 12, weight: '900' } },
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
