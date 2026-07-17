import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          50: "#f8f9fa",
          100: "#e9eaee",
          200: "#babcc6",
          300: "#8b8f9e",
          400: "#5c6176",
          500: "#2d334e",
          600: "#242940",
          700: "#1b1f32",
          800: "#121524",
          900: "#090b16",
        },
        arc: {
          blue: "#0052FF",
          cyan: "#00D4AA",
          green: "#22C55E",
        },
      },
    },
  },
  plugins: [],
};

export default config;