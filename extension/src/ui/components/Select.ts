import { escapeHtml } from '@stopaccess/core';
import { UI_ICONS } from '@/ui/theme/uiTokens';

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
        <span style="opacity: 0.5; display: flex; align-items: center;">
          ${UI_ICONS.CHEVRON_DOWN}
        </span>
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
