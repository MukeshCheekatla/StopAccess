import {
  escapeHtml,
  resolveServiceIcon as getServiceIcon,
} from '@focusgate/core';

/**
 * ServiceCard
 * Renders the app/service card (NextDNS standard apps).
 */
export function renderServiceCard(
  service: any,
  rules: any[],
  lockedDomains: string[] = [],
) {
  const icon = getServiceIcon(service);
  const localRule = rules.find(
    (rule) => rule.packageName === service.id && rule.type === 'service',
  );
  const active = service.active ?? localRule?.blockedToday ?? false;
  const isLocked = lockedDomains.includes(service.id);

  const iconNode =
    icon.kind === 'remote'
      ? `<img src="${icon.url}" alt="" class="app-icon" style="background:${icon.accent}15;">`
      : `<div class="app-icon app-icon-fallback" style="background:${icon.accent}22; color:${icon.accent};">${icon.label}</div>`;

  return `
    <div class="service-card ${active ? 'active' : ''}" data-id="${escapeHtml(
    service.id,
  )}" data-type="service" data-name="${escapeHtml(
    service.name,
  )}" style="display:flex; flex-direction:column; gap: 12px; height: auto; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
          ${iconNode}
          <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
            <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
              service.name,
            )}</div>
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
              <div class="stat-lbl" style="font-size: 10px;">App</div>
              <div style="font-size: 8px; padding: 1px 4px; border-radius: 4px; background: var(--accent); color: #fff; font-weight: 800;">PROFILE</div>
            </div>
          </div>
        </div>
        <div class="app-controls" style="display:flex; align-items:center; gap: 10px;">
          <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  } data-kind="service" data-id="${escapeHtml(
    service.id,
  )}" data-name="${escapeHtml(service.name)}">
            <span class="on-text">ON</span>
            <span class="off-text">OFF</span>
          </button>
          <button class="btn-outline delete-rule" ${
            isLocked ? 'disabled style="opacity:0.3;"' : ''
          } data-pkg="${escapeHtml(
    service.id,
  )}" style="padding: 6px; font-size: 10px;">
            ${isLocked ? '🔒' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  `;
}
