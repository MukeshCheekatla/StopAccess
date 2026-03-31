import {
  extensionAdapter as storage,
  STORAGE_KEYS,
  nextDNSApi,
} from '../background/platformAdapter.js';
import { getAppIconUrl as getSmartIcon, fmtTime } from '@focusgate/core';

export async function renderDashboardPopup(container) {
  if (!container) {
    return;
  }
  container.innerHTML = '<div class="loader">Loading Dashboard...</div>';

  try {
    const usageRes = await chrome.storage.local.get(['usage']);
    const usage = usageRes.usage || {};

    const allTotalMs = Object.values(usage).reduce(
      (a, b) => a + (b.time || 0),
      0,
    );
    const domainList = Object.entries(usage)
      .map(([domain, d]) => ({ domain, timeMs: d.time || 0 }))
      .filter((d) => d.timeMs > 0)
      .sort((a, b) => b.timeMs - a.timeMs)
      .slice(0, 3);

    const syncStatus = await storage.getString('nextdns_connection_status');
    let cloudBlocked = 0;
    if (syncStatus === 'connected') {
      try {
        const res = await nextDNSApi.getAnalyticsCounters();
        if (res.ok) {
          cloudBlocked = res.data.blocked || 0;
        }
      } catch (e) {}
    }

    const focusGoalMs = 120 * 60000;
    const focusPercent = Math.min(
      100,
      Math.round((allTotalMs / focusGoalMs) * 100),
    );

    const focusEnd = await storage.getNumber(STORAGE_KEYS.FOCUS_END, 0);
    const isFocusing = focusEnd > Date.now();
    let flowTimerUI = '';

    if (isFocusing) {
      const remainingMs = Math.max(0, focusEnd - Date.now());
      const m = Math.floor(remainingMs / 60000)
        .toString()
        .padStart(2, '0');
      const s = Math.floor((remainingMs % 60000) / 1000)
        .toString()
        .padStart(2, '0');
      flowTimerUI = `
        <div class="glass-card widget-card" style="padding: 12px; margin-bottom: 12px; border-color: rgba(113, 113, 122, 0.4); background: rgba(113, 113, 122, 0.05); display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 10px; font-weight: 800; color: var(--accent); text-transform: uppercase;">ACTIVE FLOW</div>
          <div style="font-size: 18px; font-weight: 900; color: var(--text);">${m}:${s}</div>
        </div>
      `;
    }

    container.innerHTML = `
      ${flowTimerUI}
      <div class="widget-grid" style="grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div class="glass-card" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between; border-color: rgba(113, 113, 122, 0.15);">
          <div style="font-size: 10px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">FOCUS VITALITY</div>
          <div style="display:flex; align-items:center; gap:12px; margin-top:12px;">
            <div class="stat-circle-container" style="width:44px; height:44px; position: relative;">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="4"/>
                <circle cx="22" cy="22" r="20" fill="none" stroke="var(--accent)" stroke-width="4" 
                  stroke-dasharray="126" stroke-dashoffset="${
                    126 - (126 * focusPercent) / 100
                  }" 
                  stroke-linecap="round" style="transition: stroke-dashoffset 0.5s ease;"/>
              </svg>
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; font-weight: 900; color: var(--text);">${focusPercent}%</div>
            </div>
            <div style="font-size:13px; font-weight:900; color: var(--text);">${fmtTime(
              allTotalMs,
            )}</div>
          </div>
        </div>

        <div class="glass-card" style="padding: 16px; border-color: ${
          syncStatus === 'connected'
            ? 'rgba(113, 113, 122, 0.15)'
            : 'rgba(82, 82, 91, 0.15)'
        };">
          <div style="font-size: 10px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">SHIELD STATUS</div>
          <div style="font-size:16px; font-weight:900; color:${
            syncStatus === 'connected' ? 'var(--green)' : 'var(--red)'
          }; margin-top:10px;">
            ${syncStatus === 'connected' ? 'ACTIVE' : 'OFFLINE'}
          </div>
          <div style="font-size:9px; color:var(--muted); font-weight:700; margin-top:4px; letter-spacing: 0.5px;">${cloudBlocked.toLocaleString()} INTERCEPTS</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
        <div style="font-size: 10px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px;">RECOGNIZED ACTIVITY</div>
        <div style="font-size: 9px; font-weight: 800; color: var(--accent); opacity: 0.8;">LIVE PULSE</div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${
          domainList.length === 0
            ? '<div class="glass-card" style="padding:24px; text-align:center; font-size:11px; font-weight:700; color:var(--muted); border-style:dashed;">Zero local activity data</div>'
            : domainList
                .map((d) => {
                  const safeIconUrl =
                    getSmartIcon(d.domain) ||
                    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                      d.domain,
                    )}&sz=64`;
                  return `
            <div class="glass-card" style="padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.015);">
              <div style="display:flex; align-items:center; gap:12px;">
                 <div class="brand-logo-container" style="position: relative; width: 22px; height: 22px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
                    <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: var(--muted); z-index: 1;"></div>
                    <img src="${safeIconUrl}" style="position: relative; width: 14px; height: 14px; object-fit: contain; z-index: 2; transition: opacity 0.2s ease;" 
                         onload="this.style.opacity='1';"
                         onerror="
                            if (!this.dataset.retried && this.src.indexOf('google.com') === -1) {
                              this.dataset.retried = '1';
                              this.src = 'https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                                d.domain,
                              )}&sz=64';
                            } else {
                              this.style.display = 'none';
                              const fallbackElement = this.parentElement.querySelector('.logo-fallback');
                              if (fallbackElement) {
                                fallbackElement.innerText = '${(d.domain || '?')
                                  .slice(0, 2)
                                  .toUpperCase()}';
                              }
                            }
                         " 
                         alt="">
                 </div>
                 <div style="font-size:12px; font-weight:600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${
                   d.domain
                 }</div>
              </div>
              <div style="font-size:11px; font-weight:800; color:var(--muted);">${fmtTime(
                d.timeMs,
              )}</div>
            </div>
          `;
                })
                .join('')
        }
      </div>
    `;

    // Refresh loop only if active
    clearInterval(window.__dashPopupTimer);
    window.__dashPopupTimer = setInterval(
      () => {
        if (document.querySelector('.nav-item[data-tab="dash"].active')) {
          renderDashboardPopup(container);
        }
      },
      isFocusing ? 1000 : 10000,
    );
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}
