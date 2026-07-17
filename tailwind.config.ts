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
        "arc-bg-dark": "#000b24",
        "arc-bg-gradient-start": "#010d28",
        "arc-bg-gradient-end": "#0b223e",
        "validator-blue": "#2f578c",
        "sky-sync": "#acc6e9",
        "blockstream-gold": "#e9a13f",
        "text-semi-white": "rgba(255, 255, 255, 0.65)",
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
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;