import { nextDNSApi } from '../background/platformAdapter.js';
import {
  getAppIconUrl as getSmartIcon,
  fmtTime,
  buildDashboardTabPath,
} from '@focusgate/core';

export async function renderInsightsPopup(container) {
  if (!container) {
    return;
  }
  container.innerHTML = '<div class="loader">Loading Insights...</div>';

  try {
    const isConfigured = await nextDNSApi.isConfigured();
    const { usage = {} } = await chrome.storage.local.get(['usage']);
    const allTotalMs = Object.values(usage).reduce(
      (a, b) => a + (b.time || 0),
      0,
    );
    const focusGoalMs = 120 * 60000;
    const focusPercent = Math.min(
      100,
      Math.round((allTotalMs / focusGoalMs) * 100),
    );

    let topBlocked = [];
    if (isConfigured) {
      try {
        topBlocked = (await nextDNSApi.getTopBlockedDomains(3)) || [];
      } catch (e) {
        console.warn(e);
      }
    }

    container.innerHTML = `
      <div class="widget-grid" style="grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div class="glass-card widget-card" style="padding: 12px; text-align:center;">
          <div class="widget-title" style="font-size: 10px;">AVERAGE</div>
          <div style="font-size:16px; font-weight:800; margin-top:8px;">${fmtTime(
            allTotalMs,
          )}</div>
        </div>
        <div class="glass-card widget-card" style="padding: 12px; text-align:center;">
          <div class="widget-title" style="font-size: 10px;">GOAL</div>
          <div style="font-size:16px; font-weight:800; color:var(--accent); margin-top:8px;">${focusPercent}%</div>
        </div>
      </div>

      <div class="section-label" style="font-size: 10px; margin-bottom: 12px;">TOP BLOCKS</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${
          topBlocked.length === 0
            ? '<div class="empty-state" style="padding:20px; font-size:11px;">No network threats today</div>'
            : topBlocked
                .map(
                  (d) => `
            <div class="rule-item" style="padding: 10px 14px; border-radius: 12px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <img src="${getSmartIcon(
                  d.domain,
                )}" class="app-icon" style="width:20px; height:20px;">
                <div style="font-size:11px; font-weight:800;">${d.domain}</div>
              </div>
              <div style="font-size:10px; font-weight:900; color:var(--red);">${
                d.queries
              }</div>
            </div>
          `,
                )
                .join('')
        }
      </div>
      <button class="btn-premium" id="btn_full_insights" style="width:100%; margin-top:16px; font-size:11px; padding:10px; background:rgba(255,255,255,0.02); color:var(--text); box-shadow:none;">VIEW FULL ANALYTICS</button>
    `;

    container
      .querySelector('#btn_full_insights')
      ?.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL(buildDashboardTabPath('insights')),
        });
      });
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}
