import type { EventLog, EventType, WorldState } from './types'

/** 编年史写入：所有神迹干预、制度涌现、纪元跃迁都通过它进入叙事 */
export function logEvent(
  world: WorldState,
  type: EventType,
  title: string,
  detail: string,
  tribeId?: string,
): EventLog {
  world.nextSeq += 1
  const entry: EventLog = {
    id: `e${world.nextSeq}`,
    year: Math.round(world.year),
    type,
    title,
    detail,
    tribeId,
  }
  world.chronicle.push(entry)
  return entry
}

/** 冷却判定：以年为单位，避免时间尺度放大后事件刷屏 */
export function onCooldown(world: WorldState, key: string, cooldownYears: number): boolean {
  const last = world.flags[key]
  if (last === undefined) return false
  return world.year - last < cooldownYears
}

export function markFlag(world: WorldState, key: string, value = 1): void {
  world.flags[key] = value
}

export function touchFlag(world: WorldState, key: string): void {
  world.flags[key] = world.year
}
