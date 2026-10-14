/**
 * THE TODAY SHEET (spec section 10, last paragraph). Opened from EATEN or the ring.
 * Today's entries newest first with the time, 52 px rows ruled --gold-line with a 3 x 30 px gold bar.
 * Swipe left to delete (touch, with a threshold) or the trash button; toast `Removed · 612 kcal` with
 * UNDO (restoreEntry). Tap a row to edit the snapshot (updateEntry). The newest row rises in over
 * 240 ms with its gold rule drawing left to right. The kJ toggle applies to every number.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, EmptyLine, IconButton, Sheet, useToast } from '../components/ui'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { formatEnergy, unitLabel } from '../lib/units'
import { formatTime } from '../lib/day'
import { isReducedMotion } from '../lib/motion'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { entriesForDay, totalsForDay } from '../store/selectors'
import { TodayEntryEdit, type EntryPatch } from './TodayEntryEdit'
import { EASE_STONE_CSS } from './TodayMotion'

const SWIPE_THRESHOLD = 88
const SWIPE_MAX = 140
const EDIT_FORM_ID = 'today-entry-edit'

/** `P 32 · C 48 · F 12` */
export function macroLine(e: LogEntry): string {
  const r = (n: number) => Math.round(n)
  return `P ${r(e.macros.protein)} · C ${r(e.macros.carbs)} · F ${r(e.macros.fat)}`
}

type RowProps = {
  entry: LogEntry
  unit: EnergyUnit
  /** rises in with its rule drawing (newest row) */
  rise: boolean
  onEdit(e: LogEntry): void
  onRemove(e: LogEntry): void
}

function TodayRow({ entry, unit, rise, onEdit, onRemove }: RowProps) {
  const face = useRef<HTMLDivElement>(null)
  const hint = useRef<HTMLSpanElement>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const axis = useRef<'x' | 'y' | null>(null)
  const dx = useRef(0)
  const swiped = useRef(false)
  const leaving = useRef(false)

  const setX = (x: number, animate: boolean) => {
    const el = face.current
    if (!el) return
    el.style.transition = animate && !isReducedMotion() ? `transform 200ms ${EASE_STONE_CSS}` : 'none'
    el.style.transform = x ? `translateX(${x}px)` : ''
    if (hint.current) hint.current.style.opacity = String(Math.min(1, -x / SWIPE_THRESHOLD))
  }

  const onTouchStart = (e: TouchEvent) => {
    if (leaving.current) return
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
    axis.current = null
    dx.current = 0
    swiped.current = false
  }
  const onTouchMove = (e: TouchEvent) => {
    if (!start.current || leaving.current) return
    const t = e.touches[0]
    const mx = t.clientX - start.current.x
    const my = t.clientY - start.current.y
    if (!axis.current) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return
      axis.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
    }
    if (axis.current !== 'x') return
    swiped.current = true
    dx.current = Math.max(-SWIPE_MAX, Math.min(0, mx))
    setX(dx.current, false)
  }
  const onTouchEnd = () => {
    if (!start.current || leaving.current) return
    start.current = null
    if (axis.current === 'x' && dx.current <= -SWIPE_THRESHOLD) {
      leaving.current = true
      const w = face.current?.offsetWidth ?? 390
      setX(-w, true)
      const ms = isReducedMotion() ? 0 : 200
      window.setTimeout(() => onRemove(entry), ms)
      return
    }
    setX(0, true)
    // keep the click suppressed for the tap that may follow a swipe
    window.setTimeout(() => {
      swiped.current = false
    }, 250)
  }

  const onClick = () => {
    if (swiped.current || leaving.current) return
    onEdit(entry)
  }

  const liRef = useCallback(
    (el: HTMLLIElement | null) => {
      if (!el || !rise || isReducedMotion() || typeof el.animate !== 'function') return
      try {
        el.animate([{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EASE_STONE_CSS })
        const rule = el.querySelector<HTMLElement>('[data-rule]')
        rule?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 240, easing: EASE_STONE_CSS })
      } catch {
        /* no WAAPI: the row simply appears */
      }
    },
    [rise],
  )

  return (
    <li ref={liRef} className="relative overflow-hidden" style={{ touchAction: 'pan-y' }}>
      <span
        ref={hint}
        aria-hidden="true"
        className="font-display pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[10px] tracking-[0.3em] text-ember-text"
        style={{ opacity: 0 }}
      >
        Delete
      </span>
      <div
        ref={face}
        className="relative flex h-[52px] items-center bg-obsidian-900"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <button type="button" onClick={onClick} className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-[4px] text-left" aria-label={`Edit ${entry.name}`}>
          <span aria-hidden="true" className="h-[30px] w-[3px] shrink-0 bg-gold-400" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-body text-[18px] font-medium leading-[1.2] text-bone">{entry.name}</span>
            <span className="num block truncate font-body text-[13px] leading-[1.2] text-bone-dim">
              {formatTime(entry.at)} · {macroLine(entry)}
            </span>
          </span>
          <span className="shrink-0 whitespace-nowrap pr-1">
            <span className="font-display inscribed num text-[15px] tracking-[0.02em] text-gold-400">{formatEnergy(entry.macros.kcal, unit)}</span>
            <span className="num font-body text-[13px] text-bone-dim"> {unitLabel(unit)}</span>
          </span>
        </button>
        <IconButton label={`Remove ${entry.name}`} onClick={() => onRemove(entry)} className="-mr-2 shrink-0">
          <Trash2 size={18} strokeWidth={1.5} />
        </IconButton>
      </div>
      <span data-rule aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px origin-left bg-[var(--gold-line)]" />
    </li>
  )
}

type ListProps = {
  entries: LogEntry[]
  unit: EnergyUnit
  onEdit(e: LogEntry): void
  onRemove(e: LogEntry): void
}

/** Newest first. Mounted fresh each time the sheet opens, so "new" is relative to this open. */
function TodayEntryList({ entries, unit, onEdit, onRemove }: ListProps) {
  const seen = useRef<Set<string> | null>(null)
  const first = seen.current === null
  const prev = seen.current
  useEffect(() => {
    seen.current = new Set(entries.map((e) => e.id))
  })
  if (!entries.length) return <EmptyLine className="py-6 text-center">Nothing logged yet.</EmptyLine>
  return (
    <ul className="-mx-4 px-4">
      {entries.map((e, i) => (
        <TodayRow key={e.id} entry={e} unit={unit} rise={first ? i === 0 : !prev!.has(e.id)} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </ul>
  )
}

export function TodaySheet({ today }: { today: string }) {
  const open = useUI((s) => s.todayOpen)
  const close = useUI((s) => s.closeToday)
  const entries = useStore((s) => s.entries)
  const unit = useStore((s) => s.settings.unit)
  const deleteEntry = useStore((s) => s.deleteEntry)
  const restoreEntry = useStore((s) => s.restoreEntry)
  const updateEntry = useStore((s) => s.updateEntry)
  const show = useToast((s) => s.show)

  const list = useMemo(() => entriesForDay(entries, today).reverse(), [entries, today])
  const totals = useMemo(() => totalsForDay(entries, today), [entries, today])

  const [editing, setEditing] = useState<LogEntry | null>(null)
  useEffect(() => {
    if (!open) setEditing(null)
  }, [open])
  // the entry being edited may vanish (deleted elsewhere): fall back to the list
  useEffect(() => {
    if (editing && !entries.some((e) => e.id === editing.id)) setEditing(null)
  }, [entries, editing])

  const remove = useCallback(
    (e: LogEntry) => {
      deleteEntry(e.id)
      show({
        text: `Removed · ${formatEnergy(e.macros.kcal, unit)} ${unitLabel(unit)}`,
        action: { label: 'Undo', icon: 'undo', onClick: () => restoreEntry(e) },
      })
    },
    [deleteEntry, restoreEntry, show, unit],
  )

  const save = (patch: EntryPatch) => {
    if (!editing) return
    updateEntry(editing.id, patch)
    setEditing(null)
  }

  const total = (
    <span className="whitespace-nowrap">
      <span className="font-display inscribed num text-[15px] tracking-[0.02em] text-gold-400">{formatEnergy(totals.kcal, unit)}</span>
      <span className="num font-body text-[13px] text-bone-dim"> {unitLabel(unit)}</span>
    </span>
  )

  return (
    <Sheet
      open={open}
      onClose={close}
      title={editing ? 'Edit' : 'Today'}
      headerRight={editing ? null : total}
      height="auto"
      footer={
        editing ? (
          <Button variant="gold" full type="submit" form={EDIT_FORM_ID}>
            Save
          </Button>
        ) : undefined
      }
    >
      {editing ? (
        <TodayEntryEdit key={editing.id} entry={editing} unit={unit} formId={EDIT_FORM_ID} onSave={save} onBack={() => setEditing(null)} />
      ) : (
        <TodayEntryList entries={list} unit={unit} onEdit={setEditing} onRemove={remove} />
      )}
    </Sheet>
  )
}
