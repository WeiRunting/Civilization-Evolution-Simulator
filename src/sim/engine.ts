import type { FiveDims, InstitutionEffects, WorldState } from './types'
import { Rng } from './rng'
import { projectEffects } from './institutions'
import { stepInstitutions } from './institutionStep'
import { detectEmergence } from './emergence'
import { detectEvents } from './events'
import { stepDims } from './dims'
import { stepAgents } from './agents'
import { stepExpansion } from './expansion'
import {
  stepFood,
  stepHappiness,
  stepMilitary,
  stepPopulation,
  stepRelations,
  stepTech,
} from './equations'
import {
  carryingCapacityLog,
  computeCivIndex,
  deriveStage,
  stageForCivIndex,
} from './stages'
import { pushHistory, sanitizeWorld } from './world'
import { logEvent } from './log'
import { clamp } from './num'

/**
 * 单个 tick 的固定执行顺序（顺序本身是模型的一部分，不应随意调整）：
 *   1 环境与粮食 → 2 生存与人口 → 3 五维与升维 → 4 科技 / 军事 / 幸福
 *   → 5 制度执行与道德内化 → 6 个体世代更替 → 7 疆域扩张与分裂
 *   → 8 族群关系与冲突 → 9 分层事件 → 10 制度涌现
 *   → 11 年份推进 → 12 文明指数与纪元跃迁 → 13 历史采样 → 14 数值兜底
 */
function tick(world: WorldState, rng: Rng): void {
  const years = Math.max(world.yearsPerTick, 0.5)
  const alive = world.tribes.filter((t) => t.alive)

  if (!alive.length) {
    world.year += years
    return
  }

  const capacity = carryingCapacityLog(world)
  const effects = new Map<string, InstitutionEffects>()
  const dimsBefore = new Map<string, FiveDims>()

  for (const tribe of alive) {
    const eff = projectEffects(world, tribe)
    effects.set(tribe.id, eff)
    dimsBefore.set(tribe.id, { ...tribe.dims })
    stepFood(tribe, eff, capacity, years)
    stepPopulation(tribe, eff, capacity, years)
  }

  for (const tribe of alive) {
    stepDims(world, tribe, effects.get(tribe.id)!, rng, years)
  }

  for (const tribe of alive) {
    const eff = effects.get(tribe.id)!
    stepTech(tribe, eff, years)
    stepMilitary(tribe, eff, years)
    stepHappiness(tribe, eff, years)
  }

  stepInstitutions(world, rng, years)

  for (const tribe of alive) {
    stepAgents(world, tribe, rng, years, effects.get(tribe.id)!.longevity, dimsBefore.get(tribe.id)!)
  }

  stepExpansion(world, rng, years)
  stepRelations(world, rng, years)
  detectEvents(world, rng, years)
  detectEmergence(world, rng, years)

  world.year += years
  updateStage(world)
  pushHistory(world)
  sanitizeWorld(world)
}

/** 文明指数与纪元跃迁：指数连续，阶段只是它的分档；跨级时一次性记录所有被越过的阶段 */
export function updateStage(world: WorldState): void {
  world.civIndex = clamp(computeCivIndex(world), 0, 1e6)
  const nextIndex = stageForCivIndex(world.civIndex)
  if (nextIndex <= world.stageIndex) return

  for (let index = world.stageIndex + 1; index <= nextIndex; index += 1) {
    const stage = deriveStage(index)
    logEvent(
      world,
      'stage',
      `纪元跃迁 · ${stage.name}`,
      `${stage.description} 自此刻起，单步推演跨越 ${stage.yearsPerTick} 年，卡尔达肖夫指数达到 ${stage.kardashev.toFixed(2)}。`,
    )
  }

  world.stageIndex = nextIndex
  world.yearsPerTick = deriveStage(nextIndex).yearsPerTick
}

/**
 * 主循环：以固定步长推进指定 tick 数。
 * 随机状态在整批 tick 结束后一次性写回，因此批处理与逐 tick 调用得到完全相同的历史。
 */
export function stepWorld(world: WorldState, ticks = 1): WorldState {
  const count = Math.max(1, Math.floor(ticks))
  const rng = new Rng(world.rngState)
  for (let index = 0; index < count; index += 1) {
    tick(world, rng)
  }
  world.rngState = rng.current
  return world
}

export const step = stepWorld

/** 单步（+1 tick），供时间控制台的「单步」按钮使用 */
export function stepOnce(world: WorldState): WorldState {
  return stepWorld(world, 1)
}
