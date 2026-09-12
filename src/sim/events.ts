import type { EventLog, Tribe, WorldState } from './types'
import { EVENT_BLUEPRINTS } from './pools/events'
import type { EventBlueprint, EventEffect } from './pools/types'
import { DIM_KEYS } from './config'
import { clamp, clamp01 } from './num'
import { logEvent, onCooldown, touchFlag } from './log'
import { totalLogPopulation } from './stages'
import type { Rng } from './rng'

function applyEffect(tribe: Tribe, effect: EventEffect): void {
  tribe.tech = clamp(tribe.tech + (effect.tech ?? 0), 0, 600)
  tribe.happiness = clamp(tribe.happiness + (effect.happiness ?? 0), 0, 100)
  tribe.food = clamp(tribe.food + (effect.food ?? 0), 0, 100)
  tribe.military = clamp(tribe.military + (effect.military ?? 0), 0, 100)
  if (effect.logPopulationDelta) {
    tribe.logPopulation = clamp(tribe.logPopulation + effect.logPopulationDelta, 3, 26)
  }
  if (effect.logColoniesDelta) {
    tribe.logColonies = clamp(tribe.logColonies + effect.logColoniesDelta, 0, 30)
  }
  if (effect.dims) {
    for (const key of DIM_KEYS) {
      const delta = effect.dims[key]
      if (delta === undefined) continue
      tribe.dims[key] = clamp(tribe.dims[key] + delta, 0, 100)
    }
  }
}

function stagePass(bp: EventBlueprint, world: WorldState): boolean {
  if (bp.minStage !== undefined && world.stageIndex < bp.minStage) return false
  if (bp.maxStage !== undefined && world.stageIndex > bp.maxStage) return false
  return true
}

/**
 * 分层事件判定。
 * 事件按「阶段条件 + 科技/人口门槛 + 冷却」筛选，再以与单步年限正相关的概率触发，
 * 因此 1 年一步的信息纪元与 2500 年一步的超越层不会出现同一种事件密度。
 */
export function detectEvents(world: WorldState, rng: Rng, years: number): EventLog[] {
  const logs: EventLog[] = []
  const alive = world.tribes.filter((t) => t.alive)
  if (!alive.length) return logs

  const avgTech = alive.reduce((acc, t) => acc + t.tech, 0) / alive.length
  const logPopTotal = totalLogPopulation(world)
  const span = clamp01(Math.min(years, 120) / 120 + 0.06)

  for (const bp of EVENT_BLUEPRINTS) {
    if (!stagePass(bp, world)) continue
    if (bp.minTech !== undefined && avgTech < bp.minTech) continue
    if (bp.minPopLog !== undefined && logPopTotal < bp.minPopLog) continue

    const key = `ev:${bp.id}`
    if (onCooldown(world, key, bp.cooldown)) continue
    if (!rng.chance(clamp(bp.chance * span, 0, 0.62))) continue

    const target = bp.tribal ? rng.pick(alive) : null
    const subject = target ? target.name : '全体文明体'
    const affected = target ? [target] : alive
    for (const tribe of affected) applyEffect(tribe, bp.effect)
    touchFlag(world, key)

    logs.push(logEvent(world, bp.type, bp.title(subject), bp.detail(subject), target?.id))
  }

  return logs
}
