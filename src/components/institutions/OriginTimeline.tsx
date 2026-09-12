import { useMemo, useState } from 'react'
import { GitCompare, Sparkles, X } from 'lucide-react'
import { INST_STAGE_META } from '../../sim/config'
import { deriveStage } from '../../sim/stages'
import type { InstStageTag } from '../../sim/types'
import { useWorldStore } from '../../store/useWorldStore'
import { parseBigNumber } from '../../utils/format'
import { Chip, NeonButton, Tag } from '../ui/Primitives'

interface TimelineEntry {
  id: string
  kind: 'law' | 'moral'
  title: string
  year: number
  stageTag: InstStageTag
  customByGod: boolean
  isActive: boolean
  reason: string
  metricA: { label: string; value: number }
  metricB: { label: string; value: number }
}

const KIND_COLOR = { law: '#6E8BFF', moral: '#A855F7' } as const

/** 制度演化时间线：何时因何涌现、何时被神谕修订，并在同一时间轴上对比两条制度 */
export function OriginTimeline({ open, onClose }: { open: boolean; onClose: () => void }) {
  const world = useWorldStore((state) => state.world)
  const [onlyGod, setOnlyGod] = useState(false)
  const [fromDraft, setFromDraft] = useState('')
  const [toDraft, setToDraft] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  const ranges = { from: parseBigNumber(fromDraft), to: parseBigNumber(toDraft) }

  const entries = useMemo<TimelineEntry[]>(() => {
    const laws: TimelineEntry[] = world.laws.map((law) => ({
      id: `law:${law.id}`,
      kind: 'law',
      title: law.title,
      year: law.enactedYear,
      stageTag: law.stageTag,
      customByGod: law.customByGod,
      isActive: law.isActive,
      reason: law.originReason,
      metricA: { label: '严苛度', value: law.strictness },
      metricB: { label: '执行率', value: law.enforcement },
    }))
    const morals: TimelineEntry[] = world.morals.map((moral) => ({
      id: `moral:${moral.id}`,
      kind: 'moral',
      title: moral.title,
      year: moral.originYear,
      stageTag: moral.stageTag,
      customByGod: moral.customByGod,
      isActive: moral.isActive,
      reason: moral.originReason,
      metricA: { label: '内化强度', value: moral.strength },
      metricB: { label: '普及率', value: moral.prevalence },
    }))
    return [...laws, ...morals]
      .filter((entry) => (onlyGod ? entry.customByGod : true))
      .filter((entry) => (ranges.from === null ? true : entry.year >= ranges.from))
      .filter((entry) => (ranges.to === null ? true : entry.year <= ranges.to))
      .sort((a, b) => a.year - b.year)
  }, [world.laws, world.morals, onlyGod, ranges.from, ranges.to])

  const bands = useMemo(() => {
    const out: Array<{ index: number; from: number; to: number }> = []
    for (const point of world.history) {
      const last = out[out.length - 1]
      if (last && last.index === point.stageIndex) last.to = point.year
      else out.push({ index: point.stageIndex, from: point.year, to: point.year })
    }
    return out
  }, [world.history])

  const togglePick = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const compared = picked
    .map((id) => entries.find((entry) => entry.id === id))
    .filter((entry): entry is TimelineEntry => Boolean(entry))

  if (!open) return null

  const godCount = entries.filter((entry) => entry.customByGod).length

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-end bg-void-0/72 backdrop-blur-sm">
      <div className="glass h-full w-full max-w-[560px] overflow-y-auto rounded-none border-y-0 border-r-0 p-5 animate-slide-in-right">
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="label-xs">制度演化时间线</p>
            <h2 className="mt-0.5 text-[18px] font-bold text-ink-0">法律与道德的诞生史</h2>
            <p className="mt-1 text-[12px] text-ink-2">
              共 {entries.length} 条制度，其中 {godCount} 条经神谕修订。点击卡片可选中两条并列对比。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="关闭时间线"
            className="cursor-pointer rounded-lg border border-white/12 bg-white/[0.05] p-1.5 text-ink-1 transition-colors duration-200 hover:text-ink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="relative flex h-6 w-full overflow-hidden rounded-lg border border-white/10">
          {bands.map((band) => {
            const stage = deriveStage(band.index)
            return (
              <div
                key={`${band.index}-${band.from}`}
                className="h-full transition-[flex-grow] duration-500"
                style={{
                  flexGrow: Math.max(1, band.to - band.from + 1),
                  backgroundImage: `linear-gradient(180deg, ${stage.accentFrom}55, ${stage.accentTo}22)`,
                }}
                title={`${stage.name}：第 ${Math.round(band.from)} – ${Math.round(band.to)} 年`}
              />
            )
          })}
          {!bands.length && (
            <span className="grid h-full w-full place-items-center text-[10px] text-ink-2">
              推演若干 tick 后，这里会按文明阶段着色
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip active={onlyGod} onClick={() => setOnlyGod((prev) => !prev)}>
            <Sparkles className="mr-1 h-3 w-3" />
            只看神谕
          </Chip>
          <input
            className="field max-w-[130px]"
            value={fromDraft}
            placeholder="起始年份"
            onChange={(event) => setFromDraft(event.target.value)}
          />
          <span className="text-[11px] text-ink-2">至</span>
          <input
            className="field max-w-[130px]"
            value={toDraft}
            placeholder="结束年份"
            onChange={(event) => setToDraft(event.target.value)}
          />
          {(fromDraft || toDraft) && (
            <Chip
              onClick={() => {
                setFromDraft('')
                setToDraft('')
              }}
            >
              清除区间
            </Chip>
          )}
        </div>

        {compared.length === 2 && (
          <div className="mt-3 rounded-xl border border-white/12 bg-white/[0.05] p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <GitCompare className="h-3.5 w-3.5 text-neon-cyan" />
              <span className="label-xs">制度对比</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {compared.map((entry) => (
                <div key={entry.id}>
                  <p className="truncate text-[12px] font-semibold text-ink-0">{entry.title}</p>
                  {[entry.metricA, entry.metricB].map((metric) => (
                    <div key={metric.label} className="mt-1">
                      <div className="flex items-center justify-between text-[10.5px] text-ink-2">
                        <span>{metric.label}</span>
                        <span className="tabular font-mono text-ink-0">{metric.value.toFixed(0)}</span>
                      </div>
                      <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.09]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, metric.value))}%`,
                            backgroundColor: KIND_COLOR[entry.kind],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative mt-4 space-y-2.5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-white/12">
          {entries.map((entry) => {
            const stage = INST_STAGE_META[entry.stageTag]
            const active = picked.includes(entry.id)
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => togglePick(entry.id)}
                className="relative block w-full cursor-pointer pl-6 text-left"
                title="点击加入制度对比"
              >
                <span
                  className="absolute left-[3px] top-2.5 z-10 h-2 w-2 rounded-full ring-4 ring-void-0"
                  style={{
                    backgroundColor: KIND_COLOR[entry.kind],
                    opacity: entry.isActive ? 1 : 0.4,
                    boxShadow: `0 0 10px ${KIND_COLOR[entry.kind]}`,
                  }}
                />
                <div
                  className="rounded-xl border p-2.5 transition-all duration-200"
                  style={{
                    borderColor: active ? `${KIND_COLOR[entry.kind]}88` : 'rgba(255,255,255,0.10)',
                    backgroundColor: active ? `${KIND_COLOR[entry.kind]}12` : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="tabular font-mono text-[11px] text-ink-1">{Math.round(entry.year)} 年</span>
                    <Tag color={KIND_COLOR[entry.kind]}>{entry.kind === 'law' ? '法律' : '道德'}</Tag>
                    <Tag color={stage.color}>{stage.label}</Tag>
                    {entry.customByGod && (
                      <Tag color="#F2B84B">
                        <Sparkles className="mr-1 h-3 w-3" />
                        神谕{entry.kind === 'law' ? '修订' : '植入'}
                      </Tag>
                    )}
                    {!entry.isActive && <Tag color="#5A6785">已停用</Tag>}
                  </div>
                  <p className="mt-1 text-[12.5px] font-semibold text-ink-0">{entry.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-1">{entry.reason}</p>
                </div>
              </button>
            )
          })}
          {!entries.length && (
            <p className="rounded-lg border border-dashed border-white/15 p-5 text-center text-[12px] text-ink-2">
              当前筛选条件下没有制度记录。
            </p>
          )}
        </div>

        <footer className="mt-4 flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink-2">
            已选 {picked.length} / 2{picked.length ? ' · 再次点击可取消' : ''}
          </span>
          <div className="flex items-center gap-2">
            <NeonButton onClick={() => setPicked([])} disabled={!picked.length}>
              清除选择
            </NeonButton>
            <NeonButton variant="primary" onClick={onClose}>
              回到天条
            </NeonButton>
          </div>
        </footer>
      </div>
    </div>
  )
}
