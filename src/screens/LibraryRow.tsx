import { memo, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Check, SquarePlus, Star } from 'lucide-react'
import { vibrate } from '../lib/motion'

/** Test hooks for one row; each is optional and rendered only when given (never derived, so a meal shown twice is never ambiguous). */
export type RowTestIds = { row?: string; fav?: string; log?: string }

type Props = {
  id: string
  name: string
  /** `612 kcal · P 32 C 48 F 12` or `per 100 g · 165 kcal · ...` */
  subline: string
  favourite: boolean
  onOpen(id: string): void
  onToggleFavourite(id: string): void
  /** when given, a 44 px square-plus at the trailing edge logs one portion at once */
  onLog?(id: string): void
  /** label for the log target, e.g. "Log one portion" */
  logLabel?: string
  testIds?: RowTestIds
}

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 10

/**
 * Long press without fighting the click: pointer events start a timer, movement, release or
 * cancel clear it; when it fires the next click on the same element is swallowed.
 */
function useLongPress(onLongPress: () => void) {
  const timer = useRef(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = 0
    start.current = null
  }, [])

  useEffect(() => clear, [clear])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = 0
        fired.current = true
        onLongPress()
      }, LONG_PRESS_MS)
    },
    [onLongPress],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const s = start.current
      if (!s || !timer.current) return
      if (Math.abs(e.clientX - s.x) > MOVE_CANCEL_PX || Math.abs(e.clientY - s.y) > MOVE_CANCEL_PX) clear()
    },
    [clear],
  )

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (fired.current) {
      fired.current = false
      e.preventDefault()
      e.stopPropagation()
    }
  }, [])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Android raises a context menu on long press; the press is ours
    e.preventDefault()
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp: clear, onPointerCancel: clear, onPointerLeave: clear, onClickCapture, onContextMenu }
}

const TARGET = 'flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-[4px] transition-[color,transform] duration-150 active:scale-[0.9] cursor-pointer'

/**
 * One 60 px library row ruled with --gold-line. The body is a button that opens the detail sheet.
 * At the trailing edge sit the 44 px targets: the star (outline bone-dim off, filled gold-400 on)
 * on every row, and the square-plus that logs one portion when `onLog` is given (meal rows).
 * Long press anywhere on the row toggles the favourite.
 */
export const LibraryRow = memo(function LibraryRow({ id, name, subline, favourite, onOpen, onToggleFavourite, onLog, logLabel = 'Log one portion', testIds }: Props) {
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const toggle = useCallback(() => {
    vibrate(8)
    onToggleFavourite(id)
  }, [id, onToggleFavourite])
  const press = useLongPress(toggle)

  const log = useCallback(() => {
    onLog?.(id)
    setFlash(true)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(false), 900)
  }, [id, onLog])

  return (
    <li
      data-testid={testIds?.row}
      className="flex items-stretch border-b border-[var(--gold-line)] select-none [-webkit-touch-callout:none]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 60px' }}
      {...press}
    >
      <button
        type="button"
        onClick={() => onOpen(id)}
        className="flex min-h-[60px] min-w-0 flex-1 flex-col justify-center py-1.5 pr-2 text-left transition-colors duration-150 hover:bg-[var(--gold-line)] active:bg-[var(--gold-line)] cursor-pointer"
      >
        <span className="truncate font-body text-[19px] font-medium leading-[1.3] text-bone">{name}</span>
        <span className="num truncate font-body text-[13px] leading-[1.3] text-bone-dim">{subline}</span>
      </button>

      <button
        type="button"
        data-testid={testIds?.fav}
        aria-pressed={favourite}
        aria-label={`Favourite ${name}`}
        onClick={toggle}
        className={`${TARGET} ${favourite ? 'text-gold-400' : 'text-bone-dim hover:text-bone'}`}
      >
        <Star size={20} strokeWidth={1.5} className={`transition-transform duration-150 ${favourite ? 'fill-current' : ''}`} />
      </button>

      {onLog ? (
        <button
          type="button"
          data-testid={testIds?.log}
          aria-label={`${logLabel} of ${name}`}
          title={logLabel}
          onClick={log}
          className={`${TARGET} ${flash ? 'text-gold-300' : 'text-bone-dim hover:text-gold-400'}`}
        >
          {flash ? <Check size={22} strokeWidth={1.5} /> : <SquarePlus size={22} strokeWidth={1.5} />}
        </button>
      ) : null}
    </li>
  )
})
