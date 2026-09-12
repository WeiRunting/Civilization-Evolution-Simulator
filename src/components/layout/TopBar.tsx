import { BookOpen, Globe2, Radar, RotateCcw, ScrollText, Sparkles, Save, Upload } from 'lucide-react'
import { deriveStage, stageProgress } from '../../sim/stages'
import { formatLogNumber } from '../../sim/num'
import { totalLogPopulation } from '../../sim/stages'
import { useWorldStore } from '../../store/useWorldStore'
import type { ViewKey } from '../../store/useWorldStore'
import { NeonButton, Tag } from '../ui/Primitives'

const VIEWS: Array<{ key: ViewKey; label: string; icon: typeof Globe2 }> = [
  { key: 'overview', label: '俯瞰', icon: Radar },
  { key: 'galaxy', label: '疆域星图', icon: Globe2 },
  { key: 'codex', label: '天条', icon: BookOpen },
  { key: 'chronicle', label: '编年史', icon: ScrollText },
]

export function TopBar() {
  const world = useWorldStore((state) => state.world)
  const view = useWorldStore((state) => state.view)
  const setView = useWorldStore((state) => state.setView)
  const save = useWorldStore((state) => state.save)
  const load = useWorldStore((state) => state.load)
  const resetWorld = useWorldStore((state) => state.resetWorld)

  const stage = deriveStage(world.stageIndex)
  const progress = stageProgress(world.civIndex)
  const popLog = totalLogPopulation(world)
  const activeLaws = world.laws.filter((law) => law.isActive).length

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-[56px] items-center justify-between gap-3 border-b border-white/10 bg-void-0/72 px-3 backdrop-blur-xl md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative grid h-9 w-9 shrink-0 place-items-center">
          <span className="absolute inset-0 rounded-full border border-white/20 animate-breathe" />
          <Sparkles className="relative h-4 w-4 text-neon-cyan" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-none">
            <span className="neon-text">文明进化模拟器</span>
          </p>
          <p className="mt-1 truncate text-[11px] text-ink-2">
            自 2026 年当代人类社会起算 · 无上限推演
          </p>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex">
        <Tag className="border-white/20 bg-white/[0.08] text-ink-0">
          <span className="tabular font-mono">{Math.round(world.year)}</span> 年
        </Tag>
        <Tag color={stage.accentFrom}>{stage.name}</Tag>
        <Tag color={stage.accentTo}>K = {stage.kardashev.toFixed(2)}</Tag>
        <Tag>
          总人口 <span className="tabular font-mono text-ink-0">{formatLogNumber(popLog)}</span>
        </Tag>
        <Tag>
          施行律法 <span className="tabular font-mono text-ink-0">{activeLaws}</span>
        </Tag>
        <div className="hidden w-[120px] items-center gap-2 xl:flex">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${Math.round(progress * 100)}%`,
                backgroundImage: `linear-gradient(90deg, ${stage.accentFrom}, ${stage.accentTo})`,
              }}
            />
          </div>
          <span className="tabular font-mono text-[11px] text-ink-2">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <nav className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1 md:flex">
          {VIEWS.map((item) => {
            const Icon = item.icon
            const active = view === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                className={
                  active
                    ? 'flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium text-void-0 shadow-glow'
                    : 'flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] text-ink-1 transition-colors duration-200 hover:text-ink-0'
                }
                style={
                  active
                    ? { backgroundImage: `linear-gradient(92deg, ${stage.accentFrom}, ${stage.accentTo})` }
                    : undefined
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            )
          })}
        </nav>
        <NeonButton onClick={save} title="把当前世界写入浏览器本地存档">
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">存档</span>
        </NeonButton>
        <NeonButton onClick={load} title="读取本地存档">
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">读档</span>
        </NeonButton>
        <NeonButton
          variant="danger"
          onClick={() => resetWorld()}
          title="清空当前推演，从 2026 年重新开始"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">重置</span>
        </NeonButton>
      </div>
    </header>
  )
}
