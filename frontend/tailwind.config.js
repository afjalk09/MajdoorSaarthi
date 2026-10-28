/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
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
        saffron: {
          50: '#FFF4ED',
          100: '#FFE2D0',
          200: '#FFC4A3',
          300: '#FF9E6B',
          400: '#F5793A',
          500: '#E0561A',
          600: '#C44A12',
          700: '#9E3A0D',
          800: '#7A2D0A',
          900: '#5A2107',
        },
        earth: {
          50: '#EDF5F1',
          100: '#D3E9DF',
          200: '#A7D4C1',
          300: '#6FB89B',
          400: '#469A7D',
          500: '#2D6A4F',
          600: '#245840',
          700: '#1B4332',
          800: '#143326',
          900: '#0E241B',
        },
        gold: {
          50: '#FDF8E7',
          100: '#FBEDC4',
          200: '#F7DC95',
          300: '#EFC778',
          400: '#DFA23C',
          500: '#C6861B',
          600: '#A66C12',
          700: '#85550E',
          800: '#65410B',
          900: '#472E08',
        },
        warm: {
          50: '#F7F7F3',
          100: '#EEF0EA',
          200: '#DFE2D9',
          300: '#C5CABD',
          400: '#9AA292',
          500: '#7A8374',
          600: '#5A6355',
          700: '#454D40',
          800: '#313830',
          900: '#1C2019',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"IBM Plex Sans Devanagari"', 'system-ui', 'sans-serif'],
        display: ['Archivo', '"IBM Plex Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shimmer": "shimmer 1.5s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
