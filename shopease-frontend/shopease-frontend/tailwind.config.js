// tailwind.config.js — Tailwind CSS configuration for ShopEase
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '375px',   // Extra small devices (small phones)
      'sm': '640px',   // Small devices (large phones)
      'md': '768px',   // Medium devices (tablets)
      'lg': '1024px',  // Large devices (laptops)
      'xl': '1280px',  // Extra large devices (desktops)
      '2xl': '1536px', // 2X Extra large devices
    },
    extend: {
      colors: {
        primary: {
          50:  '#eeecff',
          100: '#d8d4ff',
          200: '#b8b0ff',
          300: '#9a8fff',
          400: '#8074ff',
          500: '#6c63ff', // main brand colour
          600: '#5a51f0',
          700: '#4840d6',
          800: '#3730b8',
          900: '#282094',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease',
        'scale-in':   'scaleIn 0.25s ease',
        'slide-in':   'slideIn 0.3s ease',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        slideIn: { from: { transform: 'translateX(100%)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      boxShadow: {
        'glow': '0 0 0 3px rgba(108,99,255,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.08)',
        'card-dark': '0 4px 24px rgba(0,0,0,0.4)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
    },
  },
  plugins: [],
};
