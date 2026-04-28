import { COLORS } from '../../lib/designTokens';
import { UI_TOKENS, UI_ICONS } from '../tokens';

export function renderStreakBadge(streak: number) {
  const isZero = streak <= 0;
  const color = isZero ? COLORS.muted : COLORS.fire;

  return `
    <div style="display: flex; align-items: center; gap: 6px; padding: 5px 10px; background: var(--fg-glass-bg); border: 1px solid var(--fg-glass-border); border-radius: 12px; color: ${color}; font-weight: 700;">
      <span style="opacity: ${
        isZero ? 0.5 : 1
      }; display: flex; align-items: center;">${UI_ICONS.FIRE}</span>
      <span style="font-size: 12px; font-weight: 700; letter-spacing: 0;">${streak}d</span>
    </div>
  `;
}

export function renderCompactStreak(streak: number) {
  const isZero = streak <= 0;
  const color = isZero ? COLORS.muted : COLORS.fire;
  return `
    <div style="display: flex; align-items: center; gap: 4px; color: ${color}; font-weight: 600; font-size: 12px;">
      <span style="opacity: ${
        isZero ? 0.3 : 1
      }; display: flex; align-items: center; transform: scale(0.8);">${
    UI_ICONS.FIRE
  }</span>
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
    color = 'var(--fg-green)';
  } else if (limit <= 0) {
    percent = 100;
    color = 'var(--fg-red)';
  } else {
    percent = Math.min(100, Math.max(0, (used / limit) * 100));
    if (percent >= 80) {
      color = 'var(--fg-red)';
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
