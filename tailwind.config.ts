import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#22c55e",
        "primary-hover": "#16a34a",
        "primary-soft": "#f0fdf4",
        "background-light": "#fcfdfc",
        "background-dark": "#102216",
        "surface-dark": "#1A2E20",
        "surface-dark-2": "#253D2B",
        text: "#111813",
        "text-main": "#1e293b",
        "text-muted": "#64748b",
        "text-dark": "#E8ECE9",
        "text-muted-dark": "#A1C4AD",
        "border-dark": "#2D4A35",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ["var(--font-cairo)", "Cairo", "sans-serif"],
        cairo: ["var(--font-cairo)", "Cairo", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "10px",
        md: "12px",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        full: "9999px",
      },
      boxShadow: {
        "card": "0 8px 30px rgba(0,0,0,0.04)",
        "primary": "0 10px 30px rgba(19,236,91,0.22)",
      },
      animation: {
        "slide-up": "slideUp 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "slide-down": "slideDown 350ms cubic-bezier(0.4, 0, 1, 1) forwards",
        "fade-in": "fadeIn 300ms ease-out forwards",
        "fade-out": "fadeOut 250ms ease-in forwards",
      },
      keyframes: {
        slideUp: {
          "0%": { 
            transform: "translateY(24px)",
            opacity: "0"
          },
          "100%": { 
            transform: "translateY(0)",
            opacity: "1"
          },
        },
        slideDown: {
          "0%": { 
            transform: "translateY(-20px)",
            opacity: "0"
          },
          "100%": { 
            transform: "translateY(0)",
            opacity: "1"
          },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
