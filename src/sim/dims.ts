import type { DimKey, FiveDims, WorldState } from './types'
import { DIM_KEYS, TAU } from './config'
import { clamp, clamp01, converge } from './num'
import type { Rng } from './rng'
import type { InstitutionEffects } from './types'
import { ascensionTotal, dimPower } from './agents'
import { logEvent } from './log'

/** 触发升维所需的科技门槛：每超脱一次，门槛显著抬高 */
export function ascensionTechGate(tribe: WorldState['tribes'][number], key: DimKey): number {
  const total = ascensionTotal(tribe)
  return 96 + 34 * total + 18 * tribe.ascension[key]
}

/**
 * 五维相互影响的演化方程。
 *
 * 每个维度都有一个由「其他维度 + 资源 + 制度」共同决定的目标值，再用收敛因子逼近，
 * 因此既体现耦合关系，又天然饱和、不会发散。
 */
export function dimTargets(
  tribe: WorldState['tribes'][number],
  effects: InstitutionEffects,
): FiveDims {
  const tech = clamp(tribe.tech, 0, 260)
  const de = dimPower(tribe, 'de')
  const zhi = dimPower(tribe, 'zhi')
  const ti = dimPower(tribe, 'ti')
  const mei = dimPower(tribe, 'mei')
  const lao = dimPower(tribe, 'lao')
  const happiness = tribe.happiness
  const food = tribe.food
  const lawPressure = 100 - effects.crimeRate * 100

  const targetDe = 0.32 * mei + 0.2 * zhi + 0.16 * de + 0.16 * happiness + 0.16 * lawPressure
  const targetZhi =
    0.28 * de + 0.22 * zhi + 0.16 * lao + 0.18 * Math.min(tech, 120) + 0.16 * lawPressure
  const targetTi = 0.3 * food + 0.24 * lao + 0.2 * ti + 0.14 * Math.min(tech, 100) + 0.12 * happiness
  const targetMei = 0.3 * happiness + 0.22 * mei + 0.18 * de + 0.14 * zhi + 0.16 * Math.min(tech, 100)
  const targetLao = 0.28 * Math.min(tech, 120) + 0.22 * lao + 0.2 * ti + 0.14 * de + 0.16 * food

  // 制度通过 dimDrift 直接改写漂移方向：编辑道德约束会真实改变五维的走向
  const horizon = 60
  return {
    de: targetDe + effects.dimDrift.de * horizon,
    zhi: targetZhi + effects.dimDrift.zhi * horizon,
    ti: targetTi + effects.dimDrift.ti * horizon,
    mei: targetMei + effects.dimDrift.mei * horizon,
    lao: targetLao + effects.dimDrift.lao * horizon,
  }
}

export interface AscensionEvent {
  key: DimKey
  title: string
  detail: string
}

/**
 * 推演五维并处理升维。
 * 五维始终保持在 0-100，因此上帝视角的滑块手感不会被无限增长冲垮；
 * 文明要走得更远，依靠的是「超脱层数」带来的指数级效能加成。
 */
export function stepDims(
  world: WorldState,
  tribe: WorldState['tribes'][number],
  effects: InstitutionEffects,
  rng: Rng,
  years: number,
): AscensionEvent[] {
  const events: AscensionEvent[] = []
  const targets = dimTargets(tribe, effects)
  const t = converge(years, TAU.dim)
  const maxDelta = 2 + 44 * t

  for (const key of DIM_KEYS) {
    const before = tribe.dims[key]
    const delta = (clamp(targets[key], 0, 100) - before) * t * 0.62
    const capped = clamp(delta, -maxDelta, maxDelta)
    let next = clamp(before + capped + rng.normal(0, 0.06 * Math.sqrt(years)), 0, 100)

    if (
      next >= 99.4 &&
      tribe.tech >= ascensionTechGate(tribe, key) &&
      rng.chance(clamp01(0.02 * Math.min(years, 30)) + 0.004)
    ) {
      tribe.ascension[key] += 1
      const total = ascensionTotal(tribe)
      next = clamp(58 + total * 3 + rng.range(-3, 3), 0, 100)
      events.push({
        key,
        title: `${tribe.name}的「${key.toUpperCase()}维」完成第 ${tribe.ascension[key]} 次超脱`,
        detail: `该维度已达生物与技术的表达上限，文明以自我改写的方式跃过了它。此后再无标尺可以衡量这一维度上的差距，只能以超脱层数计。`,
      })
    }

    tribe.dims[key] = next
  }

  for (const event of events) {
    logEvent(world, 'culture', event.title, event.detail, tribe.id)
  }

  return events
}
