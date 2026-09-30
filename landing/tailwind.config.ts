import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050B18",
        foreground: "#ffffff",
        accent: "#4F8EF7",
        "glass-bg": "rgba(255, 255, 255, 0.05)",
        "glass-border": "rgba(255, 255, 255, 0.1)"
      },
      backgroundImage: {
        'gradient-text': 'linear-gradient(to right, #ffffff, #4F8EF7)',
      }
    },
  },
  plugins: [],
};
export default config;
