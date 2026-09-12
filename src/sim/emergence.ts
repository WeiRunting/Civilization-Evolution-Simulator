import type { EmergenceCondition, LawBlueprint, MoralBlueprint } from './pools/types'
import { LAW_BLUEPRINTS } from './pools/laws'
import { MORAL_BLUEPRINTS } from './pools/morals'
import type { DimKey, EmergenceResult, LawItem, MoralItem, WorldState } from './types'
import { DIM_KEYS } from './config'
import type { Rng } from './rng'
import { clamp, clamp01 } from './num'
import { logEvent } from './log'
import { totalLogPopulation } from './stages'

export interface EmergenceContext {
  year: number
  stageIndex: number
  tech: number
  logPopulation: number
  happiness: number
  logColonies: number
  dims: Record<DimKey, number>
  lawTitles: Set<string>
  moralTitles: Set<string>
}

/** 把世界状态压缩成规则表可以直接判断的条件上下文 */
export function buildContext(world: WorldState): EmergenceContext {
  const alive = world.tribes.filter((t) => t.alive)
  const dims = {} as Record<DimKey, number>
  for (const key of DIM_KEYS) {
    dims[key] = alive.length ? alive.reduce((a, t) => a + t.dims[key], 0) / alive.length : 0
  }
  return {
    year: world.year,
    stageIndex: world.stageIndex,
    tech: alive.length ? alive.reduce((a, t) => a + t.tech, 0) / alive.length : 0,
    logPopulation: totalLogPopulation(world),
    happiness: alive.length ? alive.reduce((a, t) => a + t.happiness, 0) / alive.length : 0,
    logColonies: alive.reduce((a, t) => Math.max(a, t.logColonies), 0),
    dims,
    lawTitles: new Set(world.laws.map((l) => l.title)),
    moralTitles: new Set(world.morals.map((m) => m.title)),
  }
}

export function conditionMatches(cond: EmergenceCondition, ctx: EmergenceContext): boolean {
  if (cond.minStage !== undefined && ctx.stageIndex < cond.minStage) return false
  if (cond.maxStage !== undefined && ctx.stageIndex > cond.maxStage) return false
  if (cond.minTech !== undefined && ctx.tech < cond.minTech) return false
  if (cond.maxTech !== undefined && ctx.tech > cond.maxTech) return false
  if (cond.minPopLog !== undefined && ctx.logPopulation < cond.minPopLog) return false
  if (cond.minHappiness !== undefined && ctx.happiness < cond.minHappiness) return false
  if (cond.maxHappiness !== undefined && ctx.happiness > cond.maxHappiness) return false
  if (cond.minColoniesLog !== undefined && ctx.logColonies < cond.minColoniesLog) return false

  if (cond.dims) {
    for (const key of Object.keys(cond.dims) as DimKey[]) {
      const range = cond.dims[key]
      if (!range) continue
      const value = ctx.dims[key] ?? 0
      if (range.min !== undefined && value < range.min) return false
      if (range.max !== undefined && value > range.max) return false
    }
  }

  if (cond.requiresLaw && !ctx.lawTitles.has(cond.requiresLaw)) return false
  if (cond.requiresMoral && !ctx.moralTitles.has(cond.requiresMoral)) return false
  return true
}

function makeLaw(world: WorldState, blueprint: LawBlueprint): LawItem {
  world.nextSeq += 1
  return {
    id: `law-${blueprint.id}-${world.nextSeq}`,
    title: blueprint.title,
    category: blueprint.category,
    stageTag: blueprint.stageTag,
    scope: 'all',
    strictness: clamp(blueprint.strictness, 0, 100),
    enforcement: clamp(blueprint.enforcement, 0, 100),
    enactedYear: Math.round(world.year),
    originReason: blueprint.reason,
    isActive: true,
    customByGod: false,
  }
}

function makeMoral(world: WorldState, blueprint: MoralBlueprint): MoralItem {
  world.nextSeq += 1
  return {
    id: `moral-${blueprint.id}-${world.nextSeq}`,
    title: blueprint.title,
    bindDim: blueprint.bindDim,
    stageTag: blueprint.stageTag,
    strength: clamp(blueprint.strength, 0, 100),
    prevalence: clamp(blueprint.prevalence, 0, 100),
    originYear: Math.round(world.year),
    originReason: blueprint.reason,
    isActive: true,
    customByGod: false,
  }
}

/**
 * 制度涌现判定。
 * 每 tick 遍历规则表，把条件成立的候选按权重抽样。
 * 单 tick 允许的涌现数量随时间尺度放大，但设有上限，避免纪元跃迁时法典被一次性刷满。
 */
export function detectEmergence(world: WorldState, rng: Rng, years: number): EmergenceResult {
  const ctx = buildContext(world)
  const laws: LawItem[] = []
  const morals: MoralItem[] = []
  const logs: ReturnType<typeof logEvent>[] = []

  const intensity = clamp01(1 - Math.exp(-Math.max(years, 1) / 42))
  const limit = clamp(1 + Math.floor(years / 40), 1, 4)

  const lawCandidates = LAW_BLUEPRINTS.filter(
    (bp) => !ctx.lawTitles.has(bp.title) && conditionMatches(bp.condition, ctx),
  )
  for (const bp of lawCandidates) {
    if (laws.length >= limit) break
    const p = clamp(bp.weight * 0.5 * intensity, 0, 0.55)
    if (!rng.chance(p)) continue
    const law = makeLaw(world, bp)
    laws.push(law)
    ctx.lawTitles.add(law.title)
    logs.push(
      logEvent(
        world,
        'law',
        `${law.title} 颁行`,
        `${law.originReason} 条例以严苛度 ${Math.round(law.strictness)}、执行率 ${Math.round(law.enforcement)} 起步，适用范围为全体文明体。`,
      ),
    )
  }

  const moralCandidates = MORAL_BLUEPRINTS.filter(
    (bp) => !ctx.moralTitles.has(bp.title) && conditionMatches(bp.condition, ctx),
  )
  for (const bp of moralCandidates) {
    if (morals.length >= limit) break
    const p = clamp(bp.weight * 0.44 * intensity, 0, 0.5)
    if (!rng.chance(p)) continue
    const moral = makeMoral(world, bp)
    morals.push(moral)
    ctx.moralTitles.add(moral.title)
    logs.push(
      logEvent(
        world,
        'moral',
        `「${moral.title}」成为普遍的道德约束`,
        `${moral.originReason} 它以内化强度 ${Math.round(moral.strength)}、普及率 ${Math.round(moral.prevalence)}% 进入日常，指导 ${describeBind(moral.bindDim)} 的取舍。`,
      ),
    )
  }

  return { laws, morals, logs }
}

export function describeBind(bindDim: DimKey | 'conflict'): string {
  if (bindDim === 'conflict') return '冲突与容忍'
  const map: Record<DimKey, string> = {
    de: '德行',
    zhi: '智识',
    ti: '体魄',
    mei: '审美',
    lao: '劳作',
  }
  return map[bindDim]
}

export { DIM_KEYS }
