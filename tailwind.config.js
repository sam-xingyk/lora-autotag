/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}'
  ],
  safelist: [
    'w-[48px]',
    'w-[80px]',
    'w-[256px]'
    , 'min-w-[220px]', 'min-w-[200px]', 'min-w-[150px]'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3370ff',
        primaryHover: '#295ac8',
        secondary: '#64748b',
        surface: '#ffffff',
        background: '#f5f6f7',
      }
    }
  },
  plugins: []
}