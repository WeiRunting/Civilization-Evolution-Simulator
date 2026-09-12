import type { CSSProperties, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export function GlassPanel({
  children,
  className,
  title,
  subtitle,
  actions,
  padded = true,
}: {
  children: ReactNode
  className?: string
  title?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  padded?: boolean
}) {
  return (
    <section className={twMerge('glass glass-hover', padded && 'p-4', className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[15px] font-semibold text-ink-0">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function SectionTitle({
  title,
  subtitle,
  right,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={twMerge('mb-3 flex items-end justify-between gap-3', className)}>
      <div>
        <h1 className="text-[22px] font-bold leading-tight text-ink-0">{title}</h1>
        {subtitle && <p className="mt-1 text-[12px] text-ink-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function NeonButton({
  children,
  onClick,
  active = false,
  variant = 'ghost',
  className,
  title,
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  variant?: 'ghost' | 'primary' | 'danger'
  className?: string
  title?: string
  disabled?: boolean
}) {
  const base = variant === 'ghost' ? 'btn-ghost' : 'btn-primary'
  const danger =
    variant === 'danger' ? 'border-neon-danger/40 text-neon-danger hover:border-neon-danger/70' : ''
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={twMerge(
        base,
        danger,
        active && 'shadow-glow-cyan border-white/30 bg-white/[0.12]',
        disabled && 'cursor-not-allowed opacity-45 hover:translate-y-0 hover:shadow-none',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Chip({
  children,
  active = false,
  onClick,
  className,
  title,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={twMerge('chip', active && 'chip-active', className)}
    >
      {children}
    </button>
  )
}

export function Tag({
  children,
  color,
  className,
}: {
  children: ReactNode
  color?: string
  className?: string
}) {
  if (!color) {
    return (
      <span
        className={twMerge(
          'inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[11px] text-ink-1',
          className,
        )}
      >
        {children}
      </span>
    )
  }
  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]',
        className,
      )}
      style={{
        color,
        borderColor: `${color}55`,
        backgroundColor: `${color}18`,
      }}
    >
      {children}
    </span>
  )
}

export function ProgressBar({
  value,
  color = '#6E8BFF',
  to,
  className,
  height = 6,
}: {
  value: number
  color?: string
  to?: string
  className?: string
  height?: number
}) {
  const percent = Math.max(0, Math.min(100, value * 100))
  const background = to ? `linear-gradient(90deg, ${color}, ${to})` : color
  return (
    <div
      className={twMerge('w-full overflow-hidden rounded-full bg-white/[0.09]', className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-ease-out-soft"
        style={{ width: `${percent}%`, background, boxShadow: `0 0 12px ${color}66` }}
      />
    </div>
  )
}

export function NeonSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  color = '#6E8BFF',
  glow,
  className,
  ariaLabel,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  color?: string
  glow?: string
  className?: string
  ariaLabel?: string
}) {
  const style = {
    '--slider-color': color,
    '--slider-glow': glow ?? `${color}88`,
  } as CSSProperties
  return (
    <input
      type="range"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className={twMerge('w-full', className)}
      style={style}
    />
  )
}

export function StatValue({
  value,
  unit,
  className,
  tone = 'plain',
}: {
  value: string
  unit?: string
  className?: string
  tone?: 'plain' | 'neon'
}) {
  return (
    <p className={twMerge('flex items-baseline gap-1', className)}>
      <span
        className={twMerge(
          'tabular font-mono text-[26px] font-semibold leading-none',
          tone === 'neon' ? 'neon-text' : 'text-ink-0',
        )}
      >
        {value}
      </span>
      {unit && <span className="text-[12px] text-ink-2">{unit}</span>}
    </p>
  )
}

/** 环形进度：用于道德内化强度、阶段完成度等单一比值展示 */
export function Ring({
  value,
  size = 118,
  stroke = 9,
  color = '#22D3EE',
  label,
  caption,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  label: string
  caption?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke-dashoffset 500ms' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular font-mono text-[20px] font-semibold text-ink-0">{label}</span>
        {caption && <span className="text-[11px] text-ink-2">{caption}</span>}
      </div>
    </div>
  )
}

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1 flex items-center justify-between">
      <span className="label-xs">{children}</span>
      {hint && <span className="text-[11px] text-ink-1">{hint}</span>}
    </div>
  )
}
