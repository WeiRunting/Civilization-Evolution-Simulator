import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DIM_KEYS, DIM_META } from '../../sim/config'
import { formatLogNumber } from '../../sim/num'
import { deriveStage } from '../../sim/stages'
import { useWorldStore } from '../../store/useWorldStore'
import { Chip, GlassPanel } from '../ui/Primitives'

type MetricKey = 'population' | 'tech' | 'happiness' | 'food' | 'dims' | 'civIndex' | 'laws'

const METRICS: Array<{ key: MetricKey; label: string; color: string; unit: string }> = [
  { key: 'population', label: '总人口', color: '#6E8BFF', unit: '对数域 10^n' },
  { key: 'tech', label: '科技指数', color: '#22D3EE', unit: '0-600' },
  { key: 'happiness', label: '幸福指数', color: '#A855F7', unit: '0-100' },
  { key: 'food', label: '粮食充裕度', color: '#F2B84B', unit: '0-100' },
  { key: 'dims', label: '五维均值', color: '#4ADE80', unit: '0-100' },
  { key: 'civIndex', label: '文明指数', color: '#FF6B5B', unit: '不封顶' },
  { key: 'laws', label: '施行制度数', color: '#34D399', unit: '条' },
]

const RENDER_POINTS = 300

export function TrendChart() {
  const world = useWorldStore((state) => state.world)
  const [metric, setMetric] = useState<MetricKey>('population')

  const active = METRICS.find((item) => item.key === metric) ?? METRICS[0]
  const stage = deriveStage(world.stageIndex)

  const data = useMemo(() => {
    const history = world.history
    if (!history.length) return []
    const step = Math.max(1, Math.ceil(history.length / RENDER_POINTS))
    const points: Array<{ year: number; value: number }> = []
    for (let index = 0; index < history.length; index += step) {
      const point = history[index]
      let value = 0
      if (metric === 'population') value = point.logPopulation
      else if (metric === 'tech') value = point.tech
      else if (metric === 'happiness') value = point.happiness
      else if (metric === 'food') value = point.food
      else if (metric === 'civIndex') value = point.civIndex
      else if (metric === 'laws') value = point.lawCount + point.moralCount
      else value = DIM_KEYS.reduce((acc, key) => acc + point.dims[key], 0) / DIM_KEYS.length
      points.push({ year: point.year, value: Number(value.toFixed(2)) })
    }
    return points
  }, [world.history, metric])

  const formatValue = (value: number) => (metric === 'population' ? formatLogNumber(value) : value.toFixed(1))

  return (
    <GlassPanel
      title="历史趋势"
      subtitle={`共 ${world.history.length} 个采样点，图表渲染最近 ${Math.min(
        world.history.length,
        RENDER_POINTS,
      )} 点 · 单位：${active.unit}`}
      actions={<span className="label-xs">已记录 {world.history.length} 点</span>}
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {METRICS.map((item) => (
          <Chip key={item.key} active={metric === item.key} onClick={() => setMetric(item.key)}>
            {item.label}
          </Chip>
        ))}
      </div>

      <div className="h-[248px] w-full">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={stage.accentFrom} />
                  <stop offset="100%" stopColor={active.color} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#5A6785', fontSize: 10 }}
                stroke="rgba(255,255,255,0.10)"
                minTickGap={38}
              />
              <YAxis tick={{ fill: '#5A6785', fontSize: 10 }} stroke="rgba(255,255,255,0.10)" width={52} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(13,20,40,0.94)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  borderRadius: 12,
                  fontSize: 12,
                  color: '#EAF0FF',
                }}
                labelFormatter={(label) => `${label} 年 · ${active.label}`}
                formatter={(value: number) => [formatValue(value), active.label]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#trendStroke)"
                strokeWidth={2.2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="grid h-full place-items-center rounded-xl border border-dashed border-white/15 text-[12px] text-ink-2">
            推演开始后，这里会绘制从 2026 年起的连续曲线。
          </p>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ink-2">
        曲线只追加、不回溯：神谕干预只改变未来的斜率，已发生的部分保留原样。当前指标的五维构成：
        {DIM_KEYS.map((key) => DIM_META[key].label).join(' / ')}。
      </p>
    </GlassPanel>
  )
}
