/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        alabaster: { 50: '#FCFBF8', 100: '#F7F5F0', 200: '#EFECE4', 300: '#E3DFD4', 400: '#D2CDBF' },
        ink: { DEFAULT: '#14151A', soft: '#23252D', mute: '#4B4E59' },
        steel: { 100: '#E9ECEF', 200: '#D3D8DE', 300: '#B3BAC4', 400: '#8A94A0', 500: '#6B7683', 600: '#515B67' },
        sage: { DEFAULT: '#5F9C80', soft: '#E3EFE8', deep: '#3E6F58', line: '#BBD6C8' },
        coral: { DEFAULT: '#DE6A5F', soft: '#FAE8E5', deep: '#B24A41', line: '#F0C1BB' }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Inter Tight"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Iowan Old Style', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      boxShadow: {
        glass: '0 1px 0 rgba(255,255,255,.85) inset, 0 24px 48px -28px rgba(20,21,26,.28), 0 2px 8px rgba(20,21,26,.04)',
        lift: '0 1px 0 rgba(255,255,255,.9) inset, 0 34px 60px -30px rgba(20,21,26,.34), 0 4px 14px rgba(20,21,26,.06)',
        pill: '0 1px 0 rgba(255,255,255,.28) inset, 0 -1px 0 rgba(0,0,0,.35) inset, 0 10px 24px -10px rgba(20,21,26,.55)'
      },
      keyframes: {
        softPulse: { '0%,100%': { opacity: '.55', transform: 'scale(1)' }, '50%': { opacity: '1', transform: 'scale(1.35)' } },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } }
      },
      animation: { softPulse: 'softPulse 2.2s ease-in-out infinite', floaty: 'floaty 7s ease-in-out infinite', shimmer: 'shimmer 3s linear infinite' }
    }
  },
  plugins: []
};
