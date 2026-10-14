/**
 * MACRO RING (spec section 9). SVG viewBox 0 0 120 120 at 112 px. Centre (60, 60), radius 50,
 * stroke 7, butt caps. Three explicit path arcs by angle (never dashoffset) starting at -90 deg plus
 * a 3 deg half gap, clockwise, protein then carbs then fat, 6 deg gaps (342 deg shared).
 * Split by calorie contribution (macroEnergySplit) so the ring matches the big number.
 * A zero macro draws no arc but keeps its gap. Empty day: three equal 114 deg arcs in the track colour.
 * Ghost target arcs at radius 44 when targets are set. Angles tween 520 ms --ease-stone in rAF.
 * Tapping a readout row flips the ring into single-macro progress mode for 6 s.
 */
import { useEffect, useState } from 'react'
import type { Macros, MacroTargets } from '../lib/types'
import { macroEnergySplit } from '../lib/macros'
import { macroProgress } from '../store/selectors'
import { useReducedMotion } from '../lib/motion'
import { easeStone, useTweened } from './TodayMotion'

export const MACRO_KEYS = ['protein', 'carbs', 'fat'] as const
export type MacroKey = (typeof MACRO_KEYS)[number]

export const MACRO_COLOUR: Record<MacroKey, string> = { protein: '#F2D98A', carbs: '#B8923E', fat: '#6E5324' }
export const MACRO_LETTER: Record<MacroKey, string> = { protein: 'P', carbs: 'C', fat: 'F' }
export const MACRO_LABEL: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' }

export const RING_START = -87
export const RING_SPAN = 342
export const RING_GAP = 6
export const RING_R = 50
export const GHOST_R = 44
export const TRACK = '#1A1A21'
export const GHOST = '#26262E'

export type ArcSpan = { start: number; end: number }
export type Shares = readonly [number, number, number]

export const EMPTY_SHARES: Shares = [1 / 3, 1 / 3, 1 / 3]

/** Three arcs laid clockwise from RING_START with a RING_GAP after each (a zero share keeps its gap). */
export function layoutArcs(shares: Shares): ArcSpan[] {
  let a = RING_START
  return shares.map((s) => {
    const len = RING_SPAN * Math.max(0, Math.min(1, s))
    const span = { start: a, end: a + len }
    a += len + RING_GAP
    return span
  })
}

/** Calorie shares for the ring; equal thirds (and `empty`) when nothing is logged. */
export function ringShares(m: Macros): { shares: Shares; empty: boolean } {
  const s = macroEnergySplit(m)
  if (s.protein + s.carbs + s.fat <= 0) return { shares: EMPTY_SHARES, empty: true }
  return { shares: [s.protein, s.carbs, s.fat], empty: false }
}

/** Single-macro progress mode: one arc of `ratio` over 342 deg, the other two collapsed to nothing. */
export function progressArcs(index: number, ratio: number): ArcSpan[] {
  const len = RING_SPAN * Math.max(0, Math.min(1, ratio))
  const end = RING_START + len
  return [0, 1, 2].map((i) => (i === index ? { start: RING_START, end } : { start: end + RING_GAP, end: end + RING_GAP }))
}

const rad = (deg: number) => (deg * Math.PI) / 180
const pt = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))] as const
const f = (n: number) => Math.round(n * 1000) / 1000

/** SVG path for a clockwise arc from a0 to a1 degrees (0 = right, -90 = top). Empty for nothing. */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const len = a1 - a0
  if (len <= 0.001) return ''
  if (len >= 359.99) {
    const [x0, y0] = pt(cx, cy, r, a0)
    const [x1, y1] = pt(cx, cy, r, a0 + 180)
    return `M ${f(x0)} ${f(y0)} A ${r} ${r} 0 1 1 ${f(x1)} ${f(y1)} A ${r} ${r} 0 1 1 ${f(x0)} ${f(y0)}`
  }
  const [x0, y0] = pt(cx, cy, r, a0)
  const [x1, y1] = pt(cx, cy, r, a1)
  return `M ${f(x0)} ${f(y0)} A ${r} ${r} 0 ${len > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`
}

type RingProps = {
  totals: Macros
  targets: MacroTargets
  /** single-macro progress mode */
  focus: MacroKey | null
  /** render size in px (112 on the home screen, 56 in history) */
  size?: number
}

/** The SVG only. Centre text is DOM, drawn by the caller. */
export function TodayRing({ totals, targets, focus, size = 112 }: RingProps) {
  const reduced = useReducedMotion()
  const { shares, empty } = ringShares(totals)
  const progress = macroProgress(totals, targets)
  const focusIndex = focus ? MACRO_KEYS.indexOf(focus) : -1
  const spans = focus ? progressArcs(focusIndex, progress[focus]) : layoutArcs(shares)
  const flat = spans.flatMap((s) => [s.start, s.end])
  const tw = useTweened(flat, 520, easeStone, reduced)

  // ghost arcs once any target is set; a zero target draws no ghost arc but keeps its gap (same rule as the macros)
  const hasTargets = targets.protein > 0 || targets.carbs > 0 || targets.fat > 0
  const ghost = hasTargets
    ? layoutArcs(
        (() => {
          const s = macroEnergySplit({ kcal: 0, protein: targets.protein, carbs: targets.carbs, fat: targets.fat })
          return [s.protein, s.carbs, s.fat] as const
        })(),
      )
    : null

  // test hooks: the drawn arc lengths to 1 dp; the empty-day placeholder arcs are track colour, not macros, so they read 0.0
  const deg = (i: number) => (empty && !focus ? '0.0' : Math.max(0, tw[i * 2 + 1] - tw[i * 2]).toFixed(1))

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
      data-testid="tp-ring"
      data-protein-deg={deg(0)}
      data-carbs-deg={deg(1)}
      data-fat-deg={deg(2)}
      data-focus={focus ?? undefined}
      className="block overflow-visible"
      style={{ overflow: 'visible' }}
    >
      {!empty && !focus ? <circle cx={60} cy={60} r={RING_R} fill="none" stroke={TRACK} strokeWidth={7} /> : null}
      {focus ? <circle cx={60} cy={60} r={RING_R} fill="none" stroke={TRACK} strokeWidth={7} opacity={0.6} /> : null}
      {ghost
        ? ghost.map((g, i) => {
            const d = arcPath(60, 60, GHOST_R, g.start, g.end)
            return d ? <path key={`g${i}`} d={d} fill="none" stroke={GHOST} strokeWidth={2} strokeLinecap="butt" data-ghost={MACRO_KEYS[i]} /> : null
          })
        : null}
      {MACRO_KEYS.map((k, i) => {
        const a0 = tw[i * 2]
        const a1 = tw[i * 2 + 1]
        const d = arcPath(60, 60, RING_R, a0, a1)
        if (!d) return null
        return (
          <path
            key={k}
            d={d}
            pathLength={1}
            fill="none"
            stroke={empty && !focus ? TRACK : MACRO_COLOUR[k]}
            strokeWidth={7}
            strokeLinecap="butt"
            data-arc={k}
          />
        )
      })}
      {MACRO_KEYS.map((k, i) => {
        if (empty) return null
        if (focus && k !== focus) return null
        const a0 = tw[i * 2]
        const a1 = tw[i * 2 + 1]
        const len = a1 - a0
        const mid = (a0 + a1) / 2
        const live = len > 0.5
        const [tx0, ty0] = pt(60, 60, 55.5, mid)
        const [tx1, ty1] = pt(60, 60, 59.8, mid)
        const [lx, ly] = pt(60, 60, 66.5, mid)
        return (
          <g key={`t${k}`} data-tick={k}>
            {live ? <line x1={f(tx0)} y1={f(ty0)} x2={f(tx1)} y2={f(ty1)} stroke={MACRO_COLOUR[k]} strokeWidth={1.2} /> : null}
            <text
              x={f(lx)}
              y={f(ly)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={live ? MACRO_COLOUR[k] : '#5E5A54'}
              fontSize={9.6}
              letterSpacing="0.2em"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {MACRO_LETTER[k]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

type RowProps = {
  totals: Macros
  targets: MacroTargets
  onOpen(): void
}

/** The MACRO RING ROW (y 547 to 671): ring at x 24 y 553, readouts x 160 to the right gutter. */
export function TodayRingRow({ totals, targets, onOpen }: RowProps) {
  const [focus, setFocus] = useState<MacroKey | null>(null)
  useEffect(() => {
    if (!focus) return
    const t = window.setTimeout(() => setFocus(null), 6000)
    return () => window.clearTimeout(t)
  }, [focus, totals])

  const toggle = (k: MacroKey) => setFocus((cur) => (cur === k ? null : targets[k] > 0 ? k : null))

  const { empty } = ringShares(totals)
  const split = macroEnergySplit(totals)
  const progress = macroProgress(totals, targets)
  const grams = (k: MacroKey) => Math.round(totals[k])

  const centreValue = focus ? grams(focus) : grams('protein')
  const centreLabel = focus ? `of ${Math.round(targets[focus])}` : 'Protein'

  return (
    <div className="relative h-[124px] shrink-0">
      <button
        type="button"
        data-intro="ring"
        onClick={onOpen}
        aria-label={`Today's entries. Protein ${grams('protein')} grams, carbs ${grams('carbs')} grams, fat ${grams('fat')} grams.`}
        className="absolute left-6 top-[6px] h-28 w-28 cursor-pointer rounded-full active:scale-[0.98] transition-transform duration-150"
      >
        <TodayRing totals={totals} targets={targets} focus={focus} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span data-testid="tp-ring-centre" data-grams={empty && !focus ? 0 : centreValue} className="font-display gold-text num text-[20px] font-bold leading-none">
            {empty && !focus ? 0 : centreValue}
            <span className="normal-case"> g</span>
          </span>
          <span className="font-display num mt-1 text-[9px] leading-none tracking-[0.3em] text-bone-dim" style={{ marginRight: '-0.3em' }}>
            {centreLabel}
          </span>
        </span>
      </button>

      <div data-intro="ring-readouts" className="absolute right-6 top-[14px] left-40">
        {MACRO_KEYS.map((k) => {
          const active = focus === k
          const share = Math.round(split[k] * 100)
          const ratio = Math.round(progress[k] * 100)
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              data-testid={`tp-readout-${k}`}
              data-grams={grams(k)}
              aria-pressed={active}
              aria-label={`${MACRO_LABEL[k]} ${grams(k)} grams${targets[k] > 0 ? `, ${ratio} percent of target` : ''}`}
              className="relative flex h-8 w-full cursor-pointer items-center gap-2.5 text-left before:absolute before:inset-x-0 before:-top-1.5 before:-bottom-1.5 before:content-['']"
            >
              <span aria-hidden="true" className="h-0.5 w-2.5 shrink-0" style={{ background: MACRO_COLOUR[k] }} />
              <span className={`font-display inscribed w-[62px] shrink-0 text-[10px] leading-none tracking-[0.3em] ${active ? 'text-gold-300' : 'text-bone-dim'}`}>
                {MACRO_LABEL[k]}
              </span>
              <span className="num font-body text-[18px] font-medium leading-none text-bone">
                {grams(k)} <span className="text-[15px] text-bone-dim">g</span>
              </span>
              <span className={`num font-body ml-auto text-[15px] leading-none ${active ? 'text-gold-300' : 'text-bone-dim'}`}>
                {active ? ratio : empty ? 0 : share}%
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
