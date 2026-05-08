import {
  escapeHtml,
  formatMinutes,
  findServiceIdByDomain,
} from '@stopaccess/core';
import { COLORS } from '@/ui/theme/designTokens';
import { UI_ICONS } from '@/ui/theme/uiTokens';
import { renderBrandLogo } from '@/ui/components/icons';
import { renderTableProgress } from '@/ui/components/badges';
import { renderCustomSelect } from '@/ui/components/Select';

export function getRuleActiveState(rule: any, passes: any = {}) {
  // 1. Check if any active pass matches this rule
  const now = Date.now();
  const ruleId = (rule.customDomain || rule.packageName || '').toLowerCase();

  const hasActivePass = Object.keys(passes).some((key) => {
    const pass = passes[key];
    if (!pass || pass.expiresAt <= now) {
      return false;
    }

    const passKey = key.toLowerCase();
    // Direct match or subdomain match
    if (
      passKey === ruleId ||
      passKey.endsWith('.' + ruleId) ||
      ruleId.endsWith('.' + passKey)
    ) {
      return true;
    }

    // Service match (e.g. "facebook" rule matches "facebook.com" pass)
    if (
      rule.type === 'service' &&
      findServiceIdByDomain(passKey) === rule.packageName
    ) {
      return true;
    }

    return false;
  });

  if (hasActivePass) {
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

  const now = Date.now();
  const ruleId = (rule.customDomain || rule.packageName || '').toLowerCase();
  let unblockCountdown = '';
  Object.keys(passes).forEach((key) => {
    const p = passes[key];
    if (!p || p.expiresAt <= now) {
      return;
    }

    const passKey = key.toLowerCase();
    let isMatch = false;

    if (
      passKey === ruleId ||
      passKey.endsWith('.' + ruleId) ||
      ruleId.endsWith('.' + passKey)
    ) {
      isMatch = true;
    } else if (
      rule.type === 'service' &&
      findServiceIdByDomain(passKey) === rule.packageName
    ) {
      isMatch = true;
    }

    if (isMatch) {
      const remaining = Math.max(0, Math.ceil((p.expiresAt - now) / 60000));
      unblockCountdown = `${remaining}m left`;
    }
  });

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
        <div style="margin-top: 3px; font-size: 12px; font-weight: 500; color: var(--fg-muted); display: flex; align-items: center; gap: 6px;">
          ${
            unblockCountdown
              ? `<span style="color: ${COLORS.green}; font-weight: 800; display: flex; align-items: center; gap: 4px;">
                  ${unblockCountdown}
                 </span>`
              : streak > 0
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

      <!-- 7. Toggle & Resume -->
      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
        ${
          !active && rule.desiredBlockingState !== false
            ? `
          <div style="width: 20px;"></div> <!-- Spacer where shield was -->
        `
            : ''
        }
        <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  }
          data-kind="${type}" data-id="${escapeHtml(
    rule.packageName,
  )}" data-pkg="${escapeHtml(rule.packageName)}"
          data-name="${escapeHtml(rule.appName || identifier)}"
          aria-checked="${active}"
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
          ${UI_ICONS.TRASH}
        </button>
      </div>
    </div>
  `;
}
