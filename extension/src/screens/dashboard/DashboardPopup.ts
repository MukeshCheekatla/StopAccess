import { extensionAdapter as storage } from '../../background/platformAdapter';
import {
  fmtTime,
  escapeHtml,
  resolveFaviconUrl,
  findServiceIdByDomain,
} from '@focusgate/core';

export async function renderDashboardPopup(container) {
  if (!container) {
    return;
  }

  try {
    const { usage = {}, rules: rulesRaw = '[]' } =
      await chrome.storage.local.get(['usage', 'rules']);
    const rules = JSON.parse(rulesRaw as string);
    const allTotalMs = Object.values(usage).reduce(
      (a: any, b: any) => a + (b.time || 0),
      0,
    );

    if (!container.querySelector('#dashShell')) {
      container.innerHTML = `
      <div id="dashShell" style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Status Grid (3-box layout) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <!-- Daily Usage -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px;">
            <div style="font-size: 9px; font-weight: 800; color: var(--muted); text-transform: uppercase;">DAILY USAGE</div>
            <div id="totalUsageDisp" style="font-size: 16px; font-weight: 900; margin-top: 8px;">${fmtTime(
              allTotalMs,
            )}</div>
          </div>
          
          <!-- Shield Status -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px;">
            <div style="font-size: 9px; font-weight: 800; color: var(--muted); text-transform: uppercase;">SHIELD STATUS</div>
            <div style="font-size: 16px; font-weight: 900; margin-top: 8px; color: var(--success);">ACTIVE</div>
          </div>

          <!-- Focus Timer -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 14px;">
            <div style="font-size: 9px; font-weight: 800; color: var(--muted); text-transform: uppercase;">TIMER</div>
            <div id="countdownDisp" style="font-size: 16px; font-weight: 900; margin-top: 8px; font-variant-numeric: tabular-nums;">--:--</div>
          </div>
        </div>

        <!-- Activity Section -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
             <div style="font-size: 11px; font-weight: 800; color: var(--muted); letter-spacing: 1.5px;">RECOGNIZED ACTIVITY</div>
          </div>
          <div id="usageList" style="display: flex; flex-direction: column; gap: 12px;"></div>
        </div>
      </div>
    `;
    }

    const tDisp = container.querySelector('#totalUsageDisp');
    if (tDisp) {
      tDisp.textContent = fmtTime(allTotalMs);
    }

    const uList = container.querySelector('#usageList');
    if (uList) {
      const uHtml = Object.entries(usage)
        .map(([domain, data]: [string, any]) => ({
          domain,
          timeMs: data.time || 0,
        }))
        .filter((d) => d.timeMs >= 60000)
        .sort((a, b) => b.timeMs - a.timeMs)
        .map(({ domain, timeMs }) => {
          const isBlocked = rules.some((r) => {
            const active = r.blockedToday || r.mode === 'block';
            if (!active) {
              return false;
            }
            if ((r.customDomain || r.packageName) === domain) {
              return true;
            }
            if (r.type === 'service') {
              const serviceIdForDomain = findServiceIdByDomain(domain);
              if (serviceIdForDomain === r.packageName) {
                return true;
              }
            }
            return false;
          });
          return renderActivityRow(domain, timeMs, isBlocked);
        })
        .join('');

      if (uList.innerHTML !== uHtml) {
        uList.innerHTML = uHtml;
      }
    }

    // ── Self-Stabilizing Real-Time Sync Controller ──────
    clearInterval(window.__dashTicker);
    const updateLoop = async () => {
      // Re-fetch focus endTime directly for perfect background sync
      const endTime = await storage.getNumber('focus_mode_end_time');
      const d = document.getElementById('countdownDisp');
      if (!d) {
        clearInterval(window.__dashTicker);
        return;
      }

      if (endTime > Date.now()) {
        const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        d.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(
          2,
          '0',
        )}`;
        d.style.color = 'var(--accent)';
      } else {
        d.textContent = '--:--';
        d.style.color = 'var(--text)';
      }
    };
    window.__dashTicker = setInterval(updateLoop, 1000);
    updateLoop();

    // ── Silent Usage Sync (15s) ────────────────────────
    clearInterval(window.__dashUsageSync);
    window.__dashUsageSync = setInterval(async () => {
      if (!document.getElementById('dashShell')) {
        clearInterval(window.__dashUsageSync);
        return;
      }
      const { usage: fu = {}, rules: fr = '[]' } =
        await chrome.storage.local.get(['usage', 'rules']);
      const currentRules = JSON.parse(fr as string);
      const l = document.getElementById('usageList');
      if (l) {
        l.innerHTML = Object.entries(fu)
          .map(([domain, data]: [string, any]) => ({
            domain,
            timeMs: data.time || 0,
          }))
          .filter((d) => d.timeMs >= 60000)
          .sort((a, b) => b.timeMs - a.timeMs)
          .map(({ domain, timeMs }) => {
            const isBlocked = currentRules.some((r) => {
              const active = r.blockedToday || r.mode === 'block';
              if (!active) {
                return false;
              }
              if ((r.customDomain || r.packageName) === domain) {
                return true;
              }
              if (r.type === 'service') {
                const serviceIdForDomain = findServiceIdByDomain(domain);
                if (serviceIdForDomain === r.packageName) {
                  return true;
                }
              }
              return false;
            });
            return renderActivityRow(domain, timeMs, isBlocked);
          })
          .join('');
      }
    }, 15000);
  } catch (e) {
    container.innerHTML = `<div class="error">${e.message}</div>`;
  }
}

function renderActivityRow(domain, timeMs, isBlocked = false) {
  const ico = resolveFaviconUrl(domain);
  const lbl = escapeHtml(domain.split('.')[0].slice(0, 2).toUpperCase() || '?');

  return `
    <div style="display: flex; align-items: center; gap: 16px; padding: 12px; background: rgba(255,255,255,0.01); border: 1px solid var(--glass-border); border-radius: 12px;">
      <div style="width: 36px; height: 36px; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; position: relative;">
          ${
            isBlocked
              ? "<div title='Blocked' style='position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; background: var(--red); border-radius: 50%; border: 2px solid var(--bg-dark); z-index: 10; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; color: #fff;'>×</div>"
              : ''
          }
         <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 850; color: var(--muted); z-index: 1; opacity: 0;">${lbl}</div>
         <img src="${ico}" 
              onerror="this.style.display='none'; this.parentElement.querySelector('.logo-fallback').style.opacity='1';"
              style="width: 20px; height: 20px; object-fit: contain; z-index: 2; position: relative; display: block;">
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 14px; font-weight: 800; color: ${
          isBlocked ? 'var(--muted)' : 'var(--text)'
        }; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${domain}</div>
      </div>
      <div style="font-size: 14px; font-weight: 900; color: ${
        isBlocked ? 'var(--red)' : 'var(--text)'
      }; font-variant-numeric: tabular-nums;">${fmtTime(timeMs)}</div>
    </div>
  `;
}
