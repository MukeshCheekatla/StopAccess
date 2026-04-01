import {
  getSchedules,
  updateSchedule,
  deleteSchedule,
} from '@focusgate/state/schedules';
import { extensionAdapter as storage } from '../background/platformAdapter';
import { escapeHtml } from '@focusgate/core';
import { toast } from '../lib/toast';

export async function renderSchedulePage(container) {
  if (!container) {
    return;
  }
  container.innerHTML = '<div class="loader">Loading...</div>';

  try {
    const schedules = await getSchedules(storage);

    container.innerHTML = `
      <div class="page-intro" style="margin-bottom: 32px;">
        <div style="font-size: 11px; font-weight: 800; color: var(--accent); letter-spacing: 2px; margin-bottom: 8px;">SCHEDULED CYCLES</div>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: -1.2px; line-height: 1;">BLOCK PERIODS</div>
        <div style="font-size: 14px; color: var(--muted); margin-top: 12px; font-weight: 500;">Set recurring times to automatically block distracting domains.</div>
      </div>

      <div class="glass-card" style="padding: 32px; margin-bottom: 40px; border-style: dashed; border-color: var(--glass-border); background: transparent;">
        <div style="font-size:12px; font-weight:800; color:var(--accent); text-transform:uppercase; letter-spacing:1px; margin-bottom:24px;">New Schedule Block</div>
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <input type="text" id="schName" placeholder="Cycle Name (e.g. Deep Work Morning)" class="input-premium" style="height: 54px; font-size: 15px;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div>
               <label style="font-size: 10px; color: var(--muted); font-weight: 800; display: block; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Start Time</label>
               <input type="time" id="schStart" value="09:00" class="input-premium" style="width:100%; height: 48px;">
            </div>
            <div>
               <label style="font-size: 10px; color: var(--muted); font-weight: 800; display: block; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">End Time</label>
               <input type="time" id="schEnd" value="17:00" class="input-premium" style="width:100%; height: 48px;">
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 10px; color: var(--muted); font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Active Cycle Days</div>
            <div id="day_picker" style="display: flex; gap: 10px;">
              ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
                .map(
                  (d, i) =>
                    `<button class="day-btn ${
                      [1, 2, 3, 4, 5].includes(i) ? 'active' : ''
                    }" data-day="${i}"
                  style="flex:1; height:44px; border-radius:14px; border:1px solid var(--glass-border);
                  background: ${
                    [1, 2, 3, 4, 5].includes(i)
                      ? 'var(--accent)'
                      : 'rgba(255,255,255,0.02)'
                  };
                  color: #fff;
                  font-size:10px; font-weight:900; cursor:pointer; transition: 0.2s;">${d}</button>`,
                )
                .join('')}
            </div>
          </div>
          
          <button class="btn-premium" id="btnCreateSchedule" style="height: 56px; justify-content: center; font-size: 14px; margin-top: 8px;">SAVE SCHEDULE</button>
        </div>
      </div>
      
      <div class="section-label" style="font-size: 13px; font-weight: 800; letter-spacing: 1px; margin-bottom: 24px;">ACTIVE DIRECTIVES (${
        schedules.length
      })</div>
      
      <div class="schedule-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        ${
          schedules.length === 0
            ? `
            <div class="glass-card" style="grid-column: 1/-1; height: 160px; display: flex; flex-direction:column; align-items:center; justify-content:center; background:transparent; border-style:dashed; border-color:var(--glass-border); opacity: 0.5;">
              <div style="font-size: 11px; font-weight: 800; color: var(--muted); letter-spacing:1px; text-transform:uppercase;">Zero automated cycles configured</div>
            </div>
        `
            : schedules
                .map(
                  (s) => `
            <div class="glass-card" style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
               <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                 <div>
                   <div style="font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.5px;">${escapeHtml(
                     s.name,
                   )}</div>
                   <div style="font-size: 11px; color: var(--muted); font-weight: 700; margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                      <span style="color: var(--accent); font-weight: 900; background: rgba(255, 255, 255, 0.04); padding: 4px 10px; border-radius: 10px; border: 1px solid var(--glass-border);">ACTIVE: ${
                        s.startTime
                      } — ${s.endTime}</span>
                   </div>
                 </div>
                 <button class="delete-sch" data-id="${
                   s.id
                 }" style="background:none; border:none; color:var(--red); cursor:pointer; opacity:0.4; transition:0.2s;">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                 </button>
               </div>
               <div style="display: flex; gap: 6px; padding-top: 16px; border-top: 1px solid var(--glass-border);">
                 ${['S', 'M', 'T', 'W', 'T', 'F', 'S']
                   .map(
                     (d, i) =>
                       `<span style="width:28px; height:28px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center;
                     font-size:9px; font-weight:900;
                     background:${
                       s.days?.includes(i)
                         ? 'var(--accent)'
                         : 'rgba(255,255,255,0.03)'
                     };
                     color:${
                       s.days?.includes(i) ? '#fff' : 'rgba(255,255,255,0.15)'
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
    `;

    // Day picker toggle
    container.querySelectorAll('.day-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const isActive = btn.classList.toggle('active');
        btn.style.background = isActive
          ? 'var(--accent)'
          : 'rgba(255,255,255,0.03)';
      });
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
          toast.error('Block name is mandatory.');
          return;
        }

        const selectedDays = Array.from(
          container.querySelectorAll('.day-btn.active'),
        ).map((b) =>
          parseInt((b as HTMLElement).getAttribute('data-day') || '0', 10),
        );

        if (selectedDays.length === 0) {
          toast.error('Target days selection required.');
          return;
        }

        const btn = container.querySelector('#btnCreateSchedule');
        btn.innerText = 'ARMING...';
        btn.disabled = true;

        const newSch = {
          id: Date.now().toString(),
          name,
          startTime: start,
          endTime: end,
          days: selectedDays,
          active: true,
          appNames: [],
        };

        await updateSchedule(storage, newSch);
        chrome.runtime.sendMessage({ action: 'manualSync' });
        renderSchedulePage(container);
      });

    container.querySelectorAll('.delete-sch').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');

        // Custom UI Confirmation instead of confirm
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = `
          <div style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); width:300px; z-index:10000; padding:32px; text-align:center; background:rgba(20,20,20,0.95); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); color:white;">
            <div style="font-size:24px; margin-bottom:12px;">🗑️</div>
            <div style="font-size:14px; font-weight:900; margin-bottom:8px;">DELETE SCHEDULE?</div>
            <div style="font-size:11px; color:var(--muted); line-height:1.5; margin-bottom:24px;">This automated block period will be permanently removed.</div>
            <div style="display:flex; gap:10px;">
              <button class="btn-cancel" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--text); padding:10px; border-radius:10px; cursor:pointer; font-size:11px;">CANCEL</button>
              <button class="btn-confirm" style="flex:1; background:var(--red); border:none; color:white; padding:10px; border-radius:10px; cursor:pointer; font-weight:800; font-size:11px;">DELETE</button>
            </div>
          </div>
          <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:9999; backdrop-filter:blur(4px);"></div>
        `;
        document.body.appendChild(modalContainer);

        const cleanup = () => document.body.removeChild(modalContainer);
        modalContainer
          .querySelector('.btn-cancel')
          ?.addEventListener('click', cleanup);
        modalContainer
          .querySelector('.btn-confirm')
          ?.addEventListener('click', async () => {
            cleanup();
            await deleteSchedule(storage, id);
            chrome.runtime.sendMessage({ action: 'manualSync' });
            renderSchedulePage(container);
          });
      });
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Failed to load schedules: ${e.message}</div>`;
  }
}
