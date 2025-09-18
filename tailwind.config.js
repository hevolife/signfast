/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-bottom': 'slideInFromBottom 0.6s ease-out',
        'slide-in-top': 'slideInFromTop 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInFromBottom: {
          from: { 
            opacity: '0',
            transform: 'translateY(20px)',
          },
          to: { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInFromTop: {
          from: { 
            opacity: '0',
            transform: 'translateY(-20px)',
          },
          to: { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
};