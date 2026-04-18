export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],

  prefix: 'fg-', // KEEP THIS

  corePlugins: {
    preflight: false, // safety fallback
  },

  theme: {
    extend: {
      colors: {
        accent: 'var(--fg-accent)',
        'accent-alt': 'var(--fg-surface-hover)',
        'brand-dark': 'var(--fg-bg)',
        'brand-muted': 'var(--fg-muted)',
        'glass-bg': 'var(--fg-glass-bg)',
        'glass-border': 'var(--fg-glass-border)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
    },
  },

  plugins: [],
};
