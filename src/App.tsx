import { useEffect } from 'react'
import { deriveStage, stageCssVars } from './sim/stages'
import { bootstrapWorld, useWorldStore } from './store/useWorldStore'
import { useSimHotkeys, useSimLoop } from './hooks/useSimLoop'
import { TopBar } from './components/layout/TopBar'
import { TimelineBar } from './components/layout/TimelineBar'
import { MobileTabs } from './components/layout/MobileTabs'
import { ControlDock } from './components/controls/ControlDock'
import { TribeList } from './components/tribes/TribeList'
import { MilestoneBanner, NoticeToast } from './components/milestones/MilestoneBanner'
import { OverviewView } from './components/overview/OverviewView'
import { GalaxyView } from './components/galaxy/GalaxyView'
import { CodexView } from './components/institutions/CodexView'
import { ChronicleView } from './components/chronicle/ChronicleView'

/**
 * 应用外壳：顶部导航 + 左侧族群栏 + 中央视图 + 右侧调参抽屉 + 底部时间控制台。
 * 阶段主题令牌写到 :root，因此 body 的星云背景、滑块光晕与所有面板强调色会随文明等级整体演进。
 */
function App() {
  const world = useWorldStore((state) => state.world)
  const view = useWorldStore((state) => state.view)
  const stageIndex = world.stageIndex

  useSimLoop()
  useSimHotkeys()

  useEffect(() => {
    bootstrapWorld()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const vars = stageCssVars(deriveStage(stageIndex))
    for (const key of Object.keys(vars)) root.style.setProperty(key, vars[key])
  }, [stageIndex])

  return (
    <div className="min-h-screen">
      <TopBar />

      <aside className="fixed bottom-[68px] left-0 top-[56px] z-30 hidden w-[280px] overflow-hidden border-r border-white/10 bg-void-0/52 backdrop-blur-xl lg:block">
        <TribeList />
      </aside>

      <ControlDock />

      <main className="pb-[132px] pt-[56px] lg:pb-[84px] lg:pl-[280px] xl:pr-[340px]">
        <div className="mx-auto w-full max-w-[1800px] p-3">
          {view === 'overview' && <OverviewView />}
          {view === 'galaxy' && <GalaxyView />}
          {view === 'codex' && <CodexView />}
          {view === 'chronicle' && <ChronicleView />}
        </div>
      </main>

      <MobileTabs />
      <TimelineBar />
      <MilestoneBanner />
      <NoticeToast />
    </div>
  )
}

export default App
