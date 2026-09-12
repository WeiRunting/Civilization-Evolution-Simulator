import { Pencil, Power, Sparkles, Trash2 } from 'lucide-react'
import { DIM_META, INST_STAGE_META } from '../../sim/config'
import type { MoralItem } from '../../sim/types'
import { NeonButton, Tag } from '../ui/Primitives'

const CONFLICT_COLOR = '#FF6B5B'

function bindMeta(moral: MoralItem): { label: string; color: string; hint: string } {
  if (moral.bindDim === 'conflict') {
    return { label: '冲突抑制', color: CONFLICT_COLOR, hint: '抑制族群间的暴力倾向与开战概率' }
  }
  const meta = DIM_META[moral.bindDim]
  return { label: `绑定${meta.label}维`, color: meta.color, hint: `持续把${meta.label}维向该准则的方向漂移` }
}

/** 道德准则卡片：绑定维度 + 内化强度 / 普及率双条 + 起源缘由 */
export function MoralCard({
  moral,
  onEdit,
  onToggle,
  onRemove,
}: {
  moral: MoralItem
  onEdit: () => void
  onToggle: () => void
  onRemove: () => void
}) {
  const bind = bindMeta(moral)
  const stage = INST_STAGE_META[moral.stageTag]
  const widespread = moral.prevalence >= 55

  return (
    <article
      className={
        widespread
          ? 'group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07]'
          : 'group relative overflow-hidden rounded-xl border border-dashed border-white/18 bg-white/[0.02] px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.06]'
      }
      style={{ opacity: moral.isActive ? 1 : 0.58, boxShadow: widespread ? `inset 0 0 0 1px ${bind.color}14` : undefined }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <h3
          className={
            moral.isActive ? 'text-[13.5px] font-semibold text-ink-0' : 'text-[13.5px] font-semibold text-ink-1 line-through'
          }
        >
          {moral.title}
        </h3>
        <Tag color={bind.color}>{bind.label}</Tag>
        <Tag color={stage.color}>{stage.label}纪元</Tag>
        {!widespread && <Tag color="#5A6785">尚未普遍内化</Tag>}
        {moral.customByGod && (
          <Tag color="#F2B84B">
            <Sparkles className="mr-1 h-3 w-3" />
            神谕修订
          </Tag>
        )}
        {!moral.isActive && <Tag color="#5A6785">已停止传承</Tag>}
      </div>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-ink-2">内化强度</span>
            <span className="tabular font-mono text-ink-0">{moral.strength.toFixed(0)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.09]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, moral.strength))}%`,
                background: `linear-gradient(90deg, ${bind.color}, #A855F7)`,
                boxShadow: `0 0 10px ${bind.color}66`,
              }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-ink-2">普及率</span>
            <span className="tabular font-mono text-ink-0">{moral.prevalence.toFixed(0)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.09]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(0, Math.min(100, moral.prevalence))}%`,
                background: 'linear-gradient(90deg, #A78BFA, #22D3EE)',
                boxShadow: '0 0 10px rgba(167,139,250,0.45)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Tag>第 {Math.round(moral.originYear)} 年起流传</Tag>
        <Tag>{bind.hint}</Tag>
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-1">{moral.originReason}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
        <NeonButton onClick={onEdit} title="改写这条道德准则并即时看到预估影响力">
          <Pencil className="h-3.5 w-3.5" />
          编辑
        </NeonButton>
        <NeonButton onClick={onToggle} title={moral.isActive ? '停止传承（准则会退出道德结构）' : '重新传承'}>
          <Power className="h-3.5 w-3.5" />
          {moral.isActive ? '停止传承' : '恢复传承'}
        </NeonButton>
        <NeonButton variant="danger" onClick={onRemove} title="把这条道德准则从道德体系中删除">
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </NeonButton>
      </div>
    </article>
  )
}
