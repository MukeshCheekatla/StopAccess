import {
  getSchedules,
  updateSchedule,
  deleteSchedule,
} from '@focusgate/state/schedules';
import { extensionAdapter as storage } from '../../background/platformAdapter';
import { escapeHtml, buildDashboardTabPath } from '@focusgate/core';
import { toast } from '../../lib/toast';

declare var chrome: any;

export async function renderSchedulePage(
  container: HTMLElement,
  context: 'page' | 'popup' = 'page',
): Promise<void> {
  if (!container) {
    return;
  }
  container.innerHTML = '<div class="loader">Syncing schedules...</div>';

  try {
    const schedules = await getSchedules(storage);

    if (context === 'popup') {
      _renderPopup(container, schedules);
    } else {
      _renderPage(container, schedules);
    }
  } catch (e: any) {
    container.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

// ─── Full Page View ───────────────────────────────────────────────────────────

function _renderPage(container: HTMLElement, schedules: any[]): void {
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 2fr 3fr; gap: var(--space-xl); align-items: start;">
      <!-- Creation Card -->
      <section>
        <div class="section-label">Deploy New Cycle</div>
        <div class="glass-card" style="padding: var(--space-lg); border: 2px dashed var(--glass-border); background: transparent;">
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div>
              <label class="field-label">Cycle Name</label>
              <input type="text" id="schName" placeholder="e.g. Deep Work Morning" class="input-premium" style="font-size: 14px;">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <label class="field-label">Start Time</label>
                <input type="time" id="schStart" value="09:00" class="input-premium" style="height: 44px;">
              </div>
              <div>
                <label class="field-label">End Time</label>
                <input type="time" id="schEnd" value="17:00" class="input-premium" style="height: 44px;">
              </div>
            </div>
            <div>
              <label class="field-label" style="margin-bottom: 12px;">Active Days</label>
              <div id="day_picker" style="display: flex; gap: 6px;">
                ${['S', 'M', 'T', 'W', 'T', 'F', 'S']
                  .map(
                    (d, i) =>
                      `<button class="day-btn-premium ${
                        [1, 2, 3, 4, 5].includes(i) ? 'active' : ''
                      }" data-day="${i}">${d}</button>`,
                  )
                  .join('')}
              </div>
            </div>
            <button class="btn-premium" id="btnCreateSchedule" style="height: 52px; justify-content: center; font-size: 13px; margin-top: 8px;">ACTIVATE CYCLE</button>
          </div>
        </div>
      </section>

      <!-- Active Schedules -->
      <section>
        <div class="section-label">Active Focus Directives</div>
        <div class="schedule-list" style="display: flex; flex-direction: column; gap: var(--space-md); margin-top: 2px;">
          ${
            schedules.length === 0
              ? `<div class="glass-card" style="padding: 60px 40px; text-align:center; opacity: 0.5;">
                  <div style="font-size: 24px; margin-bottom: 16px; color: var(--muted);">⏰</div>
                  <div style="font-size: 11px; font-weight: 800; color: var(--muted); text-transform:uppercase;">No automated block cycles found.</div>
                </div>`
              : schedules
                  .map(
                    (s) => `
                <div class="glass-card" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; position: relative;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <div style="font-size: 16px; font-weight: 800; color: var(--text);">${escapeHtml(
                        s.name,
                      )}</div>
                      <div style="font-size: 11px; color: var(--accent); font-weight: 800; margin-top: 4px; text-transform: uppercase;">${
                        s.startTime
                      } — ${s.endTime}</div>
                    </div>
                    <button class="delete-sch" data-id="${
                      s.id
                    }" style="background:none; border:none; color:var(--red); cursor:pointer; opacity:0.4; padding: 4px;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div style="display: flex; gap: 4px; padding-top: 12px; border-top: 1px solid var(--glass-border);">
                    ${['S', 'M', 'T', 'W', 'T', 'F', 'S']
                      .map(
                        (d, i) =>
                          `<span style="width:26px; height:26px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; font-family: monospace; background:${
                            s.days?.includes(i)
                              ? 'var(--accent)'
                              : 'rgba(255,255,255,0.02)'
                          }; color:${
                            s.days?.includes(i)
                              ? '#fff'
                              : 'rgba(255,255,255,0.1)'
                          };">${d}</span>`,
                      )
                      .join('')}
                  </div>
                </div>
              `,
                  )
                  .join('')
          }
        </div>
      </section>
    </div>

    <style>
      .day-btn-premium { flex:1; height:36px; border-radius:8px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.02); color:var(--muted); font-size:11px; font-weight:800; font-family:monospace; cursor:pointer; transition:0.2s; }
      .day-btn-premium.active { background:var(--accent); color:#fff; border-color:var(--accent); }
      .day-btn-premium:hover:not(.active) { background:rgba(255,255,255,0.05); }
    </style>
  `;

  _attachPageHandlers(container);
}

function _attachPageHandlers(container: HTMLElement): void {
  container.querySelectorAll('.day-btn-premium').forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });

  container
    .querySelector('#btnCreateSchedule')
    ?.addEventListener('click', async () => {
      const name = (
        container.querySelector('#schName') as HTMLInputElement
      ).value.trim();
      const start = (container.querySelector('#schStart') as HTMLInputElement)
        .value;
      const end = (container.querySelector('#schEnd') as HTMLInputElement)
        .value;

      if (!name) {
        toast.error('Cycle name required.');
        return;
      }

      const selectedDays = Array.from(
        container.querySelectorAll('.day-btn-premium.active'),
      ).map((b) =>
        parseInt((b as HTMLElement).getAttribute('data-day') || '0', 10),
      );
      if (selectedDays.length === 0) {
        toast.error('Select active days.');
        return;
      }

      const btn = container.querySelector(
        '#btnCreateSchedule',
      ) as HTMLButtonElement;
      btn.innerText = 'DEPLOYING...';
      btn.disabled = true;

      await updateSchedule(storage, {
        id: Date.now().toString(),
        name,
        startTime: start,
        endTime: end,
        days: selectedDays,
        active: true,
        appNames: [],
      });

      chrome.runtime.sendMessage({ action: 'manualSync' });
      renderSchedulePage(container, 'page');
    });

  container.querySelectorAll('.delete-sch').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')!;
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';
      modalOverlay.innerHTML = `
        <div class="modal" style="max-width: 320px;">
          <div style="font-size:28px; margin-bottom:16px;">🗑️</div>
          <div style="font-size:16px; font-weight:900; margin-bottom:8px;">Decommission Cycle?</div>
          <div style="font-size:12px; color:var(--muted); line-height:1.5; margin-bottom:24px;">This automated block period will be removed from the focus engine.</div>
          <div style="display:flex; gap:12px; width: 100%;">
            <button class="btn-premium btn-cancel" style="flex:1; background:transparent; border-color:var(--glass-border); box-shadow:none;">CANCEL</button>
            <button class="btn-premium btn-confirm" style="flex:1; background:var(--red); border-color:var(--red);">DELETE</button>
          </div>
        </div>
      `;
      document.body.appendChild(modalOverlay);
      const cleanup = () => document.body.removeChild(modalOverlay);
      (modalOverlay.querySelector('.btn-cancel') as HTMLElement).onclick =
        cleanup;
      (modalOverlay.querySelector('.btn-confirm') as HTMLElement).onclick =
        async () => {
          cleanup();
          await deleteSchedule(storage, id);
          chrome.runtime.sendMessage({ action: 'manualSync' });
          renderSchedulePage(container, 'page');
        };
    });
  });
}

// ─── Popup View ───────────────────────────────────────────────────────────────

function _renderPopup(container: HTMLElement, schedules: any[]): void {
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
        url: chrome.runtime.getURL(buildDashboardTabPath('schedule')),
      });
    });
}
