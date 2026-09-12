import { useEffect, useRef, useState } from 'react'
import { Activity, Brain, Heart, Users } from 'lucide-react'
import { DIM_KEYS } from '../../sim/config'
import { formatLogNumber, formatPercent } from '../../sim/num'
import { totalLogPopulation } from '../../sim/stages'
import { useWorldStore } from '../../store/useWorldStore'
import { GlassPanel } from '../ui/Primitives'

/** 数值滚动递增：只在数值变化时做一次 420ms 补间，避免逐帧抖动 */
function useTween(value: number, duration = 420): number {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (value - from) * eased
      setDisplay(next)
      if (t < 1) {
        rafRef.current = window.requestAnimationFrame(step)
      } else {
        fromRef.current = value
      }
    }
    rafRef.current = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return display
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  caption,
  color,
}: {
  icon: typeof Users
  label: string
  value: string
  unit?: string
  caption: string
  color: string
}) {
  return (
    <GlassPanel padded={false} className="p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="label-xs">{label}</span>
        <span
          className="grid h-7 w-7 place-items-center rounded-lg"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="tabular font-mono text-[26px] font-semibold leading-none text-ink-0">
          {value}
        </span>
        {unit && <span className="text-[12px] text-ink-2">{unit}</span>}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-2">{caption}</p>
    </GlassPanel>
  )
}

export function StatCards() {
  const world = useWorldStore((state) => state.world)
  const alive = world.tribes.filter((tribe) => tribe.alive)

  const popLog = totalLogPopulation(world)
  const dimAvg = DIM_KEYS.reduce((acc, key) => {
    if (!alive.length) return acc
    return acc + alive.reduce((sum, tribe) => sum + tribe.dims[key], 0) / alive.length
  }, 0) / DIM_KEYS.length
  const techAvg = alive.length ? alive.reduce((acc, tribe) => acc + tribe.tech, 0) / alive.length : 0
  const happyAvg = alive.length
    ? alive.reduce((acc, tribe) => acc + tribe.happiness, 0) / alive.length
    : 0

  const popTween = useTween(popLog)
  const dimTween = useTween(dimAvg)
  const techTween = useTween(techAvg)
  const happyTween = useTween(happyAvg)

  const topTribe = alive.slice().sort((a, b) => b.logPopulation - a.logPopulation)[0]
  const share = topTribe && popLog > 0 ? Math.pow(10, topTribe.logPopulation - popLog) : 0

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard
        icon={Users}
        label="总人口"
        value={formatLogNumber(popTween)}
        caption={
          topTribe
            ? `${topTribe.name} 占全体的 ${formatPercent(share, 1)}，是当前人口规模最大的文明体。`
            : '所有文明体均已消亡，历史在此停笔。'
        }
        color="#6E8BFF"
      />
      <StatCard
        icon={Activity}
        label="五维综合分"
        value={dimTween.toFixed(1)}
        unit="/ 100"
        caption="德智体美劳的加权均值，决定文明指数中「人」的那一部分。"
        color="#34D399"
      />
      <StatCard
        icon={Brain}
        label="科技指数"
        value={techTween.toFixed(1)}
        caption="科技累积驱动阶段跃迁与承载上限，是长时段推演的主导变量。"
        color="#22D3EE"
      />
      <StatCard
        icon={Heart}
        label="幸福指数"
        value={happyTween.toFixed(1)}
        unit="/ 100"
        caption="由美维、德行、粮食与制度苛政共同决定，压低起义风险。"
        color="#A855F7"
      />
    </div>
  )
}
