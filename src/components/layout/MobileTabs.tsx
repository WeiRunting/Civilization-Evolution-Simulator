import { BookOpen, Globe2, Radar, ScrollText, Users } from 'lucide-react'
import { useWorldStore } from '../../store/useWorldStore'
import type { ViewKey } from '../../store/useWorldStore'

const TABS: Array<{ key: ViewKey | 'tribes'; label: string; icon: typeof Radar }> = [
  { key: 'overview', label: '俯瞰', icon: Radar },
  { key: 'tribes', label: '族群', icon: Users },
  { key: 'galaxy', label: '疆域', icon: Globe2 },
  { key: 'codex', label: '天条', icon: BookOpen },
  { key: 'chronicle', label: '编年史', icon: ScrollText },
]

/** 小屏底部标签页：与 TimeBar 上下叠放，避免主视野被遮挡 */
export function MobileTabs() {
  const view = useWorldStore((state) => state.view)
  const setView = useWorldStore((state) => state.setView)

  return (
    <nav className="fixed inset-x-0 bottom-[68px] z-40 flex h-[52px] items-stretch justify-around border-t border-white/10 bg-void-1/85 backdrop-blur-xl lg:hidden">
      {TABS.map((tab) => {
        const Icon = tab.icon
        const active = tab.key === 'tribes' ? false : view === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              if (tab.key === 'tribes') {
                setView('overview')
                document.getElementById('tribe-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                return
              }
              setView(tab.key)
            }}
            className={
              active
                ? 'flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[10px] text-neon-cyan'
                : 'flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-[10px] text-ink-2 transition-colors duration-200 hover:text-ink-0'
            }
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
