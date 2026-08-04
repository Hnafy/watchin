/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand red — refined Netflix-style scarlet with full ramp
        primary: {
          50: '#fff1f1', 100: '#ffe0e1', 200: '#ffc0c2', 300: '#ff9094',
          400: '#ff5258', 500: '#f61d27', 600: '#e50914', 700: '#c10711',
          800: '#9f0810', 900: '#7c0d13', 950: '#450a0e',
        },
        // Near-black surfaces tuned for cinema
        dark: {
          50: '#f5f5f5', 100: '#e7e7e7', 200: '#cfcfcf', 300: '#b0b0b0',
          400: '#8f8f8f', 500: '#6f6f70', 600: '#505052', 700: '#333338',
          800: '#1e1e22', 850: '#151518', 900: '#0e0e11', 925: '#0a0a0c', 950: '#050505',
        },
        // Ambient accents used for gradient glows
        aurora: {
          red: '#e50914',
          rose: '#ff5258',
          amber: '#ffb340',
          violet: '#7c3aed',
          teal: '#14b8a6',
        },
      },
      fontFamily: {
        sans: [
          'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto',
          '"Helvetica Neue", Arial, sans-serif',
        ],
        display: [
          'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto',
          '"Helvetica Neue", Arial, sans-serif',
        ],
      },
      borderRadius: {
        xs: '0.25rem', sm: '0.5rem', DEFAULT: '0.625rem', md: '0.75rem',
        lg: '1rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '2rem',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        'glass-lg': '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glow-red': '0 0 0 1px rgba(229,9,20,0.25), 0 8px 32px rgba(229,9,20,0.28), 0 0 24px rgba(229,9,20,0.12)',
        'glow-white': '0 0 0 1px rgba(255,255,255,0.08), 0 16px 48px rgba(0,0,0,0.55)',
        'soft': '0 4px 24px rgba(0,0,0,0.35)',
        'card': '0 2px 8px rgba(0,0,0,0.3), 0 16px 40px rgba(0,0,0,0.35)',
        'hero': '0 40px 120px rgba(0,0,0,0.7)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '6px',
        md: '12px',
        lg: '18px',
        xl: '25px',
        '2xl': '40px',
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(ellipse at center, transparent 0%, rgba(5,5,5,0.85) 100%)',
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
      },
      animation: {
        'aurora': 'aurora 14s ease-in-out infinite',
        'aurora-slow': 'aurora 22s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.6s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        'marquee': 'marquee 40s linear infinite',
        'gradient-x': 'gradientX 6s ease-in-out infinite',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'blink': 'blink 1.2s steps(2, start) infinite',
      },
      keyframes: {
        aurora: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '0.7' },
          '50%': { transform: 'translate3d(6%, -4%, 0) scale(1.15)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(229,9,20,0.5)' },
          '50%': { boxShadow: '0 0 28px 6px rgba(229,9,20,0.25)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-soft': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [],
};
