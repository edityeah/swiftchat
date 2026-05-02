/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'Google Sans', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#386AF6',
          dark: '#2755E3',
          light: '#EEF2FF',
          50: '#F4F6FA',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#F5F7FA',
          chat: '#F0F4FF',
        },
        txt: {
          primary: '#1A1F36',
          secondary: '#7383A5',
          tertiary: '#B8C0CC',
        },
        bdr: {
          DEFAULT: '#E8EDF5',
          light: '#F0F4FA',
        },
        ok: {
          DEFAULT: '#4CAF50',
          light: '#E8F5E9',
        },
        warn: {
          DEFAULT: '#FFB300',
          light: '#FFF8E1',
        },
        danger: {
          DEFAULT: '#E53935',
          light: '#FFEBEE',
        },
      },
      borderRadius: {
        pill: '50px',
        card: '16px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.10)',
        modal: '0 2px 10px rgba(0,0,0,0.12)',
        bottom: '0 -2px 8px rgba(0,0,0,0.06)',
        canvas: '-4px 0 20px rgba(0,0,0,0.12)',
      },
      animation: {
        'slide-in': 'slideIn 0.26s cubic-bezier(0.4,0,0.2,1)',
        'fade-in': 'fadeIn 0.18s ease',
        'bubble-in': 'bubbleIn 0.18s ease',
        'pulse-ring': 'pulseRing 1.3s ease infinite',
        pop: 'pop 0.4s cubic-bezier(0.16,1,0.3,1)',
        typing: 'typing 0.9s infinite',
        wave: 'wave 0.8s ease-in-out infinite',
        live: 'liveDot 1.4s infinite',
        progress: 'progressFill 2s ease forwards',
        'canvas-slide': 'canvasSlide 0.3s cubic-bezier(0.4,0,0.2,1)',
        spin: 'spin 0.5s linear infinite',
      },
      keyframes: {
        slideIn: { from: { transform: 'translateX(100%)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        bubbleIn: { from: { opacity: '0', transform: 'translateY(7px)' }, to: { opacity: '1', transform: 'none' } },
        pulseRing: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(56,106,246,0.28)' },
          '50%': { boxShadow: '0 0 0 14px transparent' },
        },
        pop: { from: { transform: 'scale(0)' }, to: { transform: 'scale(1)' } },
        typing: {
          '0%,60%,100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        wave: {
          '0%,100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        liveDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.2' } },
        progressFill: { from: { width: '0%' }, to: { width: '100%' } },
        canvasSlide: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
