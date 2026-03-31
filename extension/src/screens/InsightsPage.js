import {
  extensionAdapter as storage,
  nextDNSApi,
} from '../background/platformAdapter.js';
import { getAppIconUrl as getSmartIcon } from '@focusgate/core';

export async function renderInsightsPage(container) {
  if (!container) {
    return;
  }
  container.innerHTML = '<div class="loader">Analyzing Network...</div>';

  try {
    const snapshots = (await storage.getArray('fg_snapshots')) || [];
    const isConfigured = await nextDNSApi.isConfigured();
    let blockedLogs = [];
    let topBlocked = [];

    if (isConfigured) {
      try {
        const [logsRes, domainsRes] = await Promise.all([
          nextDNSApi.getLogs(),
          nextDNSApi.getTopBlocked(),
        ]);

        if (logsRes.ok) {
          blockedLogs = logsRes.data.filter((l) => l.status === 'blocked');
        }
        if (domainsRes.ok) {
          topBlocked = domainsRes.data.slice(0, 5);
        }
      } catch (e) {
        console.warn('Network analytics partially unavailable', e);
      }
    }

    const maxMins = Math.max(1, ...snapshots.map((s) => s.screenTimeMinutes));

    container.innerHTML = `
      <div class="page-intro" style="margin-bottom: 32px;">
        <div style="font-size: 11px; font-weight: 800; color: var(--accent); letter-spacing: 2px; margin-bottom: 8px;">INTELLIGENCE ENGINE</div>
        <div style="font-size: 40px; font-weight: 900; letter-spacing: -1.8px; line-height: 0.9;">INSIGHTS & ANALYTICS</div>
        <div style="font-size: 14px; color: var(--muted); margin-top: 12px; font-weight: 500;">Deep inspection of your digital habits and intercepted threats.</div>
      </div>

      <div class="glass-card" style="margin-bottom: 32px; padding: 24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
          <div class="section-label" style="margin:0;">Focus Consistency (Last 7 Days)</div>
          <div style="font-size:10px; color:var(--muted); font-weight:700;">UNIT: ENGAGEMENT MINUTES</div>
        </div>
        ${
          snapshots.length === 0
            ? `
          <div style="height: 180px; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 12px; border: 1px dashed rgba(255,255,255,0.05); border-radius: 12px;">
            History buffer empty. Maintain focus for 24h to seed analytics.
          </div>
        `
            : `
          <div class="bar-chart" style="height: 180px; display: flex; align-items: flex-end; gap: 12px; padding-bottom: 24px;">
            ${[...snapshots]
              .reverse()
              .map((s, i) => {
                const height = Math.max(
                  8,
                  (s.screenTimeMinutes / maxMins) * 100,
                );
                const isActive = i === snapshots.length - 1;
                return `
                <div class="bar-col" style="flex:1; height:100%; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:8px;">
                  <div class="bar-track" style="width:100%; flex:1; background:rgba(255,255,255,0.03); border-radius:4px; position:relative; overflow:hidden;">
                    <div class="bar-fill" style="height: ${height}%; width:100%; position:absolute; bottom:0; background:${
                  isActive ? 'var(--accent)' : 'rgba(113, 113, 122, 0.2)'
                }; border-radius:4px; transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                  </div>
                  <span style="font-size:9px; font-weight:800; color: ${
                    isActive ? 'var(--text)' : 'var(--muted)'
                  };">${s.date.slice(8, 10)}</span>
                </div>
              `;
              })
              .join('')}
          </div>
        `
        }
      </div>

      <div class="insights-row" style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
        <div class="intercept-section">
          <div class="section-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span>Network Activity Logs</span>
            <span style="font-size:9px; color:var(--red); font-weight:900; letter-spacing:1px;">BLOCKED TRAFFIC</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${
              !isConfigured
                ? `
              <div class="glass-card" style="padding:40px 20px; text-align:center; background:rgba(255, 184, 0, 0.02); border-color:rgba(255, 184, 0, 0.1);">
                <div style="font-size:32px; margin-bottom:12px;">🔒</div>
                <div style="font-size:12px; font-weight:800; color:var(--yellow); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Network Logs Encrypted</div>
                <div style="font-size:11px; color:var(--muted); line-height:1.6; max-width:240px; margin:0 auto;">Switch to <strong>Hybrid</strong> or <strong>Enterprise</strong> mode to enable cloud-level packet inspection.</div>
              </div>
            `
                : blockedLogs.length === 0
                ? `
              <div class="glass-card" style="padding:32px; text-align:center; color:var(--muted); background:rgba(255,255,255,0.01);">
                <div style="font-size:24px; margin-bottom:12px; opacity:0.5;">🛡️</div>
                <div style="font-size:11px; font-weight:800; text-transform:uppercase;">No network threats detected in recent cycles</div>
              </div>
            `
                : blockedLogs
                    .map((log) => {
                      const safeIconUrl =
                        getSmartIcon(log.domain) ||
                        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                          log.domain,
                        )}&sz=64`;
                      return `
              <div class="glass-card" style="display:flex; align-items:center; gap:14px; padding:12px 16px; border-radius:14px;">
                 <div class="brand-logo-container" style="position: relative; width: 32px; height: 32px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
                    <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: var(--muted); z-index: 1; opacity: 0;"></div>
                    <img src="${safeIconUrl}" alt="" style="width: 18px; height: 18px; object-fit: contain; z-index: 2; transition: opacity 0.2s ease; opacity: 0;" 
                         onload="this.style.opacity='1'; const fallback = this.parentElement.querySelector('.logo-fallback'); if (fallback) fallback.style.opacity='0';"
                         onerror="
                            if (!this.dataset.retried && this.src.indexOf('google.com') === -1) {
                              this.dataset.retried = '1';
                              this.src = 'https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                                log.domain,
                              )}&sz=64';
                            } else {
                              this.style.display = 'none';
                              const fallbackElement = this.parentElement.querySelector('.logo-fallback');
                              if (fallbackElement) {
                                fallbackElement.style.opacity='1';
                                fallbackElement.innerText = '${(
                                  log.domain || '?'
                                )
                                  .slice(0, 2)
                                  .toUpperCase()}';
                              }
                            }
                         ">
                 </div>
                 <div style="flex:1; min-width:0;">
                    <div style="font-weight:800; font-size:12px; color:var(--red); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:-0.2px;">${
                      log.domain
                    }</div>
                    <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                      <div style="height:4px; width:4px; border-radius:50%; background:var(--red);"></div>
                      <div style="font-size:10px; color:var(--muted); font-weight:700;">${
                        log.reasons?.[0]?.name || 'Blocked by Shield'
                      }</div>
                    </div>
                 </div>
                 <div style="font-size:10px; color:var(--muted); font-weight:900; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:6px;">${formatTimeAgo(
                   log.timestamp,
                 )}</div>
              </div>
            `;
                    })
                    .join('')
            }
          </div>
        </div>

        <div class="top-blocks-section">
          <div class="section-label">High-Impact Blocklist</div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${
              !isConfigured
                ? `
              <div class="glass-card" style="padding:40px 20px; text-align:center; background:rgba(255, 184, 0, 0.02); border-color:rgba(255, 184, 0, 0.1);">
                <div style="font-size:32px; margin-bottom:12px;">📊</div>
                <div style="font-size:12px; font-weight:800; color:var(--yellow); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Analytics Paused</div>
                <div style="font-size:11px; color:var(--muted); line-height:1.6;">Global block statistics require an active NextDNS profile link.</div>
              </div>
            `
                : topBlocked.length === 0
                ? `
              <div class="glass-card" style="padding:32px; text-align:center; color:var(--muted); background:rgba(255,255,255,0.01);">
                <div style="font-size:24px; margin-bottom:12px; opacity:0.5;">📈</div>
                <div style="font-size:11px; font-weight:800; text-transform:uppercase;">Collecting Top Threats...</div>
              </div>
            `
                : topBlocked
                    .map((item) => {
                      const safeIconUrl =
                        getSmartIcon(item.name) ||
                        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                          item.name,
                        )}&sz=64`;
                      return `
              <div class="glass-card" style="display:flex; align-items:center; justify-content:space-between; padding:16px;">
                <div style="display:flex; align-items:center; gap:16px;">
                  <div class="brand-logo-container" style="position: relative; width: 32px; height: 32px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
                    <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: var(--muted); z-index: 1; opacity: 0;"></div>
                    <img src="${safeIconUrl}" alt="" style="width: 18px; height: 18px; object-fit: contain; z-index: 2; transition: opacity 0.2s ease; opacity: 0;" 
                         onload="this.style.opacity='1'; const fallback = this.parentElement.querySelector('.logo-fallback'); if (fallback) fallback.style.opacity='0';"
                         onerror="
                            if (!this.dataset.retried && this.src.indexOf('google.com') === -1) {
                              this.dataset.retried = '1';
                              this.src = 'https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                                item.name,
                              )}&sz=64';
                            } else {
                              this.style.display = 'none';
                              const fallbackElement = this.parentElement.querySelector('.logo-fallback');
                              if (fallbackElement) {
                                fallbackElement.style.opacity='1';
                                fallbackElement.innerText = '${(
                                  item.name || '?'
                                )
                                  .slice(0, 2)
                                  .toUpperCase()}';
                              }
                            }
                         ">
                  </div>
                  <div>
                    <div style="font-weight:900; font-size:13px;">${
                      item.name || 'Unknown'
                    }</div>
                    <div style="font-size:10px; color:var(--muted); font-weight:700;">Blocked ${
                      item.count
                    } times</div>
                  </div>
                </div>
              </div>
            `;
                    })
                    .join('')
            }
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) {
    return 'Just now';
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`;
  }
  return `${Math.floor(diff / 3600000)}h ago`;
}
