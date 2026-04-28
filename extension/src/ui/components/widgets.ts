import {
  findServiceIdByDomain,
  escapeHtml,
  formatMinutes,
} from '@stopaccess/core';
import { COLORS } from '../../lib/designTokens';
import { UI_TOKENS, UI_ICONS } from '../tokens';
import { renderBrandLogo } from './icons';
import { renderTableProgress } from './badges';

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
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
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
         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
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

export function renderCustomSelect(
  options: { value: any; label: string }[],
  current: any,
  pkg: string,
  className: string,
  width = '130px',
) {
  const selectedLabel =
    options.find((o) => o.value === current)?.label || options[0].label;
  return `
    <div class="fg-custom-select ${className}" data-pkg="${escapeHtml(pkg)}">
      <div class="fg-select-trigger" style="width: ${width}; height: 32px; padding: 0 12px; font-size: 12px; font-weight: 500;">
        <span>${selectedLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      <div class="fg-select-menu">
        ${options
          .map(
            (opt) => `
          <div class="fg-select-option ${
            Number(opt.value) === Number(current) ? 'selected' : ''
          }" data-value="${opt.value}">
            ${opt.label}
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
  `;
}

export function getRuleActiveState(rule: any, passes: any = {}) {
  // 1. Check exact package/domain direct match
  const ruleDomain = rule.customDomain || rule.packageName;
  let pass = passes[ruleDomain];

  // 2. If no exact match, scan all active passes to see if they apply to this rule
  if (!pass) {
    for (const key of Object.keys(passes)) {
      if (
        ruleDomain === key ||
        (ruleDomain && key.endsWith(`.${ruleDomain}`)) ||
        (rule.type === 'service' &&
          findServiceIdByDomain(key) === rule.packageName)
      ) {
        pass = passes[key];
        break;
      }
    }
  }

  if (pass && pass.expiresAt > Date.now()) {
    return false;
  }
  return Boolean(
    rule?.desiredBlockingState ?? rule?.blockedToday ?? rule?.mode !== 'allow',
  );
}

export function renderLimitSelector(rule: any) {
  const limitValue = rule.dailyLimitMinutes || 0;
  const options = [
    { value: 0, label: 'Instant Block' },
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
  ];
  return renderCustomSelect(
    options,
    limitValue,
    rule.packageName,
    'edit-limit-select',
  );
}

export function renderPassSelector(rule: any) {
  const currentValue = Math.max(0, Number(rule.maxDailyPasses ?? 3));
  const options = [0, 1, 2, 3, 4, 5].map((v) => ({
    value: v,
    label: `${v} pass${v === 1 ? '' : 'es'}`,
  }));
  return renderCustomSelect(
    options,
    currentValue,
    rule.packageName,
    'edit-pass-select',
    '110px',
  );
}

export function renderAppTableRow(
  rule: any,
  isLocked: boolean,
  passes: any = {},
) {
  const active = getRuleActiveState(rule, passes);
  const used = rule.usedMinutesToday || 0;
  const limit = rule.dailyLimitMinutes || 0;
  const identifier = rule.customDomain || rule.packageName;
  const type = rule.type || 'domain';
  const streak = rule.streakDays || 0;

  const usageText =
    limit > 0
      ? `<span style="color: var(--fg-text); font-size: 13px; font-weight: 600;">${formatMinutes(
          used,
        )}</span><span style="color: var(--fg-muted); font-size: 12px; font-weight: 400; margin-left: 3px;">/ ${formatMinutes(
          limit,
        )}</span>`
      : `<span style="color: var(--fg-muted); font-size: 13px; font-weight: 500;">${formatMinutes(
          used,
        )}</span>`;

  return `
    <div class="rule-table-row fg-transition-all fg-duration-150 hover:fg-bg-[var(--fg-glass-bg)] ${
      active ? 'is-active' : ''
    }" data-pkg="${escapeHtml(rule.packageName)}" style="
      display: grid;
      grid-template-columns: 32px minmax(160px, 1fr) 150px 140px 120px 80px 40px;
      column-gap: 12px;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid var(--fg-glass-border);
      cursor: default;
      width: 100%;
      scroll-snap-align: start;
    ">
      <!-- 1. Icon -->
      <div style="display: flex; align-items: center; justify-content: center;">
        ${renderBrandLogo(identifier, rule.appName, 32)}
      </div>

      <!-- 2. Identity -->
      <div style="display: flex; flex-direction: column; min-width: 0;">
        <div style="font-size: 15px; font-weight: 600; color: var(--fg-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;">${escapeHtml(
          rule.appName || identifier,
        )}</div>
        <div style="margin-top: 3px; font-size: 12px; font-weight: 500; color: var(--fg-muted); display: flex; align-items: center; gap: 4px;">
          ${
            streak > 0
              ? `<span style="color: ${COLORS.fire}; display: flex; align-items: center; transform: scale(0.75);">${UI_ICONS.FIRE}</span> ${streak}d streak`
              : type === 'service'
              ? 'App'
              : 'Domain'
          }
        </div>
      </div>

      <!-- 3. Usage & Progress -->
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; align-items: center; gap: 3px;">
          ${usageText}
        </div>
        ${renderTableProgress(used, limit, active)}
      </div>

      <!-- 5. Limit Selector -->
      <div style="display: flex; align-items: center;">
        ${renderLimitSelector(rule)}
      </div>

      <!-- 6. Pass Selector -->
      <div style="display: flex; align-items: center;">
        ${renderPassSelector(rule)}
      </div>

      <!-- 7. Toggle -->
      <div style="display: flex; align-items: center; justify-content: flex-end;">
        <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  }
          data-kind="${type}" data-id="${escapeHtml(
    rule.packageName,
  )}" data-pkg="${escapeHtml(rule.packageName)}"
          style="transform: scale(0.8); transform-origin: right;">
          <span class="on-text">On</span>
          <span class="off-text">Off</span>
        </button>
      </div>

      <!-- 8. Delete -->
      <div style="display: flex; align-items: center; justify-content: flex-end;">
        <button class="btn-icon delete-rule" ${
          isLocked ? 'disabled style="opacity:0.3;"' : ''
        } data-pkg="${escapeHtml(rule.packageName)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </div>
  `;
}
