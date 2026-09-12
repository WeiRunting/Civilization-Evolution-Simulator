/**
 * 确定性随机：mulberry32。
 * 世界的随机状态保存在 WorldState.rngState 中，因此「同种子 + 同干预序列」必然复现同一段历史。
 */

export function nextRandom(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, state: t | 0 }
}

/** 可变的随机游标，避免在方程中到处传递 state */
export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed | 0
  }

  get current(): number {
    return this.state
  }

  next(): number {
    const step = nextRandom(this.state)
    this.state = step.state
    return step.value
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** 以 p 的概率返回 true */
  chance(p: number): boolean {
    return this.next() < p
  }

  /** 近似正态分布（Box-Muller 简化版），用于个体天赋与噪声 */
  normal(mean = 0, sd = 1): number {
    const u = Math.max(this.next(), 1e-9)
    const v = this.next()
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    return mean + z * sd
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length) % items.length]
  }
}

export function hashStringToSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h | 0
}

/** 「重置时间轴」使用：每次开启一段不可复现的新历史 */
export function hashSeedFromTime(): number {
  const mixed = Date.now() ^ Math.floor(Math.random() * 0xffffffff)
  return mixed | 0
}
