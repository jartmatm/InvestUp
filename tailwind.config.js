/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4A6CF7",
          light: "#6E8BFF",
          dark: "#2E4AD9",
        },
        gray: {
          100: "#F7F7F7",
          200: "#EDEDED",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
        success: "#4CAF50",
        danger: "#FF4D4F",
        warning: "#FFC107",
      },
      borderRadius: {
        xl: "1rem",
        lg: "0.75rem",
        md: "0.5rem",
      },
    },
  },
  plugins: [],
};
