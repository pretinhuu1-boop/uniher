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
          50: "#FAF7F2",
          100: "#F3EDE2",
          200: "#EDE3D4",
        },
        rose: {
          50:  "#FAF5E8",
          100: "#F5EDD5",
          200: "#E8D5A3",
          300: "#DCBD75",
          400: "#CFA84A",
          500: "#C9A264",
          600: "#B8922A",
          700: "#9A7520",
          800: "#7A5A14",
        },
        gold: {
          50:  "#FAF5E8",
          100: "#F5EDD5",
          200: "#E8D5A3",
          300: "#DCBD75",
          400: "#CFA84A",
          500: "#C9A264",
          600: "#B8922A",
          700: "#9A7520",
          800: "#7A5A14",
        },
        navy: {
          50:  "#EEF2F8",
          100: "#D5DFF0",
          400: "#3D6090",
          500: "#1A3A6B",
          600: "#142E58",
          700: "#0F2245",
          800: "#091632",
          900: "#040D1F",
        },
        nude: {
          50:  "#FAF3EE",
          100: "#F2E5DC",
          200: "#E8CFC3",
          300: "#D4B5A8",
          500: "#A87D70",
        },
        uni: {
          green: "#3E7D5A",
          text: {
            900: "#1E2B3C",
            600: "#5C4A3A",
            500: "#7A6050",
            400: "#A08878",
            300: "#C4B0A5",
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
        xl: "0 12px 48px rgba(154, 117, 32, 0.14)",
        md: "0 3px 18px rgba(154, 117, 32, 0.10)",
        sm: "0 1px 6px rgba(154, 117, 32, 0.07)",
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
