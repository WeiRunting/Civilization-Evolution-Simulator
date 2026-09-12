import { useEffect, useRef } from 'react'
import { useWorldStore } from '../../store/useWorldStore'
import { useElementSize } from '../../hooks/useElementSize'

/**
 * 个体点阵图：Canvas 2D 自绘。
 * 横轴为智、纵轴为劳，颜色区分文明体、亮度映射德、点径映射人口权重。
 * 由于代表个体带权重，200 个点即可代表 10^18 级人口分布形态。
 */
export function DotMatrix() {
  const world = useWorldStore((state) => state.world)
  const { ref: boxRef, size } = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width < 40 || size.height < 40) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(size.width * dpr)
    canvas.height = Math.floor(size.height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)

    const padX = 26
    const padY = 18
    const plotW = size.width - padX * 2
    const plotH = size.height - padY * 2

    ctx.strokeStyle = 'rgba(255,255,255,0.09)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i += 1) {
      const y = padY + (plotH / 4) * i
      ctx.beginPath()
      ctx.moveTo(padX, y)
      ctx.lineTo(padX + plotW, y)
      ctx.stroke()
      const x = padX + (plotW / 4) * i
      ctx.beginPath()
      ctx.moveTo(x, padY)
      ctx.lineTo(x, padY + plotH)
      ctx.stroke()
    }

    const alive = world.tribes.filter((tribe) => tribe.alive)
    const totalLog = Math.max(1, alive.reduce((acc, tribe) => Math.max(acc, tribe.logPopulation), 1))

    for (const tribe of alive) {
      const weightScale = 0.6 + (tribe.logPopulation / totalLog) * 1.1
      for (const agent of tribe.agents) {
        const x = padX + (agent.dims.zhi / 100) * plotW
        const y = padY + (1 - agent.dims.lao / 100) * plotH
        const radius = (1.1 + Math.abs(agent.talent) * 1.3) * weightScale
        const alpha = 0.24 + (agent.dims.de / 100) * 0.6
        ctx.beginPath()
        ctx.fillStyle = `${tribe.color}${Math.round(Math.min(1, alpha) * 255)
          .toString(16)
          .padStart(2, '0')}`
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 轴线与刻度文案
    ctx.fillStyle = 'rgba(143,160,196,0.85)'
    ctx.font = '11px "Source Han Sans SC", system-ui, sans-serif'
    ctx.fillText('智 →', padX + plotW - 26, padY + plotH + 14)
    ctx.save()
    ctx.translate(12, padY + 30)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('劳 →', 0, 0)
    ctx.restore()
    ctx.fillStyle = 'rgba(90,103,133,0.9)'
    ctx.fillText('0', padX - 4, padY + plotH + 13)
    ctx.fillText('100', padX + plotW - 16, padY + plotH + 13)
  }, [world, size])

  return (
    <div ref={boxRef} className="relative h-[300px] w-full">
      <canvas ref={canvasRef} className="h-full w-full rounded-xl" />
      <p className="pointer-events-none absolute right-2 top-1 text-[10px] text-ink-2">
        代表个体 {world.tribes.filter((t) => t.alive).length * 200} 个
      </p>
    </div>
  )
}
