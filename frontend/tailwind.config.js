/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bodyBg: 'var(--body-bg)',
        primaryBg: 'var(--primary-bg)',
        secondaryBg: 'var(--secondary-bg)',
        accentBg: 'var(--accent-bg)',
        textColor: 'var(--text-color)',
        // Bootstrap-like colors for reuse
        blue: 'var(--bs-blue)',
        purple: 'var(--bs-purple)',
        pink: 'var(--bs-pink)',
        orange: 'var(--bs-orange)',
      },
      fontFamily: {
        sans: ['var(--bs-font-sans-serif)'],
        mono: ['var(--bs-font-monospace)'],
      },
    },
  },
  plugins: [],
};