import { COLORS } from '../../lib/designTokens';

export function attachCalendarWidget(
  triggerElement: HTMLElement,
  container: HTMLElement,
  currentDateStr: string,
  onDateSelect: (dateStr: string) => void,
) {
  // Prevent multiple calendars
  if (document.getElementById('sa-calendar-popup')) {
    document.getElementById('sa-calendar-popup')?.remove();
    return;
  }

  const currentDate = new Date(currentDateStr);
  let renderDate = new Date(currentDate);

  const calendarContainer = document.createElement('div');
  calendarContainer.id = 'sa-calendar-popup';
  calendarContainer.className = 'glass-card';
  calendarContainer.style.position = 'absolute';
  calendarContainer.style.top = 'calc(100% + 8px)';
  calendarContainer.style.right = '0';
  calendarContainer.style.marginTop = '0';
  calendarContainer.style.zIndex = '1000';
  calendarContainer.style.padding = '16px';
  calendarContainer.style.width = '260px';
  calendarContainer.style.boxShadow = '0 10px 40px var(--fg-shadow-soft)';
  calendarContainer.style.background = 'var(--fg-glass-bg)';
  calendarContainer.style.border = '1px solid var(--fg-glass-border)';

  const renderMonth = () => {
    const year = renderDate.getFullYear();
    const month = renderDate.getMonth();

    // Header
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const headerHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
        <button id="cal-prev-month" style="background:transparent; border:none; cursor:pointer; color:var(--fg-text); font-weight:bold; font-size:16px;">&lt;</button>
        <div style="font-weight:bold; color:var(--fg-text); font-size:14px;">${monthNames[month]} ${year}</div>
        <button id="cal-next-month" style="background:transparent; border:none; cursor:pointer; color:var(--fg-text); font-weight:bold; font-size:16px;">&gt;</button>
      </div>
    `;

    // Weekdays
    const weekdaysHtml = `
      <div style="display:grid; grid-template-columns:repeat(7, 1fr); text-align:center; font-size:10px; color:var(--fg-muted); margin-bottom:8px; font-weight:bold;">
        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
      </div>
    `;

    // Days calculate
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let daysHtml =
      '<div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px;">';

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      daysHtml += '<div></div>';
    }

    const todayDateStr = new Date().toLocaleDateString('en-CA');

    for (let i = 1; i <= daysInMonth; i++) {
      const cellDateStr = new Date(year, month, i).toLocaleDateString('en-CA');
      const isSelected = cellDateStr === currentDateStr;
      const isToday = cellDateStr === todayDateStr;
      const isFuture = cellDateStr > todayDateStr;

      let bg: string = 'transparent';
      let color: string = COLORS.text;
      let cursor = 'pointer';
      let opacity = '1';

      if (isSelected) {
        bg = COLORS.accent;
        color = COLORS.onAccent;
      } else if (isFuture) {
        color = COLORS.muted;
        opacity = '0.3';
        cursor = 'default';
      } else if (isToday) {
        color = COLORS.accent;
        bg = COLORS.blueSoft;
      }

      daysHtml += `
        <div class="cal-day" data-date="${cellDateStr}" data-future="${isFuture}" style="
          width:100%; aspect-ratio:1; display:flex; align-items:center; justify-content:center; 
          border-radius:6px; cursor:${cursor}; background:${bg}; color:${color}; font-size:12px; font-weight:500; opacity:${opacity};
          transition:0.1s background;
        ">${i}</div>
      `;
    }
    daysHtml += '</div>';

    // Quick Actions
    const quickActionsHtml = `
      <div style="display:flex; justify-content:space-between; margin-top:16px; border-top:1px solid var(--fg-glass-border); padding-top:12px;">
        <button id="cal-today-btn" style="background:transparent; border:none; color:${COLORS.accent}; font-size:12px; font-weight:600; cursor:pointer;">Today</button>
        <button id="cal-close-btn" style="background:transparent; border:none; color:var(--fg-muted); font-size:12px; font-weight:500; cursor:pointer;">Close</button>
      </div>
    `;

    calendarContainer.innerHTML =
      headerHtml + weekdaysHtml + daysHtml + quickActionsHtml;

    // Attach listeners
    calendarContainer
      .querySelector('#cal-prev-month')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        renderDate.setMonth(renderDate.getMonth() - 1);
        renderMonth();
      });

    calendarContainer
      .querySelector('#cal-next-month')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        renderDate.setMonth(renderDate.getMonth() + 1);
        renderMonth();
      });

    calendarContainer
      .querySelector('#cal-today-btn')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        onDateSelect(todayDateStr);
        calendarContainer.remove();
      });

    calendarContainer
      .querySelector('#cal-close-btn')
      ?.addEventListener('click', (e) => {
        e.stopPropagation();
        calendarContainer.remove();
      });

    calendarContainer.querySelectorAll('.cal-day').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if ((el as HTMLElement).dataset.future === 'true') {
          return;
        }
        const selected = (el as HTMLElement).dataset.date;
        if (selected) {
          onDateSelect(selected);
          calendarContainer.remove();
        }
      });
      // hover effect for non-selected/non-future
      el.addEventListener('mouseover', () => {
        if ((el as HTMLElement).dataset.future === 'true') {
          return;
        }
        if ((el as HTMLElement).style.backgroundColor === 'transparent') {
          (el as HTMLElement).style.backgroundColor =
            'var(--fg-glass-hover, var(--fg-shadow-inset))';
        }
      });
      el.addEventListener('mouseout', () => {
        if ((el as HTMLElement).dataset.future === 'true') {
          return;
        }
        const isSelected = (el as HTMLElement).dataset.date === currentDateStr;
        const isToday = (el as HTMLElement).dataset.date === todayDateStr;
        if (!isSelected && !isToday) {
          (el as HTMLElement).style.backgroundColor = 'transparent';
        } else if (isToday && !isSelected) {
          (el as HTMLElement).style.backgroundColor = COLORS.blueSoft;
        }
      });
    });
  };

  renderMonth();

  // Close on outside click
  const closeListener = (e: MouseEvent) => {
    if (
      !calendarContainer.contains(e.target as Node) &&
      !triggerElement.contains(e.target as Node)
    ) {
      calendarContainer.remove();
      document.removeEventListener('click', closeListener);
    }
  };
  setTimeout(() => document.addEventListener('click', closeListener), 0);

  triggerElement.appendChild(calendarContainer);
}
