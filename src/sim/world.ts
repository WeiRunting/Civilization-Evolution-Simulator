import type {
  DimKey,
  FiveDims,
  GodAction,
  LawItem,
  MoralItem,
  Tribe,
  WorldState,
} from './types'
import {
  DIM_DEFAULT,
  DIM_KEYS,
  DIM_META,
  EXPANSION,
  HISTORY_LIMIT,
  POP,
  SAVE_VERSION,
  START_YEAR,
  colonizeChance,
} from './config'
import { Rng, hashStringToSeed } from './rng'
import { clamp, formatLogNumber } from './num'
import { makeTribe, shiftAgents } from './agents'
import { INITIAL_2026_TRIBES, SEED_LAWS, SEED_MORALS } from './presets'
import { computeCivIndex, deriveStage, stageForCivIndex, totalLogPopulation } from './stages'
import { projectEffects } from './institutions'
import { relationTarget } from './equations'
import { logEvent } from './log'

function seedInstitutions(world: WorldState): void {
  SEED_LAWS.forEach((seed, index) => {
    world.nextSeq += 1
    world.laws.push({
      id: `law-seed-${index}`,
      title: seed.title,
      category: seed.category,
      stageTag: 'info',
      scope: 'all',
      strictness: seed.strictness,
      enforcement: seed.enforcement,
      enactedYear: START_YEAR,
      originReason: seed.reason,
      isActive: true,
      customByGod: false,
    })
  })

  SEED_MORALS.forEach((seed, index) => {
    world.nextSeq += 1
    world.morals.push({
      id: `moral-seed-${index}`,
      title: seed.title,
      bindDim: seed.bindDim,
      stageTag: 'info',
      strength: seed.strength,
      prevalence: seed.prevalence,
      originYear: START_YEAR,
      originReason: seed.reason,
      isActive: true,
      customByGod: false,
    })
  })
}

/** 文明体的关系矩阵以「在 tribes 数组中的下标」为索引，死亡文明体保留占位以稳定下标 */
export function registerTribe(world: WorldState, tribe: Tribe): void {
  const index = world.tribes.length
  world.tribes.push(tribe)
  const size = world.tribes.length

  for (const row of world.relations) {
    while (row.length < size) row.push(0)
  }
  while (world.relations.length < size) {
    world.relations.push(new Array<number>(size).fill(0))
  }

  world.relations[index][index] = 100
  for (let i = 0; i < index; i += 1) {
    const other = world.tribes[i]
    if (!other.alive) continue
    const value = relationTarget(
      tribe,
      other,
      projectEffects(world, tribe),
      projectEffects(world, other),
    )
    world.relations[index][i] = value
    world.relations[i][index] = value
  }
}

/** 2026 起点世界：现实文明圈 + 当代国际制度池，五维与人口均为真实量级 */
export function createWorld(seed = 20260912): WorldState {
  const world: WorldState = {
    version: SAVE_VERSION,
    seed,
    rngState: seed,
    startYear: START_YEAR,
    year: START_YEAR,
    stageIndex: 0,
    civIndex: 0,
    yearsPerTick: deriveStage(0).yearsPerTick,
    tribes: [],
    laws: [],
    morals: [],
    relations: [],
    chronicle: [],
    history: [],
    nextAgentId: 0,
    nextSeq: 0,
    flags: {},
  }

  seedInstitutions(world)

  const rng = new Rng(hashStringToSeed(`${seed}-2026`))
  for (const preset of INITIAL_2026_TRIBES) {
    const tribe = makeTribe(world, rng, {
      id: preset.id,
      name: preset.name,
      color: preset.color,
      dims: preset.dims,
      logPopulation: preset.logPopulation,
      tech: preset.tech,
      happiness: preset.happiness,
      food: preset.food,
      military: preset.military,
    })
    registerTribe(world, tribe)
  }

  world.rngState = rng.current
  world.civIndex = computeCivIndex(world)
  world.stageIndex = stageForCivIndex(world.civIndex)
  world.yearsPerTick = deriveStage(world.stageIndex).yearsPerTick
  pushHistory(world)

  logEvent(
    world,
    'stage',
    `${START_YEAR} 年 · 文明演化的起点`,
    `时间从 ${START_YEAR} 年的当代人类社会起算。此刻全球被划分为八个文明圈，能源仍依赖化石与裂变，人类尚未走出地月系统。此后的一切——无论是跃迁到行星文明，还是在某一次战争后退回分裂——都将由德智体美劳五维的演化自行决定。`,
  )

  return world
}

/** 平均值汇总：面板与编年史都消费同一组统计口径 */
export function averageDimsOf(world: WorldState): FiveDims {
  const alive = world.tribes.filter((t) => t.alive)
  const result = { ...DIM_DEFAULT }
  if (!alive.length) return result
  for (const key of DIM_KEYS) {
    result[key] = alive.reduce((acc, t) => acc + t.dims[key], 0) / alive.length
  }
  return result
}

/** 历史环形缓冲：每 tick 追加一点，超出上限后丢弃最旧的一点 */
export function pushHistory(world: WorldState): void {
  const alive = world.tribes.filter((t) => t.alive)
  const dims = averageDimsOf(world)
  world.history.push({
    year: Math.round(world.year),
    stageIndex: world.stageIndex,
    civIndex: world.civIndex,
    logPopulation: totalLogPopulation(world),
    tech: alive.length ? alive.reduce((a, t) => a + t.tech, 0) / alive.length : 0,
    happiness: alive.length ? alive.reduce((a, t) => a + t.happiness, 0) / alive.length : 0,
    food: alive.length ? alive.reduce((a, t) => a + t.food, 0) / alive.length : 0,
    dims,
    lawCount: world.laws.filter((l) => l.isActive).length,
    moralCount: world.morals.filter((m) => m.isActive).length,
  })
  if (world.history.length > HISTORY_LIMIT) {
    world.history.splice(0, world.history.length - HISTORY_LIMIT)
  }
}

function guard(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return clamp(fallback, min, max)
  return clamp(value, min, max)
}

/**
 * 数值稳定保护：任何一次推演结束后都强制把状态约束回合法区间。
 * 大数域运算 + 收敛方程已从根上避免发散，这里是最后一道兜底，确保永远不会出现 NaN。
 */
export function sanitizeWorld(world: WorldState): void {
  for (const tribe of world.tribes) {
    tribe.logPopulation = guard(tribe.logPopulation, POP.logFloor, POP.logCeiling, POP.pressureRef)
    tribe.tech = guard(tribe.tech, 0, 600, 60)
    tribe.happiness = guard(tribe.happiness, 0, 100, 60)
    tribe.food = guard(tribe.food, 0, 100, 60)
    tribe.military = guard(tribe.military, 0, 100, 50)
    tribe.logColonies = guard(tribe.logColonies, 0, 30, 0)
    tribe.logReach = guard(tribe.logReach, -3.5, 30, -3.5)
    tribe.logFleets = guard(tribe.logFleets, -10, 30, -6)
    for (const key of DIM_KEYS) {
      tribe.dims[key] = guard(tribe.dims[key], 0, 100, DIM_DEFAULT[key])
    }
  }
  world.civIndex = guard(world.civIndex, 0, 1e6, 0)
  world.year = guard(world.year, world.startYear, 1e9, world.startYear)
  if (!Number.isFinite(world.yearsPerTick) || world.yearsPerTick <= 0) {
    world.yearsPerTick = deriveStage(world.stageIndex).yearsPerTick
  }
  if (world.history.length > HISTORY_LIMIT) {
    world.history.splice(0, world.history.length - HISTORY_LIMIT)
  }
  if (world.chronicle.length > 4000) {
    world.chronicle.splice(0, world.chronicle.length - 4000)
  }
}

function resolveTribes(world: WorldState, scope: string): Tribe[] {
  if (scope === 'all') return world.tribes.filter((t) => t.alive)
  return world.tribes.filter((t) => t.alive && t.id === scope)
}

function scopeLabel(world: WorldState, scope: string): string {
  if (scope === 'all') return '全体文明体'
  return world.tribes.find((t) => t.id === scope)?.name ?? '指定文明体'
}

function describeDims(dims: Partial<FiveDims>): string {
  const parts: string[] = []
  for (const key of DIM_KEYS) {
    const value = dims[key as DimKey]
    if (value === undefined) continue
    parts.push(`${DIM_META[key].label} ${Math.round(value)}`)
  }
  return parts.length ? parts.join('、') : '未指定'
}

/**
 * 神谕干预：唯一允许从外部改写世界的入口。
 * 所有干预只影响未来 tick，并且一律写入编年史，保证「改了什么、何时改的」可追溯。
 */
export function applyGodAction(world: WorldState, action: GodAction): WorldState {
  switch (action.kind) {
    case 'setDims': {
      const label = scopeLabel(world, action.scope)
      for (const tribe of resolveTribes(world, action.scope)) {
        for (const key of DIM_KEYS) {
          const value = action.dims[key]
          if (value === undefined) continue
          tribe.dims[key] = clamp(value, 0, 100)
        }
        shiftAgents(tribe, tribe.dims, 0.72)
      }
      logEvent(
        world,
        'divine',
        `神谕降临：改写${label}的五维`,
        `${label}被直接置于新的坐标上（${describeDims(action.dims)}）。代表个体的分布随之向新均值靠拢，但文化惯性与制度成本仍会在之后数十年里把曲线拉回它的旧轨道。`,
      )
      break
    }
    case 'adjustDim': {
      const label = scopeLabel(world, action.scope)
      for (const tribe of resolveTribes(world, action.scope)) {
        tribe.dims[action.dim] = clamp(tribe.dims[action.dim] + action.delta, 0, 100)
        shiftAgents(tribe, tribe.dims, 0.62)
      }
      const meta = DIM_META[action.dim]
      logEvent(
        world,
        'divine',
        `神谕降临：${label}的${meta.label}维 ${action.delta >= 0 ? '+' : ''}${action.delta.toFixed(1)}`,
        `${meta.label}维（${meta.desc}）被外力推离原轨，现值 ${Math.round(
          resolveTribes(world, action.scope)[0]?.dims[action.dim] ?? 0,
        )}。该维将按自身的耦合方程继续演化。`,
      )
      break
    }
    case 'setPopulation':
    case 'scalePopulation': {
      const label = scopeLabel(world, action.scope)
      for (const tribe of resolveTribes(world, action.scope)) {
        if (action.kind === 'setPopulation') {
          tribe.logPopulation = clamp(action.logPopulation, POP.logFloor, POP.logCeiling)
        } else {
          const factor = clamp(action.factor, 1e-6, 1e9)
          tribe.logPopulation = clamp(
            tribe.logPopulation + Math.log10(factor),
            POP.logFloor,
            POP.logCeiling,
          )
        }
      }
      logEvent(
        world,
        'divine',
        `神谕降临：${label}的人口被重写`,
        `人口量级被外力直接改写。承载上限并未改变，因此若新的人口超过生态与产能所能支撑的规模，死亡率会在随后数十年内自行把曲线压回。`,
      )
      break
    }
    case 'addTribe': {
      const rng = new Rng(hashStringToSeed(`${world.seed}-${world.nextSeq}-${action.name}`))
      const tribe = makeTribe(world, rng, {
        id: `tribe-${world.nextSeq + 1}`,
        name: action.name,
        color: action.color,
        dims: action.dims,
        logPopulation: clamp(action.logPopulation, POP.logFloor, POP.logCeiling),
        tech: action.tech ?? 55,
      })
      registerTribe(world, tribe)
      logEvent(
        world,
        'divine',
        `神谕降临：${action.name}被创造`,
        `一个新的文明体在推演中被凭空写入，起始人口量级 10^${tribe.logPopulation.toFixed(1)}，五维为 ${describeDims(tribe.dims)}。它与其他文明体的初始关系由五维距离与制度张力即时决定。`,
        tribe.id,
      )
      break
    }
    case 'removeTribe': {
      const tribe = world.tribes.find((t) => t.id === action.tribeId)
      if (!tribe) break
      tribe.alive = false
      logEvent(
        world,
        'divine',
        `神谕降临：${tribe.name}被抹去`,
        `${tribe.name}的一切统计量停止演化，其编年史条目保留在档案中。它所占据的生态位会在随后被邻近文明体逐步填补。`,
        tribe.id,
      )
      break
    }
    case 'renameTribe': {
      const tribe = world.tribes.find((t) => t.id === action.tribeId)
      if (!tribe) break
      const oldName = tribe.name
      tribe.name = action.name
      if (action.color) tribe.color = action.color
      logEvent(
        world,
        'divine',
        `神谕降临：${oldName}更名为${action.name}`,
        `同一群人的自我称谓被改写。名字不会改变五维，但会改变他们如何讲述自己的历史。`,
        tribe.id,
      )
      break
    }
    case 'upsertLaw': {
      const law: LawItem = { ...action.law, customByGod: true }
      const index = world.laws.findIndex((item) => item.id === law.id)
      if (index >= 0) {
        law.enactedYear = world.laws[index].enactedYear
        world.laws[index] = law
      } else {
        law.enactedYear = Math.round(world.year)
        world.laws.push(law)
      }
      logEvent(
        world,
        'law',
        `${Math.round(world.year)} 年，神谕降临：${index >= 0 ? '修订' : '增订'}《${law.title}》`,
        `条文以严苛度 ${Math.round(law.strictness)}、执行率 ${Math.round(law.enforcement)} 写入法典，适用于${
          law.scope === 'all' ? '全体文明体' : `${law.scope.length} 个指定文明体`
        }。立法缘由：${law.originReason}`,
      )
      break
    }
    case 'removeLaw': {
      const law = world.laws.find((item) => item.id === action.id)
      if (!law) break
      world.laws = world.laws.filter((item) => item.id !== action.id)
      logEvent(
        world,
        'law',
        `《${law.title}》被神谕删除`,
        `该条文不再存在于任何一份法典之中，其对社会的作用系数在同一 tick 内失效。废除从不意味着遗忘——被它塑造过的行为习惯仍会残留一段时间。`,
      )
      break
    }
    case 'toggleLaw': {
      const law = world.laws.find((item) => item.id === action.id)
      if (!law) break
      law.isActive = !law.isActive
      logEvent(
        world,
        'law',
        `《${law.title}》${law.isActive ? '恢复施行' : '被暂停施行'}`,
        `${law.isActive ? '条文重新进入执行链条' : '条文暂挂，其严苛度与执行率不再参与效果投影'}。`,
      )
      break
    }
    case 'upsertMoral': {
      const moral: MoralItem = { ...action.moral, customByGod: true }
      const index = world.morals.findIndex((item) => item.id === moral.id)
      if (index >= 0) {
        moral.originYear = world.morals[index].originYear
        world.morals[index] = moral
      } else {
        moral.originYear = Math.round(world.year)
        world.morals.push(moral)
      }
      logEvent(
        world,
        'moral',
        `${Math.round(world.year)} 年，神谕降临：${index >= 0 ? '修订' : '写入'}「${moral.title}」`,
        `准则的内化强度为 ${Math.round(moral.strength)}、普及率 ${Math.round(moral.prevalence)}%，绑定维度为 ${
          moral.bindDim === 'conflict' ? '冲突与容忍' : DIM_META[moral.bindDim].label
        }。将漂移方向改写为：${moral.originReason}`,
      )
      break
    }
    case 'removeMoral': {
      const moral = world.morals.find((item) => item.id === action.id)
      if (!moral) break
      world.morals = world.morals.filter((item) => item.id !== action.id)
      logEvent(
        world,
        'moral',
        `「${moral.title}」被神谕删除`,
        `这项准则从社会的道德结构中消失，绑定维度上的漂移推力随之撤销。新一代人不会在成长中习得它。`,
      )
      break
    }
    case 'toggleMoral': {
      const moral = world.morals.find((item) => item.id === action.id)
      if (!moral) break
      moral.isActive = !moral.isActive
      logEvent(
        world,
        'moral',
        `「${moral.title}」${moral.isActive ? '重新被社会内化' : '停止传承'}`,
        `${moral.isActive ? '准则重新进入道德结构' : '准则暂时退出道德结构，不再对五维产生漂移推力'}。`,
      )
      break
    }
    case 'pushExpansion': {
      const label = scopeLabel(world, action.scope)
      const targets = resolveTribes(world, action.scope)
      if (!targets.length) break

      const rng = new Rng(hashStringToSeed(`${world.seed}-${world.nextSeq}-${action.mode}-${Math.round(world.year)}`))
      let succeeded = 0
      let failed = 0

      for (const tribe of targets) {
        if (action.mode === 'colonize') {
          const chance = colonizeChance(tribe.tech, tribe.dims.lao, tribe.logColonies)
          if (rng.chance(chance)) {
            tribe.logColonies = clamp(tribe.logColonies + EXPANSION.colonyGain, 0, 30)
            tribe.logReach = clamp(tribe.logReach + EXPANSION.reachGain, -3.5, 30)
            tribe.logFleets = clamp(tribe.logFleets + EXPANSION.fleetGain * 0.4, -10, 30)
            succeeded += 1
          } else {
            // 反噬：远航失败消耗储备与士气，并让舰队蒙受损失
            tribe.happiness = clamp(tribe.happiness - 2.4, 0, 100)
            tribe.military = clamp(tribe.military - 1.6, 0, 100)
            tribe.food = clamp(tribe.food - 2, 0, 100)
            failed += 1
          }
        } else if (action.mode === 'fortify') {
          tribe.logReach = clamp(tribe.logReach - EXPANSION.reachGain * 0.6, -3.5, 30)
          tribe.military = clamp(tribe.military + 6, 0, 100)
          tribe.happiness = clamp(tribe.happiness + 2.2, 0, 100)
          succeeded += 1
        } else {
          tribe.logFleets = clamp(tribe.logFleets + EXPANSION.fleetGain, -10, 30)
          tribe.logReach = clamp(tribe.logReach + EXPANSION.reachGain * 0.4, -3.5, 30)
          tribe.tech = clamp(tribe.tech + 0.6, 0, 600)
          succeeded += 1
        }
      }

      const modeLabel =
        action.mode === 'colonize' ? '加速殖民' : action.mode === 'fortify' ? '收缩防线' : '建立中继'
      const lead = targets[0]
      const detail =
        action.mode === 'colonize'
          ? `神谕要求全力外拓。${targets.length} 个文明体同时起航，其中 ${succeeded} 次成功：定居星系推进到 ${formatLogNumber(
              lead.logColonies,
            )} 个，疆域半径约 ${formatLogNumber(lead.logReach + 3.5)} 光年。${failed > 0 ? `另有 ${failed} 支船队失联，储备与士气出现损伤。` : '这一次没有船队失联。'}`
          : action.mode === 'fortify'
            ? `神谕令边界向内收拢。${targets.length} 个文明体放弃最外层的据点，疆域半径退到约 ${formatLogNumber(
                lead.logReach + 3.5,
              )} 光年，换来更厚的防线与更高的内部安定。`
            : `神谕在中继节点上点亮航标。${targets.length} 个文明体的舰队当量抬升至 ${formatLogNumber(
                lead.logFleets,
              )}，跨星系通信与投送的延迟显著下降，科技随之受益。`

      logEvent(world, 'expansion', `神谕降临：${label}${modeLabel}`, detail)
      break
    }
    default:
      break
  }
  return world
}

/** 供 UI 复用的轻量统计，避免在组件里重复聚合 */
export function worldSummary(world: WorldState): {
  logPopulation: number
  dims: FiveDims
  tech: number
  happiness: number
  food: number
  lawCount: number
  moralCount: number
  aliveCount: number
} {
  const alive = world.tribes.filter((t) => t.alive)
  return {
    logPopulation: totalLogPopulation(world),
    dims: averageDimsOf(world),
    tech: alive.length ? alive.reduce((a, t) => a + t.tech, 0) / alive.length : 0,
    happiness: alive.length ? alive.reduce((a, t) => a + t.happiness, 0) / alive.length : 0,
    food: alive.length ? alive.reduce((a, t) => a + t.food, 0) / alive.length : 0,
    lawCount: world.laws.filter((l) => l.isActive).length,
    moralCount: world.morals.filter((m) => m.isActive).length,
    aliveCount: alive.length,
  }
}
