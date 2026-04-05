export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],

  prefix: 'fg-', // KEEP THIS

  corePlugins: {
    preflight: false, // safety fallback
  },

  theme: {
    extend: {
      colors: {
        accent: '#52525B', // Standard theme accent
        'accent-alt': '#3F3F46',
        'brand-dark': '#09090B',
        'brand-muted': '#a1a1aa',
        'glass-bg': 'rgba(18, 18, 20, 0.7)',
        'glass-border': 'rgba(255, 255, 255, 0.04)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },

  plugins: [],
};
