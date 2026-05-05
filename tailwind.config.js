/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design Brief §0 — Indigo primary
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // Slate — text/bg/dividers
        secondary: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        // Semantic
        success: { 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A' },
        warning: { 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706' },
        danger:  { 400: '#F87171', 500: '#EF4444', 600: '#DC2626' },
        info:    { 400: '#38BDF8', 500: '#0EA5E9', 600: '#0284C7' },
        // Dark mode backgrounds
        dark: {
          bg:       '#0B0F17',
          elevated: '#111827',
          divider:  '#1F2937',
        },
      },
      fontFamily: {
        sans:        ['Inter-Regular'],
        'sans-md':   ['Inter-Medium'],
        'sans-semi': ['Inter-SemiBold'],
        'sans-bold': ['Inter-Bold'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '2rem',
      },
      fontSize: {
        'h1':      ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'h2':      ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'h3':      ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body':    ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'caption': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'tiny':    ['11px', { lineHeight: '16px', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};
