/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Ember Dark Ops — Primary Palette
        primary: '#FF6600',
        'primary-light': '#FFB596',
        'primary-dim': '#FF8533',
        // Backgrounds
        background: '#131313',
        'bg-dim': '#0E0E0E',
        surface: '#1A1A1A',
        'surface-alt': '#201F1F',
        elevated: '#2A2A2A',
        'elevated-high': '#353534',
        // Text
        'on-surface': '#E5E2E1',
        'on-surface-muted': '#E3BFB1',
        'on-surface-dim': '#888888',
        // Borders
        outline: '#AA8A7D',
        'outline-subtle': '#5A4136',
        'border-default': '#333333',
        // Status
        success: '#10B981',
        'success-dim': '#065F46',
        danger: '#EF4444',
        'danger-dim': '#7F1D1D',
        warning: '#F59E0B',
        // Secondary
        secondary: '#C8C6C5',
        'secondary-container': '#474746',
      },
      fontFamily: {
        'hanken': ['HankenGrotesk', 'sans-serif'],
        'hanken-medium': ['HankenGrotesk-Medium', 'sans-serif'],
        'hanken-semibold': ['HankenGrotesk-SemiBold', 'sans-serif'],
        'hanken-bold': ['HankenGrotesk-Bold', 'sans-serif'],
        'hanken-extrabold': ['HankenGrotesk-ExtraBold', 'sans-serif'],
        'mono': ['JetBrainsMono', 'monospace'],
        'mono-medium': ['JetBrainsMono-Medium', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        'full': '9999px',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '40px',
      },
    },
  },
  plugins: [],
};
