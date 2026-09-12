import { useState } from 'react'
import { Divide, Equal, X } from 'lucide-react'
import { POP } from '../../sim/config'
import { clamp, formatLogNumber } from '../../sim/num'
import { useWorldStore } from '../../store/useWorldStore'
import { parseBigNumber } from '../../utils/format'
import { FieldLabel, NeonButton, NeonSlider, Tag } from '../ui/Primitives'

/**
 * 对数人口控制：滑块在对数域线性移动，因此从 10^6 到 10^18 的手感完全一致。
 * 同时保留「乘十 / 除十」快捷操作与支持中文大数单位的精确输入。
 */
export function PopulationControl() {
  const world = useWorldStore((state) => state.world)
  const scope = useWorldStore((state) => state.scope)
  const god = useWorldStore((state) => state.god)

  const alive = world.tribes.filter((tribe) => tribe.alive)
  const target = scope === 'all' ? null : alive.find((tribe) => tribe.id === scope) ?? null

  const totalLog = alive.length
    ? (() => {
        let total = -Infinity
        for (const tribe of alive) {
          const hi = Math.max(total, tribe.logPopulation)
          const lo = Math.min(total, tribe.logPopulation)
          total = hi === -Infinity ? lo : hi + Math.log10(1 + Math.pow(10, lo - hi))
        }
        return total
      })()
    : 0

  const currentLog = target ? target.logPopulation : totalLog
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)

  const sliderMin = 3
  const sliderMax = 21

  const submitDraft = () => {
    const parsed = parseBigNumber(draft)
    if (parsed === null || parsed <= 0) {
      setEditing(false)
      setDraft('')
      return
    }
    god({
      kind: 'setPopulation',
      scope,
      logPopulation: clamp(Math.log10(parsed), POP.logFloor, POP.logCeiling),
    })
    setEditing(false)
    setDraft('')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-ink-0">人口调控</h3>
          <p className="text-[11px] text-ink-2">
            {target ? `${target.name} 的人口量级` : '全体文明体人口合计'}
          </p>
        </div>
        <Tag color="#F2B84B">对数刻度</Tag>
      </div>

      <div>
        <FieldLabel hint={<span className="tabular font-mono text-[13px] text-ink-0">{formatLogNumber(currentLog)}</span>}>
          人口量级（10^n）
        </FieldLabel>
        <NeonSlider
          value={clamp(currentLog, sliderMin, sliderMax)}
          min={sliderMin}
          max={sliderMax}
          step={0.05}
          color="#F2B84B"
          glow="rgba(242,184,75,0.6)"
          ariaLabel="人口量级"
          onChange={(value) => god({ kind: 'setPopulation', scope, logPopulation: value })}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <NeonButton
          onClick={() => god({ kind: 'scalePopulation', scope, factor: 10 })}
          title="人口乘十"
        >
          <X className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">乘十</span>
        </NeonButton>
        <NeonButton
          onClick={() => god({ kind: 'scalePopulation', scope, factor: 0.1 })}
          title="人口除十"
        >
          <Divide className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">除十</span>
        </NeonButton>
        <NeonButton
          onClick={() => {
            if (editing) {
              submitDraft()
              return
            }
            setEditing(true)
            setDraft(String(Math.round(Math.pow(10, Math.min(currentLog, 15)))))
          }}
          title="精确输入，支持「亿」「万」等中文单位"
        >
          <Equal className="h-3.5 w-3.5" />
          精确输入
        </NeonButton>
      </div>

      {editing && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            className="field"
            value={draft}
            placeholder="例如：12.5亿"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitDraft()
              if (event.key === 'Escape') {
                setEditing(false)
                setDraft('')
              }
            }}
          />
          <NeonButton variant="primary" onClick={submitDraft} title="写入该人口量级">
            写入
          </NeonButton>
        </div>
      )}

      <p className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-[11px] leading-relaxed text-ink-2">
        承载上限由科技、殖民地与疆域共同决定。若把人口强行推到上限以上，死亡率会在随后自行把曲线压回——神谕能改写数字，但改不掉生态与产能的约束。
      </p>
    </div>
  )
}
