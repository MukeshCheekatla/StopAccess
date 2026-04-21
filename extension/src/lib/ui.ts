import {
  resolveServiceIcon,
  escapeHtml,
  resolveFaviconUrl,
  resolveIconUrl,
  formatMinutes,
} from '@stopaccess/core';
import { COLORS } from './designTokens';

/**
 * UI_TOKENS — single source of truth for all text/colour styles.
 */
const TOKEN_DEFS = {
  HEADING: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--fg-text)',
    letterSpacing: '-0.01em',
    lineHeight: '1.4',
  },
  HERO: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--fg-text)',
    letterSpacing: '-0.02em',
    lineHeight: '1.3',
  },
  /** Section / widget labels — NOT uppercase by default. Callers add uppercase if needed. */
  LABEL: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--fg-text)',
    letterSpacing: '0.02em',
    lineHeight: '1.4',
  },
  SUBTEXT: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--fg-muted)',
    lineHeight: '1.5',
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
    fontWeight: '700',
    letterSpacing: '0.04em',
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
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--fg-muted)',
    letterSpacing: '0.06em',
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
    fontWeight: '400',
    color: 'var(--fg-text)',
    opacity: '0.9',
    lineHeight: '1.6',
  },
  ERROR: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--red)',
    letterSpacing: '0',
    lineHeight: '1.4',
  },
  FOOTNOTE: {
    fontSize: '12px',
    fontWeight: '400',
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
    RED: COLORS.red,
    GREEN: COLORS.green,
    MUTED: COLORS.muted,
    TEXT: COLORS.text,
    ACCENT: COLORS.accent,
  },
};

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
  }; font-weight:800; font-size: 12px;">${friendly}</div>
        <div style="${UI_TOKENS.TEXT.BADGE} color:${
    COLORS.muted
  }; text-transform: uppercase; margin-top: -1px;">${targetDate}</div>
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

import { saveIconToCache, getCachedIconSync } from './iconCache';

/** Resolves any domain/identifier to a favicon URL via the core iconography engine. */
export function getBrandLogoUrl(domain: string, _sz = 128): string {
  return resolveFaviconUrl(domain);
}

/** Resolves a service ID or domain to its canonical icon domain. */
export function resolveIconDomain(id: string, name?: string): string {
  if (id.includes('.')) {
    return id; // Already a domain — preserve subdomains like mail.google.com
  }
  const info = resolveServiceIcon({ id, name });
  return info.domain || resolveIconUrl(id) || id;
}

export function renderBrandLogo(
  identifier: string,
  name?: string,
  size = 44,
  cachedUrl?: string,
) {
  const targetDomain = resolveIconDomain(identifier, name);
  const iconFromCache = getCachedIconSync(targetDomain);
  const primaryIconUrl =
    cachedUrl || iconFromCache || getBrandLogoUrl(targetDomain, 128);
  const hasCache = !!(cachedUrl || iconFromCache);
  const iconSize = Math.floor(size * 0.9);

  return `
    <div class="global-brand-logo fg-shrink-0 fg-relative fg-flex fg-items-center fg-justify-center" 
         data-domain="${targetDomain}"
         style="width: ${size}px; height: ${size}px;">
       <div class="logo-fallback fg-absolute fg-inset-0 fg-flex fg-items-center fg-justify-center" 
            style="font-size: ${Math.floor(
              size * 0.45,
            )}px; font-weight: 700; color: var(--fg-text); opacity: ${
    hasCache ? '0' : '0.3'
  }; z-index: 1;">
         ${(name || identifier).slice(0, 2).toUpperCase()}
       </div>
       <img src="${primaryIconUrl}" 
            data-domain="${targetDomain}"
            class="brand-logo-image"
            style="width: ${iconSize}px; height: ${iconSize}px; object-fit: contain; z-index: 2; border-radius: 20%; opacity: ${
    hasCache ? '1' : '0'
  }; position: relative;" 
            alt="">
    </div>
  `;
}

export function attachGlobalIconListeners(container: HTMLElement) {
  if ((container as any).__iconListenersAttached) {
    return;
  }

  container.addEventListener(
    'load',
    (e) => {
      const target = e.target as HTMLImageElement;
      if (
        target.tagName === 'IMG' &&
        target.classList.contains('brand-logo-image')
      ) {
        const fallback = target.previousElementSibling as HTMLElement;
        if (target.naturalWidth > 1) {
          target.style.opacity = '1';
          target.style.display = 'block';
          if (fallback) {
            fallback.style.opacity = '0';
          }

          const domain = target.dataset.domain;
          if (domain) {
            saveIconToCache(domain, target.src);
          }
        } else {
          target.dispatchEvent(new Event('error'));
        }
      }
    },
    true,
  );

  container.addEventListener(
    'error',
    (e) => {
      const target = e.target as HTMLImageElement;
      if (
        target.tagName === 'IMG' &&
        target.classList.contains('brand-logo-image')
      ) {
        const fallback = target.previousElementSibling as HTMLElement;
        target.style.display = 'none';
        if (fallback) {
          fallback.style.opacity = '1';
        }
      }
    },
    true,
  );

  (container as any).__iconListenersAttached = true;
}

export function renderAppIcon(
  domain: string,
  name?: string,
  cachedUrl?: string,
) {
  return renderBrandLogo(domain, name, 44, cachedUrl);
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

import { findServiceIdByDomain } from '@stopaccess/core';

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

export function renderStreakBadge(streak: number) {
  const isZero = streak <= 0;
  const color = isZero ? COLORS.muted : COLORS.fire;

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
  const color = isZero ? COLORS.muted : COLORS.fire;
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
  if (!active) {
    return `
      <div style="width: 100%; height: 4px; background: var(--fg-glass-border); border-radius: 3px; overflow: hidden; opacity: 0.3;">
        <div style="height: 100%; width: 0%; background: var(--fg-muted); border-radius: 3px;"></div>
      </div>
    `;
  }

  let percent = 0;
  let color: string = COLORS.green;

  if (used <= 0) {
    percent = 0;
    color = 'var(--green)';
  } else if (limit <= 0) {
    percent = 100;
    color = 'var(--red)';
  } else {
    percent = Math.min(100, Math.max(0, (used / limit) * 100));
    if (percent >= 80) {
      color = 'var(--red)';
    } else if (percent >= 50) {
      color = 'var(--fg-progress-yellow)';
    }
  }

  return `
    <div style="width: 100%; height: 4px; background: var(--fg-glass-border); border-radius: 3px; overflow: hidden;">
      <div style="height: 100%; width: ${percent}%; background: ${color}; border-radius: 3px; transition: width 0.4s ease, background-color 0.4s ease;"></div>
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
        <div style="margin-top: 3px; font-size: 12px; font-weight: 500; color: var(--fg-muted);">${
          streak > 0
            ? `🔥 ${streak}d streak`
            : type === 'service'
            ? 'App'
            : 'Domain'
        }</div>
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
    <div class="glass-card" style="margin-bottom: 32px; padding: 28px 32px; display: flex; align-items: center; justify-content: space-between; border-color: ${accentColor}; background: var(--fg-blue-wash);">
      <div style="display: flex; align-items: center; gap: 20px;">
        <div style="width: 44px; height: 44px; border-radius: 14px; background: var(--fg-blue-soft); display: flex; align-items: center; justify-content: center; color: ${accentColor}; flex-shrink: 0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19c.7 0 1.3-.2 1.8-.7s.7-1.1.7-1.8c0-1.4-1.1-2.5-2.5-2.5-.1 0-.3 0-.4.1C16.5 10.6 13.5 8 10 8c-3.1 0-5.7 2.1-6.7 5h-.3C1.3 13 0 14.3 0 15.9c0 1.6 1.3 2.9 2.9 2.9h14.6z"/></svg>
        </div>
        <div>
          <div style="${UI_TOKENS.TEXT.BANNER_HEADING}">${title}</div>
          <div style="${UI_TOKENS.TEXT.BANNER_BODY}; margin-top: 4px;">${body}</div>
        </div>
      </div>
      <button class="btn-premium" id="${btnId}" style="background: ${accentColor}; color: ${COLORS.onAccent}; font-weight: 700; white-space: nowrap; margin-left: 24px;">${btnLabel}</button>
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
      ? `<span style="font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 100px; background: var(--fg-danger-badge); color: var(--red); border: 1px solid var(--fg-danger-badge-border);">${count}</span>`
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
        background: ${active ? 'var(--green)' : 'var(--fg-toggle-bg)'};
        border: 1px solid ${active ? 'var(--green)' : 'var(--fg-glass-border)'};
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
        background: ${active ? 'var(--green)' : 'var(--fg-toggle-bg)'};
        border: 1px solid ${active ? 'var(--green)' : 'var(--fg-glass-border)'};
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
    btn.style.background = 'var(--green)';
    btn.style.border = '1px solid var(--green)';
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
    red: 'background: var(--fg-danger-badge); color: var(--red); border: 1px solid var(--fg-danger-badge-border);',
    green:
      'background: var(--fg-emerald-soft); color: var(--green); border: 1px solid var(--fg-emerald-border);',
    accent:
      'background: var(--fg-indigo-soft); color: var(--fg-accent); border: 1px solid var(--fg-nav-border);',
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
// Confirmation Dialog — high friction actions
// ─────────────────────────────────────────────

export interface DialogOptions {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

/**
 * Show a professional modal dialog.
 * Returns a promise that resolves to true if confirmed, false otherwise.
 */
export async function showConfirmDialog(
  options: DialogOptions,
): Promise<boolean> {
  const {
    title,
    body,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = false,
  } = options;

  return new Promise((resolve) => {
    const dialogId = `__fg_dialog_${Date.now()}`;
    const overlay = document.createElement('div');
    overlay.id = dialogId;
    overlay.className =
      'fg-fixed fg-inset-0 fg-z-[99999] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay)] fg-backdrop-blur-sm fg-opacity-0 fg-scale-105 fg-transition-all fg-duration-300';

    overlay.innerHTML = `
      <div class="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[32px] fg-p-8 fg-max-w-[420px] fg-w-full fg-shadow-2xl">
        <div style="${UI_TOKENS.TEXT.HERO}; margin-bottom: 12px;">${title}</div>
        <div style="${
          UI_TOKENS.TEXT.SUBTEXT
        }; font-size: 14px; margin-bottom: 32px; opacity: 0.8; line-height: 1.6;">${body}</div>
        
        <div class="fg-flex fg-gap-3 fg-justify-end">
          <button class="dialog-cancel-btn fg-px-6 fg-py-3 fg-rounded-2xl fg-text-sm fg-font-bold fg-text-[var(--fg-muted)] hover:fg-bg-[var(--fg-surface-hover)] fg-transition-all">${cancelLabel}</button>
          <button class="dialog-confirm-btn btn-premium fg-px-6 fg-py-3 fg-rounded-2xl fg-text-sm" 
                  style="font-weight: 800; background: ${
                    isDestructive ? 'var(--red)' : 'var(--fg-text)'
                  }; color: ${isDestructive ? COLORS.onAccent : COLORS.bg};">
            ${confirmLabel}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Force reflow for animation
    setTimeout(() => {
      overlay.classList.remove('fg-opacity-0', 'fg-scale-105');
      overlay.classList.add('fg-opacity-100', 'fg-scale-100');
    }, 10);

    const cleanup = (result: boolean) => {
      overlay.classList.add('fg-opacity-0', 'fg-scale-[0.98]');
      overlay.style.pointerEvents = 'none';
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 250);
    };

    overlay
      .querySelector('.dialog-cancel-btn')
      ?.addEventListener('click', () => {
        cleanup(false);
      });

    overlay
      .querySelector('.dialog-confirm-btn')
      ?.addEventListener('click', () => {
        cleanup(true);
      });

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup(false);
      }
    });
  });
}

// ─────────────────────────────────────────────
// Info Tooltip — write once, use everywhere
// ─────────────────────────────────────────────

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
export function showPinModal(
  title: string,
  body: string,
  onVerify: (pin: string) => Promise<boolean>,
  onCancel?: () => void,
) {
  const overlay = document.createElement('div');
  overlay.className =
    'fg-fixed fg-inset-0 fg-z-[2000] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay-strong)] fg-backdrop-blur-xl fg-transition-all fg-duration-300 fg-opacity-0';

  overlay.innerHTML = `
    <div class="pin-modal-card fg-bg-[var(--fg-surface)] fg-w-[340px] fg-rounded-[32px] fg-border fg-border-[var(--fg-glass-border)] fg-shadow-2xl fg-p-8 fg-text-center fg-transition-transform fg-duration-300">
      <div class="fg-mb-6 fg-mx-auto fg-w-12 fg-h-12 fg-rounded-2xl fg-bg-[var(--fg-accent-soft)] fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-accent)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div style="${UI_TOKENS.TEXT.HEADING}; font-size: 18px; margin-bottom: 8px;">${title}</div>
      <div style="${UI_TOKENS.TEXT.SUBTEXT}; margin-bottom: 24px;">${body}</div>
      
      <div class="fg-flex fg-justify-center fg-gap-3 fg-mb-8">
        <input type="password" maxlength="1" class="pin-digit-input" autofocus>
        <input type="password" maxlength="1" class="pin-digit-input">
        <input type="password" maxlength="1" class="pin-digit-input">
        <input type="password" maxlength="1" class="pin-digit-input">
      </div>

      <style>
        .pin-digit-input {
          width: 50px;
          height: 60px;
          background: var(--fg-surface-hover);
          border: 1px solid var(--fg-glass-border);
          border-radius: 16px;
          text-align: center;
          font-size: 24px;
          font-weight: 800;
          color: var(--fg-text);
          outline: none;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        .pin-digit-input:focus {
          border-color: var(--fg-accent);
          background: var(--fg-surface);
          box-shadow: 0 0 0 4px var(--fg-accent-soft);
          transform: translateY(-2px);
        }
        .pin-digit-input.error {
          border-color: var(--red);
          animation: shake 0.4s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      </style>

      <div class="fg-flex fg-flex-col fg-gap-3">
        <div class="fg-flex fg-gap-3">
          <button class="fg-flex-1 fg-rounded-2xl fg-py-3.5 fg-text-[11px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-50 fg-uppercase fg-tracking-[0.15em] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all" id="pin_cancel_btn">Cancel</button>
          <button class="btn-premium fg-flex-1 fg-py-3.5 fg-text-[11px] fg-font-black fg-uppercase fg-tracking-[0.15em]" id="pin_verify_btn">Verify</button>
        </div>
        <button id="pin_forgot_link" class="fg-text-[9px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-40 hover:fg-opacity-80 fg-uppercase fg-tracking-widest fg-transition-all fg-mt-2">Forgot PIN?</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const inputs = Array.from(
    overlay.querySelectorAll('.pin-digit-input'),
  ) as HTMLInputElement[];

  // Animation
  requestAnimationFrame(() => {
    overlay.classList.remove('fg-opacity-0');
    overlay.classList.add('fg-opacity-100');
    overlay.querySelector('.pin-modal-card')?.classList.remove('fg-scale-105');
    overlay.querySelector('.pin-modal-card')?.classList.add('fg-scale-100');

    // Force focus on first digit for optimal UX
    if (inputs.length > 0) {
      inputs[0].focus();
    }
  });
  const verifyBtn = overlay.querySelector(
    '#pin_verify_btn',
  ) as HTMLButtonElement;
  const cancelBtn = overlay.querySelector('#pin_cancel_btn') as HTMLElement;

  const getPin = () => inputs.map((i) => i.value).join('');

  const close = () => {
    overlay.classList.remove('fg-opacity-100');
    overlay.classList.add('fg-opacity-0');
    overlay.querySelector('.pin-modal-card')?.classList.add('fg-scale-95');
    setTimeout(() => overlay.remove(), 300);
  };

  inputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      if (val && idx < 3) {
        inputs[idx + 1].focus();
      }
      if (getPin().length === 4) {
        verifyBtn.focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }
      if (e.key === 'Enter' && getPin().length === 4) {
        verifyBtn.click();
      }
    });
  });

  verifyBtn.addEventListener('click', async () => {
    const pin = getPin();
    if (pin.length < 4) {
      return;
    }

    verifyBtn.disabled = true;
    verifyBtn.innerText = 'Verifying...';

    const ok = await onVerify(pin);
    if (ok) {
      close();
    } else {
      verifyBtn.disabled = false;
      verifyBtn.innerText = 'Verify';
      inputs.forEach((i) => {
        i.value = '';
        i.classList.add('error');
        setTimeout(() => i.classList.remove('error'), 500);
      });
      inputs[0].focus();
    }
  });

  cancelBtn.addEventListener('click', () => {
    close();
    if (onCancel) {
      onCancel();
    }
  });

  overlay
    .querySelector('#pin_forgot_link')
    ?.addEventListener('click', async () => {
      await showConfirmDialog({
        title: 'PIN Recovery',
        body: 'If you have forgotten your PIN, you can initiate a 12-hour delayed reset from the "Guardian PIN" section in Settings. This delay ensures consistency in your focus goals.',
        confirmLabel: 'Understood',
        cancelLabel: '',
      });
    });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
    }
  });
}

/**
 * Show a 'What's New' discovery modal for recent updates.
 */
export async function showWhatsNew(version: string, features: any[]) {
  const overlay = document.createElement('div');
  overlay.className =
    'fg-fixed fg-inset-0 fg-z-[99999] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay)] fg-backdrop-blur-[20px] fg-opacity-0 fg-transition-all fg-duration-500';

  const featureList = features
    .map(
      (f) => `
    <div class="fg-flex fg-gap-5 fg-p-6 fg-rounded-[32px] fg-bg-[var(--fg-white-wash)] fg-border fg-border-[var(--fg-white-wash)] fg-transition-all hover:fg-bg-[var(--fg-surface-hover)]">
      <div class="fg-text-4xl fg-shrink-0">${f.icon}</div>
      <div>
        <div class="fg-text-[16px] fg-font-bold fg-text-[var(--fg-text)] fg-tracking-tight">${f.label}</div>
        <div class="fg-text-[12px] fg-text-[var(--fg-muted)] fg-mt-1 fg-line-height-1.4 fg-font-medium">${f.desc}</div>
      </div>
    </div>
  `,
    )
    .join('');

  overlay.innerHTML = `
    <div class="fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-glass-border)] fg-rounded-[48px] fg-p-12 fg-max-w-[1000px] fg-w-[90%] fg-shadow-2xl fg-scale-95 fg-transition-all fg-duration-500 fg-flex fg-flex-col">
      <div class="fg-mb-10 fg-flex fg-items-end fg-justify-between">
        <div>
          <div class="fg-text-[11px] fg-font-bold fg-text-[var(--fg-accent)] fg-tracking-wide fg-mb-2">System Update Discovery</div>
          <h2 class="fg-text-4xl fg-font-black fg-text-[var(--fg-text)] fg-tracking-tighter">What's New in v${version}</h2>
        </div>
        <div class="fg-text-[11px] fg-font-bold fg-text-[var(--fg-muted)] fg-opacity-50 fg-tracking-tight">Build 1.0.7 Stable</div>
      </div>
      
      <div class="fg-grid fg-grid-cols-2 fg-gap-5 fg-mb-12">
        ${featureList}
      </div>
      
      <div class="fg-flex fg-justify-center">
        <button id="btn_close_whats_new" class="btn-premium fg-px-20 fg-h-16 fg-rounded-3xl fg-font-bold fg-tracking-tight fg-text-base">Explore Features</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Animate in
  setTimeout(() => {
    overlay.classList.remove('fg-opacity-0');
    overlay.firstElementChild?.classList.remove('fg-scale-95');
  }, 10);

  return new Promise<void>((resolve) => {
    const close = () => {
      overlay.classList.add('fg-opacity-0');
      overlay.firstElementChild?.classList.add('fg-scale-95');
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 500);
    };

    overlay
      .querySelector('#btn_close_whats_new')
      ?.addEventListener('click', close);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        close();
      }
    });
  });
}

const CHALLENGE_PRESETS = [
  'Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions. This challenge is here to remind me that my time is valuable and I must use it wisely.',
  'Self-discipline is the ability to make yourself do what you should do, when you should do it, whether you feel like it or not. I control my actions, and I choose to spend my time on meaningful work that brings me closer to my future self.',
  "The more you think you know, the more you realize you don't. Stay humble, stay hungry, and most importantly, stay focused on the task at hand. Do not let the digital noise pull you away from what truly matters in your life today.",
  'Focus on what you can control, and let go of what you cannot. Your attention is your most valuable resource; do not squander it on distractions that offer no real value to your life or your goals.',
];

/**
 * Show a 'Patience Challenge' typing modal.
 * User must type the target text perfectly to proceed.
 */
export async function showTypingChallenge(
  initialText: string = CHALLENGE_PRESETS[0],
): Promise<boolean> {
  return new Promise((resolve) => {
    let targetText = initialText;
    const overlay = document.createElement('div');
    overlay.className =
      'fg-fixed fg-inset-0 fg-z-[99999] fg-flex fg-items-center fg-justify-center fg-bg-[var(--fg-overlay-strong)] fg-backdrop-blur-2xl fg-opacity-0 fg-transition-all fg-duration-500';

    const renderModal = () => {
      overlay.innerHTML = `
        <div class="fg-relative fg-bg-[var(--fg-surface)] fg-border fg-border-[var(--fg-white-wash)] fg-rounded-[48px] fg-p-14 fg-max-w-[750px] fg-w-full fg-shadow-2xl fg-transition-all fg-duration-500">
          <button id="btn_shuffle_challenge" class="fg-absolute fg-top-10 fg-right-10 fg-w-10 fg-h-10 fg-rounded-full fg-flex fg-items-center fg-justify-center fg-text-[var(--fg-muted)] hover:fg-text-[var(--fg-text)] hover:fg-bg-[var(--fg-white-wash)] fg-transition-all" title="Shuffle paragraph">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
          </button>
          
          <div class="fg-text-center fg-mb-10">
            <div class="fg-text-[12px] fg-font-bold fg-text-[var(--fg-accent)] fg-tracking-[0.4em] fg-mb-2">Mastery Challenge</div>
            <h2 class="fg-text-2xl fg-font-black fg-text-[var(--fg-text)]">Unblock Challenge</h2>
            <p class="fg-text-[13px] fg-text-[var(--fg-muted)] fg-mt-1">Prove your focus by typing the paragraph below.</p>
          </div>
          
          <div id="challenge_display" class="fg-text-[26px] fg-line-height-1.6 fg-mb-12 fg-text-left fg-select-none" style="font-family: 'JetBrains Mono', monospace; word-break: break-word; white-space: pre-wrap; letter-spacing: 0.02em;">
            ${targetText
              .split('')
              .map((char) => `<span class="char-unit">${char}</span>`)
              .join('')}
          </div>
          
          <input type="text" id="challenge_input" class="fg-absolute fg-opacity-0 fg-pointer-events-none" />
          
          <div class="fg-flex fg-gap-6 fg-items-center">
            <button id="btn_cancel_challenge" class="fg-px-8 fg-h-16 fg-rounded-[24px] fg-text-[13px] fg-font-bold fg-text-[var(--fg-text)] fg-opacity-40 hover:fg-bg-[var(--fg-surface-hover)] hover:fg-opacity-100 fg-transition-all">I'll Wait</button>
            
            <div class="fg-flex-1 fg-relative fg-h-16 fg-rounded-[24px] fg-bg-[var(--fg-surface-hover)] fg-flex fg-items-center fg-justify-center fg-px-10">
              <div id="challenge_progress_bar" class="fg-absolute fg-inset-0 fg-bg-[var(--fg-accent)]/10 fg-rounded-[24px] fg-w-0 fg-transition-all"></div>
              
              <div class="fg-relative fg-flex fg-items-center fg-justify-center fg-gap-8 fg-text-[14px] fg-font-bold fg-select-none">
                <div class="fg-flex fg-items-center fg-gap-3">
                  <span class="fg-text-[var(--fg-muted)]">Progress</span>
                  <span class="fg-text-[var(--fg-text)]"><span id="progress_percent">0</span>%</span>
                </div>
                
                <div class="fg-w-1.5 fg-h-1.5 fg-rounded-full fg-bg-[var(--fg-text)] fg-opacity-10"></div>
                
                <div class="fg-flex fg-items-center fg-gap-3">
                  <span class="fg-text-[var(--fg-muted)]">Mistakes</span>
                  <span id="mistake_count" class="fg-text-[var(--fg-text)]">0</span>
                </div>
                
                <div class="fg-w-1.5 fg-h-1.5 fg-rounded-full fg-bg-[var(--fg-text)] fg-opacity-10"></div>
                
                <div class="fg-flex fg-items-center fg-gap-3">
                  <span class="fg-text-[var(--fg-muted)]">Time</span>
                  <span id="challenge_timer" class="fg-text-[var(--fg-text)]" style="font-family: 'JetBrains Mono', monospace; min-width: 60px; text-align: left;">0.0s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <style>
          .char-unit {
            color: var(--fg-text);
            opacity: 0.15;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border-bottom: 2px solid transparent;
          }
          .char-unit.current { 
            opacity: 1; 
            color: var(--fg-text); 
            border-bottom: 2px solid var(--fg-accent);
          }
          .char-unit.typed { 
            color: var(--fg-green); 
            opacity: 1; 
          }
          .char-unit.error { 
            color: var(--red); 
            opacity: 1; 
            border-bottom: 2px solid var(--red);
          }
        </style>
      `;
    };

    renderModal();
    document.body.appendChild(overlay);

    let currentIndex = 0;
    let mistakeCount = 0;
    let startTime: number | null = null;
    let timerInterval: any = null;

    let input = overlay.querySelector('#challenge_input') as HTMLInputElement;
    let chars = overlay.querySelectorAll('.char-unit');
    let progressBar = overlay.querySelector(
      '#challenge_progress_bar',
    ) as HTMLElement;
    let progressText = overlay.querySelector(
      '#progress_percent',
    ) as HTMLElement;
    let mistakeText = overlay.querySelector('#mistake_count') as HTMLElement;
    let timerText = overlay.querySelector('#challenge_timer') as HTMLElement;

    const resetState = () => {
      currentIndex = 0;
      mistakeCount = 0;
      startTime = null;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      timerText.textContent = '0.0s';

      // Refresh references
      input = overlay.querySelector('#challenge_input') as HTMLInputElement;
      chars = overlay.querySelectorAll('.char-unit');
      progressBar = overlay.querySelector(
        '#challenge_progress_bar',
      ) as HTMLElement;
      progressText = overlay.querySelector('#progress_percent') as HTMLElement;
      mistakeText = overlay.querySelector('#mistake_count') as HTMLElement;
      timerText = overlay.querySelector('#challenge_timer') as HTMLElement;

      updateUI();
      input.focus();
    };

    const setupListeners = () => {
      overlay
        .querySelector('#btn_shuffle_challenge')
        ?.addEventListener('click', (e) => {
          e.stopPropagation();
          const filtered = CHALLENGE_PRESETS.filter((p) => p !== targetText);
          targetText = filtered[Math.floor(Math.random() * filtered.length)];
          renderModal();
          resetState();
          setupListeners(); // Re-bind listeners for new DOM
        });

      overlay
        .querySelector('#btn_cancel_challenge')
        ?.addEventListener('click', () => {
          if (timerInterval) {
            clearInterval(timerInterval);
          }
          overlay.classList.add('fg-opacity-0');
          setTimeout(() => {
            overlay.remove();
            resolve(false);
          }, 500);
        });

      overlay.addEventListener('click', () => input.focus());

      input.addEventListener('input', () => {
        if (!startTime) {
          startTime = Date.now();
          timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime!) / 1000);
            const m = Math.floor(elapsed / 60);
            const s = elapsed % 60;
            timerText.textContent =
              m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${elapsed}s`;
          }, 500);
        }

        const val = input.value;
        if (!val) {
          return;
        }

        const typedChar = val[val.length - 1];
        const targetChar = targetText[currentIndex];

        if (typedChar === targetChar) {
          chars[currentIndex].classList.remove('error');
          chars[currentIndex].classList.add('typed');
          currentIndex++;
          updateUI();

          if (currentIndex === targetText.length) {
            if (timerInterval) {
              clearInterval(timerInterval);
            }

            // Record Performance
            const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
            if (elapsed > 0) {
              import('./typingHistory').then(({ saveTypingSession }) => {
                const wpm = Math.round(targetText.length / 5 / (elapsed / 60));
                const attempts = targetText.length + mistakeCount;
                const accuracy = Math.round(
                  (targetText.length / attempts) * 100,
                );

                saveTypingSession({
                  timestamp: Date.now(),
                  duration: elapsed,
                  wpm,
                  accuracy,
                  textLength: targetText.length,
                  mistakes: mistakeCount,
                });
              });
            }

            overlay.classList.add('fg-opacity-0');
            setTimeout(() => {
              overlay.remove();
              resolve(true);
            }, 500);
          }
        } else {
          mistakeCount++;
          updateUI();
          chars[currentIndex].classList.add('error');
          overlay.firstElementChild?.animate(
            [
              { transform: 'translateX(-1px)' },
              { transform: 'translateX(1px)' },
              { transform: 'translateX(0)' },
            ],
            { duration: 50, iterations: 3 },
          );
        }
        input.value = '';
      });
    };

    const updateUI = () => {
      chars.forEach((c, i) => {
        c.classList.remove('current');
        if (i === currentIndex) {
          c.classList.add('current');
        }
      });
      const percent = Math.floor((currentIndex / targetText.length) * 100);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = percent.toString();
      mistakeText.textContent = mistakeCount.toString();
    };

    updateUI();
    setupListeners();

    // Animate in
    setTimeout(() => {
      overlay.classList.remove('fg-opacity-0');
      input.focus();
    }, 10);
  });
}

/**
 * Unified verification wrapper for sensitive actions.
 * Chains all enabled protections (PIN & Patience Challenge).
 */
export async function confirmGuardianAction(options: {
  title: string;
  body: string;
  isDestructive?: boolean;
}): Promise<boolean> {
  const { extensionAdapter: storage } = await import(
    '../background/platformAdapter'
  );
  const { checkGuard } = await import('../background/sessionGuard');
  const { toast } = (await import('./toast')) as any;

  // 1. System Lock Check (Focus Session / Strict Mode)
  // We check this FIRST so we don't annoy the user with a challenge that won't work.
  const guard = await checkGuard(
    options.isDestructive ? 'remove_app' : 'modify_blocklist',
  );
  if (!guard.allowed) {
    toast.error((guard as any).reason);
    return false;
  }

  const challengeEnabled = await storage.getBoolean('challenge_enabled');
  const currentPin = await storage.getString('guardian_pin');

  // 0. Environment Check for Popup
  // Typing inside a tiny extension popup is terrible UX.
  // If a lock is triggered, move them to the full dashboard.
  if (
    (challengeEnabled || currentPin) &&
    window.location.pathname.includes('popup.html')
  ) {
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard.html?tab=apps'),
    });
    window.close();
    return false;
  }

  if (challengeEnabled) {
    const challengeText =
      (await storage.getString('challenge_text')) ||
      'Success is not final, failure is not fatal: it is the courage to continue that counts. I will stay focused on my goals and avoid distractions.';
    const passed = await showTypingChallenge(challengeText);
    if (!passed) {
      return false;
    }
  }

  // 2. PIN Lock
  if (currentPin) {
    return new Promise((resolve) => {
      showPinModal(
        options.title,
        options.body,
        async (entered) => {
          if (entered === currentPin) {
            resolve(true);
            return true;
          } else {
            toast.error('Incorrect PIN');
            return false;
          }
        },
        () => resolve(false),
      );
    });
  }

  // 3. Fallback to Simple Confirm if no advanced security is set
  return await showConfirmDialog({
    title: options.title,
    body: options.body,
    confirmLabel: options.isDestructive ? 'Delete' : 'Confirm',
    isDestructive: options.isDestructive,
  });
}
