/**
 * FLANK PLAQUES (polish-spec 6.1, --plinth-y minus 64 to minus 12): EATEN left, GOAL right, cut either
 * side of the column above the plinth. Anchored to --plinth-y (written by the scene in frame
 * coordinates; the stage starts 40 px under the top safe area) so they ride with the monument when it
 * scales on a short phone.
 *
 *   EATEN            Cinzel 700 12 px 0.12em bone-dim
 *   1 328            Cinzel 700 24 px bone
 *   ───────◆         6 px under the value: a 44 x 1 gold rule fading toward the column, a rhombus at its end
 *
 * Left x 20 to 124 left aligned, right x 266 to 370 right aligned (mirrored). With the hero swapped to
 * EATEN the left plaque reads LEFT and the remaining figure, so each figure appears once. The left
 * plaque opens the TODAY sheet.
 *
 * Also the goal marker: a 7 x 7 rhombus at the right gutter centred on the gold line at --goal-y. No
 * text (the GOAL plaque carries the figure); it is named for screen readers.
 */
import { Rhombus } from '../components/ornaments'
import type { EnergyUnit } from '../lib/types'
import { formatEnergy, unitLabel } from '../lib/units'

type Props = {
  eaten: number
  /** kcal left (negative once over) */
  remaining: number
  goal: number
  unit: EnergyUnit
  /** the hero shows EATEN, so the left plaque shows what is left */
  swapped: boolean
  /** short phones: a 20 px value, a tighter block */
  compact: boolean
  onEaten(): void
}

/** the plinth top in stage coordinates */
export const PLINTH_IN_STAGE = 'calc(var(--plinth-y) - var(--safe-top) - 40px)'

const RULE_W = 44

function PlaqueRule({ side }: { side: 'left' | 'right' }) {
  const fromOuter = side === 'left' ? '90deg' : '270deg'
  return (
    <span aria-hidden="true" className={`flex items-center gap-[5px] ${side === 'right' ? 'flex-row-reverse' : ''}`}>
      <span className="block h-px" style={{ width: RULE_W, background: `linear-gradient(${fromOuter}, rgba(216, 180, 90, 0.55), rgba(216, 180, 90, 0.08))` }} />
      <Rhombus />
    </span>
  )
}

export function TodayFlanks({ eaten, remaining, goal, unit, swapped, compact, onEaten }: Props) {
  const showLeft = swapped && remaining >= 0
  const leftLabel = showLeft ? 'Left' : 'Eaten'
  const leftKcal = showLeft ? remaining : eaten
  const leftText = formatEnergy(leftKcal, unit)
  const goalText = formatEnergy(goal, unit)
  const h = compact ? 46 : 52
  const above = compact ? 56 : 64
  const valueSize = compact ? 'text-[20px]' : 'text-[24px]'
  const valueCls = `font-display inscribed num block font-bold leading-[1.1] tracking-[0.02em] text-bone ${valueSize}`

  return (
    <div data-intro="flanks" className="pointer-events-none absolute inset-x-5" style={{ height: h, top: `calc(${PLINTH_IN_STAGE} - ${above}px)` }}>
      <button
        type="button"
        onClick={onEaten}
        aria-label={`${leftLabel} ${leftText} ${unitLabel(unit)}. Today's entries.`}
        className="press pointer-events-auto absolute left-0 top-0 flex w-[104px] cursor-pointer flex-col items-start justify-between rounded-[4px] text-left"
        style={{ height: h }}
      >
        <span className="label inscribed block">{leftLabel}</span>
        <span
          className={valueCls}
          data-testid={showLeft ? 'tp-left-value' : 'tp-eaten-value'}
          data-kcal={Math.round(leftKcal)}
        >
          {leftText}
        </span>
        <PlaqueRule side="left" />
      </button>
      <div className="absolute right-0 top-0 flex w-[104px] flex-col items-end justify-between text-right" style={{ height: h }}>
        <span className="label inscribed block" style={{ marginRight: '-0.12em' }}>
          Goal
        </span>
        <span className={valueCls} data-testid="tp-goal-value" data-kcal={goal} style={{ marginRight: '-0.02em' }}>
          {goalText}
        </span>
        <PlaqueRule side="right" />
      </div>
    </div>
  )
}

/** The goal marker: a 7 x 7 rhombus on the gold line at the right gutter. Follows --goal-y (written by the scene). */
export function TodayGoalLabel({ goal, unit }: { goal: number; unit: EnergyUnit }) {
  return (
    <span
      data-intro="goal-label"
      data-testid="tp-goal-label"
      role="img"
      aria-label={`Goal ${formatEnergy(goal, unit)} ${unitLabel(unit)}`}
      className="pointer-events-none absolute"
      style={{ top: 'calc(var(--goal-y) - 3.5px)', right: 20, width: 7, height: 7 }}
    >
      <Rhombus style={{ position: 'absolute', left: 1, top: 1 }} />
    </span>
  )
}
