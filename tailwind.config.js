/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#020404',
        card: 'rgba(255, 255, 255, 0.05)',
        border: 'rgba(255, 255, 255, 0.12)',
        text: '#FFFFFF',
        muted: 'rgba(255, 255, 255, 0.7)',
        accent: '#2d9cdb',
        green: '#03DAC6',
        yellow: '#FFB74D',
        red: '#CF6679',
        blue: '#64B5F6',
        glass: 'rgba(255, 255, 255, 0.03)',
      },
      borderRadius: {
        card: '16px',
      },
      letterSpacing: {
        tightest: '-1px',
        tighter: '-0.5px',
      },
    },
  },
  plugins: [],
};
