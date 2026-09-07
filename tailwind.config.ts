import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#FF6B00",
          orangeHover: "#EA580C",
          orangeLight: "#FFF7ED",
          navy: "#0F172A",
          navyLight: "#1E293B",
          blue: "#2563EB",
          blueLight: "#EFF6FF",
          border: "#E2E8F0",
          surface: "#F8FAFC",
          card: "#FFFFFF",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
        }
      }
    },
  },
  plugins: [],
};
export default config;
