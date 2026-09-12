import { useEffect, useRef } from 'react'
import { MAX_TICKS_PER_FRAME } from '../sim/config'
import { useWorldStore } from '../store/useWorldStore'
import type { Speed } from '../store/useWorldStore'

/** 倍速只作用于「每秒 tick 数」，与 yearsPerTick（单步代表年限）正交 */
export const TICKS_PER_SECOND: Record<Speed, number> = { 1: 2, 2: 5, 5: 12 }

/**
 * 模拟主循环：requestAnimationFrame 累加器 + 固定步长。
 * 单帧最多执行 MAX_TICKS_PER_FRAME 个 tick，因此切后台回来时不会一次性补算上千步。
 */
export function useSimLoop(): void {
  const running = useWorldStore((state) => state.running)
  const speed = useWorldStore((state) => state.speed)
  const tick = useWorldStore((state) => state.tick)
  const frameRef = useRef(0)

  useEffect(() => {
    if (!running) return undefined

    let raf = 0
    let last = performance.now()
    let accumulator = 0
    const interval = 1000 / TICKS_PER_SECOND[speed]

    const loop = (now: number) => {
      const delta = now - last
      last = now
      accumulator += delta

      let count = 0
      while (accumulator >= interval && count < MAX_TICKS_PER_FRAME) {
        accumulator -= interval
        count += 1
      }
      if (accumulator > interval * MAX_TICKS_PER_FRAME) accumulator = 0

      if (count > 0) {
        frameRef.current += 1
        tick(count)
      }
      raf = window.requestAnimationFrame(loop)
    }

    raf = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(raf)
  }, [running, speed, tick])
}

/** 键盘快捷键：空格暂停 / 播放，方向右键推进一个 tick */
export function useSimHotkeys(): void {
  const toggleRunning = useWorldStore((state) => state.toggleRunning)
  const tick = useWorldStore((state) => state.tick)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (event.code === 'Space') {
        event.preventDefault()
        toggleRunning()
      } else if (event.code === 'ArrowRight') {
        event.preventDefault()
        tick(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tick, toggleRunning])
}
