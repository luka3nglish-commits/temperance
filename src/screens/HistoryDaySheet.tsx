import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { EmptyLine, IconButton, Sheet, useToast } from '../components/ui'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { formatDayLabel, formatTime } from '../lib/day'
import { sumMacros } from '../lib/macros'
import { useStore } from '../store/useStore'
import { entriesForDay } from '../store/selectors'
import { Delta, EnergyFigure, MacroReadouts, MiniRing, dayStampLong, energyText } from './HistoryWeek'

type Props = {
  day: string
  open: boolean
  onClose(): void
  today: string
  unit: EnergyUnit
  goalKcal: number
}

/**
 * One day's entries (snapshots, with their time). Swipe a row left, or tap its trash, to delete it;
 * the toast offers UNDO which puts the exact snapshot back. Only this day's numbers change.
 */
export function HistoryDaySheet({ day, open, onClose, today, unit, goalKcal }: Props) {
  const entries = useStore((s) => s.entries)
  const deleteEntry = useStore((s) => s.deleteEntry)
  const restoreEntry = useStore((s) => s.restoreEntry)
  const toast = useToast((s) => s.show)

  // newest first
  const list = useMemo(() => entriesForDay(entries, day).reverse(), [entries, day])
  const totals = useMemo(() => sumMacros(list.map((e) => e.macros)), [list])

  const remove = (entry: LogEntry) => {
    const snapshot = entry
    deleteEntry(entry.id)
    toast({
      text: `Removed · ${energyText(entry.macros.kcal, unit)}`,
      action: { label: 'Undo', icon: 'undo', onClick: () => restoreEntry(snapshot) },
    })
  }

  const label = formatDayLabel(day, today)
  const title = label === 'Today' || label === 'Yesterday' ? label : dayStampLong(day)

  return (
    <Sheet open={open} onClose={onClose} title={title} height="auto" contentId="tp-history-day-sheet" headerRight={list.length ? <EnergyFigure kcal={totals.kcal} unit={unit} size={15} /> : null}>
      {list.length ? (
        <>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--gold-line-strong)] pb-3">
            <div className="flex items-center gap-4">
              <MiniRing macros={totals} />
              <MacroReadouts macros={totals} />
            </div>
            <Delta kcal={totals.kcal} goalKcal={goalKcal} unit={unit} />
          </div>
          <ul className="mt-1">
            {list.map((e) => (
              <SwipeRow key={e.id} entry={e} unit={unit} onDelete={() => remove(e)} />
            ))}
          </ul>
        </>
      ) : (
        <EmptyLine className="py-6 text-center">Nothing logged yet.</EmptyLine>
      )}
    </Sheet>
  )
}

const REVEAL = 96
const COMMIT = 72

/** A 52 px entry row that slides left over an ember field; past 72 px it deletes on release. */
function SwipeRow({ entry, unit, onDelete }: { entry: LogEntry; unit: EnergyUnit; onDelete(): void }) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; id: number; axis: 'x' | 'y' | null } | null>(null)

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, axis: null }
  }
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const mx = e.clientX - s.x
    const my = e.clientY - s.y
    if (s.axis === null) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return
      s.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      if (s.axis === 'x') {
        setDragging(true)
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
    }
    if (s.axis !== 'x') return
    setDx(Math.max(-REVEAL - 24, Math.min(0, mx)))
  }
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    start.current = null
    setDragging(false)
    if (s.axis === 'x' && dx <= -COMMIT) {
      setDx(-REVEAL - 24)
      onDelete()
      return
    }
    setDx(0)
  }
  /** a cancelled pointer (scroll took over, call came in) never deletes: it slides back */
  const onCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    start.current = null
    setDragging(false)
    setDx(0)
  }

  const armed = dx <= -COMMIT
  const m = entry.macros

  return (
    <li data-testid={`tp-history-entry-${entry.id}`} className="relative overflow-hidden border-b border-[var(--gold-line)]">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-5 transition-opacity duration-150"
        style={{ width: REVEAL + 24, background: 'linear-gradient(90deg, transparent, rgba(255,90,31,0.18))', opacity: dx < 0 ? 1 : 0 }}
      >
        <Trash2 size={18} strokeWidth={1.5} className={armed ? 'text-ember' : 'text-ember-text'} />
      </div>
      <div
        className="relative flex min-h-[52px] items-center gap-3 bg-obsidian-900 select-none"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform var(--t-sheet-out) var(--ease-stone)',
          touchAction: 'pan-y',
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        <span className="num w-[60px] shrink-0 font-body text-[14px] text-bone-dim">{formatTime(entry.at)}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-body text-[18px] font-medium leading-[1.3] text-bone">{entry.name}</span>
          <span className="num font-body text-[14px] text-bone-dim">
            P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}
            {entry.servings !== 1 ? ` · x ${entry.servings}` : ''}
          </span>
        </span>
        <EnergyFigure kcal={m.kcal} unit={unit} size={15} />
        <IconButton label={`Delete ${entry.name}`} onClick={onDelete} className="-mr-2 hover:text-ember-text">
          <Trash2 size={18} strokeWidth={1.5} />
        </IconButton>
      </div>
    </li>
  )
}
