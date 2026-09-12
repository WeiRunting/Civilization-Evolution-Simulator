import type { EventLog, InstitutionEffects, Tribe, WorldState } from './types'
import { CONFLICT, DIM_KEYS, POP, TAU, TECH } from './config'
import { clamp, clamp01, rateToLogDelta, saturate } from './num'
import { ascensionTotal, dimPower } from './agents'
import { projectEffects } from './institutions'
import { logEvent, onCooldown, touchFlag } from './log'
import type { Rng } from './rng'

/**
 * 环境与粮食。
 * 产能由劳维（升维后为劳务效能）、科技与殖民地规模共同决定，
 * 人口压力与骚乱风险会反向压低有效供给。
 */
export function stepFood(
  tribe: Tribe,
  effects: InstitutionEffects,
  capacityLog: number,
  years: number,
): void {
  const lao = dimPower(tribe, 'lao')
  const pressure = clamp01((tribe.logPopulation - POP.pressureRef) / POP.roomSpan)
  const target = clamp(
    22 +
      lao * 0.58 +
      tribe.tech * 0.12 +
      Math.max(0, capacityLog - POP.pressureRef) * 3 +
      tribe.logColonies * 3.5 -
      pressure * 15 -
      effects.revoltRisk * 7,
    4,
    100,
  )
  tribe.food = clamp(saturate(tribe.food, target, years, TAU.food, 9), 0, 100)
}

/**
 * 生存与人口，全程在对数域完成。
 * 出生率受制度生育系数与粮食驱动，死亡率受寿命系数与人口压力驱动，
 * 接近承载上限时净增长率线性衰减，因此永远不会突破量级天花板。
 */
export function stepPopulation(
  tribe: Tribe,
  effects: InstitutionEffects,
  capacityLog: number,
  years: number,
): void {
  const pressure = clamp01((tribe.logPopulation - POP.pressureRef) / POP.roomSpan)
  const room = clamp01((capacityLog - tribe.logPopulation) / POP.roomSpan + 0.35)
  const birth =
    POP.birthBase * effects.fertility * (1 - pressure * 0.38) * (1 + clamp(tribe.food, 0, 100) / 260)
  const death =
    (POP.deathBase / Math.max(effects.longevity, 0.4)) *
    (1 + pressure * 0.55 + (1 - clamp(tribe.food, 0, 100) / 100) * 0.45)
  const net = birth - death
  const effective = net >= 0 ? net * room : net * (1 + (1 - room) * 0.55)
  const ceiling = Math.min(capacityLog + 0.35, POP.logCeiling)
  const next = tribe.logPopulation + rateToLogDelta(effective, years)
  tribe.logPopulation = clamp(next, POP.logFloor, Math.max(POP.logFloor, ceiling))
}

/** 科技进步：智维为核心，制度创新力为乘数，殖民地与疆域提供溢出收益 */
export function stepTech(tribe: Tribe, effects: InstitutionEffects, years: number): void {
  const zhi = dimPower(tribe, 'zhi')
  const ascensionBoost = 1 + 0.14 * ascensionTotal(tribe)
  const drive = TECH.growth * effects.innovation * (0.45 + zhi / 150) * ascensionBoost
  const colonial =
    TECH.colonyBonus * tribe.logColonies + TECH.reachBonus * Math.max(0, tribe.logReach + 3.5)
  const drain = TECH.militaryCost * clamp((tribe.military - 55) / 45, 0, 1) * 3
  const friction = 1 / (1 + Math.max(0, tribe.tech - 45) / 170)
  const gain = (drive * friction + colonial - drain) * years * 0.12
  tribe.tech = clamp(tribe.tech + gain, 0, 600)
}

/** 幸福指数：审美与德行抬升，人口压力、骚乱与制度苛政下压 */
export function stepHappiness(tribe: Tribe, effects: InstitutionEffects, years: number): void {
  const mei = dimPower(tribe, 'mei')
  const de = dimPower(tribe, 'de')
  const pressure = clamp01((tribe.logPopulation - POP.pressureRef) / POP.roomSpan)
  const target = clamp(
    34 +
      mei * 0.3 +
      de * 0.13 +
      clamp(tribe.food, 0, 100) * 0.2 +
      effects.happiness -
      pressure * 13 -
      effects.revoltRisk * 12,
    0,
    100,
  )
  tribe.happiness = clamp(saturate(tribe.happiness, target, years, TAU.happiness, 11), 0, 100)
}

/** 军事能力：体维为底，科技与舰队当量加成 */
export function stepMilitary(tribe: Tribe, effects: InstitutionEffects, years: number): void {
  const ti = dimPower(tribe, 'ti')
  const target = clamp(
    8 +
      ti * 0.4 +
      tribe.tech * 0.2 +
      Math.max(0, tribe.logFleets + 6) * 3 +
      effects.divergenceTension * 8,
    0,
    100,
  )
  tribe.military = clamp(saturate(tribe.military, target, years, TAU.military, 10), 0, 100)
}

/** 双方关系的目标值：五维与德行趋同、贸易往来抬升，制度差异与冲突倾向压低 */
export function relationTarget(
  a: Tribe,
  b: Tribe,
  ea: InstitutionEffects,
  eb: InstitutionEffects,
): number {
  let distance = 0
  for (const key of DIM_KEYS) {
    distance += Math.abs(dimPower(a, key) - dimPower(b, key))
  }
  distance = clamp01(distance / (DIM_KEYS.length * 100))
  const deGap = Math.abs(a.dims.de - b.dims.de) / 100
  const tension = (ea.divergenceTension + eb.divergenceTension) / 2
  const conflict = (ea.conflictDelta + eb.conflictDelta) / 2
  const affinity = ((a.dims.de + b.dims.de) / 2 - 55) * 0.35
  const trade =
    Math.max(a.logColonies, b.logColonies) * 1.6 + Math.max(a.logReach, b.logReach) * 1.2
  return clamp(
    18 - distance * 170 + (1 - deGap) * 22 + affinity + trade - tension * 62 + conflict * 34,
    CONFLICT.relationFloor,
    CONFLICT.relationCeil,
  )
}

function setRelation(world: WorldState, i: number, j: number, value: number): void {
  const row = world.relations[i]
  if (!row) return
  row[j] = value
  const mirror = world.relations[j]
  if (mirror) mirror[i] = value
}

/**
 * 族群关系与冲突。
 * 关系向「由五维、德行与制度张力决定的目标值」收敛；
 * 关系跌破战争阈值时按概率开战，造成人口、幸福与科技的不可逆损失。
 */
export function stepRelations(world: WorldState, rng: Rng, years: number): EventLog[] {
  const logs: EventLog[] = []
  const alive = world.tribes.filter((t) => t.alive)
  if (alive.length < 2) return logs

  const indexOf = new Map<string, number>()
  world.tribes.forEach((tribe, index) => indexOf.set(tribe.id, index))
  const effects = new Map<string, InstitutionEffects>()
  for (const tribe of alive) effects.set(tribe.id, projectEffects(world, tribe))

  const maxDelta = 1 + (22 * Math.min(years, 30)) / 30

  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      const a = alive[i]
      const b = alive[j]
      const ia = indexOf.get(a.id)
      const ib = indexOf.get(b.id)
      if (ia === undefined || ib === undefined) continue

      const target = relationTarget(a, b, effects.get(a.id)!, effects.get(b.id)!)
      const current = world.relations[ia]?.[ib] ?? 0
      let next = saturate(current, target, years, TAU.relations, maxDelta)
      next = clamp(next, CONFLICT.relationFloor, CONFLICT.relationCeil)

      if (next < CONFLICT.warThreshold) {
        const key = `war:${a.id}:${b.id}`
        const chance = CONFLICT.warChance * (0.15 + clamp01(Math.min(years, 40) / 40))
        if (!onCooldown(world, key, 70) && rng.chance(chance)) {
          const logDelta = -0.02 - rng.next() * 0.03
          const lossA = clamp(fromLogLoss(a.logPopulation, logDelta), 0, 1)
          const lossB = clamp(fromLogLoss(b.logPopulation, logDelta), 0, 1)
          a.logPopulation = clamp(a.logPopulation + logDelta, 3, 26)
          b.logPopulation = clamp(b.logPopulation + logDelta, 3, 26)
          a.happiness = clamp(a.happiness - 9 - rng.range(0, 6), 0, 100)
          b.happiness = clamp(b.happiness - 9 - rng.range(0, 6), 0, 100)
          a.tech = clamp(a.tech - 1.6, 0, 600)
          b.tech = clamp(b.tech - 1.6, 0, 600)
          next = -18
          touchFlag(world, key)
          logs.push(
            logEvent(
              world,
              'war',
              `${a.name}与${b.name}爆发战争`,
              `长期恶化的关系终于越过了战争门槛。冲突持续数年，${a.name}失去约 ${(lossA * 100).toFixed(1)}% 的人口，${b.name}失去约 ${(lossB * 100).toFixed(1)}%。战后的疆界被重新划在谈判桌上，而仇恨被写进了两边的教科书。`,
            ),
          )
        }
      }

      setRelation(world, ia, ib, next)
    }
  }

  return logs
}

/** 由 log10 域的衰减量反推线性比例，用于战损文案 */
function fromLogLoss(logPopulation: number, logDelta: number): number {
  const before = Math.pow(10, logPopulation)
  const after = Math.pow(10, logPopulation + logDelta)
  if (!Number.isFinite(before) || before <= 0) return 0
  return 1 - after / before
}
