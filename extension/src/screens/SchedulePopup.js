import { getSchedules } from '@focusgate/state/schedules';
import { extensionAdapter as storage } from '../background/platformAdapter.js';

export async function renderSchedulePopup(container) {
  container.innerHTML = '<div class="loader">Loading Schedule...</div>';

  try {
    const schedules = await getSchedules(storage);

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
        <div style="font-size: 10px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px;">ACTIVE AUTOMATIONS</div>
        <div style="font-size: 10px; font-weight: 800; color: var(--accent); opacity: 0.8;">${
          schedules.length
        }</div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${
          schedules.length === 0
            ? '<div class="glass-card" style="padding:24px; text-align:center; font-size:11px; font-weight:700; color:var(--muted); border-style:dashed;">Zero automated cycles</div>'
            : schedules
                .map(
                  (s) => `
            <div class="glass-card" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.01);">
              <div style="flex:1;">
                <div style="font-size: 13px; font-weight: 700; color: var(--text);">${escapeHtml(
                  s.name,
                )}</div>
                <div style="font-size: 10px; color: var(--accent); font-weight: 900; margin-top: 4px; letter-spacing: 0.5px; opacity: 0.9;">${
                  s.startTime
                } — ${s.endTime}</div>
              </div>
              <div style="font-size: 9px; color: var(--muted); font-weight: 900; background: rgba(255,255,255,0.03); padding: 4px 8px; border-radius: 6px;">AUTO</div>
            </div>
          `,
                )
                .join('')
        }
      </div>
      <button class="btn-premium" id="btn_full_schedule" style="width:100%; margin-top:20px; font-size:11px; height: 44px; justify-content: center; background:rgba(255,255,255,0.02); color:var(--text); box-shadow:none; border-color: var(--glass-border); border-radius: 14px;">MANAGE ENFORCEMENT CYCLES</button>
    `;

    container
      .querySelector('#btn_full_schedule')
      ?.addEventListener('click', () => {
        chrome.tabs.create({
          url: chrome.runtime.getURL('dist/dashboard.html') + '?tab=schedule',
        });
      });

    function escapeHtml(v) {
      return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  } catch (e) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}
