import { useState } from 'react'
import { Pencil, UserPlus } from 'lucide-react'
import { useWorldStore } from '../../store/useWorldStore'
import { TribeCard } from './TribeCard'
import { TribeEditorDialog } from './TribeEditorDialog'
import type { TribeDialogMode } from './TribeEditorDialog'
import { NeonButton } from '../ui/Primitives'

/**
 * 族群列表：桌面端常驻左侧栏，小屏折叠进「俯瞰」视图。
 * 排序按人口量级降序，便于一眼看出谁在主导这段历史。
 */
export function TribeList({ variant = 'sidebar' }: { variant?: 'sidebar' | 'inline' }) {
  const world = useWorldStore((state) => state.world)
  const selectedTribeId = useWorldStore((state) => state.selectedTribeId)
  const selectTribe = useWorldStore((state) => state.selectTribe)

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<TribeDialogMode>('create')
  const [editingId, setEditingId] = useState<string | undefined>(undefined)

  const alive = world.tribes
    .filter((tribe) => tribe.alive)
    .slice()
    .sort((a, b) => b.logPopulation - a.logPopulation)

  const selected = world.tribes.find((tribe) => tribe.id === selectedTribeId) ?? null

  const openCreate = () => {
    setMode('create')
    setEditingId(undefined)
    setOpen(true)
  }

  const openEdit = () => {
    if (!selected) return
    setMode('edit')
    setEditingId(selected.id)
    setOpen(true)
  }

  return (
    <div
      id="tribe-list"
      className={
        variant === 'sidebar'
          ? 'flex h-full flex-col gap-3 p-3'
          : 'glass flex flex-col gap-3 p-3'
      }
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-ink-0">文明体</h2>
          <p className="text-[11px] text-ink-2">
            共 {alive.length} 个存续 · 人口量级降序
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <NeonButton onClick={openEdit} disabled={!selected} title="改写当前选中的文明体">
            <Pencil className="h-3.5 w-3.5" />
          </NeonButton>
          <NeonButton onClick={openCreate} title="创造一个全新的文明体">
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">创生</span>
          </NeonButton>
        </div>
      </header>

      <div className={variant === 'sidebar' ? 'flex-1 space-y-2 overflow-y-auto pr-1' : 'space-y-2'}>
        {alive.map((tribe, index) => (
          <TribeCard
            key={tribe.id}
            world={world}
            tribe={tribe}
            rank={index + 1}
            selected={tribe.id === selectedTribeId}
            onSelect={() => selectTribe(tribe.id === selectedTribeId ? null : tribe.id)}
          />
        ))}
        {!alive.length && (
          <p className="rounded-lg border border-dashed border-white/15 p-4 text-center text-[12px] text-ink-2">
            所有文明体都已消亡。可以「创生」新的文明体，或重置时间轴重新开始。
          </p>
        )}
      </div>

      <TribeEditorDialog
        open={open}
        mode={mode}
        tribeId={editingId}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
