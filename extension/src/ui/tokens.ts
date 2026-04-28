import { COLORS } from '../lib/designTokens';

const TOKEN_DEFS = {
  HEADING: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--fg-text)',
    letterSpacing: '0',
    lineHeight: '1.4',
  },
  HERO: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--fg-text)',
    letterSpacing: '0',
    lineHeight: '1.3',
  },
  LABEL: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--fg-text)',
    letterSpacing: '0',
    lineHeight: '1.4',
  },
  SUBTEXT: {
    fontSize: '13px',
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
  BADGE: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0',
  },
  STAT: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '0',
    color: 'var(--fg-text)',
    lineHeight: '1.1',
  },
  STAT_LARGE: {
    fontSize: '48px',
    fontWeight: '800',
    letterSpacing: '0',
    color: 'var(--fg-text)',
    lineHeight: '1',
  },
  WIDGET_LABEL: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--fg-muted)',
    letterSpacing: '0',
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
    color: 'var(--fg-red)',
    letterSpacing: '0',
    lineHeight: '1.4',
  },
  FOOTNOTE: {
    fontSize: '12px',
    fontWeight: '400',
    color: 'var(--fg-muted)',
    lineHeight: '1.6',
  },
  MODAL_TITLE: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--fg-text)',
    lineHeight: '1.4',
  },
  MODAL_BODY: {
    fontSize: '13px',
    fontWeight: '400',
    color: 'var(--fg-muted)',
    lineHeight: '1.6',
  },
  BUTTON_TEXT: {
    fontSize: '14px',
    fontWeight: '600',
    letterSpacing: '0',
    color: 'var(--fg-text)',
  },
};

export const UI_ICONS = {
  FIRE: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.254 1.189-3.188a4.82 4.82 0 0 0 3.311 3.188z"/></svg>',
  CHECK:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  ARROW_RIGHT:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  TRENDS:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  SHIELD:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  ZAP: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  LOCK: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  RULER:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.8 2.8 0 1 1-4-4l-3.9 3.9-3.9-3.9 3.9-3.9a2.8 2.8 0 1 1 4-4L2 14.7l3 3 16.3-16.3"/></svg>',
  ROCKET:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
  TARGET:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  SPARKLES:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>',
  TURTLE:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2Z"/><path d="M16 10V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z"/><path d="M2 14h20"/><path d="M20 18v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2"/></svg>',
  CHART:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  LIGHTBULB:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
  KEYBOARD:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="10" y1="8" x2="10" y2="8"/><line x1="14" y1="8" x2="14" y2="8"/><line x1="18" y1="8" x2="18" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="14" y2="12"/><line x1="18" y1="12" x2="18" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',
  CLOSE:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  CLOUDSYNC:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>',
  SETTINGS:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  SEARCH:
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
};

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
    MODAL_TITLE: toCSS(TOKEN_DEFS.MODAL_TITLE),
    MODAL_BODY: toCSS(TOKEN_DEFS.MODAL_BODY),
    BUTTON_TEXT: toCSS(TOKEN_DEFS.BUTTON_TEXT),

    // React-compatible objects
    R: TOKEN_DEFS,
  },
  COLORS: {
    RED: COLORS.red,
    GREEN: COLORS.green,
    MUTED: COLORS.muted,
    TEXT: COLORS.text,
    ACCENT: COLORS.accent,
    ON_ACCENT: COLORS.onAccent,
    BORDER: COLORS.border,
    SURFACE: COLORS.surface,
  },
};
