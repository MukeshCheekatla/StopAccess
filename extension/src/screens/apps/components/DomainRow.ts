import { escapeHtml, resolveIconUrl as getDomainIcon } from '@focusgate/core';

export function renderDomainRow(
  domain: string,
  isActive: boolean,
  isLocked: boolean,
  _onToggle: (domain: string, active: boolean) => void,
): string {
  const elementId = `domain_row_${domain.replace(/\./g, '_')}`;

  const scoreColor = isLocked ? 'var(--red)' : 'var(--muted)';

  return `
    <div class="rule-item" id="${elementId}" style="animation: fadeIn 0.3s ease-out both;">
      <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
        <div class="domain-icon-wrapper" style="width: 32px; height: 32px; border-radius: 8px;
          background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center;
          overflow: hidden; border: 1px solid var(--glass-border);">
          <img src="${getDomainIcon(domain)}" style="width: 18px; height: 18px;"
            onerror="this.src='https://www.google.com/s2/favicons?sz=64&domain=${domain}';">
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(domain)}
          </div>
          <div style="font-size: 10px; color: ${scoreColor};
            font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            ${isLocked ? '🔒 Focus Protected' : '🌐 Domain Rule'}
          </div>
        </div>
      </div>

      <button class="toggle-switch-btn ${
        isActive ? 'active' : ''
      } domain-toggle"
        data-domain="${domain}"
        data-active="${isActive}"
        ${
          isLocked ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''
        }>
        <span class="on-text">OFF</span>
        <span class="off-text">ON</span>
      </button>
    </div>
  `;
}
