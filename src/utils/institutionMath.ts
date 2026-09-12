import type { DimKey, InstitutionEffects, LawItem, MoralItem, Tribe, WorldState } from '../sim/types'
import { DIM_KEYS, DIM_META } from '../sim/config'
import { clamp, formatLogNumber } from '../sim/num'
import { computeCivIndex, deriveStage, stageForCivIndex, totalLogPopulation } from '../sim/stages'
import { activeLawsFor, effectsWithDraft, projectEffects } from '../sim/institutions'
import { formatPercent } from '../sim/num'

/** 单文明体视角的文明指数：复用全局公式，只把文明体列表收窄为它自己 */
export function tribeCivIndex(world: WorldState, tribe: Tribe): number {
  return computeCivIndex({ ...world, tribes: [tribe] })
}

export function tribeStage(world: WorldState, tribe: Tribe): ReturnType<typeof deriveStage> {
  return deriveStage(stageForCivIndex(tribeCivIndex(world, tribe)))
}

export interface ImpactRow {
  label: string
  value: number
  display: string
  better: 'up' | 'down' | 'neutral'
}

const IMPACT_META: Array<{
  key: keyof InstitutionEffects
  label: string
  better: 'up' | 'down'
  format: (value: number) => string
}> = [
  { key: 'crimeRate', label: '犯罪率', better: 'down', format: (v) => formatPercent(v, 1) },
  { key: 'revoltRisk', label: '起义风险', better: 'down', format: (v) => formatPercent(v, 1) },
  { key: 'innovation', label: '科技增速', better: 'up', format: (v) => `${v.toFixed(2)}x` },
  { key: 'fertility', label: '生育系数', better: 'up', format: (v) => `${v.toFixed(2)}x` },
  { key: 'longevity', label: '寿命系数', better: 'up', format: (v) => `${v.toFixed(2)}x` },
  { key: 'expansion', label: '扩张动能', better: 'up', format: (v) => `${v.toFixed(2)}x` },
  { key: 'happiness', label: '幸福偏移', better: 'up', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}` },
  { key: 'divergenceTension', label: '制度张力', better: 'down', format: (v) => formatPercent(v, 1) },
]

/**
 * 预估影响力：把「当前制度」与「带草稿的制度」两次投影相减。
 * 与引擎消费的是同一个纯函数，所以面板上看到的变化就是下一 tick 真实发生的变化。
 */
export function compareEffects(
  world: WorldState,
  tribe: Tribe,
  draft: { kind: 'law'; item: LawItem } | { kind: 'moral'; item: MoralItem } | null,
): { base: InstitutionEffects; next: InstitutionEffects; rows: ImpactRow[]; dimDrift: Record<DimKey, number> } {
  const base = projectEffects(world, tribe)
  const next = effectsWithDraft(world, tribe, draft)
  const rows = IMPACT_META.map<ImpactRow>((meta) => {
    const delta = (next[meta.key] as number) - (base[meta.key] as number)
    const improved = meta.better === 'up' ? delta > 0.0001 : delta < -0.0001
    const worsened = meta.better === 'up' ? delta < -0.0001 : delta > 0.0001
    return {
      label: meta.label,
      value: delta,
      display: `${delta >= 0 ? '+' : ''}${meta.format(Math.abs(delta)).replace('-', '')}`,
      better: improved ? 'up' : worsened ? 'down' : 'neutral',
    }
  })
  const dimDrift = {} as Record<DimKey, number>
  for (const key of DIM_KEYS) dimDrift[key] = next.dimDrift[key] - base.dimDrift[key]
  return { base, next, rows, dimDrift }
}

/** 文明体总览摘要，供卡片与星图共用 */
export function tribeSummary(world: WorldState, tribe: Tribe) {
  const effects = projectEffects(world, tribe)
  const laws = activeLawsFor(world, tribe)
  return {
    population: formatLogNumber(tribe.logPopulation),
    colonies: formatLogNumber(tribe.logColonies),
    reach: `${formatLogNumber(tribe.logReach + 3.5)} 光年`,
    fleets: formatLogNumber(tribe.logFleets),
    effects,
    lawCount: laws.length,
    ascension: DIM_KEYS.reduce((acc, key) => acc + tribe.ascension[key], 0),
  }
}

export function dimColor(key: DimKey): string {
  return DIM_META[key].color
}

export function dimLabel(key: DimKey): string {
  return DIM_META[key].label
}

export function clampDim(value: number): number {
  return clamp(value, 0, 100)
}

export function worldPopulationText(world: WorldState): string {
  return formatLogNumber(totalLogPopulation(world))
}
