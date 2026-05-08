import { COLORS } from '@/ui/theme/designTokens';
import { UI_TOKENS, UI_ICONS } from '@/ui/theme/uiTokens';

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
      <div style="width: 100%; height: 5px; background: var(--fg-glass-border); border-radius: 100px; overflow: hidden; opacity: 0.3;">
        <div style="height: 100%; width: 0%; background: var(--fg-muted);"></div>
      </div>
    `;
  }

  let percent = 0;
  let gradient: string = `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.accent})`;

  if (used <= 0) {
    percent = 0;
  } else if (limit <= 0) {
    percent = 100;
    gradient = `linear-gradient(90deg, ${COLORS.red}, #ff4d4d)`;
  } else {
    percent = Math.min(100, Math.max(0, (used / limit) * 100));
    if (percent >= 80) {
      gradient = `linear-gradient(90deg, ${COLORS.red}, #ff4d4d)`;
    } else if (percent >= 50) {
      gradient = `linear-gradient(90deg, ${COLORS.yellow}, #ffcc00)`;
    }
  }

  return `
    <div class="progress-bar-container" style="width: 100%; height: 5px; background: var(--fg-glass-border); border-radius: 100px; overflow: hidden; position: relative;">
      <style>
        @keyframes fg-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.6s ease;
          background-size: 200% 100% !important;
          animation: fg-shimmer 3s linear infinite;
        }
      </style>
      <div class="progress-bar-fill" style="width: ${percent}%; background: ${gradient};"></div>
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
          ${UI_ICONS.CLOUD}
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
