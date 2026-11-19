/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate'

export default {
  // The app switches themes with <html data-theme="dark">, so Tailwind's `dark:` follows that.
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1160px' } },
    extend: {
      colors: {
        // shadcn/ui semantic tokens (values live in src/styles.css as HSL triplets)
        border: 'hsl(var(--ui-border))',
        input: 'hsl(var(--ui-input))',
        ring: 'hsl(var(--ui-ring))',
        background: 'hsl(var(--ui-background))',
        foreground: 'hsl(var(--ui-foreground))',
        primary: { DEFAULT: 'hsl(var(--ui-primary))', foreground: 'hsl(var(--ui-primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--ui-secondary))', foreground: 'hsl(var(--ui-secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--ui-destructive))', foreground: 'hsl(var(--ui-destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--ui-muted))', foreground: 'hsl(var(--ui-muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--ui-accent))', foreground: 'hsl(var(--ui-accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--ui-popover))', foreground: 'hsl(var(--ui-popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--ui-card))', foreground: 'hsl(var(--ui-card-foreground))' },
        // Brand colours by role, not hue, so a re-theme only changes the tokens in styles.css
        brand: {
          primary: 'hsl(var(--ui-brand-primary))',
          'primary-deep': 'hsl(var(--ui-brand-primary-deep))',
          accent: 'hsl(var(--ui-brand-accent))',
          'accent-hover': 'hsl(var(--ui-brand-accent-hover))',
          white: '#ffffff',
        },
        whatsapp: '#25d366',
        // legacy names kept for existing markup
        forest: '#126b55', ink: '#152b25', mist: '#f4f7f5',
      },
      borderColor: { DEFAULT: 'hsl(var(--ui-border))' },
      borderRadius: { lg: 'var(--ui-radius)', md: 'calc(var(--ui-radius) - 2px)', sm: 'calc(var(--ui-radius) - 4px)' },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: { 'accordion-down': 'accordion-down 0.2s ease-out', 'accordion-up': 'accordion-up 0.2s ease-out' },
    },
  },
  plugins: [animate],
}
