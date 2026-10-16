/**
 * THE HERO (polish-spec 6.1, y 101 to 251): eyebrow, the gold number, the radial scrim and the
 * sub-line. The block is anchored to the gold goal line: its bottom sits GAP_ABOVE_LINE above --goal-y
 * (the scene writes that variable in frame coordinates; the stage starts 40 px under the top safe area),
 * so on a short phone, where the monument layer scales down, the number shrinks to fit above the line
 * instead of colliding with it.
 *
 *   REMAINING        Cinzel 700 13 px 0.22em bone-dim (OVER THE LINE in ember-text with a 14 px flame)
 *   1 272            Cinzel 700 96 px gold foil (72 px under 700 px tall; 88 px ember when over), odometer
 *   51% of goal      Cormorant 500 18 px roman bone-soft, the percent of the goal eaten
 *
 * Over the line always wins: the crown of the column rises above the line (up to OVER_MAX_PX, the
 * scene's renderH asymptote), so the block keeps that much more air and the sub-line wears a dark halo
 * to read through the cracks. Under it, the hero figure (settings.hero) decides REMAINING or EATEN;
 * tapping the number swaps it. Each log sweeps one highlight across the foil by animating --tilt-x on
 * its wrapper (skipped under reduced motion).
 */
import { useRef } from 'react'
import { Flame } from 'lucide-react'
import type { EnergyUnit, HeroFigure } from '../lib/types'
import { formatInt, toDisplayEnergy, unitLabel } from '../lib/units'
import { isReducedMotion } from '../lib/motion'
import { GOAL_Y, OVER_MAX_PX, PX_PER_UNIT } from '../scene/tokens'
import { useLogPulse } from './TodayMotion'
import { TodayOdometer } from './TodayOdometer'

type Props = {
  /** kcal left today; negative once over */
  remaining: number
  eaten: number
  goal: number
  unit: EnergyUnit
  hero: HeroFigure
  /** short phone layout (viewport under 700 px) */
  short: boolean
  onSwap(): void
}

export function heroLabel(over: boolean, hero: HeroFigure): string {
  if (over) return 'Over the line'
  return hero === 'eaten' ? 'Eaten' : 'Remaining'
}

/** The percent of the goal eaten, whole: `51%`. 0 with no goal. */
export function goalPercent(eaten: number, goal: number): number {
  if (!(goal > 0) || !(eaten > 0)) return 0
  return Math.round((eaten / goal) * 100)
}

/** The sub-line under the hero: `51% of goal` (the same whichever figure the hero shows). */
export function sublineText(eaten: number, goal: number): string {
  return `${goalPercent(eaten, goal)}% of goal`
}

/** the goal line in stage coordinates: the stage starts 40 px under the top safe area */
export const GOAL_IN_STAGE = 'calc(var(--goal-y) - var(--safe-top) - 40px)'
/** the hero block ends this far above the line at full scale; over the line the crown takes OVER_MAX_PX of it */
export function gapAboveLine(over: boolean): number {
  return over ? OVER_MAX_PX + 7 : 16
}
/**
 * The same gap as a CSS expression, scaled with the monument on a short phone: the crown rises
 * OVER_MAX_PX times the stage scale, and the scale is the plinth-to-line distance over its full 244 px.
 */
export function gapCss(over: boolean): string {
  if (!over) return '16px'
  const perPx = Math.round((OVER_MAX_PX / (GOAL_Y * PX_PER_UNIT)) * 10000) / 10000
  return `(min(${OVER_MAX_PX}px, (var(--plinth-y) - var(--goal-y)) * ${perPx}) + 7px)`
}
/** eyebrow 18 + 2 + number + 4 + sub-line 22 (short phones: 16 + 1 + number + 2 + 20) */
const CHROME = 46
const CHROME_SHORT = 39
/** air always kept between the header and the eyebrow */
const TOP_AIR = 8

const OVER_HALO = '0 0 2px var(--color-obsidian-950), 0 0 10px var(--color-obsidian-950), 0 0 18px rgba(5, 5, 7, 0.9)'

export function TodayNumber({ remaining, eaten, goal, unit, hero, short, onSwap }: Props) {
  const over = remaining < 0
  const magnitude = over ? -remaining : hero === 'eaten' ? eaten : remaining
  const label = heroLabel(over, hero)
  const display = Math.round(toDisplayEnergy(magnitude, unit))
  const gap = gapCss(over)
  const chrome = short ? CHROME_SHORT : CHROME
  const base = short ? (over ? 66 : 72) : over ? 88 : 96
  // never larger than the room above the line: (room - gap - chrome - air) / line-height 1.08
  const size = `max(32px, min(${base}px, calc((${GOAL_IN_STAGE} - ${gap} - ${chrome + TOP_AIR}px) / 1.08)))`
  const blockHeight = `calc(${GOAL_IN_STAGE} - ${gap})`

  const wrapRef = useRef<HTMLDivElement>(null)
  useLogPulse(() => {
    const el = wrapRef.current
    if (!el || isReducedMotion() || typeof el.animate !== 'function') return
    try {
      const cur = parseFloat(getComputedStyle(el).getPropertyValue('--tilt-x')) || 0
      el.animate(
        [{ '--tilt-x': '-1' }, { '--tilt-x': '1', offset: 0.82 }, { '--tilt-x': String(cur) }],
        { duration: 600, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      )
    } catch {
      /* custom property animation unsupported: the auto sweep still moves the light */
    }
  })

  const unitText = unitLabel(unit)
  const swapHint = over ? '' : hero === 'eaten' ? ' Show remaining.' : ' Show eaten.'

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: GOAL_IN_STAGE,
          background: 'radial-gradient(ellipse 60% 70% at 50% 50%, var(--scrim), transparent 72%)',
        }}
      />
      <div className="absolute inset-x-0 top-0 flex flex-col items-center justify-end overflow-visible" style={{ height: blockHeight }}>
        <p
          data-intro="label"
          data-testid="tp-hero-label"
          className={`eyebrow inscribed flex w-full shrink-0 items-center justify-center gap-2 ${short ? 'h-4' : 'h-[18px]'} ${over ? 'text-ember-text' : ''}`}
          style={{ paddingLeft: '0.22em' }}
        >
          {over ? <Flame aria-hidden="true" size={14} strokeWidth={1.5} className="shrink-0" /> : null}
          <span>{label}</span>
        </p>
        <div
          ref={wrapRef}
          data-intro="number"
          data-testid="tp-hero-number"
          data-value={display}
          data-over={over ? 'true' : 'false'}
          className={`flex w-full justify-center ${short ? 'mt-px' : 'mt-[2px]'}`}
        >
          <button
            type="button"
            onClick={onSwap}
            aria-label={`${formatInt(display)} ${unitText} ${label.toLowerCase()}.${swapHint}`}
            className="block cursor-pointer select-none rounded-[4px] transition-transform duration-150 active:scale-[0.99]"
          >
            <TodayOdometer value={display} ember={over} size={size} />
          </button>
        </div>
        <p
          data-intro="subline"
          data-testid="tp-subline"
          className={`num font-body w-full shrink-0 text-center text-[18px] font-medium ${short ? 'mt-0.5 h-5 leading-5' : 'mt-1 h-[22px] leading-[22px]'} ${over ? 'text-ember-text' : 'text-bone-soft'}`}
          style={over ? { textShadow: OVER_HALO } : undefined}
        >
          {sublineText(eaten, goal)}
        </p>
      </div>
    </>
  )
}
