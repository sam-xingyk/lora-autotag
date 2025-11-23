/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}'
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