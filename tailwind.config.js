/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#121317',
        surface: '#1B1D24',
        surfaceRaised: '#22242D',
        border: '#2A2D37',
        text: '#E8E6E1',
        textMuted: '#8B8D97',
        accent: '#C9A05C',
        accentMuted: '#8A6F3F',
        danger: '#C4645A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
        data: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        cell: '4px',
        card: '10px',
      },
      boxShadow: {
        inset: 'inset 0 1px 2px rgba(0,0,0,0.35)',
        card: '0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};
