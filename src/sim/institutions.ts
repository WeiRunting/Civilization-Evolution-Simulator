import type { DimKey, InstitutionEffects, LawItem, MoralItem, Tribe, WorldState } from './types'
import { DIM_KEYS, INST } from './config'
import { clamp, clamp01 } from './num'

export type InstitutionTendency = '严刑' | '宽仁' | '契约' | '尚武' | '礼教' | '技术官僚' | '中庸'

const ZERO_DIMS: Record<DimKey, number> = { de: 0, zhi: 0, ti: 0, mei: 0, lao: 0 }

export function activeLawsFor(world: WorldState, tribe: Tribe): LawItem[] {
  return world.laws.filter(
    (law) => law.isActive && (law.scope === 'all' || law.scope.includes(tribe.id)),
  )
}

export function activeMorals(world: WorldState): MoralItem[] {
  return world.morals.filter((moral) => moral.isActive)
}

/** 有效严苛度：以执行率为权重，未执行的严刑只是纸面文字 */
export function effectiveStrictness(laws: LawItem[]): number {
  if (!laws.length) return 0
  let weightSum = 0
  let acc = 0
  for (const law of laws) {
    const weight = 0.25 + law.enforcement / 100
    acc += law.strictness * weight
    weightSum += weight
  }
  return acc / weightSum
}

export function averageEnforcement(laws: LawItem[]): number {
  if (!laws.length) return 0
  return laws.reduce((acc, law) => acc + law.enforcement, 0) / laws.length
}

/** 按绑定维度汇总道德的内化强度与普及率 */
export function moralProfile(morals: MoralItem[]): {
  perDim: Record<DimKey, number>
  conflict: number
  total: number
  prevalence: number
} {
  const perDim: Record<DimKey, number> = { ...ZERO_DIMS }
  let conflict = 0
  let total = 0
  let prevalenceAcc = 0
  let prevalenceWeight = 0

  for (const moral of morals) {
    const power = (moral.strength / 100) * (0.4 + moral.prevalence / 160)
    total += power
    prevalenceAcc += moral.prevalence * power
    prevalenceWeight += power
    if (moral.bindDim === 'conflict') {
      conflict += power
    } else {
      perDim[moral.bindDim] += power
    }
  }

  return {
    perDim,
    conflict,
    total,
    prevalence: prevalenceWeight > 0 ? prevalenceAcc / prevalenceWeight : 0,
  }
}

/**
 * 制度差异张力：本地适用的法条结构与全局平均差异越大，文明体之间的关系越紧张。
 * 这是「编辑制度会影响文明」在族群间层面的体现。
 */
export function divergenceTension(world: WorldState, tribe: Tribe): number {
  const global = effectiveStrictness(world.laws.filter((l) => l.isActive))
  const local = effectiveStrictness(activeLawsFor(world, tribe))
  const globalCodes = new Set(world.laws.filter((l) => l.isActive).map((l) => l.title))
  const localCodes = new Set(activeLawsFor(world, tribe).map((l) => l.title))
  let onlyGlobal = 0
  globalCodes.forEach((title) => {
    if (!localCodes.has(title)) onlyGlobal += 1
  })
  const gap = Math.abs(local - global) / 100
  const coverageGap = globalCodes.size > 0 ? onlyGlobal / globalCodes.size : 0
  return clamp01(gap * 1.2 + coverageGap * 0.9)
}

/**
 * 制度效果投影：把法律与道德折算成演化方程可以直接消费的系数。
 * UI 的「预估影响力」复用同一个纯函数，因此展示与引擎结果必然一致。
 */
export function projectEffects(world: WorldState, tribe: Tribe): InstitutionEffects {
  const laws = activeLawsFor(world, tribe)
  const morals = activeMorals(world)

  const strictness = effectiveStrictness(laws)
  const enforcement = averageEnforcement(laws)
  const enfNorm = enforcement / 100
  const harsh = clamp01((strictness - INST.harshThreshold) / (100 - INST.harshThreshold))
  const tension = divergenceTension(world, tribe)
  const profile = moralProfile(morals)

  const deNorm = tribe.dims.de / 100
  const zhiNorm = tribe.dims.zhi / 100
  const tiNorm = tribe.dims.ti / 100
  const meiNorm = tribe.dims.mei / 100
  const laoNorm = tribe.dims.lao / 100

  const moralDe = clamp(profile.perDim.de, 0, 3) / 3
  const moralZhi = clamp(profile.perDim.zhi, 0, 3) / 3
  const moralTi = clamp(profile.perDim.ti, 0, 3) / 3
  const moralMei = clamp(profile.perDim.mei, 0, 3) / 3
  const moralLao = clamp(profile.perDim.lao, 0, 3) / 3
  const moralConflict = clamp(profile.conflict, 0, 3) / 3

  const crimeRate = clamp01(
    0.44 * (1 - deNorm * 0.72) * (1 - enfNorm * 0.5) * (1 + harsh * 0.25) -
      moralConflict * 0.08,
  )

  const revoltRisk = clamp01(
    0.18 +
      (1 - tribe.happiness / 100) * 0.42 +
      harsh * 0.48 +
      tension * 0.34 +
      crimeRate * 0.32 -
      moralDe * 0.16,
  )

  const innovation = clamp(
    0.6 + zhiNorm * 0.5 + enfNorm * 0.22 - harsh * 0.6 + moralZhi * 0.35 + tribe.tech / 320,
    0.25,
    2.6,
  )

  const fertility = clamp(
    0.72 + tiNorm * 0.42 + moralTi * 0.18 - harsh * 0.26 - crimeRate * 0.2,
    0.3,
    1.7,
  )

  const happiness = clamp(
    -harsh * 20 + enfNorm * 7 - crimeRate * 12 + moralMei * 9 + moralDe * 4 - tension * 5,
    -28,
    22,
  )

  const conflictDelta = clamp(
    -deNorm * 0.5 - enfNorm * 0.22 + harsh * 0.28 + tension * 0.45 - moralConflict * 0.2,
    -1,
    1,
  )

  const longevity = clamp(
    0.82 + tiNorm * 0.38 + enfNorm * 0.12 - harsh * 0.14,
    0.5,
    1.6,
  )

  const expansion = clamp(
    0.55 + laoNorm * 0.35 + tribe.tech / 340 + enfNorm * 0.18 - harsh * 0.22,
    0.3,
    2.3,
  )

  const driftScale = 0.02 * (0.35 + profile.prevalence / 150)
  const dimDrift: Record<DimKey, number> = { ...ZERO_DIMS }
  for (const key of DIM_KEYS) {
    dimDrift[key] = 0
  }
  dimDrift.de = moralDe * driftScale * 1.2 + enfNorm * 0.008 - harsh * 0.005
  dimDrift.zhi = moralZhi * driftScale + enfNorm * 0.004
  dimDrift.ti = moralTi * driftScale
  dimDrift.mei = moralMei * driftScale * 1.15 - harsh * 0.012
  dimDrift.lao = moralLao * driftScale

  return {
    crimeRate,
    revoltRisk,
    innovation,
    fertility,
    happiness,
    conflictDelta,
    divergenceTension: tension,
    dimDrift,
    longevity,
    expansion,
  }
}

/** 制度倾向标签，用于族群卡片与法典卡片的跨文明体对比 */
export function institutionTendency(world: WorldState, tribe: Tribe): InstitutionTendency {
  const laws = activeLawsFor(world, tribe)
  if (!laws.length) return '中庸'
  const strictness = effectiveStrictness(laws)
  const counts: Record<string, number> = {}
  for (const law of laws) {
    counts[law.category] = (counts[law.category] ?? 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (strictness >= 68) return '严刑'
  if (top && top[0] === 'military' && top[1] >= laws.length * 0.4) return '尚武'
  if (top && top[0] === 'custom' && tribe.dims.de >= 72) return '礼教'
  if (strictness <= 32) return '宽仁'
  if (top && top[0] === 'economic') return '契约'
  if (top && top[0] === 'civil') return '技术官僚'
  return '中庸'
}

export interface InstitutionSnapshot {
  lawCount: number
  moralCount: number
  strictness: number
  enforcement: number
  moralStrength: number
  moralPrevalence: number
  tendency: InstitutionTendency
}

export function snapshot(world: WorldState): InstitutionSnapshot {
  const laws = world.laws.filter((l) => l.isActive)
  const morals = world.morals.filter((m) => m.isActive)
  const profile = moralProfile(morals)
  return {
    lawCount: laws.length,
    moralCount: morals.length,
    strictness: effectiveStrictness(laws),
    enforcement: averageEnforcement(laws),
    moralStrength: clamp(profile.total, 0, 100),
    moralPrevalence: profile.prevalence,
    tendency: '中庸',
  }
}

/** 用于编辑面板预估影响力：临时替换一条条文后重算效果差 */
export function effectsWithDraft(
  world: WorldState,
  tribe: Tribe,
  draft: { kind: 'law'; item: LawItem } | { kind: 'moral'; item: MoralItem } | null,
): InstitutionEffects {
  if (!draft) return projectEffects(world, tribe)
  const next: WorldState =
    draft.kind === 'law'
      ? { ...world, laws: upsertInto(world.laws, draft.item) }
      : { ...world, morals: upsertInto(world.morals, draft.item) }
  return projectEffects(next, tribe)
}

function upsertInto<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((entry) => entry.id === item.id)
  if (index < 0) return [...items, item]
  const copy = items.slice()
  copy[index] = item
  return copy
}

export { clamp, clamp01 }
