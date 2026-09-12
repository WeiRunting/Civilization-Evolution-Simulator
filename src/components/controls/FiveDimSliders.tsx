import { ArrowDown, ArrowUp, Minus, Sparkles } from 'lucide-react'
import type { Ascension, DimKey, FiveDims } from '../../sim/types'
import { DIM_KEYS, DIM_META } from '../../sim/config'
import { useWorldStore } from '../../store/useWorldStore'
import { projectEffects } from '../../sim/institutions'
import { FieldLabel, NeonSlider, ProgressBar, Tag } from '../ui/Primitives'

const ZERO: Ascension = { de: 0, zhi: 0, ti: 0, mei: 0, lao: 0 }

/**
 * 五维滑块组：作用域为「全体人类」时显示加权均值，
 * 作用于单一文明体时直接改写它的五维，并同步把代表个体向新均值牵引。
 */
export function FiveDimSliders() {
  const world = useWorldStore((state) => state.world)
  const scope = useWorldStore((state) => state.scope)
  const god = useWorldStore((state) => state.god)

  const alive = world.tribes.filter((tribe) => tribe.alive)
  const target = scope === 'all' ? null : alive.find((tribe) => tribe.id === scope) ?? null

  const values = { ...ZERO } as unknown as FiveDims
  for (const key of DIM_KEYS) {
    values[key] = alive.length
      ? alive.reduce((acc, tribe) => acc + tribe.dims[key], 0) / alive.length
      : 0
  }
  const shown: FiveDims = target ? target.dims : values

  const ascension = { ...ZERO }
  for (const key of DIM_KEYS) {
    ascension[key] = target
      ? target.ascension[key]
      : alive.length
        ? Math.round(alive.reduce((acc, tribe) => acc + tribe.ascension[key], 0) / alive.length)
        : 0
  }

  const reference = target ?? alive[0]
  const effects = reference ? projectEffects(world, reference) : null
  const scopeName = target ? target.name : '全体文明体'

  const apply = (key: DimKey, value: number) => {
    god({ kind: 'setDims', scope, dims: { [key]: value } as Partial<FiveDims> })
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-ink-0">五维调控</h3>
          <p className="text-[11px] text-ink-2">作用域：{scopeName}</p>
        </div>
        {!target && <Tag color="#22D3EE">全体均值</Tag>}
      </div>

      {DIM_KEYS.map((key) => {
        const meta = DIM_META[key]
        const drift = effects ? effects.dimDrift[key] : 0
        const DriftIcon = drift > 0.002 ? ArrowUp : drift < -0.002 ? ArrowDown : Minus
        const driftColor = drift > 0.002 ? '#4ADE80' : drift < -0.002 ? '#F87171' : '#5A6785'
        return (
          <div key={key}>
            <FieldLabel
              hint={
                <span className="flex items-center gap-1.5">
                  <span className="tabular font-mono text-ink-0">{shown[key].toFixed(1)}</span>
                  <span className="flex items-center gap-0.5" title="当前制度对该维的漂移推力">
                    <DriftIcon className="h-3 w-3" style={{ color: driftColor }} />
                    <span className="tabular font-mono" style={{ color: driftColor }}>
                      {drift >= 0 ? '+' : ''}
                      {drift.toFixed(3)}
                    </span>
                  </span>
                </span>
              }
            >
              <span style={{ color: meta.color }}>
                {meta.label} · {meta.influence}
              </span>
            </FieldLabel>
            <NeonSlider
              value={shown[key]}
              color={meta.color}
              glow={meta.glow}
              ariaLabel={`${meta.label}维`}
              onChange={(value) => apply(key, value)}
            />
            <div className="mt-1 flex items-center gap-2">
              <ProgressBar value={shown[key] / 100} color={meta.color} height={4} className="flex-1" />
              {ascension[key] > 0 && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full border border-neon-violet/45 bg-neon-violet/12 px-1.5 py-0.5 text-[10px] text-neon-violet"
                  title={`${meta.label}维已完成 ${ascension[key]} 次升维，效能按指数放大`}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  超脱 {ascension[key]}
                </span>
              )}
            </div>
          </div>
        )
      })}

      <p className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-[11px] leading-relaxed text-ink-2">
        拖动滑块即刻改写该文明体的五维，但制度、承载上限与人口压力会在随后数十年里把曲线拉回它自己的轨道。
        任一维触顶且科技达标时会触发「升维」，以指数效能换取新的 0-100 手感。
      </p>
    </div>
  )
}
