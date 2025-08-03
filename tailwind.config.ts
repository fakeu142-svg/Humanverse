import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
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
        // Desert Theme - Main Platform
        desert: {
          50: '#FDF7F0',
          100: '#F5E6D3',
          200: '#E8C9A0',
          300: '#DAA520', // goldenrod
          400: '#C4941A',
          500: '#8B4513', // burnt orange
          600: '#7A3C10',
          700: '#693310',
          800: '#582A0D',
          900: '#2F1B14', // dark brown
          950: '#1A0F0A',
        },
        // Admin Theme - Surveillance Interface
        admin: {
          50: '#F8F8F8',
          100: '#E8E8E8',
          200: '#D3D3D3',
          300: '#B8B8B8',
          400: '#9D9D9D',
          500: '#6B6B6B',
          600: '#525252',
          700: '#404040',
          800: '#2D2D2D',
          900: '#1F1F1F', // main admin bg
          950: '#141414',
        },
        // Status Colors
        danger: '#DC2626',
        warning: '#F59E0B',
        success: '#059669',
        info: '#0284C7',
        // Mask Type Colors
        mask: {
          ashfox: '#8B4513',
          violetcrow: '#7C3AED',
          echodust: '#6B7280',
          ironsage: '#374151',
          ghostwind: '#E5E7EB',
        },
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
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'], // Headers
        'body': ['Source Code Pro', 'monospace'], // Body text
        'mono': ['JetBrains Mono', 'monospace'], // Admin panels
        sans: ['var(--font-sans)', 'sans-serif'],
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
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-danger": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(220, 38, 38, 0.7)" },
          "70%": { boxShadow: "0 0 0 10px rgba(220, 38, 38, 0)" },
        },
        "surveillance-scan": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-danger": "pulse-danger 2s infinite",
        "surveillance-scan": "surveillance-scan 2s linear infinite",
      },
      backdropBlur: {
        xs: '2px',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
