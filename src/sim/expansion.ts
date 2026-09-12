import type { EventLog, FiveDims, Tribe, WorldState } from './types'
import { DIM_KEYS, EXPANSION, TAU } from './config'
import { clamp, clamp01, formatLogNumber, saturate } from './num'
import { ascensionTotal, dimPower, makeTribe } from './agents'
import { projectEffects } from './institutions'
import { logEvent, onCooldown, touchFlag } from './log'
import { registerTribe } from './world'
import type { Rng } from './rng'

/** 分裂出的子文明体命名：同源但已不甘于被母体遥控 */
const SPLIT_PREFIX = ['外环', '边地', '新', '远疆', '自由']

/**
 * 疆域、殖民地、舰队与分裂。
 * 扩张是有成本的行为：需要科技门槛与粮食余量，成功后提高殖民数量级与舰队当量；
 * 殖民规模过大且制度张力过高时，边缘星域会分裂为新的文明体。
 */
export function stepExpansion(world: WorldState, rng: Rng, years: number): EventLog[] {
  const logs: EventLog[] = []
  const snapshot = world.tribes.filter((t) => t.alive)

  for (const tribe of snapshot) {
    if (!tribe.alive) continue
    const effects = projectEffects(world, tribe)
    const ascension = ascensionTotal(tribe)

    const reachTarget = clamp(
      -3.5 + (tribe.tech - 70) * 0.055 + tribe.logColonies * 0.95 + ascension * 0.35,
      -3.5,
      30,
    )
    if (reachTarget > tribe.logReach) {
      const tau = Math.max(TAU.expansion / Math.max(effects.expansion, 0.3), 12)
      tribe.logReach = clamp(saturate(tribe.logReach, reachTarget, years, tau, 0.45), -3.5, 30)
    }

    const fleetTarget = clamp(
      -6 + (tribe.tech - 60) * 0.05 + tribe.logColonies * 0.8 + tribe.military / 30,
      -10,
      30,
    )
    tribe.logFleets = clamp(saturate(tribe.logFleets, fleetTarget, years, TAU.expansion, 0.6), -10, 30)

    const gate = Math.max(EXPANSION.techGate, 62 + world.stageIndex * 10)
    const key = `exp:${tribe.id}`
    const ready = tribe.tech >= gate * 0.7 && tribe.food > 26
    if (ready && !onCooldown(world, key, 40)) {
      const progress = clamp01((tribe.tech - gate * 0.55) / 45)
      const pace = 0.55 + clamp01(Math.min(years, 60) / 60)
      const chance = clamp01(effects.expansion * 0.16 * progress * pace)
      if (rng.chance(chance)) {
        const gain = EXPANSION.colonyGain * (1 + ascension * 0.22) + rng.range(0, 0.05)
        tribe.logColonies = clamp(tribe.logColonies + gain, 0, 30)
        tribe.logFleets = clamp(tribe.logFleets + EXPANSION.fleetGain * 0.35, -10, 30)
        touchFlag(world, key)
        logs.push(
          logEvent(
            world,
            'expansion',
            `${tribe.name}把疆域推进到 ${formatLogNumber(tribe.logColonies)} 个定居星系`,
            `一次成功的远航让新的殖民点落成。至此${tribe.name}的稳定定居星系达到 ${formatLogNumber(tribe.logColonies)} 个，疆域半径约 ${formatLogNumber(tribe.logReach + 3.5)} 光年，舰队当量同步抬升。`,
            tribe.id,
          ),
        )
      }
    }

    const tension = effects.divergenceTension
    if (
      tribe.logColonies > EXPANSION.splitColonyLog &&
      tension > EXPANSION.splitTension &&
      !onCooldown(world, `split:${tribe.id}`, 90) &&
      rng.chance(clamp01(0.02 * Math.min(years, 40) + 0.004))
    ) {
      const child = splitTribe(world, tribe, rng)
      if (child) {
        touchFlag(world, `split:${tribe.id}`)
        logs.push(
          logEvent(
            world,
            'expansion',
            `${tribe.name}的边缘星域分裂为「${child.name}」`,
            `殖民规模已达 ${formatLogNumber(tribe.logColonies)} 个星系，而中心与边缘在制度上的差异持续扩大（张力 ${(tension * 100).toFixed(0)}%）。边缘星域拒绝继续执行母体的法典，「${child.name}」自此成为独立的文明体，并带走了约三分之一的殖民地。`,
            child.id,
          ),
        )
      }
    }
  }

  return logs
}

/** 让子文明体在制度与五维上带有可识别的偏移：更务实、更尚劳、德行略低 */
function splitDims(parent: Tribe, rng: Rng): FiveDims {
  const child = {} as FiveDims
  for (const key of DIM_KEYS) {
    child[key] = clamp(parent.dims[key] + rng.normal(0, 6), 0, 100)
  }
  child.lao = clamp(child.lao + 6, 0, 100)
  child.ti = clamp(child.ti + 4, 0, 100)
  child.de = clamp(child.de - 5, 0, 100)
  child.zhi = clamp(child.zhi - 3, 0, 100)
  return child
}

/**
 * 分裂：母体让渡约三分之一的殖民地与人口，
 * 五维以母体为基准并叠加「边地化」偏移，子体继承同一科技起点。
 */
export function splitTribe(world: WorldState, parent: Tribe, rng: Rng): Tribe | null {
  const suffix = world.nextSeq + 1
  const name = `${rng.pick(SPLIT_PREFIX)}${parent.name.slice(0, 2)}`
  const childDims = splitDims(parent, rng)
  const child = makeTribe(world, rng, {
    id: `${parent.id}-${suffix}`,
    name,
    color: parent.color,
    dims: childDims,
    logPopulation: parent.logPopulation - 0.48,
    tech: Math.max(0, parent.tech - rng.range(1, 5)),
    parentId: parent.id,
  })

  // 分裂出的个体同样带有偏移，保证聚合统计量与族群五维一致
  for (const agent of child.agents) {
    for (const key of DIM_KEYS) {
      agent.dims[key] = clamp(agent.dims[key] + (childDims[key] - parent.dims[key]) * 0.7, 0, 100)
    }
  }

  child.logColonies = clamp(parent.logColonies - 0.2, 0, 30)
  child.logReach = clamp(parent.logReach - 0.15, -3.5, 30)
  child.logFleets = clamp(parent.logFleets - 0.3, -10, 30)
  child.happiness = clamp(parent.happiness - 4 + rng.range(-3, 3), 0, 100)
  child.food = clamp(parent.food - 3, 0, 100)

  parent.logPopulation = clamp(parent.logPopulation - 0.18, 3, 26)
  parent.logColonies = clamp(parent.logColonies - 0.2, 0, 30)
  parent.logFleets = clamp(parent.logFleets - 0.25, -10, 30)
  parent.happiness = clamp(parent.happiness - 2, 0, 100)

  registerTribe(world, child)
  return child
}
