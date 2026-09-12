import { StatCards } from './StatCards'
import { StageProgress } from './StageProgress'
import { RadarChart } from '../charts/RadarChart'
import { DotMatrix } from '../charts/DotMatrix'
import { TrendChart } from '../charts/TrendChart'
import { TribeList } from '../tribes/TribeList'
import { InlineControlPanel } from '../controls/ControlDock'
import { ChronicleStream } from '../chronicle/ChronicleView'
import { GlassPanel } from '../ui/Primitives'

/** 「俯瞰」主控制台：指标 → 阶梯 → 雷达与点阵 → 趋势 → 小屏专属的族群与调参 */
export function OverviewView() {
  return (
    <div className="space-y-3">
      <StatCards />
      <StageProgress />

      <div className="grid gap-3 2xl:grid-cols-[1.15fr_1fr]">
        <GlassPanel
          title="五维雷达"
          subtitle="半透明色块为各文明体，顶点发光表示已达该维高点"
        >
          <RadarChart />
        </GlassPanel>
        <GlassPanel
          title="个体点阵"
          subtitle="每点为一个代表个体：横轴智、纵轴劳、亮度映射德、大小映射人口权重"
        >
          <DotMatrix />
        </GlassPanel>
      </div>

      <TrendChart />

      <div className="grid gap-3 lg:grid-cols-2 xl:hidden">
        <TribeList variant="inline" />
      </div>

      <div className="lg:hidden">
        <GlassPanel
          title="编年史近况"
          subtitle="最近写入的事件，完整档案请切换到「编年史」视图"
        >
          <ChronicleStream limit={8} />
        </GlassPanel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <InlineControlPanel />
      </div>
    </div>
  )
}
