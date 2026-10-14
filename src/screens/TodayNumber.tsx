/**
 * THE HERO (spec section 6, y 103 to 247): label, the brushed gold number, the radial scrim and the
 * sub-line. Positioned absolutely inside the monument stage at stage-relative offsets.
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

export function TodayNumber({ remaining, eaten, goal, unit, hero, short, onSwap }: Props) {
  const reduced = useReducedMotion()
  const over = remaining < 0
  const magnitude = over ? -remaining : hero === 'eaten' ? eaten : remaining
  const label = heroLabel(over, hero)
  const display = Math.round(toDisplayEnergy(magnitude, unit))
  const shown = Math.round(useCounted(display, 380, easeCount, reduced))
  const size = short ? (over ? 66 : 72) : over ? 88 : 96

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
  const labelTop = short ? 8 : 16
  const numberTop = short ? 26 : 34
  const sublineTop = short ? 106 : 138

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: short ? 132 : 170,
          background: 'radial-gradient(ellipse 60% 70% at 50% 50%, var(--scrim), transparent 72%)',
        }}
      />
      <p
        data-intro="label"
        className={`font-display inscribed absolute inset-x-0 text-center text-[11px] leading-[18px] tracking-[0.4em] ${over ? 'text-ember-text' : 'text-bone-dim'}`}
        style={{ top: labelTop, marginRight: '-0.4em' }}
      >
        {label}
      </p>
      <div ref={wrapRef} data-intro="number" className="absolute inset-x-0 flex justify-center" style={{ top: numberTop }}>
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
        className="num font-body absolute inset-x-0 text-center text-[17px] italic leading-[22px] text-bone-dim"
        style={{ top: sublineTop }}
      >
        {subline}
      </p>
    </>
  )
}
