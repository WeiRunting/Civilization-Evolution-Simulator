import { Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import { deriveStage } from '../../sim/stages'
import { useWorldStore } from '../../store/useWorldStore'
import type { Speed } from '../../store/useWorldStore'
import { TICKS_PER_SECOND } from '../../hooks/useSimLoop'
import { Chip, NeonButton } from '../ui/Primitives'
import { formatSpan, formatStepCost } from '../../utils/format'

const SPEEDS: Speed[] = [1, 2, 5]

export function TimelineBar() {
  const world = useWorldStore((state) => state.world)
  const running = useWorldStore((state) => state.running)
  const speed = useWorldStore((state) => state.speed)
  const lastStepMs = useWorldStore((state) => state.lastStepMs)
  const toggleRunning = useWorldStore((state) => state.toggleRunning)
  const setSpeed = useWorldStore((state) => state.setSpeed)
  const tick = useWorldStore((state) => state.tick)
  const resetWorld = useWorldStore((state) => state.resetWorld)

  const stage = deriveStage(world.stageIndex)

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-center justify-between gap-3 border-t border-white/10 bg-void-0/78 px-3 backdrop-blur-xl md:px-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleRunning}
          title={running ? '暂停推演（空格）' : '开始推演（空格）'}
          className={
            running
              ? 'grid h-10 w-10 cursor-pointer place-items-center rounded-full text-void-0 shadow-glow transition-transform duration-200 hover:scale-105 active:scale-95'
              : 'grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-white/20 bg-white/[0.07] text-ink-0 transition-transform duration-200 hover:scale-105 hover:shadow-glow active:scale-95'
          }
          style={
            running
              ? { backgroundImage: `linear-gradient(120deg, ${stage.accentFrom}, ${stage.accentTo})` }
              : undefined
          }
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
          {SPEEDS.map((item) => (
            <Chip key={item} active={speed === item} onClick={() => setSpeed(item)}>
              {item}x
            </Chip>
          ))}
        </div>

        <NeonButton onClick={() => tick(1)} title="前进 1 个 tick（方向键右键）">
          <StepForward className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">单步</span>
        </NeonButton>
        <NeonButton variant="danger" onClick={() => resetWorld()} title="清空推演，从 2026 年重开">
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden md:inline">重置时间轴</span>
        </NeonButton>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="text-right">
          <p className="label-xs">当前纪元</p>
          <p className="tabular font-mono text-[15px] text-ink-0">{Math.round(world.year)} 年</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="label-xs">单步 = 1 tick</p>
          <p className="tabular font-mono text-[15px] text-neon-cyan">{formatSpan(world.yearsPerTick)}</p>
        </div>
        <div className="hidden text-right md:block">
          <p className="label-xs">推演节流</p>
          <p className="tabular font-mono text-[15px] text-ink-1">
            {TICKS_PER_SECOND[speed]} tick/s · {formatStepCost(lastStepMs)}
          </p>
        </div>
        <div className="hidden text-right lg:block">
          <p className="label-xs">文明指数</p>
          <p className="tabular font-mono text-[15px] text-ink-0">{world.civIndex.toFixed(1)}</p>
        </div>
      </div>
    </footer>
  )
}
