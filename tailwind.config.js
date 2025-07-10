/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'luitania-cream': '#FDFBF6',
        'luitania-textbrown': '#4E423A',
        'luitania-pink': '#E6C6B6',
        'luitania-sage': '#A2A995',
        'luitania-warmgray': '#D3CBC3',
      },
      fontFamily: {
        'lora': ['Lora', 'serif'],
        'quicksand': ['Quicksand', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 15px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}