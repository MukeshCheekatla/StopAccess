import {
  resolveServiceIcon,
  escapeHtml,
  getRootDomain,
} from '@stopaccess/core';

/**
 * UI_TOKENS — single source of truth for all text/colour styles.
 */
const TOKEN_DEFS = {
  HEADING: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--fg-text)',
    letterSpacing: '0',
  },
  HERO: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--fg-text)',
    letterSpacing: '-0.02em',
  },
  LABEL: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--fg-muted)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  SUBTEXT: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--muted)',
  },
  CARD_TITLE: {
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0',
    color: 'var(--fg-text)',
  },
  BADGE: {
    fontSize: '9px',
    fontWeight: '800',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  STAT: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: 'var(--fg-text)',
  },
  STAT_LARGE: {
    fontSize: '48px',
    fontWeight: '800',
    letterSpacing: '-2px',
    color: 'var(--fg-text)',
  },
  WIDGET_LABEL: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--fg-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  BANNER_HEADING: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--fg-text)',
    letterSpacing: '0',
  },
  BANNER_BODY: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--fg-text)',
    opacity: '0.7',
    lineHeight: '1.5',
  },
  ERROR: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--red)',
    letterSpacing: '0',
  },
  FOOTNOTE: {
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--fg-muted)',
    lineHeight: '1.5',
  },
};

/** Helper to convert React style object to CSS string for template literals */
function toCSS(obj: any): string {
  return Object.entries(obj)
    .map(
      ([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v};`,
    )
    .join(' ');
}

export const UI_TOKENS = {
  TEXT: {
    HEADING: toCSS(TOKEN_DEFS.HEADING),
    HERO: toCSS(TOKEN_DEFS.HERO),
    LABEL: toCSS(TOKEN_DEFS.LABEL),
    SUBTEXT: toCSS(TOKEN_DEFS.SUBTEXT),
    CARD_TITLE: toCSS(TOKEN_DEFS.CARD_TITLE),
    BADGE: toCSS(TOKEN_DEFS.BADGE),
    STAT: toCSS(TOKEN_DEFS.STAT),
    STAT_LARGE: toCSS(TOKEN_DEFS.STAT_LARGE),
    WIDGET_LABEL: toCSS(TOKEN_DEFS.WIDGET_LABEL),
    BANNER_HEADING: toCSS(TOKEN_DEFS.BANNER_HEADING),
    BANNER_BODY: toCSS(TOKEN_DEFS.BANNER_BODY),
    ERROR: toCSS(TOKEN_DEFS.ERROR),
    FOOTNOTE: toCSS(TOKEN_DEFS.FOOTNOTE),

    // React-compatible objects
    R: TOKEN_DEFS,
  },
  COLORS: {
    RED: 'var(--red)',
    GREEN: 'var(--fg-green)',
    MUTED: 'var(--muted)',
    TEXT: 'var(--fg-text)',
    ACCENT: 'var(--fg-accent)',
  },
};

export function renderBrandLogo(identifier: string, name?: string, size = 44) {
  const iconInfo = resolveServiceIcon({ id: identifier, name });
  const targetDomain = iconInfo.domain || identifier;
  const rootDomain = getRootDomain(targetDomain);

  const primaryIconUrl = `https://logo.clearbit.com/${rootDomain}`;
  const iconSize = Math.floor(size * 0.9);

  return `
    <div class="brand-logo-container insights-logo-container" 
         data-domain="${rootDomain}"
         style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
       <div class="logo-fallback" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: ${Math.floor(
         size * 0.45,
       )}px; font-weight: 700; color: var(--fg-text); opacity: 0.3; z-index: 1;">${(
    name || identifier
  )
    .slice(0, 2)
    .toUpperCase()}</div>
       <img src="${primaryIconUrl}" 
            class="brand-logo-image"
            style="position: relative; width: ${iconSize}px; height: ${iconSize}px; object-fit: contain; z-index: 2; border-radius: 20%; opacity: 0;" 
            alt="">
    </div>
  `;
}

export function renderAppIcon(domain: string, name?: string) {
  return renderBrandLogo(domain, name, 44);
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
      <div class="fg-select-trigger" style="width: ${width}; height: 32px; padding: 0 12px; font-size: 11px; font-weight: 700;">
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
  const domain = rule.customDomain || rule.packageName;
  const pass = passes[domain];
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

export function renderStreakBadge(streak: number) {
  const isZero = streak <= 0;
  const color = isZero ? 'var(--muted)' : '#f97316';
  const bg = isZero ? 'rgba(255,255,255,0.05)' : 'rgba(249, 115, 22, 0.1)';
  const border = isZero ? 'var(--glass-border)' : 'rgba(249, 115, 22, 0.2)';

  return `
    <div style="display: flex; align-items: center; gap: 6px; padding: 5px 10px; background: ${bg}; border: 1px solid ${border}; border-radius: 12px; color: ${color}; font-weight: 700; filter: ${
    isZero ? 'none' : 'drop-shadow(0 4px 12px rgba(249, 115, 22, 0.15))'
  };">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: ${
        isZero ? 0.5 : 1
      };"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3 0-1.03.46-2 1.39-3h.01c.78.78 1.1 1.63 1.1 2.5 0 1.05-.33 2.1-.8 3.01.52-.4 1.1-.73 1.56-1.1.28.9.23 1.83-.15 2.7-.3.7-.7 1.32-1.2 1.86A5 5 0 0 1 7 14.5c0-.9.2-1.74.57-2.5h.06l.87 2.5z"/><path d="M12 2c1 2 2 4 2 7a4 4 0 0 1-7.87 1C5.47 11.41 5 13.15 5 15a7 7 0 0 0 13.14 3.33L19 18a7 7 0 0 0-7-16z"/></svg>
      <span style="font-size: 11px; letter-spacing: 0;">${streak}d</span>
    </div>
  `;
}

/**
 * Render a non-cloud / local-mode warning banner.
 * Used in Privacy, Security, Schedule, and Insights pages.
 */
export function renderCloudBanner(
  title: string,
  body: string,
  btnId: string,
  btnLabel = 'Link Profile',
  accentColor = 'var(--fg-accent)',
): string {
  return `
    <div class="glass-card" style="margin-bottom: 32px; padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; border-color: ${accentColor}; background: rgba(59, 130, 246, 0.05);">
      <div style="display: flex; align-items: center; gap: 20px;">
        <div style="width: 44px; height: 44px; border-radius: 14px; background: rgba(59,130,246,0.1); display: flex; align-items: center; justify-content: center; color: ${accentColor}; flex-shrink: 0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19c.7 0 1.3-.2 1.8-.7s.7-1.1.7-1.8c0-1.4-1.1-2.5-2.5-2.5-.1 0-.3 0-.4.1C16.5 10.6 13.5 8 10 8c-3.1 0-5.7 2.1-6.7 5h-.3C1.3 13 0 14.3 0 15.9c0 1.6 1.3 2.9 2.9 2.9h14.6z"/></svg>
        </div>
        <div>
          <div style="${UI_TOKENS.TEXT.BANNER_HEADING}">${title}</div>
          <div style="${UI_TOKENS.TEXT.BANNER_BODY}; margin-top: 4px;">${body}</div>
        </div>
      </div>
      <button class="btn-premium" id="${btnId}" style="background: ${accentColor}; color: #fff; font-weight: 700; white-space: nowrap; margin-left: 24px;">${btnLabel}</button>
    </div>
  `;
}

/**
 * Render a generic error state card.
 */
export function renderErrorCard(message: string, retryBtnId: string): string {
  return `
    <div class="app-card" style="text-align: center; padding: 40px 24px; background: var(--fg-glass-bg); border-color: var(--fg-glass-border);">
      <div style="color: var(--red); margin-bottom: 12px; display: flex; justify-content: center;">
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
      ? `<span style="font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 100px; background: rgba(185,28,28,0.12); color: var(--red); border: 1px solid rgba(185,28,28,0.2);">${count}</span>`
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

// ─────────────────────────────────────────────
// Toggle Switch — write once, use everywhere
// ─────────────────────────────────────────────

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
        background: ${active ? 'var(--green)' : 'var(--fg-glass-bg)'};
        border: 1px solid ${active ? 'var(--green)' : 'var(--fg-glass-border)'};
        transition: background 0.2s ease; outline: none;"
    >
      <span style="position: absolute; top: 2px; left: ${
        active ? '16px' : '2px'
      };
        width: 14px; height: 14px; border-radius: 50%;
        background: white; transition: left 0.2s ease;
        box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></span>
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
        background: ${active ? 'var(--green)' : 'rgba(255,255,255,0.1)'};
        transition: background 0.2s; outline: none;"
    >
      <span style="position: absolute; top: 2px; left: ${
        active ? '18px' : '2px'
      };
        width: 16px; height: 16px; border-radius: 50%;
        background: white; transition: left 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></span>
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
    btn.style.background = 'var(--green)';
    btn.style.border = '1px solid var(--green)';
  } else {
    btn.classList.remove('active');
    btn.style.background = 'var(--fg-glass-bg)';
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
  btn.style.background = active ? 'rgba(0,196,140,0.12)' : 'var(--fg-glass-bg)';
  btn.style.borderColor = active
    ? 'rgba(0,196,140,0.35)'
    : 'var(--fg-glass-border)';
  btn.style.color = active ? 'var(--green)' : 'var(--muted)';
  if (active) {
    btn.classList.add('active');
  } else {
    btn.classList.remove('active');
  }
}

// ─────────────────────────────────────────────
// Loader — write once, use everywhere
// ─────────────────────────────────────────────

/**
 * Render a centered loading spinner with optional label.
 * Replaces the `<div class="loader">...</div>` pattern used in every screen.
 *
 * @param label    Small uppercase text beneath the spinner. Pass '' to omit.
 * @param padding  Wrapper padding class (Tailwind-style). Default: 'fg-p-10'
 */
export function renderLoader(label = '', padding = 'fg-p-10'): string {
  const text = label
    ? `<div class="fg-text-[11px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-70 fg-mt-4 fg-uppercase fg-tracking-[2px] fg-animate-pulse">${label}</div>`
    : '';
  return `
    <div class="fg-flex fg-flex-col fg-items-center fg-justify-center ${padding}">
      <div class="loader fg-mb-4"></div>
      ${text}
    </div>
  `;
}

// ─────────────────────────────────────────────
// Empty State — write once, use everywhere
// ─────────────────────────────────────────────

/**
 * Render a dashed-border empty state box.
 * Replaces the hardcoded inline-style empty state used in AppsPage and others.
 *
 * @param message  The message to display.
 */
export function renderEmptyState(message: string): string {
  return `
    <div style="padding: 28px 20px; border: 1px dashed var(--fg-glass-border); border-radius: 16px; color: var(--fg-muted); font-size: 12px; font-weight: 700; text-align: center; background: var(--fg-glass-bg); width: 100%;">
      ${message}
    </div>
  `;
}

// ─────────────────────────────────────────────
// Section Badge — write once, use everywhere
// ─────────────────────────────────────────────

/**
 * Render a small pill badge (e.g. "3 ACTIVE", "2/7 ACTIVE").
 * Replaces the repeated `fg-font-black fg-uppercase fg-tracking fg-rounded-full` pattern.
 *
 * @param label  The badge text, e.g. "${count} ACTIVE"
 * @param color  'default' (glass) | 'red' | 'green' | 'accent'
 */
export function renderSectionBadge(
  label: string,
  color: 'default' | 'red' | 'green' | 'accent' = 'default',
): string {
  const styles: Record<string, string> = {
    default:
      'background: var(--fg-glass-bg); color: var(--fg-text); border: 1px solid var(--fg-glass-border); opacity: 0.8;',
    red: 'background: rgba(185,28,28,0.12); color: var(--red); border: 1px solid rgba(185,28,28,0.2);',
    green:
      'background: rgba(0,196,140,0.1); color: var(--green); border: 1px solid rgba(0,196,140,0.25);',
    accent:
      'background: rgba(99,102,241,0.12); color: var(--fg-accent); border: 1px solid rgba(99,102,241,0.2);',
  };
  return `<span style="font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 10px; border-radius: 100px; ${styles[color]}">${label}</span>`;
}

// ─────────────────────────────────────────────
// Card Section — write once, use everywhere
// ─────────────────────────────────────────────

/**
 * Render the repeating app-card section header row:
 *   [icon + title]  [badge]
 *
 * Used by ThreatSection, DomainProtection, Parental, Content, Blocklists,
 * NativeTrackers, PrivacyOptions — all 7 follow identical structure.
 *
 * @param iconHtml   SVG/HTML for the leading icon (already escaped)
 * @param iconColor  CSS color value for the icon, e.g. 'var(--accent)', '#818cf8'
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

// ─────────────────────────────────────────────
// Stat Card — write once, use everywhere
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Info Tooltip — write once, use everywhere
// ─────────────────────────────────────────────

/**
 * Render the info 'i' circle tooltip icon used on toggle rows.
 */
export function renderInfoTooltip(tooltipText: string): string {
  if (!tooltipText) {
    return '';
  }
  return `
    <div class="fg-tooltip fg-info-icon" data-tooltip="${tooltipText}">i</div>
  `;
}
