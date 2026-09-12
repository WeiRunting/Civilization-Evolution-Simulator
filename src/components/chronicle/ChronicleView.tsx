import { useMemo, useState } from 'react'
import { Compass, Sparkles, ScrollText } from 'lucide-react'
import type { EventLog, EventType } from '../../sim/types'
import { EVENT_META, EVENT_ORDER } from '../../sim/config'
import { useWorldStore } from '../../store/useWorldStore'
import { parseBigNumber } from '../../utils/format'
import { Chip, GlassPanel, NeonButton, SectionTitle, Tag } from '../ui/Primitives'

function EventRow({ entry }: { entry: EventLog }) {
  const meta = EVENT_META[entry.type]
  const divine = entry.type === 'divine'
  const stage = entry.type === 'stage'
  return (
    <article
      id={`chronicle-${entry.id}`}
      className="relative scroll-mt-[86px] pl-6"
    >
      <span
        className="absolute left-[7px] top-2 z-10 h-2.5 w-2.5 rounded-full ring-4 ring-void-0"
        style={{ backgroundColor: meta.color, boxShadow: `0 0 12px ${meta.color}` }}
      />
      {stage ? (
        <div
          className="mb-1 rounded-lg border px-3 py-1.5 text-[12px] font-medium"
          style={{
            borderColor: `${meta.color}55`,
            backgroundColor: `${meta.color}14`,
            color: meta.color,
          }}
        >
          {Math.round(entry.year)} 年 · {entry.title}
        </div>
      ) : (
        <div
          className="rounded-xl border p-3 transition-colors duration-200 hover:bg-white/[0.06]"
          style={{
            borderColor: divine ? 'rgba(242,184,75,0.42)' : 'rgba(255,255,255,0.10)',
            backgroundColor: divine ? 'rgba(242,184,75,0.06)' : 'rgba(255,255,255,0.03)',
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular font-mono text-[12px] text-ink-1">{Math.round(entry.year)} 年</span>
            <Tag color={meta.color}>{meta.label}</Tag>
            {divine && (
              <Tag color="#F2B84B">
                <Sparkles className="mr-1 h-3 w-3" />
                神谕干预
              </Tag>
            )}
            <h3 className="text-[13.5px] font-semibold text-ink-0">{entry.title}</h3>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-1">{entry.detail}</p>
        </div>
      )}
    </article>
  )
}

/** 编年史摘要流：供「俯瞰」视图与小屏引用，只渲染最近 limit 条 */
export function ChronicleStream({ limit = 10 }: { limit?: number }) {
  const chronicle = useWorldStore((state) => state.world.chronicle)
  const entries = useMemo(() => chronicle.slice(-limit).reverse(), [chronicle, limit])

  if (!entries.length) {
    return (
      <p className="rounded-lg border border-dashed border-white/15 p-4 text-center text-[12px] text-ink-2">
        推演开始后，神迹、立法与纪元跃迁都会写入这里。
      </p>
    )
  }

  return (
    <div className="relative space-y-2.5 before:absolute before:bottom-1 before:left-[11px] before:top-1 before:w-px before:bg-white/12">
      {entries.map((entry) => (
        <EventRow key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

/** 编年史视图：类型筛选、年份跳转与倒序事件流 */
export function ChronicleView() {
  const world = useWorldStore((state) => state.world)
  const [types, setTypes] = useState<EventType[]>([])
  const [yearDraft, setYearDraft] = useState('')
  const [onlyDivine, setOnlyDivine] = useState(false)

  const entries = useMemo(() => {
    const filtered = world.chronicle.filter((entry) => {
      if (onlyDivine && entry.type !== 'divine') return false
      if (types.length && !types.includes(entry.type)) return false
      return true
    })
    return filtered.slice().reverse()
  }, [world.chronicle, types, onlyDivine])

  const divineCount = world.chronicle.filter((entry) => entry.type === 'divine').length

  const toggleType = (key: EventType) => {
    setTypes((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }

  const jumpToYear = () => {
    const parsed = parseBigNumber(yearDraft)
    if (parsed === null || !entries.length) return
    let best = entries[0]
    let bestGap = Math.abs(best.year - parsed)
    for (const entry of entries) {
      const gap = Math.abs(entry.year - parsed)
      if (gap < bestGap) {
        best = entry
        bestGap = gap
      }
    }
    document.getElementById(`chronicle-${best.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const jumpToEdge = (edge: 'first' | 'last') => {
    const target = edge === 'first' ? entries[entries.length - 1] : entries[0]
    if (!target) return
    document.getElementById(`chronicle-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="space-y-3">
      <SectionTitle
        title="编年史"
        subtitle={`自 ${world.startYear} 年至今共记录 ${world.chronicle.length} 条事件，其中 ${divineCount} 条源自神谕干预。`}
        right={
          <Tag color="#F2B84B">
            <ScrollText className="mr-1 h-3 w-3" />
            倒序排列
          </Tag>
        }
      />

      <GlassPanel>
        <div className="flex flex-wrap items-center gap-1.5">
          {EVENT_ORDER.map((key) => (
            <Chip key={key} active={types.includes(key)} onClick={() => toggleType(key)}>
              <span
                className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: EVENT_META[key].color }}
              />
              {EVENT_META[key].label}
            </Chip>
          ))}
          <Chip active={onlyDivine} onClick={() => setOnlyDivine((prev) => !prev)}>
            只看神谕
          </Chip>
          {(types.length > 0 || onlyDivine) && (
            <Chip
              onClick={() => {
                setTypes([])
                setOnlyDivine(false)
              }}
            >
              清除筛选
            </Chip>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="field max-w-[220px]"
            value={yearDraft}
            placeholder="跳转年份，例如：12万"
            onChange={(event) => setYearDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') jumpToYear()
            }}
          />
          <NeonButton onClick={jumpToYear} title="滚动到最接近该年份的事件">
            <Compass className="h-3.5 w-3.5" />
            定位
          </NeonButton>
          <NeonButton onClick={() => jumpToEdge('first')} title="跳到最古老的一条记录">
            最早一条
          </NeonButton>
          <NeonButton onClick={() => jumpToEdge('last')} title="跳到最新的一条记录">
            最新一条
          </NeonButton>
          <span className="text-[11px] text-ink-2">当前筛选命中 {entries.length} 条</span>
        </div>
      </GlassPanel>

      {entries.length ? (
        <div className="relative space-y-2.5 pb-2 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-gradient-to-b before:from-transparent before:via-white/14 before:to-transparent">
          {entries.map((entry) => (
            <EventRow key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <GlassPanel>
          <p className="rounded-lg border border-dashed border-white/15 p-6 text-center text-[12px] text-ink-2">
            当前筛选条件下没有事件。放宽筛选，或让推演继续跑一段时间。
          </p>
        </GlassPanel>
      )}
    </div>
  )
}
