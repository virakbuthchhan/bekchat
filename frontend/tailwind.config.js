/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slack: {
          sidebar: '#19171D',
          hover: '#27242C',
          active: '#1164A3',
          badge: '#CD2553',
        },
      },
    },
  },
  plugins: [],
}
