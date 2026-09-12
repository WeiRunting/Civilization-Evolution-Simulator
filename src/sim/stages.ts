import type { InstStageTag, WorldState } from './types'
import { CIV, DIM_KEYS } from './config'
import { clamp, clamp01, fromLog10, log10Add } from './num'
import { hexToRgba } from '../utils/color'

export interface Stage {
  index: number
  name: string
  /** 卡尔达肖夫指数，无上限外推 */
  kardashev: number
  /** 单步（1 tick）跨越的年限 */
  yearsPerTick: number
  minCivIndex: number
  tag: InstStageTag
  accentFrom: string
  accentTo: string
  description: string
}

/** 预设阶梯：从当代信息纪元一路到银河帝国与超越层 */
const BASE_STAGES: Stage[] = [
  {
    index: 0,
    name: '当代 · 信息纪元',
    kardashev: 0.73,
    yearsPerTick: 1,
    minCivIndex: 0,
    tag: 'info',
    accentFrom: '#6E8BFF',
    accentTo: '#22D3EE',
    description: '文明起点。全球互联的信息社会，能源仍依赖化石与裂变，人类尚未走出地月系统。',
  },
  {
    index: 1,
    name: '近未来 · 智能纪元',
    kardashev: 0.79,
    yearsPerTick: 2,
    minCivIndex: 44,
    tag: 'ai',
    accentFrom: '#22D3EE',
    accentTo: '#A855F7',
    description: '通用智能与可控聚变相继落地，寿命显著延长，社会结构因自动化而剧烈重组。',
  },
  {
    index: 2,
    name: '行星文明',
    kardashev: 1.02,
    yearsPerTick: 5,
    minCivIndex: 56,
    tag: 'planetary',
    accentFrom: '#34D399',
    accentTo: '#22D3EE',
    description: '气候工程与轨道工业成型，人类首次以单一行星为单位组织资源与治理。',
  },
  {
    index: 3,
    name: '恒星系文明',
    kardashev: 1.86,
    yearsPerTick: 15,
    minCivIndex: 68,
    tag: 'stellar',
    accentFrom: '#6E8BFF',
    accentTo: '#A855F7',
    description: '戴森云开始遮蔽恒星，行星改造工程遍及奥尔特云内外，母星成为集体记忆。',
  },
  {
    index: 4,
    name: '星际文明',
    kardashev: 2.31,
    yearsPerTick: 40,
    minCivIndex: 78,
    tag: 'interstellar',
    accentFrom: '#A855F7',
    accentTo: '#FF6B5B',
    description: '曲率与虫洞通道打通，数百个恒星系纳入同一套贸易与法律秩序。',
  },
  {
    index: 5,
    name: '星系文明',
    kardashev: 2.94,
    yearsPerTick: 150,
    minCivIndex: 88,
    tag: 'galactic',
    accentFrom: '#F2B84B',
    accentTo: '#A855F7',
    description: '旋臂之间的航路贯通，数以亿计的恒星系被同一文明触及，银河成为一张版图。',
  },
  {
    index: 6,
    name: '银河帝国',
    kardashev: 3.05,
    yearsPerTick: 600,
    minCivIndex: 97,
    tag: 'galactic',
    accentFrom: '#F2B84B',
    accentTo: '#FFE7A8',
    description: '银河系被单一政体统一，银河法典通行全境，心理史学成为治理工具。',
  },
  {
    index: 7,
    name: '超越层',
    kardashev: 3.28,
    yearsPerTick: 2500,
    minCivIndex: 112,
    tag: 'transcendent',
    accentFrom: '#A855F7',
    accentTo: '#22D3EE',
    description: '意识可上传、可编辑，文明以矩阵与跨星系织网的形式存在，物理边界开始失去意义。',
  },
]

const TRANSCEND_ACCENTS: Array<[string, string]> = [
  ['#A855F7', '#22D3EE'],
  ['#22D3EE', '#4ADE80'],
  ['#4ADE80', '#F2B84B'],
  ['#F2B84B', '#6E8BFF'],
  ['#6E8BFF', '#FF6B5B'],
  ['#FF6B5B', '#A855F7'],
]

/**
 * 阶段阶梯的参数化外推。
 * 索引超出预设表长后不再依赖写死的列表，而是按公式继续生成阶段名与效果参数，
 * 因此「文明是否有上限」在代码层面确实没有上限。
 */
export function deriveStage(index: number): Stage {
  const safeIndex = Math.max(0, Math.floor(index))
  if (safeIndex < BASE_STAGES.length) return BASE_STAGES[safeIndex]

  const depth = safeIndex - (BASE_STAGES.length - 1)
  const minCivIndex = 112 + depth * 15 + depth * depth * 0.8
  const [accentFrom, accentTo] = TRANSCEND_ACCENTS[safeIndex % TRANSCEND_ACCENTS.length]

  return {
    index: safeIndex,
    name: `超越层 · Ω-${depth}`,
    kardashev: 3.28 + depth * 0.36,
    yearsPerTick: Math.min(2500 * Math.pow(5, depth), 5e8),
    minCivIndex,
    tag: 'transcendent',
    accentFrom,
    accentTo,
    description: `第 ${depth} 次超脱。文明已不再以行星或恒星为存在单位，其规模与时间感超出原始人类的语言所能描述。此后阶梯由公式续写，永不封顶。`,
  }
}

export function stageAt(index: number): Stage {
  return deriveStage(index)
}

/** 由文明指数反查阶段索引，超出预设阶梯时按公式继续外推 */
export function stageForCivIndex(civIndex: number): number {
  if (civIndex < BASE_STAGES[1].minCivIndex) return 0
  for (let i = BASE_STAGES.length - 1; i >= 1; i -= 1) {
    if (civIndex >= BASE_STAGES[i].minCivIndex) {
      if (i < BASE_STAGES.length - 1) return i
      let index = i
      while (index < 512 && civIndex >= deriveStage(index + 1).minCivIndex) index += 1
      return index
    }
  }
  return 0
}

/** 到下一阶段的进度 0..1 */
export function stageProgress(civIndex: number): number {
  const index = stageForCivIndex(civIndex)
  const current = deriveStage(index)
  const next = deriveStage(index + 1)
  const span = next.minCivIndex - current.minCivIndex
  if (span <= 0) return 0
  return clamp01((civIndex - current.minCivIndex) / span)
}

export function stageCssVars(stage: Stage): Record<string, string> {
  return {
    '--stage-from': stage.accentFrom,
    '--stage-to': stage.accentTo,
    '--stage-glow': hexToRgba(stage.accentFrom, 0.32),
    '--stage-nebula-a': hexToRgba(stage.accentFrom, 0.16),
    '--stage-nebula-b': hexToRgba(stage.accentTo, 0.13),
    '--stage-grid': hexToRgba(stage.accentFrom, 0.05),
  }
}

export function averageDims(world: WorldState): Record<string, number> {
  const alive = world.tribes.filter((t) => t.alive)
  const result: Record<string, number> = {}
  for (const key of DIM_KEYS) {
    if (!alive.length) {
      result[key] = 0
      continue
    }
    const sum = alive.reduce((acc, tribe) => acc + tribe.dims[key], 0)
    result[key] = sum / alive.length
  }
  return result
}

export function totalLogPopulation(world: WorldState): number {
  let total = -Infinity
  for (const tribe of world.tribes) {
    if (!tribe.alive) continue
    total = log10Add(total, tribe.logPopulation)
  }
  return total === -Infinity ? 0 : total
}

/**
 * 文明指数：连续、不封顶。
 * 由科技、人口量级、殖民地量级、疆域量级、五维综合分与升维层数合成，
 * 阶段只是它的分档映射，所以文明没有硬性天花板。
 */
export function computeCivIndex(world: WorldState): number {
  const alive = world.tribes.filter((t) => t.alive)
  if (!alive.length) return 0

  const techAvg = alive.reduce((acc, t) => acc + t.tech, 0) / alive.length
  const logPopTotal = totalLogPopulation(world)
  const maxColony = alive.reduce((acc, t) => Math.max(acc, t.logColonies), 0)
  const maxReach = alive.reduce((acc, t) => Math.max(acc, t.logReach), 0)

  const dimAvg =
    DIM_KEYS.reduce((acc, key) => {
      const sum = alive.reduce((s, t) => s + t.dims[key], 0) / alive.length
      return acc + sum
    }, 0) / DIM_KEYS.length

  const ascensionTotal = alive.reduce(
    (acc, t) => acc + DIM_KEYS.reduce((s, key) => s + t.ascension[key], 0),
    0,
  )

  const sTech = techAvg / 100
  const sPop = Math.max(0, (logPopTotal - CIV.popRef) / CIV.popSpan)
  const sColony = Math.max(0, maxColony / CIV.colonySpan)
  const sReach = Math.max(0, (maxReach - CIV.reachRef) / CIV.reachSpan)
  const sDim = dimAvg / 100

  const core =
    100 *
    (CIV.weightTech * sTech +
      CIV.weightPop * sPop +
      CIV.weightColony * sColony +
      CIV.weightReach * sReach +
      CIV.weightDim * sDim)

  const activeLaws = world.laws.filter((l) => l.isActive).length
  const activeMorals = world.morals.filter((m) => m.isActive).length
  const institutional = Math.min(activeLaws, 40) * 0.05 + Math.min(activeMorals, 30) * 0.04

  return Math.max(0, core + CIV.ascensionWeight * ascensionTotal + institutional)
}

/** 承载上限（log10），决定人口能走多远 */
export function carryingCapacityLog(world: WorldState): number {
  const alive = world.tribes.filter((t) => t.alive)
  if (!alive.length) return 0
  const maxColony = alive.reduce((acc, t) => Math.max(acc, t.logColonies), 0)
  const maxReach = alive.reduce((acc, t) => Math.max(acc, t.logReach), 0)
  const techAvg = alive.reduce((acc, t) => acc + t.tech, 0) / alive.length
  const ascensionTotal = alive.reduce(
    (acc, t) => acc + DIM_KEYS.reduce((s, key) => s + t.ascension[key], 0),
    0,
  )
  return (
    9.9 +
    0.55 * maxColony +
    0.35 * Math.max(0, maxReach + 3.5) +
    0.02 * (techAvg - 70) +
    1.2 * ascensionTotal
  )
}

export function populationScale(logPopulation: number): number {
  return fromLog10(clamp(logPopulation, 0, 30))
}

export const ALL_BASE_STAGES = BASE_STAGES
