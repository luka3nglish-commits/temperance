/**
 * THE TODAY SHEET (polish-spec 6.1 and 4.11). Opened from EATEN or the ring.
 * Today's entries newest first, one row grammar, 56 px rows ruled --rule:
 *
 *   ◆ | Greek yoghurt · 180 g                 175 kcal | 🗑
 *     | 3:20 pm · P 16 · C 7 · F 9                     |
 *
 * a 14 px mark gutter (a solid rhombus on the newest entry, whose kcal is gold-300), the name in
 * Cormorant 500 19 px with the portion (portionLabel) in a separate span so the name truncates and the
 * amount never does, the meta line Cormorant 600 16 px bone-soft, the value as ValueUnit, and a 44 px
 * trash. Swipe left to delete (touch, with a threshold) or the trash; the row folds away (220 ms) and
 * the toast reads `Removed · 612 kcal` with UNDO (restoreEntry). Tap a row to edit the snapshot
 * (updateEntry). The rows rise in on open (the list stagger); a row that arrives while the sheet is
 * open washes gold. The kJ toggle applies to every number.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, EmptyLine, IconButton, Sheet, ValueUnit, useStaggerOnce, useToast } from '../components/ui'
import { Rhombus } from '../components/ornaments'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { formatEnergy, unitLabel } from '../lib/units'
import { formatTime } from '../lib/day'
import { portionAria, portionLabel } from '../lib/portion'
import { isReducedMotion } from '../lib/motion'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { entriesForDay, totalsForDay } from '../store/selectors'
import { TodayEntryEdit, type EntryPatch } from './TodayEntryEdit'
import { EASE_STONE_CSS } from './TodayMotion'

const SWIPE_THRESHOLD = 88
const SWIPE_MAX = 140
const FOLD_MS = 220
const EDIT_FORM_ID = 'today-entry-edit'

/** `P 32 · C 48 · F 12` */
export function macroLine(e: LogEntry): string {
  const r = (n: number) => Math.round(n)
  return `P ${r(e.macros.protein)} · C ${r(e.macros.carbs)} · F ${r(e.macros.fat)}`
}

/** `Greek yoghurt, 180 grams, 175 kcal` */
export function entryAria(e: LogEntry, unit: EnergyUnit): string {
  const portion = portionAria(e)
  return `${e.name}${portion ? `, ${portion}` : ''}, ${formatEnergy(e.macros.kcal, unit)} ${unitLabel(unit)}`
}

/** Fold a row away (height and opacity to 0, --ease-stone), then call `done`. */
function fold(el: HTMLElement | null, done: () => void) {
  if (!el || isReducedMotion() || typeof el.animate !== 'function') return done()
  try {
    const a = el.animate([{ height: `${el.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: FOLD_MS, easing: EASE_STONE_CSS, fill: 'forwards' })
    a.onfinish = done
    a.oncancel = done
  } catch {
    done()
  }
}

type RowProps = {
  entry: LogEntry
  unit: EnergyUnit
  /** the newest entry today: the solid mark and the gold value */
  newest: boolean
  /** arrived while the sheet was open: the gold wash */
  fresh: boolean
  onEdit(e: LogEntry): void
  onRemove(e: LogEntry): void
}

function TodayRow({ entry, unit, newest, fresh, onEdit, onRemove }: RowProps) {
  const li = useRef<HTMLLIElement>(null)
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
    // the face covers the DELETE hint only while it is being swiped
    el.style.backgroundColor = x ? 'var(--color-obsidian-900)' : ''
    if (hint.current) hint.current.style.opacity = String(Math.min(1, -x / SWIPE_THRESHOLD))
  }

  const remove = () => {
    if (leaving.current) return
    leaving.current = true
    fold(li.current, () => onRemove(entry))
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
      const w = face.current?.offsetWidth ?? 390
      setX(-w, true)
      window.setTimeout(remove, isReducedMotion() ? 0 : 200)
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

  const portion = portionLabel(entry)

  return (
    <li
      ref={li}
      data-testid={`tp-today-entry-${entry.id}`}
      data-kcal={Math.round(entry.macros.kcal)}
      data-newest={newest ? 'true' : undefined}
      className={`row-rule relative overflow-hidden ${fresh ? 'row-new' : ''}`}
      style={{ touchAction: 'pan-y' }}
    >
      <span ref={hint} aria-hidden="true" className="label pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-ember-text" style={{ opacity: 0 }}>
        Delete
      </span>
      <div
        ref={face}
        className="row-press relative grid h-14 grid-cols-[14px_1fr_44px] items-center"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <span className="flex items-center">{newest ? <Rhombus solid className={fresh ? 'is-new' : ''} /> : null}</span>
        <button
          type="button"
          onClick={onClick}
          className="grid h-full min-w-0 cursor-pointer grid-cols-[1fr_auto] items-center gap-3 rounded-[4px] pr-2 text-left"
          aria-label={`Edit ${entryAria(entry, unit)}`}
        >
          <span className="min-w-0">
            <span className="flex min-w-0 items-baseline">
              <span className="truncate font-body text-[19px] font-medium leading-[1.25] text-bone">{entry.name}</span>
              {portion ? <span className="num shrink-0 whitespace-pre font-body text-[16px] font-medium leading-[1.25] text-bone-soft">{` · ${portion}`}</span> : null}
            </span>
            <span className="meta block truncate">
              {formatTime(entry.at)} · {macroLine(entry)}
            </span>
          </span>
          <ValueUnit value={formatEnergy(entry.macros.kcal, unit)} unit={unitLabel(unit)} tone={newest ? 'gold' : 'bone'} />
        </button>
        <IconButton label={`Remove ${entry.name}`} data-testid={`tp-today-entry-remove-${entry.id}`} onClick={remove} className="shrink-0 active:text-ember-text">
          <Trash2 size={22} strokeWidth={1.5} />
        </IconButton>
      </div>
    </li>
  )
}

type ListProps = {
  entries: LogEntry[]
  unit: EnergyUnit
  onEdit(e: LogEntry): void
  onRemove(e: LogEntry): void
}

/** Newest first. Mounted fresh each time the sheet opens, so "fresh" is relative to this open. */
function TodayEntryList({ entries, unit, onEdit, onRemove }: ListProps) {
  const stagger = useStaggerOnce()
  const seen = useRef<Set<string> | null>(null)
  const prev = seen.current
  useEffect(() => {
    seen.current = new Set(entries.map((e) => e.id))
  })
  if (!entries.length) return <EmptyLine className="py-6 text-center">Nothing logged yet.</EmptyLine>
  return (
    <ul className={stagger} data-testid="tp-today-list">
      {entries.map((e, i) => (
        <TodayRow key={e.id} entry={e} unit={unit} newest={i === 0} fresh={prev !== null && !prev.has(e.id)} onEdit={onEdit} onRemove={onRemove} />
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
    <span data-testid="tp-today-sheet-total" className="mr-1">
      <ValueUnit value={formatEnergy(totals.kcal, unit)} unit={unitLabel(unit)} />
    </span>
  )

  // The Sheet portals itself to <body> (so it paints over the tab bar and the shards) and owns the dialog.
  return (
    <Sheet
      open={open}
      onClose={close}
      testId="tp-today-sheet"
      title={editing ? 'Edit' : 'Today'}
      headerRight={editing ? null : total}
      height="auto"
      footer={
        editing ? (
          <Button variant="gold" full type="submit" form={EDIT_FORM_ID} data-testid="tp-today-edit-save">
            Save
          </Button>
        ) : undefined
      }
    >
      <div className="contents" data-today-view={editing ? 'edit' : 'list'}>
        {editing ? (
          <TodayEntryEdit key={editing.id} entry={editing} unit={unit} formId={EDIT_FORM_ID} onSave={save} onBack={() => setEditing(null)} />
        ) : (
          <TodayEntryList entries={list} unit={unit} onEdit={setEditing} onRemove={remove} />
        )}
      </div>
    </Sheet>
  )
}
