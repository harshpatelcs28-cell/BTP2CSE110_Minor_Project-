/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        natureTheme: {
          darkergreen: '#1E2D2A',
          darkgreen: '#1a3c34',
          mediumgreen: '#2a5a4a',
          olive: '#8fb13d',
          yellow: '#fbc943',
          redbarn: '#cd3d4c',
          mintlight: '#d2f3e0',
          darkblue: '#163a50',
          teal: '#286c75'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
        serif: ['"DM Serif Display"', 'serif'],
      }
    },
  },
  plugins: [],
}
