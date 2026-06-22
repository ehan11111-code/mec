import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', 'bg-soft': 'var(--bg-soft)',
        surface: 'var(--surface)', 'surface-elev': 'var(--surface-elev)',
        border: 'var(--border)', 'border-strong': 'var(--border-strong)',
        text: 'var(--text)', 'text-soft': 'var(--text-soft)', muted: 'var(--muted)',
        accent: 'var(--accent)', 'accent-soft': 'var(--accent-soft)', 'accent-strong': 'var(--accent-strong)',
        success: 'var(--success)', 'success-soft': 'var(--success-soft)',
        warn: 'var(--warn)', 'warn-soft': 'var(--warn-soft)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'Manrope', '-apple-system', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', '-apple-system', 'sans-serif'],
        ar: ['var(--font-ar)', 'Segoe UI', 'sans-serif']
      },
      borderRadius: { soft: '14px', xl2: '20px' },
      boxShadow: { soft: 'var(--shadow-sm)', card: 'var(--shadow-md)', float: 'var(--shadow-lg)' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } }
      },
      animation: {
        'fade-up': 'fade-up 480ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 360ms ease both'
      }
    }
  },
  plugins: []
}

export default config
