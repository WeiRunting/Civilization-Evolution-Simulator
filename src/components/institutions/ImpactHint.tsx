import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { DIM_KEYS, DIM_META } from '../../sim/config'
import type { DimKey } from '../../sim/types'
import { formatDelta } from '../../utils/format'
import type { ImpactRow } from '../../utils/institutionMath'

const TONE_COLOR: Record<ImpactRow['better'], string> = {
  up: '#34D399',
  down: '#F87171',
  neutral: '#5A6785',
}

/**
 * 预估影响力标签组。
 * 数值来自 compareEffects（与引擎共用 projectEffects），所以这里显示的变化就是下一 tick 真实发生的变化。
 */
export function ImpactHint({
  rows,
  dimDrift,
  title = '预估影响力',
}: {
  rows: ImpactRow[]
  dimDrift?: Record<DimKey, number>
  title?: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label-xs">{title}</span>
        <span className="text-[11px] text-ink-2">相对当前制度的偏移</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((row) => {
          const color = TONE_COLOR[row.better]
          const Icon = row.better === 'up' ? TrendingUp : row.better === 'down' ? TrendingDown : Minus
          return (
            <span
              key={row.label}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px]"
              style={{ color, borderColor: `${color}44`, backgroundColor: `${color}14` }}
              title={`${row.label}：${row.display}`}
            >
              <Icon className="h-3 w-3" />
              {row.label}
              <span className="tabular font-mono">{row.display}</span>
            </span>
          )
        })}
      </div>

      {dimDrift && (
        <div className="mt-2.5">
          <p className="mb-1.5 text-[11px] text-ink-2">五维漂移方向（每年）</p>
          <div className="flex flex-wrap gap-1.5">
            {DIM_KEYS.map((key) => {
              const delta = dimDrift[key]
              const color = delta > 0.0001 ? DIM_META[key].color : delta < -0.0001 ? '#F87171' : '#5A6785'
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px]"
                  style={{ color, borderColor: `${color}3a`, backgroundColor: `${color}12` }}
                  title={`${DIM_META[key].label}：${dimDrift[key].toFixed(5)} / 年`}
                >
                  {DIM_META[key].label}
                  <span className="tabular font-mono">{formatDelta(delta, 3)}</span>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
