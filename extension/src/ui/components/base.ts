import { COLORS } from '../../lib/designTokens';
import { UI_TOKENS } from '../tokens';
import { renderBrandLogo } from './icons';

export function renderInfoTooltip(
  tooltipText: string,
  direction: 'up' | 'down' = 'up',
  align: 'center' | 'left' | 'right' = 'center',
): string {
  if (!tooltipText) {
    return '';
  }
  const directionClass = direction === 'down' ? 'fg-tooltip-down' : '';
  const alignClass = align !== 'center' ? `fg-tooltip-${align}` : '';
  return `
    <div class="fg-tooltip ${directionClass} ${alignClass} fg-inline-flex fg-items-center fg-justify-center fg-transition-colors fg-cursor-pointer" 
         data-tooltip="${tooltipText}"
         style="margin-left: 6px; vertical-align: middle; color: var(--fg-muted);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 16v-4"></path>
        <path d="M12 8h.01"></path>
      </svg>
    </div>
  `;
}

/**
 * Premium Guardian PIN Modal
 * Challenges the user for their 4-digit pin before proceeding.
 */
/**
 * Render a generic error state card.
 */
export function renderErrorCard(message: string, retryBtnId: string): string {
  return `
    <div class="app-card" style="text-align: center; padding: 40px 24px; background: var(--fg-glass-bg); border-color: var(--fg-glass-border);">
      <div style="color: var(--fg-red); margin-bottom: 12px; display: flex; justify-content: center;">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div style="${UI_TOKENS.TEXT.ERROR}; margin-bottom: 8px;">Failed to Load</div>
      <div style="${UI_TOKENS.TEXT.FOOTNOTE}; margin-bottom: 20px;">${message}</div>
      <button class="btn btn-outline" id="${retryBtnId}">Retry</button>
    </div>
  `;
}

/**
 * Render a section header with an optional count badge.
 */
export function renderSectionHeader(
  title: string,
  subtitle: string,
  count?: number,
): string {
  const badge =
    count !== undefined && count > 0
      ? `<span style="font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 100px; background: var(--fg-danger-badge); color: var(--fg-red); border: 1px solid var(--fg-danger-badge-border);">${count}</span>`
      : '';
  return `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="${UI_TOKENS.TEXT.HEADING}">${title}</div>
          ${badge}
        </div>
        <div style="${UI_TOKENS.TEXT.SUBTEXT}; margin-top: 4px;">${subtitle}</div>
      </div>
    </div>
  `;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Toggle Switch ΓÇö write once, use everywhere
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Render a toggle switch button (HTML output).
 *
 * @param key        data-key attribute forwarded to the button
 * @param active     current on/off state
 * @param className  extra CSS class for event delegation (e.g. 'security-toggle-btn')
 */
export function renderToggleSwitch(
  key: string,
  active: boolean,
  className = 'security-toggle-btn',
): string {
  return `
    <button
      class="${className} fg-relative fg-shrink-0 fg-cursor-pointer ${
    active ? 'active' : ''
  }"
      data-key="${key}"
      aria-checked="${active}"
      role="switch"
      style="width: 32px; height: 18px; border-radius: 9px; border: none;
        background: ${active ? 'var(--fg-green)' : 'var(--fg-toggle-bg)'};
        border: 1px solid ${
          active ? 'var(--fg-green)' : 'var(--fg-glass-border)'
        };
        transition: background 0.2s ease; outline: none;"
    >
      <span style="position: absolute; top: 2px; left: ${
        active ? '16px' : '2px'
      };
        width: 14px; height: 14px; border-radius: 50%;
        background: ${COLORS.white}; transition: left 0.2s ease;
        box-shadow: 0 1px 2px var(--fg-shadow);"></span>
    </button>
  `;
}

/**
 * Render a privacy-style pill toggle (larger, used in Privacy options).
 *
 * @param key     data-key for the button
 * @param active  current state
 * @param className extra class for delegation
 */
export function renderPillToggle(
  key: string,
  active: boolean,
  className = 'privacy-option-toggle',
): string {
  return `
    <button
      class="${className} fg-relative fg-shrink-0 fg-cursor-pointer ${
    active ? 'active' : ''
  }"
      data-key="${key}"
      aria-checked="${active}"
      role="switch"
      style="width: 36px; height: 20px; border-radius: 10px; border: none;
        background: ${active ? 'var(--fg-green)' : 'var(--fg-toggle-bg)'};
        border: 1px solid ${
          active ? 'var(--fg-green)' : 'var(--fg-glass-border)'
        };
        transition: background 0.2s; outline: none;"
    >
      <span style="position: absolute; top: 2px; left: ${
        active ? '18px' : '2px'
      };
        width: 16px; height: 16px; border-radius: 50%;
        background: ${COLORS.white}; transition: left 0.2s;
        box-shadow: 0 1px 3px var(--fg-shadow);"></span>
    </button>
  `;
}

/**
 * Mutate a toggle button's DOM state after a user interaction.
 * Works for BOTH security-toggle-btn and privacy-option-toggle.
 */
export function applyToggleUI(btn: HTMLElement, active: boolean): void {
  btn.setAttribute('aria-checked', String(active));
  btn.setAttribute('data-active', String(active));
  if (active) {
    btn.classList.add('active');
    btn.style.background = 'var(--fg-green)';
    btn.style.border = '1px solid var(--fg-green)';
  } else {
    btn.classList.remove('active');
    btn.style.background = 'var(--fg-toggle-bg)';
    btn.style.border = '1px solid var(--fg-glass-border)';
  }
  const knob = btn.querySelector('span') as HTMLElement;
  if (knob) {
    knob.style.left = active ? '16px' : '2px';
  }
}

/**
 * Mutate a blocklist/card toggle button state (green check vs. blue plus).
 */
export function applyCardToggleUI(
  card: HTMLElement | null,
  btn: HTMLElement,
  active: boolean,
): void {
  if (card) {
    card.setAttribute('data-active', String(active));
  }
  btn.setAttribute('data-active', String(active));
  btn.setAttribute('aria-pressed', String(active));
  btn.style.background = active ? 'var(--fg-emerald-strong)' : COLORS.glassBg;
  btn.style.borderColor = active
    ? 'var(--fg-emerald-border-strong)'
    : COLORS.glassBorder;
  btn.style.color = active ? 'var(--fg-green)' : 'var(--fg-muted)';
  if (active) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Loader ΓÇö write once, use everywhere
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Render a centered loading spinner with optional label.
 * Replaces the `<div class="loader">...</div>` pattern used in every screen.
 *
 * @param label    Small uppercase text beneath the spinner. Pass '' to omit.
 * @param padding  Wrapper padding class (Tailwind-style). Default: 'fg-p-10'
 */
export function renderLoader(label = '', padding = 'fg-p-10'): string {
  const text = label
    ? `<div class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-70 fg-mt-4 fg-animate-pulse">${label}</div>`
    : '';
  return `
    <div class="fg-flex fg-flex-col fg-items-center fg-justify-center ${padding}">
      <div class="loader fg-mb-4"></div>
      ${text}
    </div>
  `;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Empty State ΓÇö write once, use everywhere
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Render a dashed-border empty state box.
 * Replaces the hardcoded inline-style empty state used in AppsPage and others.
 *
 * @param message  The message to display.
 */
export function renderEmptyState(
  message: string,
  suggestions?: { id: string; label: string }[],
): string {
  let suggestionsHtml = '';
  if (suggestions && suggestions.length > 0) {
    suggestionsHtml = `
      <div style="margin-top: 24px; border-top: 1px dashed var(--fg-glass-border); padding-top: 20px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.5; margin-bottom: 12px;">Quick Suggestions</div>
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
          ${suggestions
            .map(
              (s) => `
            <button class="quick-add-btn fg-px-4 fg-py-2 fg-rounded-xl fg-bg-[var(--fg-glass-bg)] fg-border fg-border-[var(--fg-glass-border)] fg-text-[var(--fg-text)] fg-text-[12px] fg-font-bold hover:fg-bg-[var(--fg-surface-hover)] hover:fg-border-[var(--fg-muted)] fg-transition-all fg-cursor-pointer fg-flex fg-items-center fg-gap-2" data-id="${
              s.id
            }">
              ${renderBrandLogo(s.id, s.label, 16)}
              <span>+ ${s.label}</span>
            </button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  return `
    <div style="padding: 28px 20px; border: 1px dashed var(--fg-glass-border); border-radius: 16px; color: var(--fg-muted); font-size: 13px; font-weight: 600; text-align: center; background: var(--fg-glass-bg); width: 100%; line-height: 1.5;">
      <div>${message}</div>
      ${suggestionsHtml}
    </div>
  `;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Section Badge ΓÇö write once, use everywhere
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Render a small pill badge (e.g. "3 Active", "2/7 Active").
 * Replaces the repeated `fg-font-black  fg-tracking fg-rounded-full` pattern.
 *
 * @param label  The badge text, e.g. "${count} Active"
 * @param color  'default' (glass) | 'red' | 'green' | 'accent'
 */
export function renderSectionBadge(
  label: string,
  color: 'default' | 'red' | 'green' | 'accent' = 'default',
): string {
  const styles: Record<string, string> = {
    default:
      'background: var(--fg-glass-bg); color: var(--fg-text); border: 1px solid var(--fg-glass-border); opacity: 0.8;',
    red: 'background: var(--fg-danger-badge); color: var(--fg-red); border: 1px solid var(--fg-danger-badge-border);',
    green:
      'background: var(--fg-emerald-soft); color: var(--fg-green); border: 1px solid var(--fg-emerald-border);',
    accent:
      'background: var(--fg-indigo-soft); color: var(--fg-accent); border: 1px solid var(--fg-nav-border);',
  };
  return `<span style="font-size: 12px; font-weight: 800; letter-spacing: 0; padding: 3px 10px; border-radius: 100px; ${styles[color]}">${label}</span>`;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Card Section ΓÇö write once, use everywhere
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Render the repeating app-card section header row:
 *   [icon + title]  [badge]
 *
 * Used by ThreatSection, DomainProtection, Parental, Content, Blocklists,
 * NativeTrackers, PrivacyOptions ΓÇö all 7 follow identical structure.
 *
 * @param iconHtml   SVG/HTML for the leading icon (already escaped)
 * @param iconColor CSS token for the icon, e.g. COLORS.accent.
 * @param title      Section title text
 * @param badge      Optional badge string (from renderSectionBadge) or ''
 */
export function renderSectionTitleRow(
  iconHtml: string,
  iconColor: string,
  title: string,
  badge = '',
): string {
  return `
    <div class="fg-flex fg-items-center fg-justify-between fg-mb-5">
      <div class="section-title fg-flex fg-items-center fg-gap-2" style="margin: 0;">
        <span style="color: ${iconColor};">${iconHtml}</span> ${title}
      </div>
      ${badge}
    </div>
  `;
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Stat Card ΓÇö write once, use everywhere
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Render a 3-column Hero stat panel used in InsightsPage and PrivacyPage.
 */
export function renderStatCard(
  title: string,
  iconHtml: string,
  iconColor: string,
  valueText: string | number,
  subLabel: string,
  badgeHtml: string = '',
): string {
  return `
    <div class="fg-flex fg-flex-col fg-gap-1 fg-p-5 fg-rounded-3xl fg-relative fg-overflow-hidden fg-transition-all" style="background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border);">
      <div class="fg-flex fg-items-center fg-justify-between fg-mb-1">
        <div class="fg-flex fg-items-center fg-gap-2">
          <span style="color: ${iconColor};">${iconHtml}</span>
          <span style="${UI_TOKENS.TEXT.LABEL}">${title}</span>
        </div>
        ${badgeHtml}
      </div>
      <div style="${UI_TOKENS.TEXT.STAT}">${valueText}</div>
      <div style="${UI_TOKENS.TEXT.LABEL}; margin-top: 4px;">${subLabel}</div>
    </div>
  `;
}
