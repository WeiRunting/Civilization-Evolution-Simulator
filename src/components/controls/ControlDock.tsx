import { Users } from 'lucide-react'
import { institutionTendency, projectEffects, snapshot } from '../../sim/institutions'
import { formatPercent } from '../../sim/num'
import { useWorldStore } from '../../store/useWorldStore'
import { FiveDimSliders } from './FiveDimSliders'
import { PopulationControl } from './PopulationControl'
import { Chip, GlassPanel, Tag } from '../ui/Primitives'

function ScopeSwitcher() {
  const world = useWorldStore((state) => state.world)
  const scope = useWorldStore((state) => state.scope)
  const setScope = useWorldStore((state) => state.setScope)
  const alive = world.tribes.filter((tribe) => tribe.alive)

  return (
    <GlassPanel
      title="作用域"
      subtitle="对全体人类或单一文明体施加神迹"
      actions={<Users className="h-4 w-4 text-ink-2" />}
    >
      <div className="flex flex-wrap gap-1.5">
        <Chip active={scope === 'all'} onClick={() => setScope('all')}>
          全体人类
        </Chip>
        {alive.map((tribe) => (
          <Chip
            key={tribe.id}
            active={scope === tribe.id}
            onClick={() => setScope(tribe.id)}
            title={`作用域切换为 ${tribe.name}`}
          >
            <span
              className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: tribe.color }}
            />
            {tribe.name}
          </Chip>
        ))}
      </div>
    </GlassPanel>
  )
}

/** 制度效果现状：与引擎消费的是同一份投影结果 */
function EffectsReadout() {
  const world = useWorldStore((state) => state.world)
  const scope = useWorldStore((state) => state.scope)
  const alive = world.tribes.filter((tribe) => tribe.alive)
  const target = scope === 'all' ? alive[0] : alive.find((tribe) => tribe.id === scope)
  if (!target) return null

  const effects = projectEffects(world, target)
  const summary = snapshot(world)
  const rows = [
    { label: '犯罪率', value: formatPercent(effects.crimeRate, 1) },
    { label: '起义风险', value: formatPercent(effects.revoltRisk, 1) },
    { label: '科技增速', value: `${effects.innovation.toFixed(2)}x` },
    { label: '生育系数', value: `${effects.fertility.toFixed(2)}x` },
    { label: '平均寿命系数', value: `${effects.longevity.toFixed(2)}x` },
    { label: '扩张动能', value: `${effects.expansion.toFixed(2)}x` },
    { label: '制度差异张力', value: formatPercent(effects.divergenceTension, 1) },
  ]

  return (
    <GlassPanel
      title="制度效果投影"
      subtitle={`以「${target.name}」的适用法条为准`}
      actions={<Tag color="#A855F7">{institutionTendency(world, target)}</Tag>}
    >
      <div className="grid grid-cols-2 gap-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5">
            <p className="text-[10px] text-ink-2">{row.label}</p>
            <p className="tabular font-mono text-[13px] text-ink-0">{row.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Tag>施行律法 {summary.lawCount}</Tag>
        <Tag>道德准则 {summary.moralCount}</Tag>
        <Tag>平均严苛度 {summary.strictness.toFixed(1)}</Tag>
        <Tag>平均执行率 {summary.enforcement.toFixed(1)}</Tag>
      </div>
    </GlassPanel>
  )
}

/** 右侧调参抽屉：1280px 以上常驻，小屏由「俯瞰」视图内的内联版本承担 */
export function ControlDock() {
  return (
    <aside className="fixed bottom-[68px] right-0 top-[56px] z-30 hidden w-[340px] flex-col gap-3 overflow-y-auto border-l border-white/10 bg-void-0/52 p-3 backdrop-blur-xl xl:flex">
      <ScopeSwitcher />
      <GlassPanel title="神迹调参" subtitle="调整只影响未来，不回改历史曲线">
        <FiveDimSliders />
      </GlassPanel>
      <GlassPanel>
        <PopulationControl />
      </GlassPanel>
      <EffectsReadout />
    </aside>
  )
}

export function InlineControlPanel() {
  return (
    <div className="space-y-3 xl:hidden">
      <ScopeSwitcher />
      <GlassPanel title="神迹调参" subtitle="调整只影响未来，不回改历史曲线">
        <FiveDimSliders />
      </GlassPanel>
      <GlassPanel>
        <PopulationControl />
      </GlassPanel>
      <EffectsReadout />
    </div>
  )
}
