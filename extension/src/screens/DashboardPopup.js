import { extensionAdapter as storage } from '../background/platformAdapter.js';
import { fmtTime, escapeHtml } from '@focusgate/core';

export async function renderDashboardPopup(container) {
  if (!container) {
    return;
  }

  try {
    const usageRes = await chrome.storage.local.get(['usage']);
    const usage = usageRes.usage || {};
    const allTotalMs = Object.values(usage).reduce(
      (a, b) => a + (b.time || 0),
      0,
    );
    const isFocusing = await storage.getBoolean('focus_mode_active');
    const endTime = await storage.getNumber('focus_mode_end_time');

    const topHtml = `
      <div id="dashShell" style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Status Grid (3-box layout) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <!-- Daily Usage -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px;">
            <div style="font-size: 9px; font-weight: 800; color: var(--muted); text-transform: uppercase;">DAILY USAGE</div>
            <div style="font-size: 16px; font-weight: 900; margin-top: 8px;">${fmtTime(
              allTotalMs,
            )}</div>
          </div>
          
          <!-- Shield Status -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px;">
            <div style="font-size: 9px; font-weight: 800; color: var(--muted); text-transform: uppercase;">SHIELD STATUS</div>
            <div style="font-size: 16px; font-weight: 900; margin-top: 8px; color: var(--success);">ACTIVE</div>
          </div>

          <!-- Focus Timer (Always Visible) -->
          <div style="background: rgba(37, 99, 235, 0.05); border: 1px solid var(--accent); border-radius: 12px; padding: 14px;">
            <div style="font-size: 9px; font-weight: 800; color: var(--accent); text-transform: uppercase;">TIMER</div>
            <div id="countdownDisp" style="font-size: 16px; font-weight: 900; margin-top: 8px; font-variant-numeric: tabular-nums;">--:--</div>
          </div>
        </div>

        <!-- Activity Section -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
             <div style="font-size: 11px; font-weight: 800; color: var(--muted); letter-spacing: 1.5px;">RECOGNIZED ACTIVITY</div>
          </div>
          <div id="usageList" style="display: flex; flex-direction: column; gap: 8px;">
             ${Object.entries(usage)
               .sort((a, b) => (b[1].time || 0) - (a[1].time || 0))
               .slice(0, 4)
               .map(([domain, data]) =>
                 renderActivityRow(domain, data.time || 0),
               )
               .join('')}
          </div>
        </div>
      </div>
    `;

    container.innerHTML = topHtml;

    // ── Self-Stabilizing Ticker Controller ──────────────
    if (isFocusing) {
      clearInterval(window.__dashTicker);
      const updateTic = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((endTime - now) / 1000));
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        const d = document.getElementById('countdownDisp');
        if (d) {
          d.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(
            2,
            '0',
          )}`;
        }
        if (diff <= 0) {
          clearInterval(window.__dashTicker);
        }
      };
      window.__dashTicker = setInterval(updateTic, 1000);
      updateTic();
    }

    // ── Silent Usage Sync (15s) ────────────────────────
    clearInterval(window.__dashUsageSync);
    window.__dashUsageSync = setInterval(async () => {
      if (!document.getElementById('dashShell')) {
        clearInterval(window.__dashUsageSync);
        return;
      }
      const freshRes = await chrome.storage.local.get(['usage']);
      const freshUsage = freshRes.usage || {};
      const list = document.getElementById('usageList');
      if (list) {
        list.innerHTML = Object.entries(freshUsage)
          .sort((a, b) => (b[1].time || 0) - (a[1].time || 0))
          .slice(0, 4)
          .map(([domain, data]) => renderActivityRow(domain, data.time || 0))
          .join('');
      }
    }, 15000);
  } catch (e) {
    container.innerHTML = `<div class="error">${e.message}</div>`;
  }
}

function renderActivityRow(domain, timeMs) {
  const ico = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain,
  )}&sz=64`;
  const lbl = escapeHtml(domain.split('.')[0].slice(0, 2).toUpperCase() || '?');

  return `
    <div style="display: flex; align-items: center; gap: 16px; padding: 12px; background: rgba(255,255,255,0.01); border: 1px solid var(--glass-border); border-radius: 12px;">
      <div style="width: 32px; height: 32px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; position: relative;">
         <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 850; color: var(--muted); z-index: 1;">${lbl}</div>
         <img src="${ico}" style="width: 18px; height: 18px; object-fit: contain; z-index: 2; position: relative; display: block;">
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 13px; font-weight: 800; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${domain}</div>
      </div>
      <div style="font-size: 13px; font-weight: 900; color: var(--text); font-variant-numeric: tabular-nums;">${fmtTime(
        timeMs,
      )}</div>
    </div>
  `;
}
