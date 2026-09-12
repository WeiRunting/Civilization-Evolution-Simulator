import { useMemo, useState } from 'react'
import { BookOpen, History, Plus, Scale, Search, ShieldCheck } from 'lucide-react'
import {
  GALACTIC_STAGE_INDEX,
  DIM_KEYS,
  DIM_META,
  INST_CATEGORY_META,
  INST_CATEGORY_ORDER,
  INST_STAGE_META,
  INST_STAGE_ORDER,
} from '../../sim/config'
import { averageEnforcement, effectiveStrictness, institutionTendency } from '../../sim/institutions'
import type { InstCategory, InstStageTag } from '../../sim/types'
import { useWorldStore } from '../../store/useWorldStore'
import { Chip, GlassPanel, NeonButton, Ring, SectionTitle, Tag } from '../ui/Primitives'
import { CodeEditorDialog } from './CodeEditorDialog'
import type { CodexKind } from './CodeEditorDialog'
import { LawCard } from './LawCard'
import { MoralCard } from './MoralCard'
import { OriginTimeline } from './OriginTimeline'

function average(list: number[]): number {
  return list.length ? list.reduce((acc, value) => acc + value, 0) / list.length : 0
}

/** 天条视图：法律体系与道德约束的双 Tab 法典面板，含银河法典专区与制度演化时间线 */
export function CodexView() {
  const world = useWorldStore((state) => state.world)
  const scope = useWorldStore((state) => state.scope)
  const god = useWorldStore((state) => state.god)

  const [tab, setTab] = useState<CodexKind>('law')
  const [stageFilter, setStageFilter] = useState<InstStageTag | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<InstCategory | 'all'>('all')
  const [onlyActive, setOnlyActive] = useState(false)
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [timelineOpen, setTimelineOpen] = useState(false)

  const activeLaws = world.laws.filter((law) => law.isActive)
  const activeMorals = world.morals.filter((moral) => moral.isActive)
  const previewTribe =
    (scope === 'all' ? world.tribes.find((tribe) => tribe.alive) : world.tribes.find((tribe) => tribe.id === scope)) ??
    world.tribes[0]

  const laws = useMemo(() => {
    const keyword = query.trim()
    return world.laws
      .filter((law) => (stageFilter === 'all' ? true : law.stageTag === stageFilter))
      .filter((law) => (categoryFilter === 'all' ? true : law.category === categoryFilter))
      .filter((law) => (onlyActive ? law.isActive : true))
      .filter((law) => (keyword ? law.title.includes(keyword) || law.originReason.includes(keyword) : true))
      .sort((a, b) => b.enactedYear - a.enactedYear)
  }, [world.laws, stageFilter, categoryFilter, onlyActive, query])

  const morals = useMemo(() => {
    const keyword = query.trim()
    return world.morals
      .filter((moral) => (stageFilter === 'all' ? true : moral.stageTag === stageFilter))
      .filter((moral) => (categoryFilter === 'all' ? true : categoryFilter === 'custom'))
      .filter((moral) => (onlyActive ? moral.isActive : true))
      .filter((moral) => (keyword ? moral.title.includes(keyword) || moral.originReason.includes(keyword) : true))
      .sort((a, b) => b.strength - a.strength)
  }, [world.morals, stageFilter, categoryFilter, onlyActive, query])

  const galacticLaws = laws.filter((law) => law.stageTag === 'galactic' || law.stageTag === 'transcendent')
  const mainLaws = laws.filter((law) => law.stageTag !== 'galactic' && law.stageTag !== 'transcendent')
  const showGalacticZone = world.stageIndex >= GALACTIC_STAGE_INDEX || galacticLaws.length > 0

  const avgStrength = average(activeMorals.map((moral) => moral.strength))
  const avgPrevalence = average(activeMorals.map((moral) => moral.prevalence))

  const openCreate = () => {
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (id: string) => {
    setEditingId(id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-3">
      <SectionTitle
        title="天条"
        subtitle={`施行中的律法 ${activeLaws.length} 条、道德准则 ${activeMorals.length} 条 · 制度随文明等级自行涌现，也可由神谕随时改写`}
        right={
          <div className="flex items-center gap-1.5">
            <NeonButton onClick={() => setTimelineOpen(true)} title="查看制度涌现与修订的完整时间线">
              <History className="h-3.5 w-3.5" />
              演化时间线
            </NeonButton>
            <NeonButton variant="primary" onClick={openCreate} title="以神谕身份增订一条制度">
              <Plus className="h-3.5 w-3.5" />
              神谕增订
            </NeonButton>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={tab === 'law'} onClick={() => setTab('law')}>
          <Scale className="mr-1 h-3 w-3" />
          法律体系 ({world.laws.length})
        </Chip>
        <Chip active={tab === 'moral'} onClick={() => setTab('moral')}>
          <ShieldCheck className="mr-1 h-3 w-3" />
          道德约束 ({world.morals.length})
        </Chip>
        {previewTribe && (
          <Tag color={previewTribe.color}>
            {institutionTendency(world, previewTribe)} · {previewTribe.name}
          </Tag>
        )}
        {previewTribe && (
          <Tag>
            平均严苛度 {effectiveStrictness(world.laws.filter((law) => law.isActive)).toFixed(1)} · 平均执行率{' '}
            {averageEnforcement(world.laws.filter((law) => law.isActive)).toFixed(1)}
          </Tag>
        )}
      </div>

      {tab === 'moral' && (
        <GlassPanel title="道德强度总览" subtitle="全体施行中准则的平均内化强度与普及率">
          <div className="flex flex-wrap items-center gap-5">
            <Ring
              value={avgStrength / 100}
              color="#A855F7"
              label={avgStrength.toFixed(0)}
              caption="平均内化强度"
            />
            <Ring
              value={avgPrevalence / 100}
              color="#22D3EE"
              label={avgPrevalence.toFixed(0)}
              caption="平均普及率"
            />
            <div className="min-w-[220px] flex-1">
              <p className="mb-2 text-[11px] text-ink-2">当前道德结构对五维的漂移推力方向</p>
              <div className="flex flex-wrap gap-1.5">
                {DIM_KEYS.map((key) => {
                  const bound = activeMorals.filter((moral) => moral.bindDim === key)
                  const power = average(bound.map((moral) => moral.strength * (0.4 + moral.prevalence / 160)))
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px]"
                      style={{
                        color: power > 0.05 ? DIM_META[key].color : '#5A6785',
                        borderColor: power > 0.05 ? `${DIM_META[key].color}44` : 'rgba(255,255,255,0.10)',
                        backgroundColor: power > 0.05 ? `${DIM_META[key].color}14` : 'transparent',
                      }}
                      title={`${bound.length} 条准则绑定${DIM_META[key].label}维`}
                    >
                      {DIM_META[key].label}
                      <span className="tabular font-mono">{power.toFixed(2)}</span>
                      <span>{power > 0.05 ? '↑' : '·'}</span>
                    </span>
                  )
                })}
                <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-ink-1">
                  冲突抑制
                  <span className="tabular font-mono text-ink-0">
                    {average(
                      activeMorals
                        .filter((moral) => moral.bindDim === 'conflict')
                        .map((moral) => moral.strength * (0.4 + moral.prevalence / 160)),
                    ).toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </GlassPanel>
      )}

      <GlassPanel
        title={tab === 'law' ? '律法条文' : '道德准则'}
        subtitle={
          tab === 'law'
            ? '执行率决定条文是否真的生效；未执行的严刑只是纸面文字'
            : '普及率不足五成的准则会以虚线标注，其对五维的推力也更弱'
        }
        actions={
          <div className="relative w-[190px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-2" />
            <input
              className="field pl-8"
              value={query}
              placeholder="搜索条文或缘由"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={stageFilter === 'all'} onClick={() => setStageFilter('all')}>
            全部阶段
          </Chip>
          {INST_STAGE_ORDER.map((key) => (
            <Chip key={key} active={stageFilter === key} onClick={() => setStageFilter(key)}>
              <span
                className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: INST_STAGE_META[key].color }}
              />
              {INST_STAGE_META[key].label}
            </Chip>
          ))}
        </div>

        {tab === 'law' && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
              全部类别
            </Chip>
            {INST_CATEGORY_ORDER.map((key) => (
              <Chip key={key} active={categoryFilter === key} onClick={() => setCategoryFilter(key)}>
                <span
                  className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: INST_CATEGORY_META[key].color }}
                />
                {INST_CATEGORY_META[key].label}
              </Chip>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Chip active={onlyActive} onClick={() => setOnlyActive((prev) => !prev)}>
            只看施行中
          </Chip>
          <span className="text-[11px] text-ink-2">
            命中 {tab === 'law' ? laws.length : morals.length} 条
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          {tab === 'law' ? (
            <>
              {showGalacticZone && (
                <section className="rounded-xl border border-neon-gold/35 bg-neon-gold/[0.06] p-3">
                  <div className="mb-2.5 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-neon-gold" />
                    <h3 className="text-[13.5px] font-semibold text-neon-gold">银河法典专区</h3>
                    <Tag color="#F2B84B">跨星系律法 {galacticLaws.length} 条</Tag>
                  </div>
                  {galacticLaws.length ? (
                    <div className="space-y-2.5">
                      {galacticLaws.map((law) => (
                        <LawCard
                          key={law.id}
                          law={law}
                          world={world}
                          selected={editingId === law.id}
                          onEdit={() => openEdit(law.id)}
                          onToggle={() => god({ kind: 'toggleLaw', id: law.id })}
                          onRemove={() => god({ kind: 'removeLaw', id: law.id })}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-neon-gold/30 p-3 text-[11.5px] text-ink-1">
                      专区已开启，但尚无跨星系律法。推演到星系纪元后，机器人法则与心理史学监管会自行在此涌现。
                    </p>
                  )}
                </section>
              )}

              {mainLaws.map((law) => (
                <LawCard
                  key={law.id}
                  law={law}
                  world={world}
                  selected={editingId === law.id}
                  onEdit={() => openEdit(law.id)}
                  onToggle={() => god({ kind: 'toggleLaw', id: law.id })}
                  onRemove={() => god({ kind: 'removeLaw', id: law.id })}
                />
              ))}
            </>
          ) : (
            morals.map((moral) => (
              <MoralCard
                key={moral.id}
                moral={moral}
                onEdit={() => openEdit(moral.id)}
                onToggle={() => god({ kind: 'toggleMoral', id: moral.id })}
                onRemove={() => god({ kind: 'removeMoral', id: moral.id })}
              />
            ))
          )}

          {((tab === 'law' && !laws.length) || (tab === 'moral' && !morals.length)) && (
            <p className="rounded-lg border border-dashed border-white/15 p-6 text-center text-[12px] text-ink-2">
              当前筛选条件下没有{tab === 'law' ? '律法' : '道德准则'}。放宽筛选，或用「神谕增订」亲手写下一部。
            </p>
          )}
        </div>
      </GlassPanel>

      <CodeEditorDialog
        open={dialogOpen}
        kind={tab}
        itemId={editingId}
        onClose={() => {
          setDialogOpen(false)
          setEditingId(null)
        }}
      />
      <OriginTimeline open={timelineOpen} onClose={() => setTimelineOpen(false)} />
    </div>
  )
}
