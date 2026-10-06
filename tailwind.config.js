/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        munay: {
          cream: '#FDF8F5',
          sand: '#F2E8DF',
          terracotta: '#9C5B4B',
          brown: '#5C3A32',
          dark: '#3E2723',
          alert: '#D32F2F'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}