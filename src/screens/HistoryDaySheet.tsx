import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { EmptyLine, IconButton, Sheet, ValueUnit, useStaggerOnce, useToast } from '../components/ui'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { formatDayLabel } from '../lib/day'
import { formatEnergy, unitLabel } from '../lib/units'
import { sumMacros } from '../lib/macros'
import { useStore } from '../store/useStore'
import { entriesForDay } from '../store/selectors'
import { Delta, EntryName, MacroReadouts, MiniRing, dayStampLong, energyText, entryAria, entryMeta } from './HistoryWeek'

type Props = {
  day: string
  open: boolean
  onClose(): void
  today: string
  unit: EnergyUnit
  goalKcal: number
}

/**
 * One day's entries (snapshots, with their time), polish-spec 6.4: the day's ring at 56 px with its
 * readouts and the delta, then list rows per 4.11 with the portion rule (`Greek yoghurt · 180 g`).
 * Swipe a row left, or tap its trash, to delete it; the toast offers UNDO which puts the exact snapshot
 * back. Only this day's numbers change.
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
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      height="auto"
      contentId="tp-history-day-sheet"
      headerRight={list.length ? <ValueUnit value={formatEnergy(totals.kcal, unit)} unit={unitLabel(unit)} size={17} tone="gold" testId="tp-history-day-total" /> : null}
    >
      <DayBody list={list} totals={totals} unit={unit} goalKcal={goalKcal} onDelete={remove} />
    </Sheet>
  )
}

function DayBody({ list, totals, unit, goalKcal, onDelete }: { list: LogEntry[]; totals: ReturnType<typeof sumMacros>; unit: EnergyUnit; goalKcal: number; onDelete(e: LogEntry): void }) {
  const stagger = useStaggerOnce()
  if (!list.length) return <EmptyLine className="py-6 text-center">Nothing logged yet.</EmptyLine>
  return (
    <>
      <div className="flex items-center justify-between gap-3 pb-4">
        <div className="flex min-w-0 items-center gap-4">
          <MiniRing macros={totals} />
          <MacroReadouts macros={totals} />
        </div>
        <Delta kcal={totals.kcal} goalKcal={goalKcal} unit={unit} />
      </div>
      <ul className={`border-t border-[var(--gold-line)] ${stagger}`}>
        {list.map((e) => (
          <SwipeRow key={e.id} entry={e} unit={unit} onDelete={() => onDelete(e)} />
        ))}
      </ul>
    </>
  )
}

const REVEAL = 96
const COMMIT = 72

/** A 56 px entry row (polish-spec 4.11) that slides left over an ember field; past 72 px it deletes on release. */
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
  const moved = dx !== 0

  return (
    <li data-testid={`tp-history-entry-${entry.id}`} className="row-rule relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-3"
        style={{ width: REVEAL + 24, background: 'linear-gradient(90deg, transparent, rgba(255,90,31,0.22))', opacity: moved ? 1 : 0 }}
      >
        <Trash2 size={22} strokeWidth={1.5} className={armed ? 'text-ember' : 'text-ember-text'} />
      </div>
      <div
        className="relative grid h-[60px] select-none grid-cols-[14px_minmax(0,1fr)_auto_44px] items-center"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform var(--t-sheet-out) var(--ease-stone)',
          touchAction: 'pan-y',
          // opaque only while it slides, so at rest it shows the sheet's own lit gradient
          background: moved ? 'var(--color-obsidian-900)' : 'transparent',
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        <span />
        <span className="sr-only">{entryAria(entry, unit)}</span>
        <span className="flex min-w-0 flex-col justify-center" aria-hidden="true">
          <EntryName entry={entry} />
          <span className="meta truncate">{entryMeta(entry)}</span>
        </span>
        <span aria-hidden="true" className="pl-3">
          <ValueUnit value={formatEnergy(entry.macros.kcal, unit)} unit={unitLabel(unit)} />
        </span>
        <IconButton label={`Delete ${entry.name}`} onClick={onDelete} className="hover:text-ember-text active:!text-ember-text">
          <Trash2 size={22} strokeWidth={1.5} />
        </IconButton>
      </div>
    </li>
  )
}
