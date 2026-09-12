import { Pencil, Power, Sparkles, Trash2 } from 'lucide-react'
import { INST_CATEGORY_META, INST_STAGE_META } from '../../sim/config'
import type { LawItem, WorldState } from '../../sim/types'
import { NeonButton, Tag } from '../ui/Primitives'

function scopeLabel(law: LawItem, world: WorldState): string {
  if (law.scope === 'all') return '全体文明体'
  const names = law.scope
    .map((id) => world.tribes.find((tribe) => tribe.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  return names.length ? names.join('、') : '原适用文明体已消亡'
}

/** 律法卡片：类别色竖条 + 严苛度 / 执行率双进度条 + 立法缘由全文 */
export function LawCard({
  law,
  world,
  selected = false,
  onEdit,
  onToggle,
  onRemove,
}: {
  law: LawItem
  world: WorldState
  selected?: boolean
  onEdit: () => void
  onToggle: () => void
  onRemove: () => void
}) {
  const category = INST_CATEGORY_META[law.category]
  const stage = INST_STAGE_META[law.stageTag]

  return (
    <article
      className="group relative overflow-hidden rounded-xl border bg-white/[0.03] pl-4 pr-3 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07]"
      style={{
        borderColor: selected ? `${category.color}88` : 'rgba(255,255,255,0.10)',
        opacity: law.isActive ? 1 : 0.58,
        boxShadow: selected ? `0 0 22px ${category.color}33` : undefined,
      }}
    >
      <span
        className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full"
        style={{
          backgroundColor: category.color,
          opacity: law.isActive ? 1 : 0.35,
          boxShadow: law.isActive ? `0 0 10px ${category.color}` : undefined,
        }}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <h3
          className={
            law.isActive ? 'text-[13.5px] font-semibold text-ink-0' : 'text-[13.5px] font-semibold text-ink-1 line-through'
          }
        >
          {law.title}
        </h3>
        <Tag color={category.color}>{category.label}</Tag>
        <Tag color={stage.color}>{stage.label}纪元</Tag>
        {law.customByGod && (
          <Tag color="#F2B84B">
            <Sparkles className="mr-1 h-3 w-3" />
            神谕增订
          </Tag>
        )}
        {!law.isActive && <Tag color="#5A6785">已废止</Tag>}
      </div>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-ink-2">严苛度</span>
            <span className="tabular font-mono text-ink-0">{law.strictness.toFixed(0)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.09]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, law.strictness))}%`,
                background: `linear-gradient(90deg, ${category.color}, #F2B84B)`,
                boxShadow: `0 0 10px ${category.color}66`,
              }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-ink-2">执行率</span>
            <span className="tabular font-mono text-ink-0">{law.enforcement.toFixed(0)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.09]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, law.enforcement))}%`,
                background: 'linear-gradient(90deg, #22D3EE, #6E8BFF)',
                boxShadow: '0 0 10px rgba(34,211,238,0.4)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Tag>{scopeLabel(law, world)}</Tag>
        <Tag>第 {Math.round(law.enactedYear)} 年生效</Tag>
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-1">{law.originReason}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
        <NeonButton onClick={onEdit} title="编辑这条律法并即时看到预估影响力">
          <Pencil className="h-3.5 w-3.5" />
          编辑
        </NeonButton>
        <NeonButton onClick={onToggle} title={law.isActive ? '停止施行（条文保留在编年史中）' : '重新施行'}>
          <Power className="h-3.5 w-3.5" />
          {law.isActive ? '废止' : '恢复'}
        </NeonButton>
        <NeonButton variant="danger" onClick={onRemove} title="把这条律法从法典中删除">
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </NeonButton>
      </div>
    </article>
  )
}
