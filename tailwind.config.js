/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          100: 'var(--background-100)',
          200: 'var(--background-200)',
          300: 'var(--background-300)',
        },
        text: {
          100: 'var(--text-100)',
          200: 'var(--text-200)',
          300: 'var(--text-300)',
        },
        primary: {
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-scrollbar')({ nocompatible: true }),
  ],
  darkMode: 'class',
}