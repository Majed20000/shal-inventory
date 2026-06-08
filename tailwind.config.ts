import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#fdf7ec',
          100: '#f7efe0',
          200: '#ebdbc8',
          300: '#dbc2a0',
          400: '#c49c6f',
          500: '#a67847',
          600: '#8b5e34',
          700: '#6b4524',
          800: '#4d2f19',
          900: '#321f12'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
