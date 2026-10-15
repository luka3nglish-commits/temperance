import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { SquarePlus } from 'lucide-react'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { recentKey } from '../store/selectors'
import { useReducedMotion, vibrate } from '../lib/motion'
import { formatEnergy, unitLabel } from '../lib/units'
import { portionAria, portionLabel } from '../lib/portion'
import { EmptyLine, SectionHeading, ValueUnit, useStaggerOnce } from '../components/ui'
import { Rhombus } from '../components/ornaments'
import { energyLine, macroLine } from '../components/MealForm'

type Props = {
  entries: readonly LogEntry[]
  unit: EnergyUnit
  /** tap: re-log the snapshot as it was */
  onRelog(entry: LogEntry): void
  /** long press 450 ms: prefill QUICK with it, no log */
  onEditFirst(entry: LogEntry): void
  /** swipe left or HIDE: drop it from recents */
  onHide(entry: LogEntry): void
  limit?: number
  /**
   * The row that arrived since the sheet was last open (its `recentKey`). Read once at mount: it
   * rises in from the top once the sheet has settled. Hiding a row later never makes the next one rise.
   */
  risingKey?: string | null
}

const LONG_PRESS_MS = 450
const SWIPE_HIDE_PX = 72
const MOVE_CANCEL_PX = 8
const STONE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * RECENT (polish-spec 6.2 and 4.11): the last 12 distinct things logged, 56 px rows: a 14 px mark
 * gutter (a solid rhombus on the newest row only), the name with its portion (`Greek yoghurt · 180 g`,
 * the portion never truncates), the P C F line, the energy in bone Cinzel (gold-300 on the newest) and
 * a SquarePlus. Every number on a row is the snapshot as it was logged, because a tap re-logs exactly
 * that (`relogEntry`). The list rises in on open; a row logged since the last open washes gold.
 */
export function LogRecents({ entries, unit, onRelog, onEditFirst, onHide, limit = 12, risingKey = null }: Props) {
  const reduced = useReducedMotion()
  const stagger = useStaggerOnce()
  const [menuFor, setMenuFor] = useState<string | null>(null)
  // captured at mount; the sheet mounts this fresh on every open
  const [rising] = useState(() => risingKey)

  return (
    <section className="mt-6" aria-label="Recent">
      <SectionHeading right={`Last ${limit}`} rule="strong">
        Recent
      </SectionHeading>
      {entries.length ? (
        <ul data-testid="tp-recents" className={`flex flex-col ${stagger}`}>
          {entries.map((e, i) => {
            const key = recentKey(e)
            return (
              <RecentRow
                key={key}
                entry={e}
                unit={unit}
                newest={i === 0}
                rising={rising === key}
                reduced={reduced}
                menuOpen={menuFor === key}
                onMenu={(open) => setMenuFor(open ? key : null)}
                onRelog={() => onRelog(e)}
                onEditFirst={() => onEditFirst(e)}
                onHide={() => onHide(e)}
              />
            )
          })}
        </ul>
      ) : (
        <div data-testid="tp-recent-empty">
          <EmptyLine className="pt-4">Nothing logged yet.</EmptyLine>
        </div>
      )}
    </section>
  )
}

type RowProps = {
  entry: LogEntry
  unit: EnergyUnit
  /** the newest row carries the mark and a gold value */
  newest: boolean
  /** logged since the sheet was last open: a 900 ms gold wash and the mark scales in */
  rising: boolean
  reduced: boolean
  menuOpen: boolean
  onMenu(open: boolean): void
  onRelog(): void
  onEditFirst(): void
  onHide(): void
}

function RecentRow({ entry, unit, newest, rising, reduced, menuOpen, onMenu, onRelog, onEditFirst, onHide }: RowProps) {
  const rowRef = useRef<HTMLLIElement>(null)
  const faceRef = useRef<HTMLButtonElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const label = portionLabel(entry)
  const spoken = portionAria(entry)

  // gesture state (refs: no re-render while a finger is down)
  const press = useRef<{ x: number; y: number; id: number; timer: number; long: boolean; swiping: boolean; dx: number } | null>(null)
  const suppressClick = useRef(false)
  const [leaving, setLeaving] = useState(false)

  const setShift = (dx: number, animate = false) => {
    const el = faceRef.current
    if (!el) return
    el.style.transition = animate ? `transform 200ms ${STONE_EASE}` : 'none'
    el.style.transform = dx ? `translateX(${dx}px)` : ''
    if (revealRef.current) revealRef.current.style.opacity = dx ? '1' : '0'
  }

  const hide = () => {
    if (reduced) {
      onHide()
      return
    }
    setLeaving(true)
    const li = rowRef.current
    if (!li || typeof li.animate !== 'function') {
      onHide()
      return
    }
    const h = li.getBoundingClientRect().height
    const a = li.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: STONE_EASE, fill: 'forwards' })
    a.onfinish = () => onHide()
    a.oncancel = () => onHide()
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    // a fresh gesture never inherits a swallowed click from the last one
    suppressClick.current = false
    if (press.current) window.clearTimeout(press.current.timer)
    const timer = window.setTimeout(() => {
      const p = press.current
      if (!p || p.swiping) return
      p.long = true
      suppressClick.current = true
      vibrate(12)
      onEditFirst()
    }, LONG_PRESS_MS)
    press.current = { x: e.clientX, y: e.clientY, id: e.pointerId, timer, long: false, swiping: false, dx: 0 }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (!p || p.id !== e.pointerId || p.long) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    if (!p.swiping) {
      if (Math.abs(dx) < MOVE_CANCEL_PX && Math.abs(dy) < MOVE_CANCEL_PX) return
      window.clearTimeout(p.timer)
      if (Math.abs(dx) > Math.abs(dy) && dx < 0) {
        p.swiping = true
        faceRef.current?.setPointerCapture(e.pointerId)
      } else {
        press.current = null
        return
      }
    }
    p.dx = Math.min(0, dx)
    setShift(p.dx)
  }

  const endPress = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    window.clearTimeout(p.timer)
    press.current = null
    if (p.swiping) {
      suppressClick.current = true
      if (p.dx <= -SWIPE_HIDE_PX) {
        setShift(-rowWidth(), true)
        hide()
      } else {
        setShift(0, true)
      }
    }
  }

  const rowWidth = () => faceRef.current?.getBoundingClientRect().width ?? 390

  return (
    <li ref={rowRef} className={`row-rule relative overflow-hidden ${leaving ? 'pointer-events-none' : ''}`}>
      {/* what the swipe reveals */}
      <div ref={revealRef} aria-hidden="true" className="absolute inset-0 flex items-center justify-end pr-5 opacity-0 transition-opacity duration-150">
        <span className="label">Hide</span>
      </div>
      <button
        ref={faceRef}
        type="button"
        data-testid={`tp-recent-row-${entry.id}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => {
          e.preventDefault()
          const kind = (e.nativeEvent as Partial<PointerEvent>).pointerType
          if (kind === 'mouse' || (kind === undefined && e.button === 2)) onMenu(!menuOpen)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault()
            hide()
          } else if (e.key === 'e' || e.key === 'E') {
            e.preventDefault()
            onEditFirst()
          }
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          if (menuOpen) {
            onMenu(false)
            return
          }
          onRelog()
        }}
        aria-label={`Log ${entry.name}${spoken ? `, ${spoken}` : ''}, ${energyLine(entry.macros.kcal, unit)}`}
        className={`group row-press relative grid h-14 w-full grid-cols-[14px_minmax(0,1fr)_auto_44px] items-center bg-obsidian-900 text-left cursor-pointer select-none [@media(hover:hover)]:hover:bg-obsidian-800 ${
          rising ? 'row-new' : ''
        }`}
        style={{ touchAction: 'pan-y', WebkitTouchCallout: 'none' }}
      >
        <span aria-hidden="true" className="flex items-center">
          {newest ? <Rhombus solid className={rising && !reduced ? 'is-new' : ''} /> : null}
        </span>
        <span className="min-w-0 pr-3">
          <span className="flex min-w-0 items-baseline leading-[1.25]">
            <span className="truncate font-body text-[19px] font-medium text-bone">{entry.name}</span>
            {label ? <span className="num shrink-0 font-body text-[16px] font-medium text-bone-soft">{` · ${label}`}</span> : null}
          </span>
          <span className="meta block truncate leading-[1.25]">{macroLine(entry.macros)}</span>
        </span>
        <ValueUnit value={formatEnergy(entry.macros.kcal, unit)} unit={unitLabel(unit)} tone={newest ? 'gold' : 'bone'} />
        <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center text-bone-dim transition-colors duration-200 group-active:text-gold-300">
          <SquarePlus size={22} strokeWidth={1.5} className="transition-[rotate] duration-200 group-active:rotate-90" />
        </span>
      </button>
      {menuOpen ? (
        <div role="group" aria-label={`${entry.name} actions`} className="flex h-11 items-center justify-end gap-2 bg-obsidian-800 px-2">
          <button
            type="button"
            onClick={() => {
              onMenu(false)
              onEditFirst()
            }}
            className="label press h-11 px-3 text-gold-300 cursor-pointer"
          >
            Edit first
          </button>
          <button
            type="button"
            onClick={() => {
              onMenu(false)
              hide()
            }}
            className="label press h-11 px-3 cursor-pointer"
          >
            Hide
          </button>
        </div>
      ) : null}
    </li>
  )
}
