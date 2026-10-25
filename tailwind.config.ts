import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border, 215 27.9% 16.9%))',
        input: 'hsl(var(--input, 215 27.9% 16.9%))',
        ring: 'hsl(var(--ring, 217.2 91.2% 59.8%))',
        background: 'hsl(var(--background, 222.2 84% 4.9%))',
        foreground: 'hsl(var(--foreground, 210 40% 98%))',
        primary: {
          DEFAULT: 'hsl(var(--primary, 217.2 91.2% 59.8%))',
          foreground: 'hsl(var(--primary-foreground, 222.2 47.4% 11.2%))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary, 217.2 32.6% 17.5%))',
          foreground: 'hsl(var(--secondary-foreground, 210 40% 98%))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive, 0 62.8% 30.6%))',
          foreground: 'hsl(var(--destructive-foreground, 210 40% 98%))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted, 217.2 32.6% 17.5%))',
          foreground: 'hsl(var(--muted-foreground, 215 20.2% 65.1%))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent, 217.2 32.6% 17.5%))',
          foreground: 'hsl(var(--accent-foreground, 210 40% 98%))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover, 222.2 84% 4.9%))',
          foreground: 'hsl(var(--popover-foreground, 210 40% 98%))',
        },
        card: {
          DEFAULT: 'hsl(var(--card, 222.2 84% 4.9%))',
          foreground: 'hsl(var(--card-foreground, 210 40% 98%))',
        },
      },
      borderRadius: {
        lg: 'var(--radius, 0.75rem)',
        md: 'calc(var(--radius, 0.75rem) - 2px)',
        sm: 'calc(var(--radius, 0.75rem) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config
