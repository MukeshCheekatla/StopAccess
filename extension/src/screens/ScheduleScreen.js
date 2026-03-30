import {
  getSchedules,
  updateSchedule,
  deleteSchedule,
} from '@focusgate/state/schedules';
import { extensionAdapter as storage } from '../background/platformAdapter.js';

export async function renderScheduleScreen(container) {
  container.innerHTML = '<div class="loader">Loading...</div>';

  try {
    const schedules = await getSchedules(storage);

    container.innerHTML = `
      <div class="app-card" style="border-style: dashed; background: transparent; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
        <div class="section-title" style="margin-bottom: 0;">Add New Schedule</div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="schName" placeholder="Focus Block Name" class="input">
          <div style="display: flex; gap: 10px;">
            <input type="time" id="schStart" value="09:00" class="input" style="flex: 1;">
            <input type="time" id="schEnd" value="17:00" class="input" style="flex: 1;">
          </div>
          <button class="btn" id="btnCreateSchedule">Create Block</button>
        </div>
      </div>
      
      <div class="section-title">Automated Blocks (${schedules.length})</div>
      
      <div class="app-list">
        ${
          schedules.length === 0
            ? `
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <p>No active schedules found.</p>
          </div>
        `
            : schedules
                .map(
                  (s) => `
            <div class="app-card" style="margin-bottom: 8px;">
               <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                 <div class="stat-val" style="font-size: 16px;">${s.name}</div>
                 <button class="btn-outline delete-sch" data-id="${
                   s.id
                 }" style="padding: 4px; border: none; cursor: pointer; color: var(--muted);">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                 </button>
               </div>
               <div style="display: flex; gap: 16px; align-items: center;">
                 <label class="badge badge-active" style="background: rgba(124, 111, 247, 0.1); border: 1px solid rgba(124,111,247,0.2); color: var(--accent);">
                    ${s.startTime} - ${s.endTime}
                 </label>
                 <div style="font-size: 11px; color: var(--muted); font-weight: 700;">
                    ${
                      s.days?.length === 7
                        ? 'EVERY DAY'
                        : s.days
                            ?.map((d) =>
                              typeof d === 'string'
                                ? d
                                : [
                                    'Sun',
                                    'Mon',
                                    'Tue',
                                    'Wed',
                                    'Thu',
                                    'Fri',
                                    'Sat',
                                  ][d],
                            )
                            .join(', ') || 'NONE'
                    }
                 </div>
               </div>
            </div>
          `,
                )
                .join('')
        }
      </div>
    `;

    container
      .querySelector('#btnCreateSchedule')
      ?.addEventListener('click', async () => {
        const name = container.querySelector('#schName').value.trim();
        const start = container.querySelector('#schStart').value;
        const end = container.querySelector('#schEnd').value;

        if (!name) {
          return;
        }

        const btn = container.querySelector('#btnCreateSchedule');
        btn.innerText = 'Creating...';
        btn.disabled = true;

        const newSch = {
          id: Date.now().toString(),
          name,
          startTime: start,
          endTime: end,
          days: [1, 2, 3, 4, 5], // Default to Workdays (Mon-Fri as numbers)
          active: true,
          appNames: [], // Blocks all restricted apps by default in our current core engine
        };

        await updateSchedule(storage, newSch);
        chrome.runtime.sendMessage({ action: 'manualSync' });
        renderScheduleScreen(container);
      });

    container.querySelectorAll('.delete-sch').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.innerHTML = '...';
        btn.disabled = true;
        await deleteSchedule(storage, id);
        chrome.runtime.sendMessage({ action: 'manualSync' });
        renderScheduleScreen(container);
      });
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Failed to load schedules: ${e.message}</div>`;
  }
}
