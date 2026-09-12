import { Infinity as InfinityIcon, Lock, Unlock } from 'lucide-react'
import { ALL_BASE_STAGES, deriveStage, stageProgress } from '../../sim/stages'
import { formatSpan } from '../../utils/format'
import { useWorldStore } from '../../store/useWorldStore'
import { GlassPanel, ProgressBar, Tag } from '../ui/Primitives'

/**
 * 文明等级阶梯：预设八级 + 两条公式外推节点。
 * 已达成节点亮起，当前节点脉冲呼吸，末端节点文案明确写着「此后阶梯由公式续写」。
 */
export function StageProgress() {
  const world = useWorldStore((state) => state.world)
  const stage = deriveStage(world.stageIndex)
  const progress = stageProgress(world.civIndex)
  const next = deriveStage(world.stageIndex + 1)

  const ladder = [...ALL_BASE_STAGES.slice(0, 8), deriveStage(8), deriveStage(9)]
  const unlockPools = [
    '宪法 · 民法 · 劳动法 · 环保法 · 国际公约',
    'AI 伦理法 · 数据主权条例 · 意识权宣言',
    '气候工程法 · 轨道资源法 · 全球税收公约',
    '戴森云工程条例 · 行星改造许可 · 恒星系航行法',
    '星际战争法 · 曲率通道管制 · 文明接触公约',
    '星系贸易法典 · 银河疆界协定 · 机器人法则',
    '银河法典 · 心理史学监管 · 帝国继承法',
    '实体边界解除条例 · 意识编辑伦理 · 织网宪章',
    '超脱层法典 · 时空测绘条例',
    'Ω 层法典 · 语言之外的法',
  ]

  return (
    <GlassPanel
      title="文明等级阶梯"
      subtitle={`当前：${stage.name} · 卡尔达肖夫指数 K = ${stage.kardashev.toFixed(2)} · 单步 ${formatSpan(
        world.yearsPerTick,
      )}`}
      actions={
        <Tag color={stage.accentTo}>
          <Unlock className="mr-1 h-3 w-3" />
          本阶段制度池
        </Tag>
      }
    >
      <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
        {ladder.map((item, index) => {
          const done = index < world.stageIndex
          const active = index === world.stageIndex
          return (
            <div
              key={item.index}
              className="min-w-[104px] flex-1 rounded-xl border px-2.5 py-2 transition-all duration-300"
              style={{
                borderColor: active ? `${item.accentFrom}88` : 'rgba(255,255,255,0.10)',
                backgroundColor: active
                  ? `${item.accentFrom}1a`
                  : done
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(255,255,255,0.02)',
                boxShadow: active ? `0 0 24px ${item.accentFrom}33` : 'none',
                opacity: done || active ? 1 : 0.55,
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className="tabular font-mono text-[11px]"
                  style={{ color: done || active ? item.accentFrom : '#5A6785' }}
                >
                  Lv.{index + 1}
                </span>
                {done ? (
                  <Unlock className="h-3 w-3" style={{ color: item.accentFrom }} />
                ) : active ? (
                  <span
                    className="h-2 w-2 animate-pulse-ring rounded-full"
                    style={{ backgroundColor: item.accentFrom }}
                  />
                ) : (
                  <Lock className="h-3 w-3 text-ink-2" />
                )}
              </div>
              <p className="mt-1 truncate text-[12px] font-medium text-ink-0" title={item.name}>
                {item.name}
              </p>
              <p className="tabular mt-0.5 font-mono text-[10px] text-ink-2">
                K {item.kardashev.toFixed(2)} · {formatSpan(item.yearsPerTick)}/步
              </p>
            </div>
          )
        })}
        <div className="flex min-w-[110px] flex-1 items-center justify-center gap-1 rounded-xl border border-dashed border-neon-violet/40 bg-neon-violet/8 px-2.5 py-2 text-[11px] text-neon-violet">
          <InfinityIcon className="h-3.5 w-3.5" />
          此后阶梯由公式续写
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-ink-2">
              到「{next.name}」还需文明指数{' '}
              <span className="tabular font-mono text-ink-0">
                +{Math.max(0, next.minCivIndex - world.civIndex).toFixed(1)}
              </span>
            </span>
            <span className="tabular font-mono text-ink-1">{Math.round(progress * 100)}%</span>
          </div>
          <ProgressBar value={progress} color={stage.accentFrom} to={stage.accentTo} height={8} />
        </div>
        <p className="hidden w-[280px] shrink-0 text-[11px] leading-relaxed text-ink-2 xl:block">
          已解锁制度池：{unlockPools[Math.min(world.stageIndex, unlockPools.length - 1)]}
        </p>
      </div>

      <p className="mt-2.5 text-[11px] leading-relaxed text-ink-2">{stage.description}</p>
    </GlassPanel>
  )
}
