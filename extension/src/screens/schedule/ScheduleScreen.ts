export async function renderScheduleScreen(container) {
  container.innerHTML = '<div class="loader">Loading...</div>';

  try {
    const { loadScheduleData } = await import(
      '../../../../packages/viewmodels/src/useScheduleVM'
    );
    const schedules = await loadScheduleData();

    container.innerHTML = `
      <div class="app-card" style="border-style: dashed; background: transparent; display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
        <div class="section-title" style="margin-bottom: 0;">Add New Schedule</div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="schName" placeholder="Focus Block Name" class="input">
          <div style="display: flex; gap: 10px;">
            <input type="time" id="schStart" value="09:00" class="input" style="flex: 1;">
            <input type="time" id="schEnd" value="17:00" class="input" style="flex: 1;">
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="stat-lbl">Days</div>
            <div id="day_picker" style="display: flex; gap: 6px;">
              ${['S', 'M', 'T', 'W', 'T', 'F', 'S']
                .map(
                  (d, i) =>
                    `<button class="day-btn ${
                      [1, 2, 3, 4, 5].includes(i) ? 'day-active' : ''
                    }" data-day="${i}"
                  style="width:34px; height:34px; border-radius:50%; border:1px solid var(--border);
                  background:${
                    [1, 2, 3, 4, 5].includes(i)
                      ? 'var(--accent)'
                      : 'var(--card)'
                  };
                  color:${
                    [1, 2, 3, 4, 5].includes(i) ? '#fff' : 'var(--muted)'
                  };
                  font-size:11px; font-weight:800; cursor:pointer;">${d}</button>`,
                )
                .join('')}
            </div>
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
               <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                 <label class="badge badge-active" style="background: rgba(124, 111, 247, 0.1); border: 1px solid rgba(124,111,247,0.2); color: var(--accent);">
                    ${s.startTime} - ${s.endTime}
                 </label>
                 <div style="display: flex; gap: 4px;">
                   ${['S', 'M', 'T', 'W', 'T', 'F', 'S']
                     .map(
                       (d, i) =>
                         `<span style="width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center;
                       font-size:9px; font-weight:800;
                       background:${
                         s.days?.includes(i) ? 'var(--accent)' : 'var(--card)'
                       };
                       color:${s.days?.includes(i) ? '#fff' : 'var(--muted)'};
                       border:1px solid var(--border);">${d}</span>`,
                     )
                     .join('')}
                 </div>
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
        const isActive = btn.classList.toggle('day-active');
        btn.style.background = isActive ? 'var(--accent)' : 'var(--card)';
        btn.style.color = isActive ? '#fff' : 'var(--muted)';
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
          return;
        }

        const selectedDays = Array.from(
          container.querySelectorAll('.day-btn.day-active'),
        ).map((b) =>
          parseInt((b as HTMLElement).getAttribute('data-day') || '0', 10),
        );

        const btn = container.querySelector('#btnCreateSchedule');
        btn.innerText = 'Creating...';
        btn.disabled = true;

        const newSch = {
          id: Date.now().toString(),
          name,
          startTime: start,
          endTime: end,
          days: selectedDays.length > 0 ? selectedDays : [1, 2, 3, 4, 5],
          active: true,
          appNames: [],
        };

        const { createScheduleAction } = await import(
          '../../../../packages/viewmodels/src/useScheduleVM'
        );
        await createScheduleAction(newSch);
        renderScheduleScreen(container);
      });

    container.querySelectorAll('.delete-sch').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.innerHTML = '...';
        btn.disabled = true;
        const { deleteScheduleAction } = await import(
          '../../../../packages/viewmodels/src/useScheduleVM'
        );
        await deleteScheduleAction(id);
        renderScheduleScreen(container);
      });
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Failed to load schedules: ${e.message}</div>`;
  }
}
