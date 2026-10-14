/**
 * FLANK INSCRIPTIONS (spec section 6, y 400 to 452): EATEN left, GOAL right, cut either side of the
 * column 107 px above the plinth top. Anchored to --plinth-y (written by the scene in frame
 * coordinates; the stage starts 40 px under the top safe area) so they ride with the monument when
 * it scales on a short phone. EATEN opens the TODAY sheet. `compact` only tightens the type.
 * Also the DOM `GOAL 2 500` label that rides the gold goal line at --goal-y.
 */
import type { EnergyUnit } from '../lib/types'
import { formatEnergy } from '../lib/units'

type Props = {
  eaten: number
  goal: number
  unit: EnergyUnit
  /** short phones: smaller values, tighter block */
  compact: boolean
  onEaten(): void
}

const labelCls = 'font-display inscribed block text-[9px] leading-none tracking-[0.35em] text-bone-dim'
const valueCls = 'font-display inscribed num block leading-[1.1] tracking-[0.02em] text-bone'

/** the plinth top in stage coordinates */
export const PLINTH_IN_STAGE = 'calc(var(--plinth-y) - var(--safe-top) - 40px)'

export function TodayFlanks({ eaten, goal, unit, compact, onEaten }: Props) {
  const eatenText = formatEnergy(eaten, unit)
  const goalText = formatEnergy(goal, unit)
  const h = compact ? 44 : 52
  const above = compact ? 84 : 107
  const valueSize = compact ? 'text-[18px]' : 'text-[22px]'

  return (
    <div data-intro="flanks" className="pointer-events-none absolute inset-x-4" style={{ height: h, top: `calc(${PLINTH_IN_STAGE} - ${above}px)` }}>
      <button
        type="button"
        onClick={onEaten}
        aria-label="Today's entries"
        className="pointer-events-auto absolute left-0 top-0 flex w-[104px] cursor-pointer flex-col items-start justify-center gap-1.5 rounded-[4px] text-left"
        style={{ height: h }}
      >
        <span className={labelCls}>Eaten</span>
        <span className={`${valueCls} ${valueSize}`} data-testid="tp-eaten-value" data-kcal={eaten}>
          {eatenText}
        </span>
      </button>
      <div className="absolute right-0 top-0 flex w-[104px] flex-col items-end justify-center gap-1.5 text-right" style={{ height: h }}>
        <span className={labelCls} style={{ marginRight: '-0.35em' }}>
          Goal
        </span>
        <span className={`${valueCls} ${valueSize}`} data-testid="tp-goal-value" data-kcal={goal} style={{ marginRight: '-0.02em' }}>
          {goalText}
        </span>
      </div>
    </div>
  )
}

/** `GOAL 2 500` right aligned at the gutter, 6 px above the gold line. Follows --goal-y (written by the scene). */
export function TodayGoalLabel({ goal, unit }: { goal: number; unit: EnergyUnit }) {
  return (
    <div
      data-intro="goal-label"
      data-testid="tp-goal-label"
      aria-hidden="true"
      className="font-display inscribed pointer-events-none absolute text-[9px] leading-none tracking-[0.3em] text-gold-400"
      style={{ top: 'calc(var(--goal-y) - 15px)', right: 'calc(16px - 0.3em)' }}
    >
      Goal <span className="num">{formatEnergy(goal, unit)}</span>
    </div>
  )
}
