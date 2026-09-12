import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useWorldStore } from '../../store/useWorldStore'
import { deriveStage } from '../../sim/stages'

/** 纪元跃迁横幅：全屏星辉扫过后停留 8 秒，或由玩家手动关闭 */
export function MilestoneBanner() {
  const milestone = useWorldStore((state) => state.milestone)
  const dismissMilestone = useWorldStore((state) => state.dismissMilestone)
  const stageIndex = useWorldStore((state) => state.world.stageIndex)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!milestone) {
      setVisible(false)
      return undefined
    }
    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), 8200)
    return () => window.clearTimeout(timer)
  }, [milestone])

  if (!milestone || !visible) return null
  const stage = deriveStage(stageIndex)

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[72px] z-50 flex justify-center px-3">
      <div
        className="pointer-events-auto relative w-full max-w-[720px] overflow-hidden rounded-panel border border-white/18 bg-void-1/86 p-4 shadow-glass backdrop-blur-2xl animate-fade-up"
        style={{ boxShadow: `0 0 42px ${stage.accentFrom}44` }}
      >
        <div
          className="absolute inset-x-0 top-0 h-full animate-sweep opacity-40"
          style={{
            backgroundImage: `linear-gradient(180deg, transparent, ${stage.accentFrom}55, transparent)`,
          }}
        />
        <div className="relative flex items-start gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-void-0"
            style={{ backgroundImage: `linear-gradient(120deg, ${stage.accentFrom}, ${stage.accentTo})` }}
          >
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="label-xs">纪元里程碑</p>
            <h3 className="mt-0.5 text-[17px] font-bold text-ink-0">{milestone.title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-1">{milestone.detail}</p>
          </div>
          <button
            type="button"
            onClick={dismissMilestone}
            className="cursor-pointer rounded-lg border border-white/12 bg-white/[0.05] p-1.5 text-ink-1 transition-colors duration-200 hover:text-ink-0"
            title="关闭里程碑提示"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** 存档 / 读档 / 重置等操作的轻提示，3.4 秒后自动消失 */
export function NoticeToast() {
  const notice = useWorldStore((state) => state.notice)
  const [shown, setShown] = useState(notice)

  useEffect(() => {
    setShown(notice)
    if (!notice) return undefined
    const timer = window.setTimeout(() => setShown(null), 3400)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (!shown) return null
  return (
    <div className="pointer-events-none fixed bottom-[132px] left-1/2 z-50 -translate-x-1/2 px-3 lg:bottom-[84px]">
      <div
        className={
          shown.tone === 'warn'
            ? 'rounded-xl border border-neon-warn/45 bg-void-1/90 px-4 py-2 text-[12px] text-neon-warn shadow-glass backdrop-blur-xl animate-fade-up'
            : 'rounded-xl border border-neon-cyan/40 bg-void-1/90 px-4 py-2 text-[12px] text-neon-cyan shadow-glass backdrop-blur-xl animate-fade-up'
        }
      >
        {shown.text}
      </div>
    </div>
  )
}
