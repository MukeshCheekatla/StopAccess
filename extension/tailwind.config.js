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
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.2s ease-out forwards',
        'fade-in': 'fade-in 0.15s ease-out forwards',
      },
    },
  },

  plugins: [],
};
