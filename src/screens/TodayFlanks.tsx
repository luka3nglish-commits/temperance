/**
 * FLANK INSCRIPTIONS (spec section 6, y 400 to 452): EATEN left, GOAL right, cut either side of the
 * column. EATEN opens the TODAY sheet. On short phones both sit on one row under the sub-line.
 * Also the DOM `GOAL 2 500` label that rides the gold goal line at --goal-y.
 */
import type { EnergyUnit } from '../lib/types'
import { formatEnergy } from '../lib/units'

type Props = {
  eaten: number
  goal: number
  unit: EnergyUnit
  /** one row under the sub-line (short phones) */
  compact: boolean
  onEaten(): void
}

const labelCls = 'font-display inscribed block text-[9px] leading-none tracking-[0.35em] text-bone-dim'
const valueCls = 'font-display inscribed num block text-[22px] leading-[1.1] tracking-[0.02em] text-bone'

export function TodayFlanks({ eaten, goal, unit, compact, onEaten }: Props) {
  const eatenText = formatEnergy(eaten, unit)
  const goalText = formatEnergy(goal, unit)

  if (compact) {
    return (
      <div data-intro="flanks" className="absolute inset-x-4 flex items-center justify-center gap-5" style={{ top: 134 }}>
        <button type="button" onClick={onEaten} aria-label="Today's entries" className="flex h-11 cursor-pointer items-baseline gap-2 rounded-[4px] px-1">
          <span className={labelCls}>Eaten</span>
          <span className={valueCls} data-testid="tp-eaten-value" data-kcal={eaten}>
            {eatenText}
          </span>
        </button>
        <span aria-hidden="true" className="h-3 w-px bg-[var(--gold-line-strong)]" />
        <div className="flex h-11 items-baseline gap-2 px-1">
          <span className={labelCls}>Goal</span>
          <span className={valueCls} data-testid="tp-goal-value" data-kcal={goal}>
            {goalText}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div data-intro="flanks" className="pointer-events-none absolute inset-x-4 h-[52px]" style={{ top: 313 }}>
      <button
        type="button"
        onClick={onEaten}
        aria-label="Today's entries"
        className="pointer-events-auto absolute left-0 top-0 flex h-[52px] w-[104px] cursor-pointer flex-col items-start justify-center gap-1.5 rounded-[4px] text-left"
      >
        <span className={labelCls}>Eaten</span>
        <span className={valueCls} data-testid="tp-eaten-value" data-kcal={eaten}>
          {eatenText}
        </span>
      </button>
      <div className="absolute right-0 top-0 flex h-[52px] w-[104px] flex-col items-end justify-center gap-1.5 text-right">
        <span className={labelCls} style={{ marginRight: '-0.35em' }}>
          Goal
        </span>
        <span className={valueCls} data-testid="tp-goal-value" data-kcal={goal} style={{ marginRight: '-0.02em' }}>
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
