import { useEffect, useRef } from 'react'
import { useWorldStore } from '../../store/useWorldStore'
import { useElementSize } from '../../hooks/useElementSize'
import { clamp01 } from '../../sim/num'

export interface GalaxyLayers {
  colonies: boolean
  reach: boolean
  trade: boolean
  conflict: boolean
}

interface StarPoint {
  x: number
  y: number
  r: number
  a: number
}

function buildStars(width: number, height: number): StarPoint[] {
  const stars: StarPoint[] = []
  for (let i = 0; i < 420; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.5 + 0.12,
    })
  }
  return stars
}

/** 由 log10 光年映射到画布半径占比：2026 年的 -3.5 对应中心一点，30 对应边缘 */
function reachRatio(logReach: number): number {
  return clamp01((logReach + 3.5) / 22)
}

/**
 * 疆域星图：独立 rAF 直写 Canvas，约 30fps，不触发 React 重渲染。
 * 旋臂底纹为静态星点，殖民地、疆域半径、贸易线与冲突热区按图层开关绘制。
 */
export function GalaxyMap({ layers }: { layers: GalaxyLayers }) {
  const world = useWorldStore((state) => state.world)
  const { ref: boxRef, size } = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef(world)
  const layersRef = useRef(layers)
  const starsRef = useRef<StarPoint[]>([])
  const phaseRef = useRef(0)

  worldRef.current = world
  layersRef.current = layers

  useEffect(() => {
    starsRef.current = buildStars(size.width || 600, size.height || 360)
  }, [size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width < 60 || size.height < 60) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let raf = 0
    let last = 0
    let disposed = false

    const draw = (now: number) => {
      if (disposed) return
      raf = window.requestAnimationFrame(draw)
      if (now - last < 32) return
      last = now
      phaseRef.current += 0.06

      const current = worldRef.current
      const active = layersRef.current
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = size.width
      const height = size.height
      const targetW = Math.floor(width * dpr)
      const targetH = Math.floor(height * dpr)
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW
        canvas.height = targetH
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cx = width / 2
      const cy = height / 2
      const maxRadius = Math.min(width, height) * 0.46

      ctx.fillStyle = 'rgba(7,11,24,0.55)'
      ctx.fillRect(0, 0, width, height)

      for (const star of starsRef.current) {
        ctx.beginPath()
        ctx.fillStyle = `rgba(234,240,255,${star.a})`
        ctx.arc(star.x % width, star.y % height, star.r, 0, Math.PI * 2)
        ctx.fill()
      }

      const alive = current.tribes.filter((tribe) => tribe.alive)

      if (active.reach) {
        for (const tribe of alive) {
          const radius = 10 + reachRatio(tribe.logReach) * maxRadius
          ctx.beginPath()
          ctx.strokeStyle = `${tribe.color}55`
          ctx.lineWidth = 1.2
          ctx.setLineDash([6, 6])
          ctx.arc(cx, cy, radius, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // 殖民地：沿旋臂撒点，数量与 colonization 量级正相关
      if (active.colonies) {
        alive.forEach((tribe, tribeIndex) => {
          const count = Math.min(46, Math.round(tribe.logColonies * 9) + 5)
          const span = 10 + reachRatio(tribe.logReach) * maxRadius
          for (let i = 0; i < count; i += 1) {
            const t = i / count
            const angle = t * Math.PI * 3.2 + tribeIndex * 1.1 + phaseRef.current * 0.012
            const radius = 14 + t * span * 0.94
            const x = cx + Math.cos(angle) * radius
            const y = cy + Math.sin(angle) * radius * 0.62
            const size2 = 1.1 + (tribe.logColonies / 12) * 1.8
            ctx.beginPath()
            ctx.fillStyle = `${tribe.color}${i % 7 === 0 ? 'ee' : '77'}`
            ctx.arc(x, y, size2, 0, Math.PI * 2)
            ctx.fill()
          }
        })
      }

      // 贸易线与冲突热区：关系为正画连线，为负画红色热区
      if (active.trade || active.conflict) {
        const indexOf = new Map<string, number>()
        current.tribes.forEach((tribe, index) => indexOf.set(tribe.id, index))
        for (let i = 0; i < alive.length; i += 1) {
          for (let j = i + 1; j < alive.length; j += 1) {
            const a = alive[i]
            const b = alive[j]
            const ia = indexOf.get(a.id)
            const ib = indexOf.get(b.id)
            if (ia === undefined || ib === undefined) continue
            const relation = current.relations[ia]?.[ib] ?? 0
            const angleA = (i / Math.max(1, alive.length)) * Math.PI * 2
            const angleB = (j / Math.max(1, alive.length)) * Math.PI * 2
            const ra = 18 + reachRatio(a.logReach) * maxRadius
            const rb = 18 + reachRatio(b.logReach) * maxRadius
            const ax = cx + Math.cos(angleA) * ra
            const ay = cy + Math.sin(angleA) * ra * 0.62
            const bx = cx + Math.cos(angleB) * rb
            const by = cy + Math.sin(angleB) * rb * 0.62

            if (active.trade && relation > 24) {
              ctx.beginPath()
              ctx.strokeStyle = `rgba(110,139,255,${Math.min(0.4, relation / 240)})`
              ctx.lineWidth = 1
              ctx.moveTo(ax, ay)
              ctx.lineTo(bx, by)
              ctx.stroke()

              const t = ((phaseRef.current * 0.02 + i * 0.1) % 1 + 1) % 1
              const px = ax + (bx - ax) * t
              const py = ay + (by - ay) * t
              ctx.beginPath()
              ctx.fillStyle = 'rgba(34,211,238,0.9)'
              ctx.arc(px, py, 1.8, 0, Math.PI * 2)
              ctx.fill()
            }

            if (active.conflict && relation < -18) {
              ctx.beginPath()
              ctx.strokeStyle = `rgba(248,113,113,${Math.min(0.65, Math.abs(relation) / 160)})`
              ctx.lineWidth = 1.6
              ctx.setLineDash([4, 5])
              ctx.moveTo(ax, ay)
              ctx.lineTo(bx, by)
              ctx.stroke()
              ctx.setLineDash([])
            }
          }
        }
      }

      // 文明的「太阳」：亮度随科技增长
      for (const tribe of alive) {
        const glow = 6 + Math.min(26, tribe.tech / 12)
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glow)
        gradient.addColorStop(0, `${tribe.color}cc`)
        gradient.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.fillStyle = gradient
        ctx.arc(cx, cy, glow, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    raf = window.requestAnimationFrame(draw)
    return () => {
      disposed = true
      window.cancelAnimationFrame(raf)
    }
  }, [size])

  return (
    <div ref={boxRef} className="relative h-[420px] w-full overflow-hidden rounded-panel border border-white/10">
      <canvas ref={canvasRef} className="h-full w-full" />
      <p className="pointer-events-none absolute bottom-2 left-3 text-[10px] text-ink-2">
        中心为各族群的母星系，虚线圆为疆域半径，流动光点为星际贸易线
      </p>
    </div>
  )
}
