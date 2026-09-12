import { useMemo } from 'react'
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { DIM_KEYS, DIM_META } from '../../sim/config'
import { useWorldStore } from '../../store/useWorldStore'

interface RadarRow {
  dim: string
  [series: string]: number | string
}

/** 五维雷达：多文明体叠加，作用域选中的文明体线条加粗 */
export function RadarChart() {
  const world = useWorldStore((state) => state.world)
  const selectedTribeId = useWorldStore((state) => state.selectedTribeId)
  const alive = world.tribes.filter((tribe) => tribe.alive)

  const { rows, series } = useMemo(() => {
    const shown = alive.slice(0, 7)
    const data: RadarRow[] = DIM_KEYS.map((key) => {
      const row: RadarRow = { dim: DIM_META[key].label }
      for (const tribe of shown) row[tribe.name] = Number(tribe.dims[key].toFixed(2))
      row['全部均值'] = shown.length
        ? Number((shown.reduce((acc, tribe) => acc + tribe.dims[key], 0) / shown.length).toFixed(2))
        : 0
      return row
    })
    return { rows: data, series: shown.map((tribe) => ({ id: tribe.id, name: tribe.name, color: tribe.color })) }
  }, [alive])

  if (!alive.length) {
    return (
      <p className="grid h-[300px] place-items-center rounded-xl border border-dashed border-white/15 text-[12px] text-ink-2">
        所有文明体均已消亡，雷达图无数据。
      </p>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar data={rows} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.12)" />
          <PolarAngleAxis
            dataKey="dim"
            tick={{ fill: '#8FA0C4', fontSize: 12 }}
            tickFormatter={(value: string) => value}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#5A6785', fontSize: 10 }} stroke="rgba(255,255,255,0.10)" />
          <Tooltip
            contentStyle={{
              background: 'rgba(13,20,40,0.94)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 12,
              fontSize: 12,
              color: '#EAF0FF',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#8FA0C4' }} />
          {series.map((item) => (
            <Radar
              key={item.id}
              name={item.name}
              dataKey={item.name}
              stroke={item.color}
              fill={item.color}
              fillOpacity={selectedTribeId === item.id ? 0.34 : 0.13}
              strokeWidth={selectedTribeId === item.id ? 2.4 : 1.4}
              isAnimationActive={false}
            />
          ))}
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  )
}
