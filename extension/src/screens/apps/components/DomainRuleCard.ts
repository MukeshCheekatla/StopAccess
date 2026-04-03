import { escapeHtml, resolveIconUrl as getDomainIcon } from '@focusgate/core';

/**
 * DomainRuleCard
 * Renders the full domain rule card with progress bar, extension badge, and limit select.
 */
export function renderDomainRuleCard(rule: any, lockedDomains: string[] = []) {
  const domain = rule.customDomain || rule.packageName;
  const active = rule.blockedToday;
  const limitValue = rule.dailyLimitMinutes || 0;
  const usedValue = Math.round(rule.usedMinutesToday || 0);
  const extensionsUsed = rule.extensionCountToday || 0;
  const isLocked = lockedDomains.includes(rule.packageName);

  const limitOptions = [
    { value: 0, label: 'No Limit' },
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
  ];

  const isCustomLimit =
    limitValue > 0 && !limitOptions.some((o) => o.value === limitValue);
  const optionsHtml =
    limitOptions
      .map(
        (o) =>
          `<option value="${o.value}" ${
            o.value === limitValue ? 'selected' : ''
          }>${o.label}</option>`,
      )
      .join('') +
    (isCustomLimit
      ? `<option value="${limitValue}" selected>${limitValue} min</option>`
      : '');

  // Progress bar
  let progressHtml = '';
  if (limitValue > 0) {
    const pct = Math.min(100, Math.round((usedValue / limitValue) * 100));
    const barColor =
      pct >= 100 ? 'var(--red)' : pct >= 75 ? 'var(--yellow)' : 'var(--accent)';
    progressHtml = `
      <div style="margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 11px; color: var(--muted);">${usedValue}m used</span>
          <span style="font-size: 11px; color: ${
            pct >= 100 ? 'var(--red)' : 'var(--muted)'
          }; font-weight: 700;">${pct}%</span>
        </div>
        <div style="width: 100%; height: 4px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 4px; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }

  // Extensions badge
  let extensionBadge = '';
  if (extensionsUsed > 0) {
    extensionBadge = `
      <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
        <div style="font-size: 10px; padding: 2px 8px; border-radius: 10px; background: rgba(108, 71, 255, 0.1); border: 1px solid rgba(108, 71, 255, 0.2); color: #9f8cff; font-weight: 800;">
          ${extensionsUsed}/5 extensions used today
        </div>
      </div>
    `;
  }

  return `
    <div class="app-card rule-card" data-pkg="${escapeHtml(
      rule.packageName,
    )}" data-name="${escapeHtml(
    rule.appName,
  )}" style="display:flex; flex-direction:column; gap: 12px; padding: 16px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap: 12px;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
          <img src="${getDomainIcon(domain)}" alt="" class="app-icon">
          <div class="app-info" style="min-width: 0;">
            <div class="stat-val" style="font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
              rule.appName,
            )}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
              <div class="stat-lbl">${escapeHtml(domain)}</div>
              <div style="font-size: 8px; padding: 2px 6px; border-radius: 4px; background: ${
                rule.scope === 'profile'
                  ? 'var(--accent)'
                  : 'rgba(255,255,255,0.05)'
              }; color: ${
    rule.scope === 'profile' ? '#fff' : 'var(--muted)'
  }; font-weight: 800; border: 1px solid ${
    rule.scope === 'profile' ? 'transparent' : 'rgba(255,255,255,0.1)'
  };">
                ${rule.scope === 'profile' ? 'NEXTDNS' : 'LOCAL'}
              </div>
              ${
                active
                  ? '<div style="font-size: 8px; padding: 2px 6px; border-radius: 4px; background: rgba(255,71,87,0.1); color: var(--red); font-weight: 800; border: 1px solid rgba(255,71,87,0.2);">BLOCKED</div>'
                  : ''
              }
            </div>
          </div>
        </div>
        <div class="app-controls" style="display:flex; align-items:center; gap: 10px;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  } data-kind="domain" data-id="${escapeHtml(domain)}" data-pkg="${escapeHtml(
    rule.packageName,
  )}">
            <span class="on-text">ON</span>
            <span class="off-text">OFF</span>
          </button>
          <button class="btn-outline delete-rule" ${
            isLocked ? 'disabled style="opacity:0.3;"' : ''
          } data-pkg="${escapeHtml(rule.packageName)}" style="padding: 6px;">
            ${isLocked ? '🔒' : 'Delete'}
          </button>
        </div>
      </div>
      
      <div style="padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14" style="color: var(--muted);">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
              <path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span style="font-size: 12px; color: var(--muted); font-weight: 700; text-transform: uppercase;">Daily Limit</span>
          </div>
          <select class="input edit-limit-select" data-pkg="${escapeHtml(
            rule.packageName,
          )}" style="width: auto; min-width: 120px; padding: 6px 12px; font-size: 13px; font-weight: 700; text-align: right; cursor: pointer; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: var(--text); appearance: auto;">
            ${optionsHtml}
          </select>
        </div>
        ${progressHtml}
        ${extensionBadge}
      </div>
    </div>
  `;
}
