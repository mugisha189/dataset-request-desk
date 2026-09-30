/** @type {import('tailwindcss').Config} */
//
// A quiet ops-console palette rather than a marketing one: a cool off-white page, near-black
// for text and primary actions, and one accent (a working blue) reserved for links, the active
// nav item and anything that needs to stand out from a page that is otherwise grayscale. Status
// colours (ok/warn/danger) are the only other colour allowed on screen, because this is a tool
// operators stare at all day and a colourful dashboard is a tiring one.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12131A',
          soft: '#2B2D38',
          muted: '#666A78',
          faint: '#9A9EAD',
        },
        brand: {
          DEFAULT: '#3D6FEF',
          bright: '#5B8CFF',
          soft: '#E4ECFF',
          wash: '#F3F7FF',
        },

        page: '#F5F6F8',
        surface: {
          DEFAULT: '#FFFFFF',
          tint: '#F0F1F5',
          sunk: '#E7E9EF',
        },
        line: {
          DEFAULT: '#E3E5EA',
          strong: '#D3D6DE',
        },

        ok: '#1F8A55',
        warn: '#B5680E',
        danger: '#C23A3A',
      },

      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      borderRadius: {
        card: '16px',
        pill: '999px',
      },

      boxShadow: {
        card: '0 1px 2px rgba(18,19,26,0.04)',
        raised: '0 6px 24px -8px rgba(18,19,26,0.18)',
        header: '0 1px 0 rgba(18,19,26,0.06)',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
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
        'fade-in': 'fade-in 0.3s ease-out both',
        'fade-up': 'fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
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
