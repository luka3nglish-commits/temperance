import { memo, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { SquarePlus, Star } from 'lucide-react'
import type { EnergyUnit } from '../lib/types'
import { formatEnergy, unitLabel } from '../lib/units'
import { vibrate } from '../lib/motion'
import { IconButton, ValueUnit } from '../components/ui'
import { Rhombus } from '../components/ornaments'

/** Test hooks for one row; each is optional and rendered only when given (never derived, so a meal shown twice is never ambiguous). */
export type RowTestIds = { row?: string; fav?: string; log?: string }

type Props = {
  id: string
  name: string
  /** meta line: `P 69 · C 70 · F 18` or `per 100 g · P 31 · C 0 · F 4` */
  meta: string
  /** energy in kcal for the value column (shown in the display unit) */
  kcal: number
  unit: EnergyUnit
  favourite: boolean
  onOpen(id: string): void
  onToggleFavourite(id: string): void
  /** when given, a 44 px square-plus at the trailing edge logs the usual amount at once */
  onLog?(id: string): void
  /** label for the log target, e.g. "Log the usual" */
  logLabel?: string
  testIds?: RowTestIds
}

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 10
const FLASH_MS = 900

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

/**
 * One 60 px library row in the shared list grammar (polish-spec 4.11):
 *
 *   [mark 14][name                  743 kcal][☆ 44][⊞ 44]
 *           [meta line, under the value too ]
 *
 * The body (mark, name, meta, value) is one button that opens the detail sheet and is the first
 * button in the row (the tour and the tests click it). The name is Cormorant 500 19 px bone and
 * truncates (the favourite shows once, on the star toggle, so the name keeps its width). The meta line is Cormorant 600
 * 16 px bone-soft with whole grams. The value is `ValueUnit` in bone. Then the 44 px targets: the
 * star toggle (20 px; off bone-dim, on gold-400 with a soft gold fill) and the square-plus that logs
 * the usual amount (meal rows). Rows without a log action keep the empty cell so every kcal column
 * lines up down the screen. A one-tap log flashes a solid rhombus in the mark gutter and turns the
 * plus 90 degrees. Long press anywhere on the row toggles the favourite.
 */
export const LibraryRow = memo(function LibraryRow({ id, name, meta, kcal, unit, favourite, onOpen, onToggleFavourite, onLog, logLabel = 'Log the usual', testIds }: Props) {
  const [flash, setFlash] = useState(0)
  const flashTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const toggle = useCallback(() => {
    vibrate(8)
    onToggleFavourite(id)
  }, [id, onToggleFavourite])
  const press = useLongPress(toggle)

  const log = useCallback(() => {
    onLog?.(id)
    // a new key remounts the rhombus so the flash replays on every tap
    setFlash((n) => n + 1)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(0), FLASH_MS)
  }, [id, onLog])

  const energy = formatEnergy(kcal, unit)
  const unitText = unitLabel(unit)

  return (
    <li
      data-testid={testIds?.row}
      className="row-rule grid h-[60px] grid-cols-[1fr_44px_44px] items-center select-none [-webkit-touch-callout:none]"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 60px' }}
      {...press}
    >
      <button
        type="button"
        onClick={() => onOpen(id)}
        aria-label={`${name}${favourite ? ', favourite' : ''}, ${meta}, ${energy} ${unitText}`}
        className="row-press grid h-full min-w-0 grid-cols-[14px_minmax(0,1fr)_auto] content-center items-baseline text-left cursor-pointer"
      >
        <span aria-hidden="true" className="row-span-2 flex items-center self-center">
          {flash ? <Rhombus key={flash} solid className="is-flash" /> : null}
        </span>
        <span className="min-w-0 truncate font-body text-[19px] font-medium leading-[1.3] text-bone">{name}</span>
        <ValueUnit value={energy} unit={unitText} className="pl-3" />
        {/* the meta line runs under the value too, so a long basis line keeps its macros on a narrow phone */}
        <span className="meta col-span-2 block min-w-0 truncate leading-[1.3]">{meta}</span>
      </button>

      <IconButton
        label={`Favourite ${name}`}
        data-testid={testIds?.fav}
        aria-pressed={favourite}
        onClick={toggle}
        className={favourite ? 'text-gold-400' : ''}
      >
        <Star size={20} strokeWidth={1.5} className={favourite ? 'fill-[rgba(216,180,90,0.28)]' : ''} />
      </IconButton>

      {onLog ? (
        <IconButton
          label={`${logLabel}: ${name}`}
          data-testid={testIds?.log}
          onClick={log}
          className={`row-action ${flash ? 'is-done text-gold-300' : ''}`}
        >
          <SquarePlus size={22} strokeWidth={1.5} />
        </IconButton>
      ) : (
        <span aria-hidden="true" />
      )}
    </li>
  )
})
