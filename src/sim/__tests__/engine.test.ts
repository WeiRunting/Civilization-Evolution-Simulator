import { describe, expect, it } from 'vitest'
import { applyGodAction, createWorld, sanitizeWorld, worldSummary } from '../world'
import { stepWorld, updateStage } from '../engine'
import { computeCivIndex, deriveStage, stageForCivIndex } from '../stages'
import { projectEffects } from '../institutions'
import { DIM_KEYS, HISTORY_LIMIT, POP, colonizeChance } from '../config'
import type { WorldState } from '../types'

function allFinite(world: WorldState): boolean {
  for (const tribe of world.tribes) {
    const values = [
      tribe.logPopulation,
      tribe.tech,
      tribe.happiness,
      tribe.food,
      tribe.military,
      tribe.logColonies,
      tribe.logReach,
      tribe.logFleets,
      ...DIM_KEYS.map((key) => tribe.dims[key]),
      ...DIM_KEYS.map((key) => tribe.ascension[key]),
    ]
    if (values.some((value) => !Number.isFinite(value))) return false
    for (const agent of tribe.agents) {
      if (!Number.isFinite(agent.age) || !Number.isFinite(agent.talent)) return false
      if (DIM_KEYS.some((key) => !Number.isFinite(agent.dims[key]))) return false
    }
  }
  return (
    Number.isFinite(world.year) &&
    Number.isFinite(world.civIndex) &&
    Number.isFinite(world.yearsPerTick) &&
    Number.isFinite(world.rngState) &&
    world.relations.every((row) => row.every((value) => Number.isFinite(value)))
  )
}

describe('确定性随机与复现', () => {
  it('同一种子推进相同 tick 数应得到完全一致的历史', () => {
    const a = createWorld(20260912)
    const b = createWorld(20260912)
    stepWorld(a, 260)
    stepWorld(b, 260)

    const sa = worldSummary(a)
    const sb = worldSummary(b)
    expect(sa.logPopulation).toBeCloseTo(sb.logPopulation, 10)
    expect(sa.tech).toBeCloseTo(sb.tech, 10)
    expect(a.year).toBe(b.year)
    expect(a.chronicle.length).toBe(b.chronicle.length)
    expect(a.tribes.map((t) => t.logPopulation)).toEqual(b.tribes.map((t) => t.logPopulation))
  })

  it('不同种子应产生不同的演化轨迹', () => {
    const a = createWorld(1)
    const b = createWorld(2)
    stepWorld(a, 200)
    stepWorld(b, 200)
    expect(a.tribes[0].happiness).not.toBeCloseTo(b.tribes[0].happiness, 6)
  })
})

describe('起点锚定与阶段外推', () => {
  it('世界从 2026 年的当代信息纪元起步', () => {
    const world = createWorld()
    expect(world.startYear).toBe(2026)
    expect(world.year).toBe(2026)
    expect(world.stageIndex).toBe(0)
    expect(world.yearsPerTick).toBe(1)
    expect(world.tribes.length).toBe(8)
    expect(world.laws.length).toBeGreaterThan(0)
    expect(world.morals.length).toBeGreaterThan(0)
  })

  it('阶段阶梯按公式无限外推，且文明指数不封顶', () => {
    expect(deriveStage(8).minCivIndex).toBeGreaterThan(deriveStage(7).minCivIndex)
    expect(deriveStage(40).minCivIndex).toBeGreaterThan(deriveStage(20).minCivIndex)
    expect(stageForCivIndex(100000)).toBeGreaterThan(7)
  })

  it('文明指数足够高时应跃迁到更高纪元并放大单步年限', () => {
    const world = createWorld(11)
    for (const tribe of world.tribes) {
      tribe.tech = 200
      tribe.logColonies = 9
      tribe.logReach = 7
      tribe.logPopulation = 14
      for (const key of DIM_KEYS) tribe.dims[key] = 100
    }
    updateStage(world)
    expect(world.stageIndex).toBeGreaterThanOrEqual(4)
    expect(world.yearsPerTick).toBeGreaterThan(1)
    expect(world.civIndex).toBeGreaterThan(60)
  })

  it('长时段大步长推演不产生 NaN，且历史缓冲不超上限', () => {
    const world = createWorld(777)
    stepWorld(world, 900)
    world.yearsPerTick = 400
    stepWorld(world, 700)
    expect(allFinite(world)).toBe(true)
    expect(world.history.length).toBeLessThanOrEqual(HISTORY_LIMIT)
    expect(world.year).toBeGreaterThan(2026 + 100000)
  })
})

describe('神谕干预', () => {
  it('调整五维与人口即时生效，且不回改既有历史曲线', () => {
    const world = createWorld(31)
    stepWorld(world, 40)
    const historyBefore = world.history.map((point) => point.dims.de)

    applyGodAction(world, { kind: 'setDims', scope: 'cn', dims: { de: 12 } })
    applyGodAction(world, { kind: 'scalePopulation', scope: 'all', factor: 10 })

    const cn = world.tribes.find((tribe) => tribe.id === 'cn')!
    expect(cn.dims.de).toBe(12)
    expect(world.history.map((point) => point.dims.de)).toEqual(historyBefore)
    expect(world.chronicle.some((entry) => entry.type === 'divine')).toBe(true)
  })

  it('人口始终被约束在合法对数区间内', () => {
    const world = createWorld(32)
    applyGodAction(world, { kind: 'setPopulation', scope: 'all', logPopulation: 99 })
    for (const tribe of world.tribes) {
      expect(tribe.logPopulation).toBeLessThanOrEqual(POP.logCeiling)
    }
    applyGodAction(world, { kind: 'scalePopulation', scope: 'all', factor: 1e-9 })
    for (const tribe of world.tribes) {
      expect(tribe.logPopulation).toBeGreaterThanOrEqual(POP.logFloor)
    }
  })

  it('新增与删除文明体会同步维护关系矩阵', () => {
    const world = createWorld(33)
    applyGodAction(world, {
      kind: 'addTribe',
      name: '测试文明',
      color: '#6E8BFF',
      dims: { de: 50, zhi: 50, ti: 50, mei: 50, lao: 50 },
      logPopulation: 8,
    })
    expect(world.relations.length).toBe(world.tribes.length)
    expect(world.relations[0].length).toBe(world.tribes.length)

    const added = world.tribes[world.tribes.length - 1]
    applyGodAction(world, { kind: 'removeTribe', tribeId: added.id })
    expect(world.tribes.find((t) => t.id === added.id)?.alive).toBe(false)
    expect(world.relations.length).toBe(world.tribes.length)
  })
})

describe('制度编辑即时生效', () => {
  it('新增高执行率律法会立刻改变制度效果投影', () => {
    const world = createWorld(41)
    const tribe = world.tribes[0]
    const before = projectEffects(world, tribe)

    applyGodAction(world, {
      kind: 'upsertLaw',
      law: {
        id: 'law-test',
        title: '测试严刑法',
        category: 'criminal',
        stageTag: 'info',
        scope: 'all',
        strictness: 96,
        enforcement: 92,
        enactedYear: world.year,
        originReason: '用于验证编辑即时生效。',
        isActive: true,
        customByGod: false,
      },
    })

    // 执法能力上升 → 犯罪率下降，且条文被标记为神谕所订，不会被制度层自动淘汰
    const after = projectEffects(world, tribe)
    expect(after.crimeRate).toBeLessThan(before.crimeRate)
    expect(world.laws.find((law) => law.id === 'law-test')?.customByGod).toBe(true)

    applyGodAction(world, { kind: 'toggleLaw', id: 'law-test' })
    expect(projectEffects(world, tribe).crimeRate).toBeCloseTo(before.crimeRate, 10)

    applyGodAction(world, { kind: 'removeLaw', id: 'law-test' })
    expect(world.laws.some((law) => law.id === 'law-test')).toBe(false)
  })

  it('严苛度越过阈值后会推高起义风险', () => {
    const world = createWorld(43)
    for (const law of world.laws) law.isActive = false
    const tribe = world.tribes[0]
    const none = projectEffects(world, tribe)

    applyGodAction(world, {
      kind: 'upsertLaw',
      law: {
        id: 'law-harsh',
        title: '测试高压法令',
        category: 'military',
        stageTag: 'info',
        scope: 'all',
        strictness: 98,
        enforcement: 100,
        enactedYear: world.year,
        originReason: '用于验证严苛度对起义风险的推力。',
        isActive: true,
        customByGod: false,
      },
    })

    const harsh = projectEffects(world, tribe)
    expect(harsh.revoltRisk).toBeGreaterThan(none.revoltRisk)
    expect(harsh.happiness).toBeLessThan(none.happiness)
  })

  it('道德约束的绑定维度决定五维漂移方向', () => {
    const world = createWorld(42)
    const tribe = world.tribes[0]
    const before = projectEffects(world, tribe).dimDrift.de

    applyGodAction(world, {
      kind: 'upsertMoral',
      moral: {
        id: 'moral-test',
        title: '测试德性',
        bindDim: 'de',
        stageTag: 'info',
        strength: 95,
        prevalence: 90,
        originYear: world.year,
        originReason: '用于验证道德对五维漂移的推力。',
        isActive: true,
        customByGod: false,
      },
    })

    expect(projectEffects(world, tribe).dimDrift.de).toBeGreaterThan(before)
  })
})

describe('疆域神迹', () => {
  it('加速殖民要么推进殖民地，要么留下反噬，且不产生非法数值', () => {
    const world = createWorld(61)
    const colonies = world.tribes.map((tribe) => tribe.logColonies)
    const military = world.tribes.map((tribe) => tribe.military)

    applyGodAction(world, { kind: 'pushExpansion', scope: 'all', mode: 'colonize' })

    const colonized = world.tribes.some((tribe, index) => tribe.logColonies > colonies[index] + 1e-9)
    const punished = world.tribes.some((tribe, index) => tribe.military < military[index] - 1e-9)
    expect(colonized || punished).toBe(true)
    expect(allFinite(world)).toBe(true)
    expect(world.chronicle.some((entry) => entry.type === 'expansion')).toBe(true)
  })

  it('收缩防线以疆域半径换取军事动员与内部安定', () => {
    const world = createWorld(62)
    const tribe = world.tribes[0]
    tribe.logReach = 10
    tribe.military = 40
    tribe.happiness = 40

    applyGodAction(world, { kind: 'pushExpansion', scope: tribe.id, mode: 'fortify' })

    expect(tribe.logReach).toBeLessThan(10)
    expect(tribe.military).toBeGreaterThan(40)
    expect(tribe.happiness).toBeGreaterThan(40)
  })

  it('建立中继同时抬升舰队当量与科技，且只作用于目标文明体', () => {
    const world = createWorld(63)
    const tribe = world.tribes[0]
    const other = world.tribes[1]
    const fleets = tribe.logFleets
    const tech = tribe.tech
    const otherFleets = other.logFleets

    applyGodAction(world, { kind: 'pushExpansion', scope: tribe.id, mode: 'relay' })

    expect(tribe.logFleets).toBeGreaterThan(fleets)
    expect(tribe.tech).toBeGreaterThan(tech)
    expect(other.logFleets).toBeCloseTo(otherFleets, 10)
  })

  it('殖民成功率随科技与劳维上升，并被约束在 [0.05, 0.85]', () => {
    expect(colonizeChance(0, 0, 30)).toBeGreaterThanOrEqual(0.05)
    expect(colonizeChance(10000, 100, 0)).toBeLessThanOrEqual(0.85)
    expect(colonizeChance(240, 85, 3)).toBeGreaterThan(colonizeChance(60, 30, 3))
  })
})

describe('数值稳定性兜底', () => {
  it('人为写入非法数值后仍能被兜底修复', () => {
    const world = createWorld(51)
    world.tribes[0].logPopulation = Number.NaN
    world.tribes[0].tech = Number.POSITIVE_INFINITY
    world.tribes[0].dims.de = Number.NaN
    world.civIndex = Number.NaN
    world.yearsPerTick = 0

    sanitizeWorld(world)

    expect(allFinite(world)).toBe(true)
    expect(world.tribes[0].logPopulation).toBeCloseTo(POP.pressureRef, 6)
    expect(world.yearsPerTick).toBe(deriveStage(world.stageIndex).yearsPerTick)
    expect(computeCivIndex(world)).toBeGreaterThan(0)
  })
})
