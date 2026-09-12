import { ChevronRight, TrendingUp } from 'lucide-react'
import type { Tribe, WorldState } from '../../sim/types'
import { DIM_KEYS, DIM_META } from '../../sim/config'
import { formatLogNumber } from '../../sim/num'
import { institutionTendency } from '../../sim/institutions'
import { tribeCivIndex, tribeStage } from '../../utils/institutionMath'
import { ProgressBar, Tag } from '../ui/Primitives'

export function TribeCard({
  world,
  tribe,
  selected,
  onSelect,
  rank,
}: {
  world: WorldState
  tribe: Tribe
  selected: boolean
  onSelect: () => void
  rank?: number
}) {
  const stage = tribeStage(world, tribe)
  const tendency = institutionTendency(world, tribe)
  const civ = tribeCivIndex(world, tribe)
  const ascension = DIM_KEYS.reduce((acc, key) => acc + tribe.ascension[key], 0)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? 'glass w-full cursor-pointer border-white/28 p-3 text-left shadow-glow'
          : 'glass-soft w-full cursor-pointer p-3 text-left transition-all duration-300 ease-ease-out-soft hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]'
      }
      style={selected ? { borderColor: `${tribe.color}66`, boxShadow: `0 0 0 1px ${tribe.color}44, 0 0 26px ${tribe.color}33` } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: tribe.color, boxShadow: `0 0 10px ${tribe.color}` }}
          />
          <span className="truncate text-[14px] font-semibold text-ink-0">{tribe.name}</span>
          {rank !== undefined && (
            <span className="tabular font-mono text-[11px] text-ink-2">#{rank}</span>
          )}
        </div>
        <ChevronRight
          className={selected ? 'h-3.5 w-3.5 shrink-0 text-ink-0' : 'h-3.5 w-3.5 shrink-0 text-ink-2'}
        />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="tabular font-mono text-[17px] font-semibold text-ink-0">
          {formatLogNumber(tribe.logPopulation)}
        </p>
        <p className="text-[11px] text-ink-2">文明指数 {civ.toFixed(1)}</p>
      </div>

      <div className="mt-2 space-y-1">
        {DIM_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="w-3 text-[10px] leading-none"
              style={{ color: DIM_META[key].color }}
              title={DIM_META[key].desc}
            >
              {DIM_META[key].label}
            </span>
            <ProgressBar
              value={tribe.dims[key] / 100}
              color={DIM_META[key].color}
              height={4}
              className="flex-1"
            />
            <span className="tabular w-6 shrink-0 text-right font-mono text-[10px] text-ink-1">
              {Math.round(tribe.dims[key])}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Tag color={stage.accentFrom}>{stage.name}</Tag>
        <Tag>{tendency}</Tag>
        <Tag>星系 {formatLogNumber(tribe.logColonies)}</Tag>
        {ascension > 0 && (
          <Tag color="#A855F7">
            <TrendingUp className="mr-1 h-3 w-3" />超脱 {ascension}
          </Tag>
        )}
      </div>
    </button>
  )
}
