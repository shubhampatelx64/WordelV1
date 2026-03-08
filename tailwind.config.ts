import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        correct: '#538d4e',
        present: '#b59f3b',
        absent: '#3a3a3c',
        'tile-bg': '#121213',
        'tile-border': '#3a3a3c',
        'key-bg': '#818384',
      },
    },
  },
  plugins: []
} satisfies Config;
