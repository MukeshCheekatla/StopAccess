export const COLORS = {
  accent: 'var(--fg-accent)',
  accentSoft: 'var(--fg-accent-soft)',
  bg: 'var(--fg-bg)',
  border: 'var(--fg-border)',
  glassBg: 'var(--fg-glass-bg)',
  glassBorder: 'var(--fg-glass-border)',
  green: 'var(--fg-green)',
  muted: 'var(--fg-muted)',
  onAccent: 'var(--fg-on-accent)',
  red: 'var(--fg-red)',
  surface: 'var(--fg-surface)',
  surfaceHover: 'var(--fg-surface-hover)',
  text: 'var(--fg-text)',
  yellow: 'var(--fg-yellow)',

  activeIndicator: 'var(--fg-active-indicator)',
  amberSoft: 'var(--fg-amber-soft)',
  amberBorder: 'var(--fg-amber-border)',
  amberText: 'var(--fg-amber-text)',
  blue: 'var(--fg-blue)',
  blueSoft: 'var(--fg-blue-soft)',
  dangerSoft: 'var(--fg-danger-soft)',
  dangerBorder: 'var(--fg-danger-border)',
  emeraldSoft: 'var(--fg-emerald-soft)',
  emeraldBorder: 'var(--fg-emerald-border)',
  fire: 'var(--fg-fire)',
  indigo: 'var(--fg-indigo)',
  indigoSoft: 'var(--fg-indigo-soft)',
  overlay: 'var(--fg-overlay)',
  overlayStrong: 'var(--fg-overlay-strong)',
  overlaySubtle: 'var(--fg-overlay-subtle)',
  overlayTint: 'var(--fg-overlay-tint)',
  shadow: 'var(--fg-shadow)',
  shadowSoft: 'var(--fg-shadow-soft)',
  white: 'var(--fg-white)',
} as const;

export const COLOR_CLASSES = {
  bg: {
    activeIndicator: 'fg-bg-[var(--fg-active-indicator)]',
    glassBg: 'fg-bg-[var(--fg-glass-bg)]',
    onAccent: 'fg-bg-[var(--fg-on-accent)]',
    overlay: 'fg-bg-[var(--fg-overlay)]',
    overlayStrong: 'fg-bg-[var(--fg-overlay-strong)]',
    overlaySubtle: 'fg-bg-[var(--fg-overlay-subtle)]',
    overlayTint: 'fg-bg-[var(--fg-overlay-tint)]',
    red: 'fg-bg-[var(--fg-red)]',
    whiteWash: 'fg-bg-[var(--fg-white-wash)]',
  },
  border: {
    hover: 'hover:fg-border-[var(--fg-hover-border)]',
    whiteWash: 'fg-border-[var(--fg-white-wash)]',
  },
  text: {
    muted: 'fg-text-[var(--fg-muted)]',
    onAccent: 'fg-text-[var(--fg-on-accent)]',
    text: 'fg-text-[var(--fg-text)]',
  },
  hover: {
    overlaySubtle: 'hover:fg-bg-[var(--fg-overlay-subtle)]',
    whiteWash: 'hover:fg-bg-[var(--fg-white-wash)]',
  },
  shadow: {
    greenGlow: 'fg-shadow-[0_0_10px_var(--fg-green-glow)]',
    redGlow: 'fg-shadow-[0_0_80px_var(--fg-red-glow)]',
    switch:
      'fg-shadow-[0_2px_8px_var(--fg-shadow-soft),0_1px_2px_var(--fg-shadow-xsoft)]',
  },
} as const;

export const CHART_COLORS = [
  'var(--fg-chart-blue)',
  'var(--fg-chart-green)',
  'var(--fg-chart-cyan)',
  'var(--fg-chart-yellow)',
  'var(--fg-chart-orange)',
  'var(--fg-chart-red)',
  'var(--fg-chart-purple)',
  'var(--fg-chart-pink)',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  'social-networks': 'var(--fg-category-social)',
  'video-streaming': 'var(--fg-category-video)',
  gambling: 'var(--fg-category-gambling)',
  games: 'var(--fg-category-games)',
  dating: 'var(--fg-category-dating)',
  news: 'var(--fg-category-news)',
  shopping: 'var(--fg-category-shopping)',
  crypto: 'var(--fg-category-crypto)',
  porn: 'var(--fg-category-porn)',
  piracy: 'var(--fg-category-piracy)',
};

export const DEFAULT_CATEGORY_COLOR = 'var(--fg-category-default)';

export const RAW_COLORS = {
  primaryBlue: '#6366f1',
} as const;

export const EXTENSION_COLOR_VAR_DECLARATIONS = `
  --fg-accent: #ff3b30;
  --fg-green: #10b981;
  --fg-red: #ff3b30;
  --fg-yellow: #f59e0b;
  --fg-on-accent: #ffffff;
  --fg-white: #ffffff;
  --fg-black: #000000;
  --fg-muted: #a1a1aa;
  --fg-text: #ececec;
  --fg-host-bg: #0b0b0b;
  --fg-guide-bg: #ffffff;
  --fg-guide-text: #111827;
  --fg-guide-muted: rgba(0, 0, 0, 0.7);
  --fg-guide-label: rgba(0, 0, 0, 0.4);
  --fg-guide-border: rgba(0, 0, 0, 0.08);
  --fg-guide-icon-border: rgba(0, 0, 0, 0.05);
  --fg-overlay-tint: rgba(0, 0, 0, 0.1);
  --fg-white-wash: rgba(255, 255, 255, 0.05);
  --fg-red-glow: rgba(239, 68, 68, 0.35);
  --fg-chart-border-dark: rgba(0, 0, 0, 0.2);
  --fg-chart-blue: #a0c4ff;
  --fg-chart-green: #caffbf;
  --fg-chart-cyan: #9bf6ff;
  --fg-chart-yellow: #fdffb6;
  --fg-chart-orange: #ffd6a5;
  --fg-chart-red: #ffadad;
  --fg-chart-purple: #bdb2ff;
  --fg-chart-pink: #ffc6ff;
  --fg-shadow-soft: rgba(0, 0, 0, 0.12);
`;
