/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sampled from logo.jpg: the mark is a deep violet at hue ~255deg.
        // brand-800 matches the logo's core; every shade from 500 up clears
        // WCAG AA (4.5:1) against white text, which the buttons rely on.
        brand: {
          50: '#f5f2fc',
          100: '#ebe6f9',
          200: '#d7cef3',
          300: '#baabe7',
          400: '#9883d8',
          500: '#795ec9',
          600: '#5b3bba',
          700: '#492e99',
          800: '#3a2678',
          900: '#2e1f5c',
        },
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        // Sweeps a highlight across a placeholder while content loads.
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
        // A soft halo, for badges that mean "something is happening now".
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(121,94,201,.45)' },
          '70%': { boxShadow: '0 0 0 8px rgba(121,94,201,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(121,94,201,0)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        fadeIn: 'fadeIn 150ms ease-out',
        fadeUp: 'fadeUp 500ms cubic-bezier(.22,1,.36,1) both',
        scaleIn: 'scaleIn 300ms cubic-bezier(.22,1,.36,1) both',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 1.4s linear infinite',
        pulseRing: 'pulseRing 2s ease-out infinite',
        pop: 'pop 300ms ease-out',
      },
    },
  },
  plugins: [],
};
