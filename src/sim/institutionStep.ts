import type { Rng } from './rng'
import type { EventLog, WorldState } from './types'
import { INST, TAU } from './config'
import { clamp, saturate } from './num'
import { logEvent } from './log'

interface Aggregate {
  tech: number
  de: number
  lao: number
  mei: number
  enforcement: number
}

function aggregate(world: WorldState): Aggregate {
  const alive = world.tribes.filter((t) => t.alive)
  if (!alive.length) {
    return { tech: 0, de: 0, lao: 0, mei: 0, enforcement: 0 }
  }
  const laws = world.laws.filter((l) => l.isActive)
  return {
    tech: alive.reduce((a, t) => a + t.tech, 0) / alive.length,
    de: alive.reduce((a, t) => a + t.dims.de, 0) / alive.length,
    lao: alive.reduce((a, t) => a + t.dims.lao, 0) / alive.length,
    mei: alive.reduce((a, t) => a + t.dims.mei, 0) / alive.length,
    enforcement: laws.length ? laws.reduce((a, l) => a + l.enforcement, 0) / laws.length : 0,
  }
}

/**
 * 制度层的逐 tick 推演。
 * 法律：执行率向「社会能力」收敛，能力不足的纸面法律会被淘汰。
 * 道德：普及率受德行与执法效果驱动，内化强度随普及率缓慢跟进，未被传承的准则会自然消散。
 */
export function stepInstitutions(world: WorldState, rng: Rng, years: number): EventLog[] {
  const logs: EventLog[] = []
  const agg = aggregate(world)

  const enforcementTarget = clamp(
    INST.enforcementBase + agg.tech * INST.enforcementTechBonus + agg.de * INST.enforcementDimBonus,
    4,
    97,
  )

  for (const law of world.laws) {
    if (!law.isActive) continue
    law.enforcement = clamp(
      saturate(law.enforcement, enforcementTarget, years, TAU.enforcement, 6),
      0,
      100,
    )
    if (
      !law.customByGod &&
      law.enforcement < 11 &&
      world.year - law.enactedYear > 140 &&
      rng.chance(0.02 * Math.min(years, 40))
    ) {
      law.isActive = false
      logs.push(
        logEvent(
          world,
          'law',
          `《${law.title}》事实上被废止`,
          `条文仍在法典之中，但已无人援引。执行率长期低于一成，任何一次判决都无法落地，它因此从法律退化为一种修辞。`,
        ),
      )
    }
  }

  const prevalenceTarget = clamp(
    INST.prevalenceBase + agg.de * INST.prevalenceDimBonus + agg.enforcement * 0.3,
    5,
    95,
  )

  for (const moral of world.morals) {
    if (!moral.isActive) continue
    moral.prevalence = clamp(
      saturate(moral.prevalence, prevalenceTarget, years, TAU.moral, 8),
      0,
      100,
    )
    const strengthTarget = clamp(28 + moral.prevalence * 0.66 + agg.de * 0.24, 5, 99)
    moral.strength = clamp(
      saturate(moral.strength, strengthTarget, years, TAU.moral * 1.6, 6),
      0,
      100,
    )
    if (!moral.customByGod && moral.prevalence < 9 && world.year - moral.originYear > 200) {
      moral.isActive = false
      logs.push(
        logEvent(
          world,
          'moral',
          `「${moral.title}」在世代交替中失传`,
          `已经没有人再因为违背它而感到不安。它没有被人推翻，只是被遗忘了。`,
        ),
      )
    }
  }

  return logs
}
