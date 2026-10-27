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
        background: "var(--background)",
        foreground: "var(--foreground)",
        normal: "#10b981",
        alert: "#f59e0b",
        minor: "#f97316",
        major: "#ef4444",
        stale: "#6b7280"
      },
    },
  },
  plugins: [],
};
export default config;
