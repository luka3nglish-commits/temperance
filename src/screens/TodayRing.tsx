/**
 * MACRO RING (polish-spec 6.1). SVG viewBox 0 0 120 120 at 120 px (96 px compact). Centre (60, 60).
 *
 *   1. Track: r 50, width 7, #0A0A0D, with groove hairlines at r 46.5 and 53.5 (bone 0.36, 0.75 wide),
 *      so an empty track still reads as a track.
 *   2. Arcs: three explicit path arcs by angle (never dashoffset) starting at -90 deg plus a 3 deg half
 *      gap, clockwise, protein then carbs then fat, 6 deg gaps (342 deg shared), butt caps, each a
 *      userSpaceOnUse linear gradient (protein #FFF1C4 to #E6C670, carbs #D2AE55 to #9C7B33, fat
 *      #A88A55 to #8E7243). Split by calorie contribution (macroEnergySplit) so the ring matches the
 *      big number. A zero macro draws no arc but keeps its gap. Empty day: three 114 deg arcs in #2A2A33.
 *   3. Inner bezel: r 41, a radial #121218 to #0B0B0F, a gold 0.35 hairline.
 *   4. Centre (DOM): protein grams Cinzel 700 22 px gold-300 plus `g`, caption PROTEIN.
 *   5. Letters P C F: Cinzel 700 12 px bone-dim (15 units in compact, so still 12 px), 5 unit ticks.
 *   8. Tip glint: while the angles tween (520 ms --ease-stone) a 3 px #FFF7DA dot rides each moving arc
 *      end, fading out over 300 ms after; a soft drop-shadow on the high tier only; none when reduced.
 *
 * Readouts (x 160 to 370, three 36 px rows): swatch, label, grams, and the right column: the macro's
 * goal (`of 180 g`) when its target is set, else its energy share. Compact (under 372 px wide): the
 * right column is hidden (kept for screen readers and tests) and a 2 px progress underline runs under
 * each value instead; ring 96 px, readouts from x 132. Tapping a readout row flips the ring into
 * single-macro progress mode for 6 s.
 */
import { useEffect, useId, useState, type CSSProperties } from 'react'
import type { Macros, MacroTargets } from '../lib/types'
import { macroEnergySplit } from '../lib/macros'
import { macroProgress } from '../store/selectors'
import { useReducedMotion } from '../lib/motion'
import { useTier } from '../scene/tier'
import { easeStone, useTweened } from './TodayMotion'

export const MACRO_KEYS = ['protein', 'carbs', 'fat'] as const
export type MacroKey = (typeof MACRO_KEYS)[number]

/** swatches and ticks (the arcs use the gradients below) */
export const MACRO_COLOUR: Record<MacroKey, string> = { protein: '#F2D98A', carbs: '#B8923E', fat: '#8E7243' }
export const MACRO_GRADIENT: Record<MacroKey, readonly [string, string]> = {
  protein: ['#FFF1C4', '#E6C670'],
  carbs: ['#D2AE55', '#9C7B33'],
  fat: ['#A88A55', '#8E7243'],
}
export const MACRO_LETTER: Record<MacroKey, string> = { protein: 'P', carbs: 'C', fat: 'F' }
export const MACRO_LABEL: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' }

export const RING_START = -87
export const RING_SPAN = 342
export const RING_GAP = 6
export const RING_R = 50
export const TRACK = '#0A0A0D'
/** the empty-day placeholder arcs */
export const EMPTY_ARC = '#2A2A33'
export const GROOVE = 'rgba(231, 225, 210, 0.36)'
const BONE_DIM = '#D3CDC2'
const BONE_MUTE = '#9C9791'
const GLINT = '#FFF7DA'

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

/** The SVG letter size in viewBox units: 12 px at any render size (15 units at the 96 px compact ring). */
export function letterUnits(size: number): number {
  return Math.round(((12 * 120) / size) * 100) / 100
}

type RingProps = {
  totals: Macros
  /** kept for callers; the ring itself no longer draws target ghosts (the readouts carry the goals) */
  targets: MacroTargets
  /** single-macro progress mode */
  focus: MacroKey | null
  /** render size in px (120 on the home screen, 96 compact) */
  size?: number
}

/** The SVG only. Centre text is DOM, drawn by the caller. */
export function TodayRing({ totals, targets, focus, size = 120 }: RingProps) {
  const reduced = useReducedMotion()
  const tier = useTier()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const { shares, empty } = ringShares(totals)
  const progress = macroProgress(totals, targets)
  const focusIndex = focus ? MACRO_KEYS.indexOf(focus) : -1
  const spans = focus ? progressArcs(focusIndex, progress[focus]) : layoutArcs(shares)
  const flat = spans.flatMap((s) => [s.start, s.end])
  const tw = useTweened(flat, 520, easeStone, reduced)
  const placeholder = empty && !focus
  const letterSize = letterUnits(size)

  // test hooks: the drawn arc lengths to 1 dp; the empty-day placeholder arcs are not macros, so they read 0.0
  const deg = (i: number) => (placeholder ? '0.0' : Math.max(0, tw[i * 2 + 1] - tw[i * 2]).toFixed(1))
  const moving = (i: number) => Math.abs(tw[i * 2 + 1] - flat[i * 2 + 1]) > 0.05 || Math.abs(tw[i * 2] - flat[i * 2]) > 0.05

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
      data-empty={placeholder ? 'true' : undefined}
      className="block overflow-visible"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {MACRO_KEYS.map((k) => (
          <linearGradient key={k} id={`${uid}-${k}`} gradientUnits="userSpaceOnUse" x1={10} y1={10} x2={110} y2={110}>
            <stop offset="0" stopColor={MACRO_GRADIENT[k][0]} />
            <stop offset="1" stopColor={MACRO_GRADIENT[k][1]} />
          </linearGradient>
        ))}
        <radialGradient id={`${uid}-bezel`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#121218" />
          <stop offset="1" stopColor="#0B0B0F" />
        </radialGradient>
      </defs>

      <circle cx={60} cy={60} r={41} fill={`url(#${uid}-bezel)`} stroke="rgba(216, 180, 90, 0.35)" strokeWidth={0.6} />
      <circle cx={60} cy={60} r={RING_R} fill="none" stroke={TRACK} strokeWidth={7} />
      <circle cx={60} cy={60} r={46.5} fill="none" stroke={GROOVE} strokeWidth={0.75} data-groove="inner" />
      <circle cx={60} cy={60} r={53.5} fill="none" stroke={GROOVE} strokeWidth={0.75} data-groove="outer" />

      {MACRO_KEYS.map((k, i) => {
        const d = arcPath(60, 60, RING_R, tw[i * 2], tw[i * 2 + 1])
        if (!d) return null
        return (
          <path
            key={k}
            d={d}
            fill="none"
            stroke={placeholder ? EMPTY_ARC : `url(#${uid}-${k})`}
            strokeWidth={7}
            strokeLinecap="butt"
            data-arc={k}
          />
        )
      })}

      {MACRO_KEYS.map((k, i) => {
        if (placeholder) return null
        if (focus && k !== focus) return null
        const a0 = tw[i * 2]
        const a1 = tw[i * 2 + 1]
        const mid = (a0 + a1) / 2
        const live = a1 - a0 > 0.5
        const [tx0, ty0] = pt(60, 60, 54.5, mid)
        const [tx1, ty1] = pt(60, 60, 59.5, mid)
        const [lx, ly] = pt(60, 60, 66.5, mid)
        return (
          <g key={`t${k}`} data-tick={k}>
            {live ? <line x1={f(tx0)} y1={f(ty0)} x2={f(tx1)} y2={f(ty1)} stroke={MACRO_COLOUR[k]} strokeWidth={1.2} /> : null}
            <text
              x={f(lx)}
              y={f(ly)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={live ? BONE_DIM : BONE_MUTE}
              fontSize={letterSize}
              fontWeight={700}
              letterSpacing="0.04em"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {MACRO_LETTER[k]}
            </text>
          </g>
        )
      })}

      {!reduced && !placeholder
        ? MACRO_KEYS.map((k, i) => {
            if (focus && k !== focus) return null
            const a1 = tw[i * 2 + 1]
            if (a1 - tw[i * 2] <= 0.5) return null
            const on = moving(i)
            const [gx, gy] = pt(60, 60, RING_R, a1)
            const style: CSSProperties = {
              opacity: on ? 1 : 0,
              transition: `opacity ${on ? 120 : 300}ms ease-out`,
              filter: tier === 'high' ? 'drop-shadow(0 0 4px rgba(246, 227, 161, 0.6))' : undefined,
            }
            return <circle key={`g${k}`} data-glint={k} cx={f(gx)} cy={f(gy)} r={1.5} fill={GLINT} style={style} />
          })
        : null}
    </svg>
  )
}

/**
 * The right-aligned column of a readout row. In progress mode: grams against the target as a
 * percent (`79%`). With a target set: the goal itself (`of 180 g`). Without one: the macro's
 * share of today's energy (`31%`, `0%` on an empty day).
 */
export function readoutAside({ active, target, ratio, share, empty }: { active: boolean; target: number; ratio: number; share: number; empty: boolean }): string {
  if (active) return `${ratio}%`
  if (target > 0) return `of ${target} g`
  return `${empty ? 0 : share}%`
}

type RowProps = {
  totals: Macros
  targets: MacroTargets
  /** under 372 px wide: 96 px ring, no right column, progress underlines */
  compact?: boolean
  onOpen(): void
}

/** The MACRO RING ROW (y 547 to 679): ring at x 20, readouts x 160 to the right gutter. */
export function TodayRingRow({ totals, targets, compact = false, onOpen }: RowProps) {
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
  const ringSize = compact ? 96 : 120

  const placeholder = empty && !focus
  const centreValue = focus ? grams(focus) : placeholder ? 0 : grams('protein')
  const centreLabel = focus ? `of ${Math.round(targets[focus])}` : 'Protein'

  return (
    <div className="relative h-[132px] shrink-0" data-compact={compact ? 'true' : undefined}>
      <button
        type="button"
        data-intro="ring"
        onClick={onOpen}
        aria-label={`Today's entries. Protein ${grams('protein')} grams, carbs ${grams('carbs')} grams, fat ${grams('fat')} grams.`}
        className="absolute left-5 cursor-pointer rounded-full transition-transform duration-150 active:scale-[0.98]"
        style={{ width: ringSize, height: ringSize, top: (132 - ringSize) / 2 }}
      >
        <TodayRing totals={totals} targets={targets} focus={focus} size={ringSize} />
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span data-testid="tp-ring-centre" data-grams={centreValue} className="num inline-flex items-baseline whitespace-nowrap">
            <span className={`font-display inscribed text-[22px] font-bold leading-none ${placeholder ? 'text-bone-dim' : 'text-gold-300'}`}>{centreValue}</span>
            <span className="unit">{' '}g</span>
          </span>
          <span
            className="label mt-[6px] whitespace-nowrap"
            style={{ letterSpacing: compact ? '0.04em' : '0.1em', marginRight: compact ? '-0.04em' : '-0.1em' }}
          >
            {centreLabel}
          </span>
        </span>
      </button>

      <div data-intro="ring-readouts" className={`absolute right-5 top-3 ${compact ? 'left-[132px]' : 'left-40'}`}>
        {MACRO_KEYS.map((k) => {
          const active = focus === k
          const target = Math.round(targets[k])
          const share = Math.round(split[k] * 100)
          const ratio = Math.round(progress[k] * 100)
          const fill = target > 0 ? Math.max(0, Math.min(1, totals[k] / target)) : 0
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              data-testid={`tp-readout-${k}`}
              data-grams={grams(k)}
              data-target={target}
              aria-pressed={active}
              aria-label={`${MACRO_LABEL[k]} ${grams(k)} grams${target > 0 ? ` of ${target}, ${ratio} percent of target` : ''}`}
              className="relative flex h-9 w-full cursor-pointer items-center gap-2.5 text-left"
            >
              <span
                aria-hidden="true"
                className="h-0.5 w-3 shrink-0"
                style={{ background: `linear-gradient(180deg, rgba(255, 247, 218, 0.3) 0 1px, ${MACRO_COLOUR[k]} 1px)` }}
              />
              <span
                className={`label inscribed shrink-0 ${compact ? 'w-[64px]' : 'w-[70px]'} ${active ? 'text-gold-300' : ''}`}
                style={{ letterSpacing: '0.1em' }}
              >
                {MACRO_LABEL[k]}
              </span>
              <span className={`relative flex min-w-0 items-baseline ${compact ? 'flex-1' : 'shrink-0'}`}>
                <span className="num font-body whitespace-nowrap text-[20px] font-semibold leading-none text-bone">{grams(k)}</span>
                <span className="unit">{' '}g</span>
                {compact && target > 0 ? (
                  <span aria-hidden="true" data-underline={k} className="absolute inset-x-0 -bottom-[7px] h-0.5 bg-[var(--rule)]">
                    <span className="block h-full" style={{ width: `${(fill * 100).toFixed(1)}%`, background: 'rgba(216, 180, 90, 0.6)' }} />
                  </span>
                ) : null}
              </span>
              <span
                data-aside={active ? 'progress' : target > 0 ? 'target' : 'share'}
                className={
                  compact
                    ? 'sr-only'
                    : `num font-body ml-auto shrink-0 whitespace-nowrap text-[16px] font-semibold leading-none ${active ? 'text-gold-300' : 'text-bone-soft'}`
                }
              >
                {readoutAside({ active, target, ratio, share, empty })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
