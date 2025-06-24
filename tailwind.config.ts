import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    // Text colors for industries
    'text-cyan-200', 'text-cyan-300', 'text-cyan-400',
    'text-purple-200', 'text-purple-300', 'text-purple-400',
    'text-violet-200', 'text-violet-300', 'text-violet-400',
    'text-green-200', 'text-green-300', 'text-green-400',
    'text-yellow-200', 'text-yellow-300', 'text-yellow-400',
    'text-orange-200', 'text-orange-300', 'text-orange-400',
    'text-blue-200', 'text-blue-300', 'text-blue-400',
    'text-pink-200', 'text-pink-300', 'text-pink-400',
    'text-indigo-200', 'text-indigo-300', 'text-indigo-400',
    'text-red-200', 'text-red-300', 'text-red-400',
    'text-emerald-200', 'text-emerald-300', 'text-emerald-400',
    'text-gray-200', 'text-gray-300', 'text-gray-400',
    // Background colors
    'bg-cyan-400/10', 'bg-cyan-400/20', 'bg-cyan-400/30', 'bg-cyan-400/40',
    'bg-purple-400/10', 'bg-purple-400/20', 'bg-purple-400/30', 'bg-purple-400/40',
    'bg-violet-400/10', 'bg-violet-400/20', 'bg-violet-400/30', 'bg-violet-400/40',
    'bg-green-400/10', 'bg-green-400/20', 'bg-green-400/30', 'bg-green-400/40',
    'bg-yellow-400/10', 'bg-yellow-400/20', 'bg-yellow-400/30', 'bg-yellow-400/40',
    'bg-orange-400/10', 'bg-orange-400/20', 'bg-orange-400/30', 'bg-orange-400/40',
    'bg-blue-400/10', 'bg-blue-400/20', 'bg-blue-400/30', 'bg-blue-400/40',
    'bg-pink-400/10', 'bg-pink-400/20', 'bg-pink-400/30', 'bg-pink-400/40',
    'bg-indigo-400/10', 'bg-indigo-400/20', 'bg-indigo-400/30', 'bg-indigo-400/40',
    'bg-red-400/10', 'bg-red-400/20', 'bg-red-400/30', 'bg-red-400/40',
    'bg-emerald-400/10', 'bg-emerald-400/20', 'bg-emerald-400/30', 'bg-emerald-400/40',
    'bg-gray-400/10', 'bg-gray-400/20', 'bg-gray-400/30', 'bg-gray-400/40',
    // Border colors
    'border-cyan-400', 'border-cyan-400/30', 'border-cyan-400/50',
    'border-purple-400', 'border-purple-400/30', 'border-purple-400/50',
    'border-violet-400', 'border-violet-400/30', 'border-violet-400/50',
    'border-green-400', 'border-green-400/30', 'border-green-400/50',
    'border-yellow-400', 'border-yellow-400/30', 'border-yellow-400/50',
    'border-orange-400', 'border-orange-400/30', 'border-orange-400/50',
    'border-blue-400', 'border-blue-400/30', 'border-blue-400/50',
    'border-pink-400', 'border-pink-400/30', 'border-pink-400/50',
    'border-indigo-400', 'border-indigo-400/30', 'border-indigo-400/50',
    'border-red-400', 'border-red-400/30', 'border-red-400/50',
    'border-emerald-400', 'border-emerald-400/30', 'border-emerald-400/50',
    'border-gray-400', 'border-gray-400/30', 'border-gray-400/50',
    // Left border colors
    'border-l-cyan-400', 'border-l-purple-400', 'border-l-violet-400',
    'border-l-green-400', 'border-l-yellow-400', 'border-l-orange-400',
    'border-l-blue-400', 'border-l-pink-400', 'border-l-indigo-400',
    'border-l-red-400', 'border-l-emerald-400', 'border-l-gray-400',
    // Shadow colors
    'shadow-cyan-400/20', 'shadow-cyan-400/30',
    'shadow-purple-400/20', 'shadow-purple-400/30',
    'shadow-violet-400/20', 'shadow-violet-400/30',
    'shadow-green-400/20', 'shadow-green-400/30',
    'shadow-yellow-400/20', 'shadow-yellow-400/30',
    'shadow-orange-400/20', 'shadow-orange-400/30',
    'shadow-blue-400/20', 'shadow-blue-400/30',
    'shadow-pink-400/20', 'shadow-pink-400/30',
    'shadow-indigo-400/20', 'shadow-indigo-400/30',
    'shadow-red-400/20', 'shadow-red-400/30',
    'shadow-emerald-400/20', 'shadow-emerald-400/30',
    'shadow-gray-400/20', 'shadow-gray-400/30',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
