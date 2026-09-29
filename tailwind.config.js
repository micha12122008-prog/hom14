/** @type {import('tailwindcss').Config} */
module.exports = {
  // Шляхи до всіх директорій з компонентами та екранами
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#c7510c",
        secondary: "#d38d0b",
        surface: "#1A1A1A",
        surfaceLight: "#2A2A2A",
        grey: "#9CA3AF",
      },
    },
  },
  plugins: [],
};