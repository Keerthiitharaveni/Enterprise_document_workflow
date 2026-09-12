/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#151A21",
          soft: "#232A34",
        },
        canvas: "#EEEEF0",
        paper: "#FFFFFF",
        line: "#D8DADF",
        pine: {
          DEFAULT: "#2F5D50",
          soft: "#E4ECE9",
          dark: "#204038",
        },
        slate: {
          DEFAULT: "#5B6270",
        },
        amber: {
          DEFAULT: "#9A6B12",
          soft: "#FBF0DA",
        },
        brick: {
          DEFAULT: "#9C3B34",
          soft: "#F8E6E4",
        },
        steel: {
          DEFAULT: "#3B5A73",
          soft: "#E6EDF2",
        },
        plum: {
          DEFAULT: "#5B4368",
          soft: "#EEE7F1",
        },
      },
      fontFamily: {
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-plex)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "6px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
