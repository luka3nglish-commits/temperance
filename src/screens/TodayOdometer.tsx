/**
 * THE HERO ODOMETER (polish-spec 7.2 item 1). The big number in gold (or ember) foil where every digit
 * rolls to its new value instead of ticking.
 *
 * Each digit sits in a fixed 0.62em cell (the same cells as GoldNumber, so nothing jitters), 1.08em
 * tall with overflow hidden. Inside, a strip of 0 to 9 twice (20 glyphs) is moved by
 * `translateY(calc(var(--d) * -1.08em))` with `transform 560ms cubic-bezier(0.2, 0.9, 0.2, 1)` delayed
 * `--i * 28ms`, `--i` counting from the rightmost digit. When the number falls (a log) digits arrive from
 * above; when it rises (a delete) from below. A digit that has to wrap rolls on into the second half
 * of the strip (index d + 10) and is reset without transition once it lands, so it always rolls one way.
 * While rolling the cell edges fade (a 16 percent mask top and bottom); at rest there is no mask.
 *
 * The foil is three stacked strips per cell, exactly like GoldNumber's layers: a 1 px chisel shadow
 * below, a 1 px light lip above (high tier only) and the face. Each face strip carries its own
 * background clipped to its text; the gradient is sized to the whole number (`--num-w * 2.2`) and
 * shifted by the cell's slot (`--slot-x`), so the light runs continuously across the cells and still
 * follows --tilt-x. The brushed layer rides on the high tier only (gold, never ember).
 *
 * A new leading digit clips in from the bottom (320 ms, --ease-cut). The thin-space cell is static.
 * Reduced motion: no roll; the figure changes in place with a 120 ms opacity crossfade.
 */
import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { formatInt } from '../lib/units'
import { isReducedMotion } from '../lib/motion'
import { useTier } from '../scene/tier'

const DIGIT_W = 0.62
const SEP_W = 0.28
const ROLL_MS = 560
const ROLL_STAGGER = 28
const ROLL_EASE = 'cubic-bezier(0.2, 0.9, 0.2, 1)'
const CLIP_MS = 320
const EASE_CUT = 'cubic-bezier(0.7, 0, 0.2, 1)'
const EDGE_MASK = 'linear-gradient(180deg, transparent 0, #000 16%, #000 84%, transparent 100%)'
/**
 * Cinzel's figures sit high in a 1.08em line (caps from about 0.05em to 0.78em), which leaves the roll
 * window lopsided and the number floating away from its sub-line. Each strip drops 0.13em so the figure
 * is centred in its cell: the roll reads evenly top and bottom and the hero block balances.
 */
const GLYPH_DROP = 0.13
const ROLL_TRANSITION =`transform ${ROLL_MS}ms ${ROLL_EASE} calc(var(--i) * ${ROLL_STAGGER}ms)`
const STRIP = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export type OdoCell = { kind: 'digit' | 'sep'; ch: string; key: string; x: number; i: number }

/** Lay a formatted number out in cells: positions in em, keys and stagger indices counted from the right. */
export function odometerCells(text: string): { cells: OdoCell[]; width: number } {
  const chars = text.split('')
  let x = 0
  let digitFromRight = chars.filter((c) => /\d/.test(c)).length
  const cells = chars.map((ch, idx) => {
    const fromRight = chars.length - 1 - idx
    const digit = /\d/.test(ch)
    if (digit) digitFromRight--
    const cell: OdoCell = { kind: digit ? 'digit' : 'sep', ch, key: `${digit ? 'd' : 's'}${fromRight}`, x, i: digit ? digitFromRight : 0 }
    x += digit ? DIGIT_W : SEP_W
    return cell
  })
  return { cells, width: Math.round(x * 1000) / 1000 }
}

/**
 * Where a digit strip starts and lands. `cur` is the strip index now (0 to 19), `n` the new digit,
 * `falling` true when the whole number went down. Returns the index to snap to without a transition
 * first (or null), the index to roll to, and whether it lands in the second half (reset it after).
 */
export function rollPlan(cur: number, n: number, falling: boolean): { snap: number | null; to: number } {
  const d = cur % 10
  if (d === n) return { snap: null, to: cur }
  if (falling) {
    // the strip moves down: the index decreases
    if (n < d) return { snap: null, to: cur >= 10 ? n + 10 : n }
    return { snap: cur < 10 ? cur + 10 : null, to: n }
  }
  // rising: the strip moves up, the index increases
  if (n > d) return { snap: null, to: cur >= 10 ? n + 10 : n }
  return { snap: cur >= 10 ? cur - 10 : null, to: n + 10 }
}

type Props = {
  value: number
  ember?: boolean
  /** Cinzel size, any CSS length (the hero uses a min() against the goal line) */
  size: string
  /** accessible text, defaults to the plain digits */
  label?: string
}

export function TodayOdometer({ value, ember = false, size, label }: Props) {
  const tier = useTier()
  const brush = tier === 'high' && !ember
  const lip = tier === 'high'
  const text = formatInt(Math.abs(Math.round(value)))
  const { cells, width } = odometerCells(text)

  const root = useRef<HTMLSpanElement>(null)
  const pos = useRef(new Map<string, number>())
  const prevValue = useRef<number | null>(null)
  const timers = useRef<number[]>([])

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const prev = prevValue.current
    prevValue.current = value
    const falling = prev !== null && value < prev
    const reduced = isReducedMotion()
    const animate = prev !== null && prev !== value && !reduced
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []

    const nodes = el.querySelectorAll<HTMLElement>('[data-odo-digit]')
    const live = new Set<string>()
    const set = (cell: HTMLElement, d: number, transition: boolean) => {
      const strips = cell.querySelectorAll<HTMLElement>('[data-strip]')
      strips.forEach((s) => (s.style.transition = transition ? ROLL_TRANSITION : 'none'))
      cell.style.setProperty('--d', String(d))
      if (!transition) {
        void cell.offsetWidth
        strips.forEach((s) => (s.style.transition = ROLL_TRANSITION))
      }
    }
    let longest = 0
    nodes.forEach((cell) => {
      const key = cell.dataset.key!
      const n = Number(cell.dataset.digit)
      const i = Number(cell.dataset.i)
      live.add(key)
      const cur = pos.current.get(key)
      if (cur === undefined || !animate) {
        set(cell, n, false)
        pos.current.set(key, n)
        // a leading digit that just arrived clips in from the bottom
        if (cur === undefined && animate && typeof cell.animate === 'function') {
          try {
            cell.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: CLIP_MS, easing: EASE_CUT })
          } catch {
            /* no WAAPI: it simply appears */
          }
        }
        return
      }
      const plan = rollPlan(cur, n, falling)
      if (plan.to === cur && plan.snap === null) return
      if (plan.snap !== null) set(cell, plan.snap, false)
      cell.style.setProperty('-webkit-mask-image', EDGE_MASK)
      cell.style.setProperty('mask-image', EDGE_MASK)
      set(cell, plan.to, true)
      pos.current.set(key, plan.to)
      const end = ROLL_MS + i * ROLL_STAGGER + 40
      longest = Math.max(longest, end)
      timers.current.push(
        window.setTimeout(() => {
          if (plan.to >= 10) {
            set(cell, plan.to - 10, false)
            pos.current.set(key, plan.to - 10)
          }
        }, end),
      )
    })
    for (const k of [...pos.current.keys()]) if (!live.has(k)) pos.current.delete(k)
    if (longest > 0) {
      timers.current.push(
        window.setTimeout(() => {
          nodes.forEach((cell) => {
            cell.style.removeProperty('-webkit-mask-image')
            cell.style.removeProperty('mask-image')
          })
        }, longest),
      )
    }
    if (prev !== null && prev !== value && reduced && typeof el.animate === 'function') {
      try {
        el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 120, easing: 'linear' })
      } catch {
        /* fine */
      }
    }
  }, [value, text])

  useLayoutEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const gradient = ember ? 'var(--ember-grad)' : 'var(--gold-grad-text)'
  const shiftX = 'calc(var(--num-w) * -1.2 * (0.5 + var(--tilt-x, 0) * 0.5) - var(--slot-x))'
  const faceStyle: CSSProperties = brush
    ? {
        backgroundImage: `var(--gold-brush), ${gradient}`,
        backgroundSize: '256px 64px, calc(var(--num-w) * 2.2) 1.08em',
        backgroundRepeat: 'repeat, repeat-y',
        backgroundPosition: `calc(-1 * var(--slot-x)) 0, ${shiftX} 0`,
      }
    : {
        backgroundImage: gradient,
        backgroundSize: 'calc(var(--num-w) * 2.2) 1.08em',
        backgroundRepeat: 'repeat-y',
        backgroundPosition: `${shiftX} 0`,
      }
  const strip = (layer: 'shadow' | 'lip' | 'face') => (
    <span
      data-strip={layer}
      aria-hidden="true"
      className="absolute inset-x-0 top-0 block text-center"
      style={{
        transform: `translateY(calc(var(--d, 0) * -1.08em + ${GLYPH_DROP}em${layer === 'shadow' ? ' + 1px' : layer === 'lip' ? ' - 1px' : ''}))`,
        transition: ROLL_TRANSITION,
        ...(layer === 'shadow'
          ? { color: 'rgba(0, 0, 0, 0.55)' }
          : layer === 'lip'
            ? { color: 'rgba(255, 247, 218, 0.14)' }
            : { ...faceStyle, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }),
      }}
    >
      {STRIP.map((g, k) => (
        <span key={k} className="block h-[1.08em] leading-[1.08em]">
          {g}
        </span>
      ))}
    </span>
  )

  return (
    <span
      ref={root}
      role="text"
      aria-label={label ?? text.replace(/\D/g, '')}
      data-odometer=""
      className="font-display relative inline-flex font-bold leading-[1.08] tracking-[-0.01em]"
      style={{ fontSize: size, '--num-w': `${width}em` } as CSSProperties}
    >
      {cells.map((c) =>
        c.kind === 'sep' ? (
          <span key={c.key} aria-hidden="true" className="inline-block h-[1.08em]" style={{ width: `${SEP_W}em` }} />
        ) : (
          <span
            key={c.key}
            aria-hidden="true"
            data-odo-digit=""
            data-key={c.key}
            data-digit={c.ch}
            data-i={c.i}
            className="relative inline-block h-[1.08em] overflow-hidden align-top"
            style={{ width: `${DIGIT_W}em`, '--slot-x': `${c.x}em`, '--i': c.i } as CSSProperties}
          >
            {strip('shadow')}
            {lip ? strip('lip') : null}
            {strip('face')}
          </span>
        ),
      )}
    </span>
  )
}
