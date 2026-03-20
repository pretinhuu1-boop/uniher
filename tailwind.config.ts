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
        cream: {
          50: "#F7F3EE",
          100: "#EDE7DC",
          200: "#E8E0D4",
        },
        rose: {
          50: "#F9EEF3",
          100: "#F2DDE6",
          300: "#EAB8CB",
          400: "#E8849E",
          500: "#C85C7E",
          700: "#8C3255",
        },
        gold: {
          50: "#FAF5E8",
          200: "#E8D5A3",
          500: "#D4B060",
          700: "#B8922A",
        },
        uni: {
          green: "#3E7D5A",
          text: {
            900: "#2A1A1F",
            600: "#6B4D57",
            400: "#A48090",
            300: "#C4AEBA",
          },
        },
      },
      fontFamily: {
        display: ["var(--ff-display)", "Georgia", "serif"],
        body: ["var(--ff-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xs: "6px",
        sm: "10px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
      },
      boxShadow: {
        xl: "0 12px 48px rgba(140, 50, 85, 0.12)",
        md: "0 3px 18px rgba(140, 50, 85, 0.09)",
        sm: "0 1px 6px rgba(140, 50, 85, 0.07)",
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out",
        fadeIn: "fadeIn 0.3s ease-in-out",
        scaleIn: "scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        float: "float 3s ease-in-out infinite",
        spin: "spin 1s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        marquee: "marquee 20s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
