/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wisp-black': '#0a0a0a',
        'wisp-white': '#fafafa',
        'wisp-grey': '#262626',
      },
    },
  },
  plugins: [],
}
