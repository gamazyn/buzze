import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        buzze: {
          bg:       '#07060f',
          panel:    '#0d0b18',
          raised:   '#15122a',
          hover:    '#1e1a38',
          fg:       '#f0ecff',
          'fg-sub': '#b8b0d8',
          'fg-dim': '#6b6390',
          'fg-dis': '#3a3558',
          violet:   '#7c3aed',
          fuchsia:  '#c084fc',
          pink:     '#f0abfc',
          success:  '#3ee67a',
          danger:   '#ff4d6d',
          warn:     '#ffc857',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
        // aliases temporários para migração gradual
        arcade:  ['Syne', 'system-ui', 'sans-serif'],
        ui:      ['DM Sans', 'system-ui', 'sans-serif'],
        value:   ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'flip-in': 'flipIn 0.6s ease-in-out',
        'score-pop': 'scorePop 0.4s ease-out',
        'buzzer-pulse': 'buzzerPulse 1s ease-in-out infinite',
        'glow-breathe': 'glowBreathe 2s ease-in-out infinite',
        'winner-shimmer': 'winnerShimmer 2s ease-in-out infinite',
      },
      keyframes: {
        flipIn: {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        scorePop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        buzzerPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(124, 58, 237, 0.6), 0 10px 0 #3b0764' },
          '50%': { boxShadow: '0 0 0 20px rgba(124, 58, 237, 0), 0 10px 0 #3b0764' },
        },
        glowBreathe: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.03)' },
        },
        winnerShimmer: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(62,230,122,0.4)' },
          '50%': { boxShadow: '0 0 28px rgba(62,230,122,0.9)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
