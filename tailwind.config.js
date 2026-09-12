/**
 * 玻璃拟态大量使用 `border-white/12`、`bg-void-0/72` 这类精细透明度。
 * Tailwind 默认的透明度刻度只覆盖 5 的整数倍，因此这里补齐 0-100 的整数梯度；
 * 只有真正被 content 命中的类才会生成 CSS，不会带来体积负担。
 */
const opacityScale = Object.fromEntries(
  Array.from({ length: 101 }, (_, value) => [value, String(value / 100)]),
)

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      opacity: opacityScale,
      fontFamily: {
        sans: [
          '"Source Han Sans SC"',
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"Cascadia Mono"', 'Consolas', 'monospace'],
      },
      colors: {
        void: {
          0: '#070B18',
          1: '#0D1428',
          2: '#131C36',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          line: 'rgba(255,255,255,0.14)',
          strong: 'rgba(255,255,255,0.22)',
        },
        ink: {
          0: '#EAF0FF',
          1: '#8FA0C4',
          2: '#5A6785',
        },
        neon: {
          blue: '#6E8BFF',
          violet: '#A855F7',
          cyan: '#22D3EE',
          gold: '#F2B84B',
          ok: '#34D399',
          warn: '#FBBF24',
          danger: '#F87171',
          coral: '#FF6B5B',
          lime: '#4ADE80',
        },
        dim: {
          de: '#4ADE80',
          zhi: '#22D3EE',
          ti: '#FF6B5B',
          mei: '#A855F7',
          lao: '#F2B84B',
        },
      },
      borderRadius: {
        panel: '16px',
      },
      boxShadow: {
        glass: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 18px 48px rgba(2,6,20,0.55)',
        glow: '0 0 0 1px rgba(110,139,255,0.35), 0 0 28px rgba(110,139,255,0.28)',
        'glow-cyan': '0 0 0 1px rgba(34,211,238,0.4), 0 0 26px rgba(34,211,238,0.3)',
        'glow-gold': '0 0 0 1px rgba(242,184,75,0.45), 0 0 34px rgba(242,184,75,0.32)',
        'glow-violet': '0 0 0 1px rgba(168,85,247,0.4), 0 0 26px rgba(168,85,247,0.3)',
      },
      transitionTimingFunction: {
        'ease-out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(2.5%, -2%, 0)' },
          '100%': { transform: 'translate3d(0,0,0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(18px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'sweep': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to: { transform: 'translateY(100%)', opacity: '1' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(34,211,238,0.45)' },
          '70%': { boxShadow: '0 0 0 12px rgba(34,211,238,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(34,211,238,0)' },
        },
      },
      animation: {
        breathe: 'breathe 4.2s ease-in-out infinite',
        drift: 'drift 36s ease-in-out infinite',
        'fade-up': 'fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        sweep: 'sweep 1400ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
