/**
 * THE HERO (spec section 6, y 103 to 247): label, the brushed gold number, the radial scrim and the
 * sub-line. The block is anchored to the gold goal line: its bottom sits 16 px above --goal-y (the
 * scene writes that variable in frame coordinates; the stage starts 40 px under the top safe area),
 * so on a short phone, where the monument layer scales down, the number shrinks to fit above the line
 * instead of colliding with it.
 *
 * Over the line always wins: label OVER THE LINE in ember-text, the magnitude in ember at 88 px.
 * Under it, the hero figure (settings.hero) decides REMAINING or EATEN; tapping the number swaps it.
 * The number counts old to new over --t-count (380 ms, --ease-count) and after every log pulse one
 * brushed highlight sweeps across it by animating --tilt-x on its wrapper (skipped under reduced motion).
 */
import { useRef } from 'react'
import { GoldNumber } from '../components/ui'
import type { EnergyUnit, HeroFigure } from '../lib/types'
import { formatEnergy, formatInt, toDisplayEnergy, unitLabel } from '../lib/units'
import { isReducedMotion, useReducedMotion } from '../lib/motion'
import { easeCount, useCounted, useLogPulse } from './TodayMotion'

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

/** the goal line in stage coordinates: the stage starts 40 px under the top safe area */
export const GOAL_IN_STAGE = 'calc(var(--goal-y) - var(--safe-top) - 40px)'
/** the hero block ends this far above the line (spec: sub-line ends at 247, line at 263) */
const GAP_ABOVE_LINE = 16
/** label line 18 px + sub-line 22 px + 4 px of slack around the number */
const CHROME = 44

export function TodayNumber({ remaining, eaten, goal, unit, hero, short, onSwap }: Props) {
  const reduced = useReducedMotion()
  const over = remaining < 0
  const magnitude = over ? -remaining : hero === 'eaten' ? eaten : remaining
  const label = heroLabel(over, hero)
  const display = Math.round(toDisplayEnergy(magnitude, unit))
  const shown = Math.round(useCounted(display, 380, easeCount, reduced))
  const base = short ? (over ? 66 : 72) : over ? 88 : 96
  // never larger than the room above the line: (room - chrome) / line-height 1.08
  const size = `min(${base}px, calc((${GOAL_IN_STAGE} - ${GAP_ABOVE_LINE + CHROME}px) / 1.08))`
  const blockHeight = `calc(${GOAL_IN_STAGE} - ${GAP_ABOVE_LINE}px)`

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
  const goalText = formatEnergy(goal, unit)
  const subline = over
    ? `of ${goalText} · ${formatEnergy(eaten, unit)} eaten`
    : hero === 'eaten'
      ? `of ${goalText} · ${formatEnergy(remaining, unit)} left`
      : `of ${goalText} · ${formatEnergy(eaten, unit)} eaten`

  const swapHint = over ? '' : hero === 'eaten' ? ' Show remaining.' : ' Show eaten.'

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: `calc(${blockHeight} + ${GAP_ABOVE_LINE}px)`,
          background: 'radial-gradient(ellipse 60% 70% at 50% 50%, var(--scrim), transparent 72%)',
        }}
      />
      <div className="absolute inset-x-0 top-0 flex flex-col items-center justify-end overflow-visible" style={{ height: blockHeight }}>
        <p
          data-intro="label"
          data-testid="tp-hero-label"
          className={`font-display inscribed w-full text-center text-[11px] leading-[18px] tracking-[0.4em] ${over ? 'text-ember-text' : 'text-bone-dim'}`}
          style={{ marginRight: '-0.4em' }}
        >
          {label}
        </p>
        <div
          ref={wrapRef}
          data-intro="number"
          data-testid="tp-hero-number"
          data-value={display}
          data-over={over ? 'true' : 'false'}
          className="flex w-full justify-center"
        >
          <button
            type="button"
            onClick={onSwap}
            aria-label={`${formatInt(display)} ${unitText} ${label.toLowerCase()}.${swapHint}`}
            className="block cursor-pointer select-none rounded-[4px] active:scale-[0.99] transition-transform duration-150"
          >
            <GoldNumber value={shown} ember={over} size={size} />
          </button>
        </div>
        <p
          data-intro="subline"
          data-testid="tp-subline"
          className="num font-body w-full text-center text-[17px] italic leading-[22px] text-bone-dim"
        >
          {subline}
        </p>
      </div>
    </>
  )
}
