import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { SquarePlus } from 'lucide-react'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { recentKey } from '../store/selectors'
import { useReducedMotion, vibrate } from '../lib/motion'
import { EmptyLine, SectionHeading } from '../components/ui'
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
/** the sheet takes --t-sheet-in to rise; the new row lands after it */
const RISE_DELAY_MS = 320
const RISE_MS = 240

/**
 * RECENT: the last 12 distinct things logged. 52 px rows with a 3 x 30 px gold bar, the name
 * over its P C F line, kcal in Cinzel gold and a square-plus ghost. Every number on a row is the
 * snapshot as it was logged (portions included), because a tap re-logs exactly that.
 */
export function LogRecents({ entries, unit, onRelog, onEditFirst, onHide, limit = 12, risingKey = null }: Props) {
  const reduced = useReducedMotion()
  const [menuFor, setMenuFor] = useState<string | null>(null)
  // captured at mount; the sheet mounts this fresh on every open
  const [rising] = useState(() => risingKey)

  return (
    <section className="mt-6" aria-label="Recent">
      <SectionHeading right={`Last ${limit}`} rule="strong">
        Recent
      </SectionHeading>
      {entries.length ? (
        <ul className="flex flex-col">
          {entries.map((e) => {
            const key = recentKey(e)
            return (
              <RecentRow
                key={key}
                entry={e}
                unit={unit}
                rising={rising === key && !reduced}
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
        <EmptyLine className="pt-3">Nothing logged yet.</EmptyLine>
      )}
    </section>
  )
}

type RowProps = {
  entry: LogEntry
  unit: EnergyUnit
  rising: boolean
  reduced: boolean
  menuOpen: boolean
  onMenu(open: boolean): void
  onRelog(): void
  onEditFirst(): void
  onHide(): void
}

function RecentRow({ entry, unit, rising, reduced, menuOpen, onMenu, onRelog, onEditFirst, onHide }: RowProps) {
  const rowRef = useRef<HTMLLIElement>(null)
  const faceRef = useRef<HTMLButtonElement>(null)
  const ruleRef = useRef<HTMLSpanElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const servings = entry.servings

  // gesture state (refs: no re-render while a finger is down)
  const press = useRef<{ x: number; y: number; id: number; timer: number; long: boolean; swiping: boolean; dx: number } | null>(null)
  const suppressClick = useRef(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!rising) return
    const li = rowRef.current
    const rule = ruleRef.current
    if (!li || typeof li.animate !== 'function') return
    const timing = { duration: RISE_MS, delay: RISE_DELAY_MS, easing: STONE_EASE, fill: 'backwards' as const }
    const a = li.animate([{ transform: 'translateY(-14px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], timing)
    const b = rule?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], timing)
    return () => {
      a.cancel()
      b?.cancel()
    }
  }, [rising])

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
    const a = li.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 200, easing: STONE_EASE, fill: 'forwards' })
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
    <li ref={rowRef} className={`relative overflow-hidden ${leaving ? 'pointer-events-none' : ''}`}>
      {/* what the swipe reveals */}
      <div ref={revealRef} aria-hidden="true" className="absolute inset-0 flex items-center justify-end pr-5 opacity-0 transition-opacity duration-150">
        <span className="font-display text-[10px] tracking-[0.4em] text-bone-dim">Hide</span>
      </div>
      <button
        ref={faceRef}
        type="button"
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
        aria-label={`Log ${entry.name}, ${energyLine(entry.macros.kcal, unit)}${servings !== 1 ? `, ${servings} portions` : ''}`}
        className="relative flex h-[52px] w-full items-center gap-3 bg-obsidian-900 text-left transition-colors duration-150 hover:bg-[var(--gold-line)] active:bg-[var(--gold-line)] cursor-pointer select-none"
        style={{ touchAction: 'pan-y', WebkitTouchCallout: 'none' }}
      >
        <span aria-hidden="true" className="h-[30px] w-[3px] shrink-0 rounded-[2px] bg-gold-400" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-body text-[18px] font-medium leading-[1.2] text-bone">
            {entry.name}
            {servings !== 1 ? <span className="num text-bone-dim"> {'×'} {servings}</span> : null}
          </span>
          <span className="num block truncate font-body text-[13px] leading-[1.2] text-bone-dim">{macroLine(entry.macros)}</span>
        </span>
        <span className="num font-display inscribed shrink-0 text-[15px] tracking-[0.02em] text-gold-400">{energyLine(entry.macros.kcal, unit)}</span>
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center text-bone-dim">
          <SquarePlus size={20} strokeWidth={1.5} />
        </span>
        <span ref={ruleRef} aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px origin-left bg-[var(--gold-line)]" />
      </button>
      {menuOpen ? (
        <div role="group" aria-label={`${entry.name} actions`} className="flex h-11 items-center justify-end gap-2 border-b border-[var(--gold-line)] bg-obsidian-800 px-2">
          <button
            type="button"
            onClick={() => {
              onMenu(false)
              onEditFirst()
            }}
            className="font-display h-9 px-3 text-[10px] tracking-[0.3em] text-gold-300 hover:text-gold-200 cursor-pointer"
          >
            Edit first
          </button>
          <button
            type="button"
            onClick={() => {
              onMenu(false)
              hide()
            }}
            className="font-display h-9 px-3 text-[10px] tracking-[0.3em] text-bone-dim hover:text-bone cursor-pointer"
          >
            Hide
          </button>
        </div>
      ) : null}
    </li>
  )
}
