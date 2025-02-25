/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./components/TestNativeWind.tsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['PlusJakartaSans-Regular'],
        'sans-medium': ['PlusJakartaSans-Medium'],
        'sans-semibold': ['PlusJakartaSans-SemiBold'],
        'sans-bold': ['PlusJakartaSans-Bold'],
        'sans-extrabold': ['PlusJakartaSans-ExtraBold'],
        'sans-light': ['PlusJakartaSans-Light'],
        'sans-extralight': ['PlusJakartaSans-ExtraLight'],
        'sans-italic': ['PlusJakartaSans-Italic'],
      },
      colors: {
        'background-main': '#25292e',
        'background-light': '#3a3f44',
        'background-dark': '#1a1d20',
        'text-primary': '#ffffff',
        'text-secondary': '#cccccc',
        'text-inverse': '#000000',
        'primary': '#ffd33d',
        'primary-dark': '#ffc107',
        'primary-light': '#ffe066',
        'status-success': '#4caf50',
        'status-error': '#f44336',
        'status-warning': '#ff9800',
      },
    },
  },
  plugins: [],
}