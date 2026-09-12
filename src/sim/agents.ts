import type { Ascension, DimKey, FiveDims, Individual, Tribe, WorldState } from './types'
import { AGENT, AGENTS_PER_TRIBE, DIM_KEYS, DIM_DEFAULT } from './config'
import { clamp, clamp01 } from './num'
import type { Rng } from './rng'

export function zeroAscension(): Ascension {
  return { de: 0, zhi: 0, ti: 0, mei: 0, lao: 0 }
}

/** 生成代表个体：个体属性围绕文明体均值散布，并带天赋偏置 */
export function createAgents(world: WorldState, dims: FiveDims, rng: Rng, count = AGENTS_PER_TRIBE): Individual[] {
  const agents: Individual[] = []
  for (let i = 0; i < count; i += 1) {
    world.nextAgentId += 1
    const talent = clamp(rng.normal(0, 0.42), -1, 1)
    const spread = 6 + 14 * (1 - Math.abs(talent))
    const agentDims = {} as FiveDims
    for (const key of DIM_KEYS) {
      agentDims[key] = clamp(dims[key] + rng.normal(0, spread), 0, 100)
    }
    agents.push({
      id: world.nextAgentId,
      age: rng.range(0, 62),
      alive: true,
      talent,
      dims: agentDims,
    })
  }
  return agents
}

export function makeTribe(
  world: WorldState,
  rng: Rng,
  opts: {
    id: string
    name: string
    color: string
    dims: FiveDims
    logPopulation: number
    tech: number
    happiness?: number
    food?: number
    military?: number
    parentId?: string | null
  },
): Tribe {
  return {
    id: opts.id,
    name: opts.name,
    color: opts.color,
    parentId: opts.parentId ?? null,
    foundingYear: Math.round(world.year),
    logPopulation: opts.logPopulation,
    tech: opts.tech,
    happiness: opts.happiness ?? clamp(50 + opts.dims.mei * 0.25, 0, 100),
    food: opts.food ?? clamp(45 + opts.dims.lao * 0.4, 0, 100),
    military: opts.military ?? clamp(30 + opts.dims.ti * 0.4 + opts.tech * 0.15, 0, 100),
    logColonies: 0,
    logReach: -3.5,
    logFleets: -6,
    dims: { ...opts.dims },
    ascension: zeroAscension(),
    agents: createAgents(world, opts.dims, rng),
    alive: true,
  }
}

export function ascensionTotal(tribe: Tribe): number {
  return DIM_KEYS.reduce((acc, key) => acc + tribe.ascension[key], 0)
}

/** 升维后的实际维度效能：0-100 的滑块手感保留，超脱层数提供指数级加成 */
export function dimPower(tribe: Tribe, key: DimKey): number {
  return tribe.dims[key] * (1 + 0.15 * tribe.ascension[key])
}

export function effectiveDims(tribe: Tribe): FiveDims {
  const result = {} as FiveDims
  for (const key of DIM_KEYS) {
    result[key] = dimPower(tribe, key)
  }
  return result
}

/** 个体寿命：由体魄、制度寿命加成、科技与升维共同决定 */
export function lifespan(tribe: Tribe, longevity: number): number {
  const ti = dimPower(tribe, 'ti')
  return (
    AGENT.lifespanBase *
    longevity *
    (0.7 + ti / 190) *
    (1 + Math.max(0, tribe.tech - 70) / 420) +
    ascensionTotal(tribe) * AGENT.lifespanAscension
  )
}

/** 加权均值：代表个体向上聚合为文明体统计量 */
export function aggregateDims(tribe: Tribe): FiveDims {
  const result = {} as FiveDims
  for (const key of DIM_KEYS) {
    result[key] = 0
  }
  let weightSum = 0
  for (const agent of tribe.agents) {
    if (!agent.alive) continue
    weightSum += 1
    for (const key of DIM_KEYS) {
      result[key] += agent.dims[key]
    }
  }
  if (weightSum === 0) return { ...tribe.dims }
  for (const key of DIM_KEYS) {
    result[key] /= weightSum
  }
  return result
}

/** 个体级行为：世代更替、向均值漂移、随机噪声与天赋突变 */
export function stepAgents(
  world: WorldState,
  tribe: Tribe,
  rng: Rng,
  years: number,
  longevity: number,
  dimsBefore: FiveDims,
): void {
  const life = Math.max(18, lifespan(tribe, longevity))
  const turnover = clamp01(years / life)
  const drift = clamp01(years / 24) * AGENT.driftToMean
  const noiseScale = AGENT.noise * Math.sqrt(Math.max(years, 0.2)) * 0.25

  for (const agent of tribe.agents) {
    if (!agent.alive) continue
    agent.age += years
    if (agent.age >= life || rng.chance(turnover * 0.45)) {
      agent.alive = false
    }
  }

  let replaced = 0
  for (let i = 0; i < tribe.agents.length; i += 1) {
    const agent = tribe.agents[i]
    if (agent.alive) {
      for (const key of DIM_KEYS) {
        const target = dimsBefore[key]
        agent.dims[key] = clamp(
          agent.dims[key] + (target - agent.dims[key]) * drift + rng.normal(0, noiseScale),
          0,
          100,
        )
      }
      if (rng.chance(AGENT.talentMutateChance * Math.min(years, 20))) {
        agent.talent = clamp(agent.talent + rng.normal(0, 0.16), -1, 1)
      }
      continue
    }
    // 世代更替：新个体从当前社会均值中抽样，因此文化传承会滞后于政策变化
    replaced += 1
    const talent = clamp(agent.talent * 0.6 + rng.normal(0, 0.3), -1, 1)
    const spread = 6 + 14 * (1 - Math.abs(talent))
    const fresh = {} as FiveDims
    for (const key of DIM_KEYS) {
      const base = dimsBefore[key] ?? DIM_DEFAULT[key]
      fresh[key] = clamp(base + rng.normal(0, spread), 0, 100)
    }
    agent.age = rng.range(0, 8)
    agent.talent = talent
    agent.dims = fresh
    agent.alive = true
  }

  if (replaced > tribe.agents.length * 0.5) {
    world.flags[`turnover:${tribe.id}`] = replaced
  }
}

/** 神迹干预后让个体分布跟随新的社会均值，形成「施法」的可视反馈 */
export function shiftAgents(tribe: Tribe, dims: FiveDims, pull = 0.72): void {
  for (const agent of tribe.agents) {
    for (const key of DIM_KEYS) {
      agent.dims[key] = clamp(agent.dims[key] + (dims[key] - agent.dims[key]) * pull, 0, 100)
    }
  }
}

export { DIM_KEYS }
