import { useEffect, useMemo, useState } from 'react'
import { Save, Sparkles, X } from 'lucide-react'
import {
  DIM_KEYS,
  DIM_META,
  INST_CATEGORY_META,
  INST_CATEGORY_ORDER,
  INST_STAGE_META,
  INST_STAGE_ORDER,
} from '../../sim/config'
import type { DimKey, InstCategory, InstStageTag, LawItem, MoralItem } from '../../sim/types'
import { useWorldStore } from '../../store/useWorldStore'
import { compareEffects } from '../../utils/institutionMath'
import { Chip, FieldLabel, NeonButton, NeonSlider, Tag } from '../ui/Primitives'
import { ImpactHint } from './ImpactHint'

export type CodexKind = 'law' | 'moral'

const CONFLICT_COLOR = '#FF6B5B'

function SliderRow({
  label,
  value,
  color,
  max = 100,
  onChange,
}: {
  label: string
  value: number
  color: string
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <FieldLabel hint={<span className="tabular font-mono text-ink-0">{value.toFixed(0)}</span>}>{label}</FieldLabel>
      <NeonSlider value={value} max={max} color={color} ariaLabel={label} onChange={onChange} />
    </div>
  )
}

/** 神谕修订抽屉：新增 / 编辑一条律法或道德准则，并实时展示预估影响力 */
export function CodeEditorDialog({
  open,
  kind,
  itemId,
  onClose,
}: {
  open: boolean
  kind: CodexKind
  itemId?: string | null
  onClose: () => void
}) {
  const world = useWorldStore((state) => state.world)
  const god = useWorldStore((state) => state.god)
  const alive = world.tribes.filter((tribe) => tribe.alive)

  const existingLaw = kind === 'law' && itemId ? world.laws.find((item) => item.id === itemId) ?? null : null
  const existingMoral =
    kind === 'moral' && itemId ? world.morals.find((item) => item.id === itemId) ?? null : null

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<InstCategory>('civil')
  const [stageTag, setStageTag] = useState<InstStageTag>('info')
  const [scope, setScope] = useState<'all' | string[]>('all')
  const [strictness, setStrictness] = useState(50)
  const [enforcement, setEnforcement] = useState(60)
  const [bindDim, setBindDim] = useState<DimKey | 'conflict'>('de')
  const [strength, setStrength] = useState(55)
  const [prevalence, setPrevalence] = useState(60)
  const [reason, setReason] = useState('')
  const [draftId, setDraftId] = useState('')

  useEffect(() => {
    if (!open) return
    setDraftId(`god-${kind}-${Date.now()}`)
    if (existingLaw) {
      setTitle(existingLaw.title)
      setCategory(existingLaw.category)
      setStageTag(existingLaw.stageTag)
      setScope(existingLaw.scope)
      setStrictness(existingLaw.strictness)
      setEnforcement(existingLaw.enforcement)
      setReason(existingLaw.originReason)
      return
    }
    if (existingMoral) {
      setTitle(existingMoral.title)
      setStageTag(existingMoral.stageTag)
      setBindDim(existingMoral.bindDim)
      setStrength(existingMoral.strength)
      setPrevalence(existingMoral.prevalence)
      setReason(existingMoral.originReason)
      return
    }
    setTitle('')
    setCategory('civil')
    setStageTag(INST_STAGE_META[world.stageIndex >= 5 ? 'galactic' : 'info'].key)
    setScope('all')
    setStrictness(50)
    setEnforcement(60)
    setBindDim('de')
    setStrength(55)
    setPrevalence(60)
    setReason('')
  }, [open, kind, existingLaw, existingMoral, world.stageIndex])

  const scopeText =
    scope === 'all'
      ? '全体文明体'
      : scope.length
        ? scope.map((id) => world.tribes.find((tribe) => tribe.id === id)?.name ?? id).join('、')
        : '尚未选择适用文明体'

  const bindLabel = bindDim === 'conflict' ? '冲突抑制' : `${DIM_META[bindDim].label}维`

  const draft = useMemo<LawItem | MoralItem>(() => {
    if (kind === 'law') {
      const base = existingLaw
      return {
        id: base?.id ?? draftId,
        title: title.trim() || '未命名律法',
        category,
        stageTag,
        scope,
        strictness,
        enforcement,
        enactedYear: base?.enactedYear ?? world.year,
        originReason:
          reason.trim() ||
          `神谕于第 ${Math.round(world.year)} 年${base ? '改写' : '增订'}《${title.trim() || '未命名律法'}》，严苛度 ${strictness.toFixed(0)}，执行率 ${enforcement.toFixed(0)}，适用范围：${scopeText}。`,
        isActive: base?.isActive ?? true,
        customByGod: true,
      }
    }
    const base = existingMoral
    return {
      id: base?.id ?? draftId,
      title: title.trim() || '未命名准则',
      bindDim,
      stageTag,
      strength,
      prevalence,
      originYear: base?.originYear ?? world.year,
      originReason:
        reason.trim() ||
        `第 ${Math.round(world.year)} 年由神谕${base ? '修订' : '植入'}准则：${title.trim() || '未命名准则'}，绑定${bindLabel}，内化强度 ${strength.toFixed(0)}，普及率 ${prevalence.toFixed(0)}。`,
      isActive: base?.isActive ?? true,
      customByGod: true,
    }
  }, [
    kind,
    existingLaw,
    existingMoral,
    draftId,
    title,
    category,
    stageTag,
    scope,
    strictness,
    enforcement,
    bindDim,
    strength,
    prevalence,
    reason,
    world.year,
    scopeText,
    bindLabel,
  ])

  const previewTribe = alive[0]
  const impact = previewTribe
    ? compareEffects(
        world,
        previewTribe,
        kind === 'law' ? { kind: 'law', item: draft as LawItem } : { kind: 'moral', item: draft as MoralItem },
      )
    : null

  if (!open) return null

  const valid = title.trim().length >= 2
  const isEditing = Boolean(existingLaw || existingMoral)

  const submit = () => {
    if (!valid) return
    if (kind === 'law') god({ kind: 'upsertLaw', law: draft as LawItem })
    else god({ kind: 'upsertMoral', moral: draft as MoralItem })
    onClose()
  }

  const toggleScopeTribe = (id: string) => {
    if (scope === 'all') {
      setScope([id])
      return
    }
    const next = scope.includes(id) ? scope.filter((item) => item !== id) : [...scope, id]
    setScope(next.length ? next : 'all')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-end bg-void-0/72 backdrop-blur-sm">
      <div className="glass h-full w-full max-w-[520px] overflow-y-auto rounded-none border-y-0 border-r-0 p-5 animate-slide-in-right">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="label-xs">神谕 · {isEditing ? '修订' : '增订'}</p>
            <h2 className="mt-0.5 text-[18px] font-bold text-ink-0">
              {kind === 'law' ? (isEditing ? '改写律法条文' : '增订一条律法') : isEditing ? '改写道德准则' : '植入道德准则'}
            </h2>
            <p className="mt-1 text-[12px] text-ink-2">
              修订即时生效；调整只影响未来的演化，不回改已经写下的历史曲线。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="关闭编辑抽屉"
            className="cursor-pointer rounded-lg border border-white/12 bg-white/[0.05] p-1.5 text-ink-1 transition-colors duration-200 hover:text-ink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <FieldLabel hint={!valid ? <span className="text-neon-warn">至少 2 个字符</span> : undefined}>
              {kind === 'law' ? '条文名称' : '准则名称'}
            </FieldLabel>
            <input
              className="field"
              value={title}
              placeholder={kind === 'law' ? '例如：星际跃迁管制法' : '例如：代际公平责任'}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          {kind === 'law' && (
            <>
              <div>
                <FieldLabel>类别</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {INST_CATEGORY_ORDER.map((key) => (
                    <Chip key={key} active={category === key} onClick={() => setCategory(key)}>
                      <span
                        className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: INST_CATEGORY_META[key].color }}
                      />
                      {INST_CATEGORY_META[key].label}
                    </Chip>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-ink-2">{INST_CATEGORY_META[category].desc}</p>
              </div>

              <div>
                <FieldLabel>适用范围</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  <Chip active={scope === 'all'} onClick={() => setScope('all')}>
                    全体文明体
                  </Chip>
                  {alive.map((tribe) => (
                    <Chip
                      key={tribe.id}
                      active={scope !== 'all' && scope.includes(tribe.id)}
                      onClick={() => toggleScopeTribe(tribe.id)}
                    >
                      <span
                        className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: tribe.color }}
                      />
                      {tribe.name}
                    </Chip>
                  ))}
                </div>
              </div>

              <SliderRow label="严苛度" value={strictness} color="#F2B84B" onChange={setStrictness} />
              <p className="-mt-2 text-[11px] leading-relaxed text-ink-2">
                严苛度超过 {INST_CATEGORY_META[category].label} 的可承受范围时会推高起义风险，即便它能压低犯罪率。
              </p>
              <SliderRow label="执行率" value={enforcement} color="#22D3EE" onChange={setEnforcement} />
            </>
          )}

          {kind === 'moral' && (
            <>
              <div>
                <FieldLabel>绑定维度</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {DIM_KEYS.map((key) => (
                    <Chip key={key} active={bindDim === key} onClick={() => setBindDim(key)}>
                      <span
                        className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: DIM_META[key].color }}
                      />
                      {DIM_META[key].label}
                    </Chip>
                  ))}
                  <Chip active={bindDim === 'conflict'} onClick={() => setBindDim('conflict')}>
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CONFLICT_COLOR }} />
                    冲突抑制
                  </Chip>
                </div>
              </div>
              <SliderRow label="内化强度" value={strength} color="#A855F7" onChange={setStrength} />
              <SliderRow label="普及率" value={prevalence} color="#A78BFA" onChange={setPrevalence} />
            </>
          )}

          <div>
            <FieldLabel hint="留白则由编年史自动撰写">阶段归属</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {INST_STAGE_ORDER.map((key) => (
                <Chip key={key} active={stageTag === key} onClick={() => setStageTag(key)}>
                  <span
                    className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: INST_STAGE_META[key].color }}
                  />
                  {INST_STAGE_META[key].label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel hint={`第 ${Math.round(world.year)} 年`}>立法缘由</FieldLabel>
            <textarea
              className="field min-h-[76px] resize-y leading-relaxed"
              value={reason}
              placeholder={
                kind === 'law'
                  ? '例如：随着星际跃迁常态化，各文明体要求对航道与跃迁频率实行统一管制。'
                  : '例如：跨星系通婚使代际之间的权利边界模糊，社会要求一种新的公平观。'
              }
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <div className="divider-x" />

          {impact && previewTribe ? (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <Tag color={previewTribe.color}>
                  <Sparkles className="mr-1 h-3 w-3" />
                  以「{previewTribe.name}」为样本
                </Tag>
                <Tag>{kind === 'law' ? scopeText : '全体文明体'}</Tag>
              </div>
              <ImpactHint rows={impact.rows} dimDrift={impact.dimDrift} />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-white/15 p-4 text-center text-[12px] text-ink-2">
              当前没有存续的文明体可供计算预估影响力。
            </p>
          )}
        </div>

        <footer className="mt-5 flex items-center justify-end gap-2">
          <NeonButton onClick={onClose}>取消</NeonButton>
          <NeonButton variant="primary" onClick={submit} disabled={!valid} title={valid ? '写入法典' : '名称过短'}>
            <Save className="h-3.5 w-3.5" />
            {isEditing ? '保存修订' : kind === 'law' ? '施行律法' : '植入准则'}
          </NeonButton>
        </footer>
      </div>
    </div>
  )
}
