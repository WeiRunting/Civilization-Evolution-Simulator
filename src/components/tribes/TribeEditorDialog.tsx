import { useEffect, useState } from 'react'
import { Trash2, UserPlus, X } from 'lucide-react'
import type { DimKey, FiveDims } from '../../sim/types'
import { DIM_DEFAULT, DIM_KEYS, DIM_META } from '../../sim/config'
import { clamp, formatLogNumber } from '../../sim/num'
import { useWorldStore } from '../../store/useWorldStore'
import { NeonButton, NeonSlider, ProgressBar, Tag } from '../ui/Primitives'

export type TribeDialogMode = 'create' | 'edit'

const PALETTE = [
  '#6E8BFF',
  '#22D3EE',
  '#4ADE80',
  '#F2B84B',
  '#FF6B5B',
  '#A855F7',
  '#34D399',
  '#F87171',
]

export function TribeEditorDialog({
  open,
  mode,
  tribeId,
  onClose,
}: {
  open: boolean
  mode: TribeDialogMode
  tribeId?: string
  onClose: () => void
}) {
  const world = useWorldStore((state) => state.world)
  const god = useWorldStore((state) => state.god)
  const tribe = tribeId ? world.tribes.find((item) => item.id === tribeId) ?? null : null

  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [dims, setDims] = useState<FiveDims>({ ...DIM_DEFAULT })
  const [logPopulation, setLogPopulation] = useState(9)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && tribe) {
      setName(tribe.name)
      setColor(tribe.color)
      setDims({ ...tribe.dims })
      setLogPopulation(tribe.logPopulation)
      return
    }
    setName('')
    setColor(PALETTE[world.tribes.length % PALETTE.length])
    setDims({ ...DIM_DEFAULT })
    setLogPopulation(8.5)
  }, [open, mode, tribe, world.tribes.length])

  if (!open) return null

  const valid = name.trim().length >= 2

  const submit = () => {
    if (!valid) return
    if (mode === 'create') {
      god({
        kind: 'addTribe',
        name: name.trim(),
        color,
        dims,
        logPopulation: clamp(logPopulation, 5.5, 24),
      })
    } else if (tribe) {
      god({ kind: 'renameTribe', tribeId: tribe.id, name: name.trim(), color })
      god({ kind: 'setDims', scope: tribe.id, dims })
      god({ kind: 'setPopulation', scope: tribe.id, logPopulation: clamp(logPopulation, 5.5, 24) })
    }
    onClose()
  }

  const remove = () => {
    if (!tribe) return
    god({ kind: 'removeTribe', tribeId: tribe.id })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-void-0/72 p-3 backdrop-blur-sm">
      <div className="glass max-h-[86vh] w-full max-w-[520px] overflow-y-auto p-5 animate-fade-up">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="label-xs">{mode === 'create' ? '神迹 · 创生' : '神迹 · 改写'}</p>
            <h2 className="mt-0.5 text-[18px] font-bold text-ink-0">
              {mode === 'create' ? '创造一个文明体' : `改写「${tribe?.name ?? ''}」`}
            </h2>
            <p className="mt-1 text-[12px] text-ink-2">
              起点五维与人口量级会被写入该文明体的初始条件，随后由耦合方程自行演化。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="关闭"
            className="cursor-pointer rounded-lg border border-white/12 bg-white/[0.05] p-1.5 text-ink-1 transition-colors duration-200 hover:text-ink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label-xs">文明体名称</span>
              {!valid && <span className="text-[11px] text-neon-warn">至少 2 个字符</span>}
            </div>
            <input
              className="field"
              value={name}
              placeholder="例如：环带自由邦"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div>
            <span className="label-xs">识别色</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {PALETTE.map((item) => (
                <button
                  key={item}
                  type="button"
                  title={`使用 ${item}`}
                  onClick={() => setColor(item)}
                  className={
                    color === item
                      ? 'h-6 w-6 cursor-pointer rounded-full ring-2 ring-white/70'
                      : 'h-6 w-6 cursor-pointer rounded-full ring-1 ring-white/25 transition-transform duration-200 hover:scale-110'
                  }
                  style={{ backgroundColor: item, boxShadow: `0 0 12px ${item}88` }}
                />
              ))}
            </div>
          </div>

          <div className="divider-x" />

          <div className="space-y-3">
            {DIM_KEYS.map((key) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[12px]" style={{ color: DIM_META[key].color }}>
                    {DIM_META[key].label} · {DIM_META[key].desc}
                  </span>
                  <span className="tabular font-mono text-[12px] text-ink-0">
                    {Math.round(dims[key])}
                  </span>
                </div>
                <NeonSlider
                  value={dims[key]}
                  color={DIM_META[key].color}
                  glow={DIM_META[key].glow}
                  ariaLabel={`${DIM_META[key].label}维初始值`}
                  onChange={(value) => setDims((prev) => ({ ...prev, [key]: value } as FiveDims))}
                />
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label-xs">起始人口量级</span>
              <span className="tabular font-mono text-[13px] text-ink-0">
                {formatLogNumber(logPopulation)}
              </span>
            </div>
            <NeonSlider
              value={logPopulation}
              min={3}
              max={20}
              step={0.1}
              color="#6E8BFF"
              ariaLabel="起始人口量级"
              onChange={setLogPopulation}
            />
            <div className="mt-2 h-1">
              <ProgressBar value={logPopulation / 20} color="#6E8BFF" height={4} />
            </div>
          </div>

          {mode === 'edit' && tribe && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag color={tribe.color}>科技 {tribe.tech.toFixed(1)}</Tag>
              <Tag>幸福 {tribe.happiness.toFixed(0)}</Tag>
              <Tag>星系 {formatLogNumber(tribe.logColonies)}</Tag>
              <Tag>
                升维{' '}
                {DIM_KEYS.reduce<number>((acc: number, key: DimKey) => acc + tribe.ascension[key], 0)}
              </Tag>
            </div>
          )}
        </div>

        <footer className="mt-5 flex items-center justify-between gap-2">
          {mode === 'edit' ? (
            <NeonButton variant="danger" onClick={remove} title="把这个文明体从推演中抹去">
              <Trash2 className="h-3.5 w-3.5" />
              抹去文明体
            </NeonButton>
          ) : (
            <span className="text-[11px] text-ink-2">新文明体会与既有文明体即时建立外交关系</span>
          )}
          <div className="flex items-center gap-2">
            <NeonButton onClick={onClose}>取消</NeonButton>
            <NeonButton variant="primary" onClick={submit} disabled={!valid}>
              <UserPlus className="h-3.5 w-3.5" />
              {mode === 'create' ? '写入推演' : '保存改写'}
            </NeonButton>
          </div>
        </footer>
      </div>
    </div>
  )
}
