import { COLORS } from '@/ui/theme/designTokens';
import { UI_TOKENS, UI_ICONS } from '@/ui/theme/uiTokens';

/**
 * Shared Date Selector Widget
 */
export function setupDateSelectorWidget(
  container: HTMLElement,
  dateW: HTMLElement,
  data: { targetDate: string; isToday: boolean },
  onDateChange: (date: string) => void,
  attachCalendar: (
    trigger: HTMLElement,
    container: HTMLElement,
    currentDate: string,
    onSelect: (date: string) => void,
  ) => void,
) {
  const { targetDate, isToday } = data;
  const date = new Date(targetDate);
  const friendly = isToday
    ? 'Today'
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  dateW.innerHTML = `
    <div class="fg-flex fg-items-center fg-gap-1">
      <button class="date-nav-prev" style="width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; background:transparent; border:none; color:${
        COLORS.muted
      }; cursor:pointer; transition:all 0.2s;">
         ${UI_ICONS.CHEVRON_LEFT}
      </button>
      
      <div style="display: flex; flex-direction: column; align-items: center; min-width: 80px; cursor:pointer;" class="date-picker-trigger" id="sa-date-trigger">
        <div style="${UI_TOKENS.TEXT.CARD_TITLE}; color:${
    COLORS.text
  }; font-weight:800; font-size: 13px;">${friendly}</div>
        <div style="${UI_TOKENS.TEXT.BADGE} color:${
    COLORS.muted
  }; margin-top: -1px;">${targetDate}</div>
      </div>

      <button class="date-nav-next" ${
        isToday ? 'disabled' : ''
      } style="width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; background:transparent; border:none; color:${
    COLORS.muted
  }; cursor:${isToday ? 'default' : 'pointer'}; opacity:${
    isToday ? '0.2' : '1'
  }; transition:all 0.2s;">
         ${UI_ICONS.CHEVRON_RIGHT}
      </button>
    </div>
  `;

  (dateW as any).__dashTargetDate = targetDate;

  if (!(dateW as any).__dateListenerAttached) {
    dateW.addEventListener('click', (e: MouseEvent) => {
      const currentTargetDate = (dateW as any).__dashTargetDate;
      const prevBtn = (e.target as HTMLElement).closest('.date-nav-prev');
      const nextBtn = (e.target as HTMLElement).closest('.date-nav-next');

      if (prevBtn && !prevBtn.hasAttribute('disabled')) {
        const d = new Date(currentTargetDate);
        d.setDate(d.getDate() - 1);
        onDateChange(d.toLocaleDateString('en-CA'));
      }
      if (nextBtn && !nextBtn.hasAttribute('disabled')) {
        const d = new Date(currentTargetDate);
        d.setDate(d.getDate() + 1);
        onDateChange(d.toLocaleDateString('en-CA'));
      }
      if ((e.target as HTMLElement).closest('#sa-date-trigger')) {
        attachCalendar(
          dateW.querySelector('#sa-date-trigger') as HTMLElement,
          container,
          currentTargetDate,
          (newDateStr: string) => onDateChange(newDateStr),
        );
      }
    });
    (dateW as any).__dateListenerAttached = true;
  }
}
