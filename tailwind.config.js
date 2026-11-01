/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midgard: {
          dark: '#1e232a',
          panel: 'rgba(23, 27, 34, 0.92)',
          gold: '#f59e0b',
          accent: '#38bdf8',
          hp: '#ef4444',
          sp: '#3b82f6',
          exp: '#10b981',
        }
      }
    },
  },
  plugins: [],
}
