import type { WorldState } from '../sim/types'
import { SAVE_VERSION, START_YEAR } from '../sim/config'
import { createWorld, sanitizeWorld } from '../sim/world'

const SAVE_KEY = 'civilization-sim.world'

export interface SaveEnvelope {
  version: number
  savedAt: number
  world: WorldState
}

/**
 * 存档写入：结构带 version 字段，便于后续迁移。
 * 写入失败（隐私模式、配额耗尽）只记录错误，不影响正在运行的推演。
 */
export function saveWorld(world: WorldState): boolean {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, savedAt: Date.now(), world }
  const payload = JSON.stringify(envelope)
  window.localStorage.setItem(SAVE_KEY, payload)
  return true
}

export function hasSave(): boolean {
  return window.localStorage.getItem(SAVE_KEY) !== null
}

export function clearSave(): void {
  window.localStorage.removeItem(SAVE_KEY)
}

export function saveMeta(): { savedAt: number; year: number } | null {
  const envelope = readEnvelope()
  if (!envelope) return null
  return { savedAt: envelope.savedAt, year: Math.round(envelope.world.year) }
}

/**
 * 读档：先做结构性预检，再补齐缺失字段。
 * 结构不可识别时返回 null，由调用方回退到新世界，绝不阻断启动。
 */
function readEnvelope(): SaveEnvelope | null {
  const raw = window.localStorage.getItem(SAVE_KEY)
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.length < 32 || trimmed[0] !== '{' || trimmed[trimmed.length - 1] !== '}') {
    console.error('[persist] 存档结构异常，已忽略：', trimmed.slice(0, 40))
    return null
  }
  if (!trimmed.includes('"world"') || !trimmed.includes('"tribes"')) {
    console.error('[persist] 存档缺少关键字段，已忽略')
    return null
  }
  const parsed = JSON.parse(trimmed) as Partial<SaveEnvelope>
  if (!parsed.world || typeof parsed.world !== 'object') {
    console.error('[persist] 存档主体缺失，已忽略')
    return null
  }
  return {
    version: typeof parsed.version === 'number' ? parsed.version : SAVE_VERSION,
    savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    world: parsed.world,
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isUsableWorld(world: WorldState): boolean {
  if (!Array.isArray(world.tribes) || world.tribes.length === 0) return false
  if (!Array.isArray(world.relations)) return false
  if (!Array.isArray(world.chronicle)) return false
  if (!isFiniteNumber(world.year) || !isFiniteNumber(world.civIndex)) return false
  return world.tribes.every(
    (tribe) =>
      tribe &&
      typeof tribe.id === 'string' &&
      tribe.dims !== undefined &&
      tribe.ascension !== undefined &&
      Array.isArray(tribe.agents) &&
      isFiniteNumber(tribe.logPopulation) &&
      isFiniteNumber(tribe.tech),
  )
}

/** 版本迁移与字段兜底：老存档缺失的新字段一律补默认值 */
function migrate(raw: WorldState): WorldState {
  const fallback = createWorld(raw.seed ?? START_YEAR)
  const world: WorldState = {
    ...fallback,
    ...raw,
    version: SAVE_VERSION,
    yearsPerTick:
      isFiniteNumber(raw.yearsPerTick) && raw.yearsPerTick > 0
        ? raw.yearsPerTick
        : fallback.yearsPerTick,
    flags: raw.flags && typeof raw.flags === 'object' ? raw.flags : {},
    history: Array.isArray(raw.history) ? raw.history : [],
    chronicle: Array.isArray(raw.chronicle) ? raw.chronicle : [],
    laws: Array.isArray(raw.laws) ? raw.laws : fallback.laws,
    morals: Array.isArray(raw.morals) ? raw.morals : fallback.morals,
    tribes: raw.tribes.map((tribe) => ({
      ...tribe,
      ascension: tribe.ascension ?? { de: 0, zhi: 0, ti: 0, mei: 0, lao: 0 },
      agents: Array.isArray(tribe.agents) ? tribe.agents : [],
      alive: tribe.alive !== false,
    })),
  }

  // 关系矩阵尺寸必须与文明体数量一致，否则重新按默认值铺满
  const size = world.tribes.length
  if (world.relations.length !== size || world.relations.some((row) => row.length !== size)) {
    world.relations = Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => (i === j ? 100 : 0)),
    )
  }

  sanitizeWorld(world)
  return world
}

export function loadWorld(): { world: WorldState; savedAt: number } | null {
  const envelope = readEnvelope()
  if (!envelope) return null
  if (!isUsableWorld(envelope.world)) {
    console.error('[persist] 存档内容不完整，已回退到新世界')
    return null
  }
  return { world: migrate(envelope.world), savedAt: envelope.savedAt }
}
