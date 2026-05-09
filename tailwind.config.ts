import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07090d",
        panel: "#10151f",
        pulse: "#29f3b5",
        amberline: "#f0b35a",
        clinical: "#67d4ff"
      },
      boxShadow: {
        glow: "0 0 36px rgba(41, 243, 181, 0.15)"
      }
    }
  },
  plugins: []
} satisfies Config;
