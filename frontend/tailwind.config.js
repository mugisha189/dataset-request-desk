/** @type {import('tailwindcss').Config} */
//
// Palette copied from the Koolo Store back office: a warm off-white page, near-black as the
// strong colour, and gold as the single accent. The typeface is a substitute -- the store's own
// SK Modernist is a commercial font licensed for Koolo's properties specifically, so this project
// uses Space Grotesk (Google Fonts, same geometric-sans family) instead of redistributing it.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0E0E10',
          soft: '#2A2A2E',
          muted: '#6B6F6A',
          faint: '#9A9E98',
        },
        gold: {
          DEFAULT: '#B8932E',
          bright: '#D4AF37',
          soft: '#F2E8C9',
          wash: '#FBF6E6',
        },

        page: '#FAFAF7',
        surface: {
          DEFAULT: '#FFFFFF',
          tint: '#F2F0E8',
          sunk: '#E9E6DB',
        },
        line: {
          DEFAULT: '#E0DCCF',
          strong: '#CFC9B8',
        },

        ok: '#2F7A4D',
        warn: '#B4690E',
        danger: '#B42318',
      },

      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      borderRadius: {
        card: '18px',
        pill: '999px',
      },

      boxShadow: {
        card: '0 1px 2px rgba(14,14,16,0.04)',
        raised: '0 6px 24px -8px rgba(14,14,16,0.18)',
        header: '0 1px 0 rgba(14,14,16,0.06)',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'overlay-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'overlay-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'dialog-in': {
          from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'dialog-out': {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          to: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
        },
        'menu-in': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'menu-out': { from: { opacity: '1', transform: 'scale(1)' }, to: { opacity: '0', transform: 'scale(0.96)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'overlay-in': 'overlay-in 150ms ease-out',
        'overlay-out': 'overlay-out 150ms ease-in',
        'dialog-in': 'dialog-in 180ms ease-out',
        'dialog-out': 'dialog-out 150ms ease-in',
        'menu-in': 'menu-in 120ms ease-out',
        'menu-out': 'menu-out 100ms ease-in',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}
