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
    <div class="fg-grid fg-gap-8 fg-items-start" style="grid-template-columns: 2fr 3fr;">
      <!-- Creation Card -->
      <section>
        <div class="section-label">Deploy New Cycle</div>
        <div class="glass-card fg-p-6" style="border: 2px dashed var(--glass-border); background: transparent;">
          <div class="fg-flex fg-flex-col fg-gap-5">
            <div>
              <label class="field-label">Cycle Name</label>
              <input type="text" id="schName" placeholder="e.g. Deep Work Morning" class="input-premium" style="font-size: 14px;">
            </div>
            <div class="fg-grid fg-grid-cols-2 fg-gap-4">
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
              <label class="field-label fg-mb-3">Active Days</label>
              <div id="day_picker" class="fg-flex fg-gap-[6px]">
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
            <button class="btn-premium fg-justify-center fg-mt-2" id="btnCreateSchedule" style="height: 52px; font-size: 13px;">ACTIVATE CYCLE</button>
          </div>
        </div>
      </section>

      <!-- Active Schedules -->
      <section>
        <div class="section-label">Active Focus Directives</div>
        <div class="schedule-list fg-flex fg-flex-col fg-gap-4 fg-mt-[2px]">
          ${
            schedules.length === 0
              ? `<div class="glass-card fg-p-10 fg-text-center fg-opacity-50">
                  <div class="fg-mb-4 fg-text-[var(--muted)]" style="font-size: 24px;">⏰</div>
                  <div class="fg-text-[11px] fg-font-extrabold fg-text-[var(--muted)] fg-uppercase">No automated block cycles found.</div>
                </div>`
              : schedules
                  .map(
                    (s) => `
                <div class="glass-card fg-p-5 fg-px-6 fg-flex fg-flex-col fg-gap-4 fg-relative">
                  <div class="fg-flex fg-justify-between fg-items-start">
                    <div>
                      <div class="fg-text-base fg-font-extrabold fg-text-[var(--text)]">${escapeHtml(
                        s.name,
                      )}</div>
                      <div class="fg-text-[11px] fg-font-extrabold fg-mt-1 fg-uppercase fg-text-[var(--accent)]">${
                        s.startTime
                      } — ${s.endTime}</div>
                    </div>
                    <button class="delete-sch fg-p-1 fg-cursor-pointer" data-id="${
                      s.id
                    }" style="background: none; border: none; color: var(--red); opacity: 0.4;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div class="fg-flex fg-gap-1 fg-pt-3" style="border-top: 1px solid var(--glass-border);">
                    ${['S', 'M', 'T', 'W', 'T', 'F', 'S']
                      .map(
                        (d, i) =>
                          `<span class="fg-inline-flex fg-items-center fg-justify-center fg-text-[9px] fg-font-black fg-rounded-[6px]" style="width: 26px; height: 26px; font-family: monospace; background: ${
                            s.days?.includes(i)
                              ? 'var(--accent)'
                              : 'rgba(255,255,255,0.02)'
                          }; color: ${
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
          <div style="font-size:28px;" class="fg-mb-4">🗑️</div>
          <div class="fg-text-base fg-font-black fg-mb-2">Decommission Cycle?</div>
          <div class="fg-text-xs fg-text-[var(--muted)] fg-leading-normal fg-mb-6">This automated block period will be removed from the focus engine.</div>
          <div class="fg-flex fg-gap-3 fg-w-full">
            <button class="btn-premium btn-cancel fg-flex-1" style="background:transparent; border-color:var(--glass-border); box-shadow:none;">CANCEL</button>
            <button class="btn-premium btn-confirm fg-flex-1" style="background:var(--red); border-color:var(--red);">DELETE</button>
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
    <div class="fg-flex fg-justify-between fg-items-center fg-mb-3 fg-px-1">
      <div class="fg-text-[10px] fg-font-extrabold fg-text-[var(--muted)] fg-uppercase fg-tracking-[1.5px]">ACTIVE AUTOMATIONS</div>
      <div class="fg-text-[10px] fg-font-extrabold fg-text-[var(--accent)]" style="opacity: 0.8;">${
        schedules.length
      }</div>
    </div>

    <div class="fg-flex fg-flex-col fg-gap-2">
      ${
        schedules.length === 0
          ? '<div class="glass-card fg-p-6 fg-text-center fg-text-[11px] fg-font-bold fg-text-[var(--muted)]" style="border-style: dashed;">Zero automated cycles</div>'
          : schedules
              .map(
                (s) => `
            <div class="glass-card fg-p-3 fg-px-4 fg-flex fg-items-center fg-justify-between" style="background: rgba(255,255,255,0.01);">
              <div class="fg-flex-1">
                <div class="fg-text-[13px] fg-font-bold fg-text-[var(--text)]">${escapeHtml(
                  s.name,
                )}</div>
                <div class="fg-text-[10px] fg-font-black fg-mt-1 fg-tracking-[0.5px] fg-text-[var(--accent)]" style="opacity: 0.9;">${
                  s.startTime
                } — ${s.endTime}</div>
              </div>
              <div class="fg-text-[9px] fg-text-[var(--muted)] fg-font-black fg-px-2 fg-py-1 fg-rounded-[6px]" style="background: rgba(255,255,255,0.03);">AUTO</div>
            </div>
          `,
              )
              .join('')
      }
    </div>
    <button class="btn-premium fg-w-full fg-mt-5 fg-text-[11px] fg-justify-center fg-text-[var(--text)]" id="btn_full_schedule" style="height: 44px; background: rgba(255,255,255,0.02); box-shadow: none; border-color: var(--glass-border); border-radius: 14px;">MANAGE ENFORCEMENT CYCLES</button>
  `;

  container
    .querySelector('#btn_full_schedule')
    ?.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL(buildDashboardTabPath('schedule')),
      });
    });
}
