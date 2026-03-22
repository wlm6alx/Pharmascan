/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        mint: {
          DEFAULT: '#0b8fac',
          light: '#7bc1b7',
          dark: '#0a7085',
        },
        beige: {
          light: '#F5F5DC',
          DEFAULT: '#F5E6D3',
          dark: '#D4C5B9',
        },
      },
    },
  },
  plugins: [],
}

