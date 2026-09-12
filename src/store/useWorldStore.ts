import { create } from 'zustand'
import type { GodAction, WorldState } from '../sim/types'
import { MAX_TICKS_PER_FRAME, START_YEAR } from '../sim/config'
import { hashSeedFromTime } from '../sim/rng'
import { applyGodAction, createWorld } from '../sim/world'
import { stepWorld } from '../sim/engine'
import { clearSave, hasSave, loadWorld, saveWorld } from './persist'

export type ViewKey = 'overview' | 'galaxy' | 'codex' | 'chronicle'
export type WorldView = ViewKey
export type Speed = 1 | 2 | 5
export type Scope = 'all' | string

export interface Milestone {
  id: number
  title: string
  detail: string
}

export interface Notice {
  id: number
  text: string
  tone: 'ok' | 'warn'
}

interface WorldStore {
  world: WorldState
  running: boolean
  speed: Speed
  view: ViewKey
  scope: Scope
  selectedTribeId: string | null
  milestone: Milestone | null
  notice: Notice | null
  lastStepMs: number
  savedAt: number | null
  tick: (ticks?: number) => void
  setRunning: (running: boolean) => void
  toggleRunning: () => void
  setSpeed: (speed: Speed) => void
  setView: (view: ViewKey) => void
  setScope: (scope: Scope) => void
  selectTribe: (tribeId: string | null) => void
  god: (action: GodAction) => void
  resetWorld: (seed?: number) => void
  save: () => void
  load: () => void
  dismissMilestone: () => void
  notify: (text: string, tone?: 'ok' | 'warn') => void
}

/**
 * 引擎在原地改写 WorldState，因此每次同步都做一层浅拷贝并按需复制被渲染的数组，
 * 让 React 能以稳定的引用比较判断是否需要重绘。
 */
function snapshot(world: WorldState): WorldState {
  return {
    ...world,
    tribes: world.tribes.slice(),
    laws: world.laws.slice(),
    morals: world.morals.slice(),
    history: world.history.slice(),
    chronicle: world.chronicle.slice(),
  }
}

export const useWorldStore = create<WorldStore>((set, get) => ({
  world: createWorld(),
  running: false,
  speed: 1,
  view: 'overview',
  scope: 'all',
  selectedTribeId: null,
  milestone: null,
  notice: null,
  lastStepMs: 0,
  savedAt: null,

  tick: (ticks = 1) => {
    const count = Math.max(1, Math.min(Math.floor(ticks), MAX_TICKS_PER_FRAME * 4))
    const world = get().world
    const beforeStage = world.stageIndex
    const start = performance.now()
    stepWorld(world, count)
    const elapsed = performance.now() - start
    const next: Partial<WorldStore> = { world: snapshot(world), lastStepMs: elapsed }

    if (world.stageIndex > beforeStage) {
      const entry = [...world.chronicle].reverse().find((item) => item.type === 'stage')
      next.milestone = {
        id: Date.now(),
        title: entry?.title ?? '纪元跃迁',
        detail: entry?.detail ?? '文明指数越过阈值，时间尺度随之放大。',
      }
    }
    set(next)
  },

  setRunning: (running) => set({ running }),
  toggleRunning: () => set({ running: !get().running }),
  setSpeed: (speed) => set({ speed }),
  setView: (view) => set({ view }),
  setScope: (scope) => set({ scope }),
  selectTribe: (tribeId) => set({ selectedTribeId: tribeId, scope: tribeId ?? 'all' }),

  god: (action) => {
    const world = get().world
    applyGodAction(world, action)
    set({ world: snapshot(world) })
  },

  resetWorld: (seed) => {
    const nextSeed = seed ?? hashSeedFromTime()
    set({
      world: createWorld(nextSeed),
      running: false,
      milestone: null,
      scope: 'all',
      selectedTribeId: null,
      lastStepMs: 0,
      notice: { id: Date.now(), text: `已重置时间轴，新文明自 ${START_YEAR} 年重新起算。`, tone: 'ok' },
    })
  },

  save: () => {
    const world = get().world
    saveWorld(world)
    const savedAt = Date.now()
    set({
      savedAt,
      notice: { id: savedAt, text: `世界已存档至本地（第 ${Math.round(world.year)} 年）。`, tone: 'ok' },
    })
  },

  load: () => {
    if (!hasSave()) {
      set({ notice: { id: Date.now(), text: '本地暂无存档，请先存档再读取。', tone: 'warn' } })
      return
    }
    const loaded = loadWorld()
    if (!loaded) {
      set({ notice: { id: Date.now(), text: '存档已损坏或不完整，已保持当前世界。', tone: 'warn' } })
      return
    }
    set({
      world: snapshot(loaded.world),
      running: false,
      savedAt: loaded.savedAt,
      milestone: null,
      scope: 'all',
      selectedTribeId: null,
      notice: {
        id: Date.now(),
        text: `已读取存档：第 ${Math.round(loaded.world.year)} 年，${loaded.world.stageIndex} 级文明。`,
        tone: 'ok',
      },
    })
  },

  dismissMilestone: () => set({ milestone: null }),
  notify: (text, tone = 'ok') => set({ notice: { id: Date.now(), text, tone } }),
}))

/** 初始化时尝试读取本地存档；失败则保留 2026 年的新世界 */
export function bootstrapWorld(): void {
  if (!hasSave()) return
  const loaded = loadWorld()
  if (!loaded) return
  useWorldStore.setState({ world: snapshot(loaded.world), savedAt: loaded.savedAt })
}
