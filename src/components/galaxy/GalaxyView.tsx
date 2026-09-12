import { useMemo, useState } from 'react'
import { Crosshair, Globe2, Layers, Radio, Rocket, Shield } from 'lucide-react'
import { GalaxyMap } from '../charts/GalaxyMap'
import type { GalaxyLayers } from '../charts/GalaxyMap'
import { EXPANSION_MODES, colonizeChance } from '../../sim/config'
import { formatLogNumber, formatPercent } from '../../sim/num'
import type { ExpansionMode } from '../../sim/types'
import { useWorldStore } from '../../store/useWorldStore'
import { tribeCivIndex, tribeStage } from '../../utils/institutionMath'
import { Chip, GlassPanel, NeonButton, SectionTitle, Tag } from '../ui/Primitives'

const LAYER_LABELS: Array<{ key: keyof GalaxyLayers; label: string }> = [
  { key: 'colonies', label: '殖民地' },
  { key: 'reach', label: '疆域半径' },
  { key: 'trade', label: '贸易线' },
  { key: 'conflict', label: '冲突热区' },
]

/** 疆域星图：星海主画布 + 图层开关 + 势力卡 + 扩张操作台 */
export function GalaxyView() {
  const world = useWorldStore((state) => state.world)
  const scope = useWorldStore((state) => state.scope)
  const setScope = useWorldStore((state) => state.setScope)
  const god = useWorldStore((state) => state.god)

  const [layers, setLayers] = useState<GalaxyLayers>({
    colonies: true,
    reach: true,
    trade: true,
    conflict: true,
  })

  const alive = useMemo(
    () => world.tribes.filter((tribe) => tribe.alive).slice().sort((a, b) => b.logColonies - a.logColonies),
    [world.tribes],
  )

  if (!alive.length) {
    return (
      <GlassPanel title="疆域星图">
        <p className="rounded-lg border border-dashed border-white/15 p-6 text-center text-[12px] text-ink-2">
          所有文明体均已消亡，星图上不再有航标。可以重置时间轴，或回到「俯瞰」创生新的文明体。
        </p>
      </GlassPanel>
    )
  }

  const totalColoniesLog = alive.reduce((acc, tribe) => Math.max(acc, tribe.logColonies), 0)
  const maxReach = alive.reduce((acc, tribe) => Math.max(acc, tribe.logReach), 0)
  const target = scope === 'all' ? alive[0] : alive.find((tribe) => tribe.id === scope) ?? alive[0]
  const colonizeRate = colonizeChance(target.tech, target.dims.lao, target.logColonies)

  const toggleLayer = (key: keyof GalaxyLayers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-3">
      <SectionTitle
        title="疆域星图"
        subtitle={`最大定居星系 ${formatLogNumber(totalColoniesLog)} 个 · 最大疆域半径约 ${formatLogNumber(maxReach + 3.5)} 光年 · 舰队与殖民由扩张方程逐 tick 推演`}
        right={
          <Tag color="#34D399">
            <Globe2 className="mr-1 h-3 w-3" />
            存续文明体 {alive.length}
          </Tag>
        }
      />

      <GlassPanel
        title="星海"
        subtitle="中心为各文明体的母星系；虚线圆为疆域半径，流动光点为星际贸易线，红色虚线为冲突航路"
        actions={
          <Tag>
            <Layers className="mr-1 h-3 w-3" />
            图层
          </Tag>
        }
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {LAYER_LABELS.map((item) => (
            <Chip
              key={item.key}
              active={layers[item.key]}
              onClick={() => toggleLayer(item.key)}
              title={`${layers[item.key] ? '隐藏' : '显示'}${item.label}图层`}
            >
              {item.label}
            </Chip>
          ))}
        </div>
        <GalaxyMap layers={layers} />
      </GlassPanel>

      <GlassPanel
        title="文明体势力"
        subtitle="按定居星系数量降序；选中一行即把它设为扩张操作台的目标"
      >
        <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
          {alive.map((tribe) => {
            const stage = tribeStage(world, tribe)
            const selected = scope === tribe.id
            return (
              <button
                key={tribe.id}
                type="button"
                onClick={() => setScope(selected ? 'all' : tribe.id)}
                className={
                  selected
                    ? 'cursor-pointer rounded-xl border p-3 text-left transition-all duration-300'
                    : 'cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]'
                }
                style={
                  selected
                    ? {
                        borderColor: `${tribe.color}77`,
                        backgroundColor: `${tribe.color}14`,
                        boxShadow: `0 0 24px ${tribe.color}33`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tribe.color, boxShadow: `0 0 10px ${tribe.color}` }}
                    />
                    <span className="truncate text-[13.5px] font-semibold text-ink-0">{tribe.name}</span>
                  </div>
                  <Tag color={stage.accentFrom}>{stage.name}</Tag>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                    <p className="text-[10px] text-ink-2">定居星系</p>
                    <p className="tabular font-mono text-[13px] text-ink-0">
                      {formatLogNumber(tribe.logColonies)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                    <p className="text-[10px] text-ink-2">疆域半径</p>
                    <p className="tabular font-mono text-[13px] text-ink-0">
                      {formatLogNumber(tribe.logReach + 3.5)} 光年
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                    <p className="text-[10px] text-ink-2">舰队当量</p>
                    <p className="tabular font-mono text-[13px] text-ink-0">
                      {formatLogNumber(tribe.logFleets)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1">
                    <p className="text-[10px] text-ink-2">文明指数</p>
                    <p className="tabular font-mono text-[13px] text-ink-0">
                      {tribeCivIndex(world, tribe).toFixed(1)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </GlassPanel>

      <GlassPanel
        title="扩张操作台"
        subtitle={`当前目标：${scope === 'all' ? `全体文明体（以 ${target.name} 为样本估算）` : target.name}`}
        actions={
          <Tag color={target.color}>
            <Crosshair className="mr-1 h-3 w-3" />
            科技 {target.tech.toFixed(1)}
          </Tag>
        }
      >
        <div className="grid gap-2.5 md:grid-cols-3">
          {EXPANSION_MODES.map((mode) => (
            <div key={mode.key} className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg"
                  style={{
                    backgroundColor: mode.key === 'colonize' ? '#34D39920' : mode.key === 'fortify' ? '#6E8BFF20' : '#22D3EE20',
                    color: mode.key === 'colonize' ? '#34D399' : mode.key === 'fortify' ? '#6E8BFF' : '#22D3EE',
                  }}
                >
                  {mode.key === 'colonize' ? (
                    <Rocket className="h-3.5 w-3.5" />
                  ) : mode.key === 'fortify' ? (
                    <Shield className="h-3.5 w-3.5" />
                  ) : (
                    <Radio className="h-3.5 w-3.5" />
                  )}
                </span>
                <h3 className="text-[13.5px] font-semibold text-ink-0">{mode.label}</h3>
              </div>
              <p className="mt-2 flex-1 text-[11.5px] leading-relaxed text-ink-1">{mode.desc}</p>

              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                <span className="text-[10px] text-ink-2">
                  {mode.key === 'colonize' ? '成功率' : '生效方式'}
                </span>
                <span className="tabular font-mono text-[12px] text-ink-0">
                  {mode.key === 'colonize' ? formatPercent(colonizeRate, 1) : '稳定生效'}
                </span>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-neon-warn/90">反噬：{mode.risk}</p>

              <NeonButton
                className="mt-2.5 justify-center"
                variant={mode.key === 'colonize' ? 'primary' : 'ghost'}
                onClick={() => god({ kind: 'pushExpansion', scope, mode: mode.key as ExpansionMode })}
                title={`对${scope === 'all' ? '全体文明体' : target.name}执行「${mode.label}」`}
              >
                {mode.label}
              </NeonButton>
            </div>
          ))}
        </div>

        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-[11px] leading-relaxed text-ink-2">
          疆域扩张需要成本、成功率与反噬风险。当殖民地规模与制度差异同时越过阈值时，边缘星域会拒绝继续执行母体的法典，
          分裂出新的文明体——这也是银河帝国由统一走向分裂的起点。
        </p>
      </GlassPanel>
    </div>
  )
}
