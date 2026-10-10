/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // warm editorial canvas — pure white is reserved for elevated surfaces only
        canvas: { DEFAULT: '#FBFBF9', sunken: '#F6F6F4' },
        ink: { DEFAULT: '#111827', soft: '#1F2937' },
        // one disciplined accent: emerald = live / active / success
        accent: { DEFAULT: '#059669', soft: '#ECFDF5', deep: '#047857', line: '#A7F3D0', bright: '#10B981' },
        // semantic only (runtime errors) — never decorative
        danger: { DEFAULT: '#DC2626', soft: '#FEF2F2', deep: '#B91C1C', line: '#FECACA' }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(17,24,39,.05), 0 1px 1px rgba(17,24,39,.03)',
        card: '0 1px 2px rgba(17,24,39,.04), 0 10px 28px -14px rgba(17,24,39,.12)',
        pop: '0 14px 36px -14px rgba(17,24,39,.22), 0 2px 6px rgba(17,24,39,.05)'
      },
      keyframes: {
        softPulse: { '0%,100%': { opacity: '.5', transform: 'scale(1)' }, '50%': { opacity: '1', transform: 'scale(1.3)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } }
      },
      animation: { softPulse: 'softPulse 2s ease-in-out infinite', floaty: 'floaty 6s ease-in-out infinite', blink: 'blink 1.1s steps(1) infinite' }
    }
  },
  plugins: []
};
