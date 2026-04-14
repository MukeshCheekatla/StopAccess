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
    lineHeight: '1.4',
  },
  HERO: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--fg-text)',
    letterSpacing: '-0.02em',
    lineHeight: '1.3',
  },
  /** Section / widget labels — NOT uppercase by default. Callers add uppercase if needed. */
  LABEL: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--fg-muted)',
    letterSpacing: '0.04em',
    lineHeight: '1.4',
  },
  SUBTEXT: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--fg-muted)',
    lineHeight: '1.55',
  },
  CARD_TITLE: {
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0',
    color: 'var(--fg-text)',
    lineHeight: '1.4',
  },
  /** Pill badges — uppercase is intentional here */
  BADGE: {
    fontSize: '10px',
    fontWeight: '800',
    letterSpacing: '0.06em',
  },
  STAT: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: 'var(--fg-text)',
    lineHeight: '1.1',
  },
  STAT_LARGE: {
    fontSize: '48px',
    fontWeight: '800',
    letterSpacing: '-2px',
    color: 'var(--fg-text)',
    lineHeight: '1',
  },
  /** Widget kicker labels — uppercase IS intentional for this specific token */
  WIDGET_LABEL: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--fg-muted)',
    letterSpacing: '0.08em',
    lineHeight: '1.4',
  },
  BANNER_HEADING: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--fg-text)',
    letterSpacing: '0',
    lineHeight: '1.4',
  },
  BANNER_BODY: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--fg-text)',
    opacity: '0.8',
    lineHeight: '1.6',
  },
  ERROR: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--red)',
    letterSpacing: '0',
    lineHeight: '1.4',
  },
  FOOTNOTE: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--fg-muted)',
    lineHeight: '1.6',
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
      <div class="fg-select-trigger" style="width: ${width}; height: 32px; padding: 0 12px; font-size: 11px; font-weight: 500;">
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

  return `
    <div style="display: flex; align-items: center; gap: 6px; padding: 5px 10px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 12px; color: ${color}; font-weight: 700;">
      <svg width="13" height="13" viewBox="0 0 448 512" fill="currentColor" style="opacity: ${
        isZero ? 0.5 : 1
      };"><path d="M159.3 5.4c7.8-7.3 19.9-7.2 27.7 .1c27.6 25.9 53.5 53.8 77.7 84c11-14.4 23.5-30.1 37-42.9c7.9-7.4 20.1-7.4 28 .1c34.6 33 63.9 76.6 84.5 118c20.3 40.8 33.8 82.5 33.8 111.9C448 404.2 348.2 512 224 512C98.4 512 0 404.1 0 276.5c0-38.4 17.8-85.3 45.4-131.7C73.3 97.7 112.7 48.6 159.3 5.4zM225.7 416c25.3 0 47.7-7 68.8-21c42.1-29.4 53.4-88.2 28.1-134.4c-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5c-16.5-21-46-58.5-62.8-79.8c-6.3-8-18.3-8.1-24.7-.1c-33.8 42.5-50.8 69.3-50.8 99.4C112 375.4 162.6 416 225.7 416z"/></svg>
      <span style="font-size: 12px; font-weight: 700; letter-spacing: 0;">${streak}d</span>
    </div>
  `;
}

export function renderCompactStreak(streak: number) {
  const isZero = streak <= 0;
  const color = isZero ? 'var(--fg-muted)' : '#f97316';
  return `
    <div style="display: flex; align-items: center; gap: 4px; color: ${color}; font-weight: 600; font-size: 12px;">
      <svg width="10" height="10" viewBox="0 0 448 512" fill="currentColor" style="opacity: ${
        isZero ? 0.3 : 1
      };"><path d="M159.3 5.4c7.8-7.3 19.9-7.2 27.7 .1c27.6 25.9 53.5 53.8 77.7 84c11-14.4 23.5-30.1 37-42.9c7.9-7.4 20.1-7.4 28 .1c34.6 33 63.9 76.6 84.5 118c20.3 40.8 33.8 82.5 33.8 111.9C448 404.2 348.2 512 224 512C98.4 512 0 404.1 0 276.5c0-38.4 17.8-85.3 45.4-131.7C73.3 97.7 112.7 48.6 159.3 5.4zM225.7 416c25.3 0 47.7-7 68.8-21c42.1-29.4 53.4-88.2 28.1-134.4c-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5c-16.5-21-46-58.5-62.8-79.8c-6.3-8-18.3-8.1-24.7-.1c-33.8 42.5-50.8 69.3-50.8 99.4C112 375.4 162.6 416 225.7 416z"/></svg>
      <span>${streak}d</span>
    </div>
  `;
}

export function renderTableProgress(
  used: number,
  limit: number,
  active: boolean,
) {
  // Instant block — no time limit set; show a status pill instead of empty bar
  if (!active) {
    return '<span style="font-size: 10px; font-weight: 700; color: var(--fg-muted); letter-spacing: 0.04em;">—</span>';
  }
  if (limit <= 0) {
    return '<span style="display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 0.08em;  padding: 3px 8px; border-radius: 6px; background: rgba(255,59,48,0.1); color: var(--red);">Instant</span>';
  }

  const percent = Math.min(100, Math.max(0, (used / limit) * 100));
  let color = '#10b981';
  if (percent >= 90) {
    color = 'var(--red)';
  } else if (percent >= 65) {
    color = '#facc15';
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; padding-right: 16px;">
      <div style="width: 100%; height: 5px; background: var(--fg-glass-border); border-radius: 3px; overflow: hidden;">
        <div style="height: 100%; width: ${percent}%; background: ${color}; border-radius: 3px; transition: width 0.4s ease;"></div>
      </div>
    </div>
  `;
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
      ? `<span style="color: var(--fg-text); font-size: 13px; font-weight: 600;">${Math.floor(
          used,
        )}m</span><span style="color: var(--fg-muted); font-size: 11px; font-weight: 400; margin-left: 3px;">/ ${limit}m</span>`
      : `<span style="color: var(--fg-muted); font-size: 13px; font-weight: 500;">${Math.floor(
          used,
        )}m</span>`;

  return `
    <div class="rule-table-row ${
      active ? 'is-active' : ''
    }" data-pkg="${escapeHtml(rule.packageName)}" style="
      display: grid;
      grid-template-columns: 44px 1.5fr 100px 1fr 140px 110px 80px 44px;
      column-gap: 12px;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--fg-glass-border);
      transition: background 0.15s;
      cursor: default;
    "
    onmouseover="this.style.background='var(--fg-glass-bg)'"
    onmouseout="this.style.background=''"
    >
      <!-- 1. Icon -->
      <div style="display: flex; align-items: center; justify-content: center;">
        ${renderBrandLogo(identifier, rule.appName, 32)}
      </div>

      <!-- 2. Identity -->
      <div style="display: flex; flex-direction: column; min-width: 0;">
        <div style="font-size: 14px; font-weight: 600; color: var(--fg-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;">${escapeHtml(
          rule.appName || identifier,
        )}</div>
        <div style="margin-top: 3px; font-size: 11px; font-weight: 500; color: var(--fg-muted);">${
          streak > 0
            ? `🔥 ${streak}d streak`
            : type === 'service'
            ? 'App'
            : 'Domain'
        }</div>
      </div>

      <!-- 3. Usage -->
      <div style="display: flex; align-items: center; gap: 3px;">
        ${usageText}
      </div>

      <!-- 4. Progress -->
      <div style="display: flex; align-items: center;">
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
      <div style="display: flex; align-items: center;">
        <button class="toggle-switch-btn ${active ? 'active' : ''}" ${
    isLocked ? 'disabled' : ''
  }
          data-kind="${type}" data-id="${escapeHtml(
    rule.packageName,
  )}" data-pkg="${escapeHtml(rule.packageName)}"
          style="transform: scale(0.8); transform-origin: left;">
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
    ? `<div class="fg-text-[11px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-70 fg-mt-4  fg-tracking-[2px] fg-animate-pulse">${label}</div>`
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
    <div style="padding: 28px 20px; border: 1px dashed var(--fg-glass-border); border-radius: 16px; color: var(--fg-muted); font-size: 13px; font-weight: 600; text-align: center; background: var(--fg-glass-bg); width: 100%; line-height: 1.5;">
      ${message}
    </div>
  `;
}

// ─────────────────────────────────────────────
// Section Badge — write once, use everywhere
// ─────────────────────────────────────────────

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
    red: 'background: rgba(185,28,28,0.12); color: var(--red); border: 1px solid rgba(185,28,28,0.2);',
    green:
      'background: rgba(0,196,140,0.1); color: var(--green); border: 1px solid rgba(0,196,140,0.25);',
    accent:
      'background: rgba(99,102,241,0.12); color: var(--fg-accent); border: 1px solid rgba(99,102,241,0.2);',
  };
  return `<span style="font-size: 10px; font-weight: 800; letter-spacing: 0.06em;  padding: 3px 10px; border-radius: 100px; ${styles[color]}">${label}</span>`;
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
    <div class="fg-tooltip fg-inline-flex fg-items-center fg-justify-center fg-rounded-full fg-transition-colors fg-cursor-help" 
         data-tooltip="${tooltipText}"
         style="width: 14px; height: 14px; background: rgba(255, 255, 255, 0.05); color: var(--fg-muted); font-size: 0; margin-left: 6px; vertical-align: middle;">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    </div>
  `;
}
