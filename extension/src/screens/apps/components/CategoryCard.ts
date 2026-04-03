import { escapeHtml, getCategoryBadge } from '@focusgate/core';

/**
 * CategoryCard
 * Renders the category protection card with vibrant badge.
 */
export function renderCategoryCard(
  category: any,
  rules: any[],
  lockedDomains: string[] = [],
) {
  const localRule = rules.find(
    (rule) => rule.packageName === category.id && rule.type === 'category',
  );
  const active = category.active ?? localRule?.blockedToday ?? false;
  const isLocked = lockedDomains.includes(category.id);

  return `
    <div class="service-card ${active ? 'active' : ''}" data-id="${escapeHtml(
    category.id,
  )}" data-type="category" data-name="${escapeHtml(
    category.name,
  )}" style="display:flex; flex-direction:column; gap: 12px; height: auto; padding: 16px;">
      <div style="display:flex; align-items:center; gap: 12px; justify-content:space-between; width: 100%;">
        <div style="display:flex; align-items:center; gap: 12px; min-width: 0;">
          <div class="app-icon app-icon-fallback" style="background: rgba(124, 111, 247, 0.16); color: var(--accent);">
            ${escapeHtml(getCategoryBadge(category))}
          </div>
          <div style="display:flex; flex-direction:column; min-width:0; flex:1;">
            <div class="name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px;">${escapeHtml(
              category.name,
            )}</div>
            <div class="stat-lbl" style="font-size: 10px;">Category Blocking</div>
          </div>
        </div>
        <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  } data-kind="category" data-id="${escapeHtml(
    category.id,
  )}" data-name="${escapeHtml(category.name)}">
          <span class="on-text">ON</span>
          <span class="off-text">OFF</span>
        </button>
        ${isLocked ? '<div style="font-size:12px;">🔒</div>' : ''}
      </div>
    </div>
  `;
}
