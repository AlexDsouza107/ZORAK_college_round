/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // deep, slightly blue-tinted near-black canvas; cards are lifted panels, never pure white
        canvas: { DEFAULT: '#06070B', sunken: '#05060A' },
        panel: { DEFAULT: '#0D1017', raised: '#121621' },
        // primary CTAs invert on dark: bright ink with canvas-coloured text
        ink: { DEFAULT: '#F3F5F9', soft: '#E2E6EE' },
        // the neutral scale is inverted for dark mode: 50 = recess, 900 = headline white
        neutral: { 50: '#12161F', 100: '#171C27', 200: '#232A38', 300: '#323B4D', 400: '#566075', 500: '#8A93A6', 600: '#A6AEBE', 700: '#BEC5D2', 800: '#D8DDE6', 900: '#F3F5F9', 950: '#05060A' },
        // one disciplined accent: emerald = live / active / success
        accent: { DEFAULT: '#10B981', soft: '#0C2A22', deep: '#34D399', line: '#15523F', bright: '#34D399' },
        // semantic only (runtime errors) — never decorative
        danger: { DEFAULT: '#F2555C', soft: '#2A1215', deep: '#FCA5A5', line: '#5C2227' }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      boxShadow: {
        subtle: '0 1px 0 rgba(255,255,255,.04) inset, 0 1px 2px rgba(0,0,0,.5)',
        card: '0 1px 0 rgba(255,255,255,.05) inset, 0 24px 60px -28px rgba(0,0,0,.85)',
        pop: '0 1px 0 rgba(255,255,255,.06) inset, 0 28px 70px -24px rgba(0,0,0,.9), 0 0 0 1px rgba(16,185,129,.12)',
        glow: '0 0 0 1px rgba(16,185,129,.35), 0 0 40px -6px rgba(16,185,129,.35)'
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
