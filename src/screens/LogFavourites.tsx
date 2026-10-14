import type { ReactNode } from 'react'
import type { EnergyUnit, Meal } from '../lib/types'
import { energyLine } from '../components/MealForm'

/**
 * A 40 px stone chip: obsidian-800, gold hairline, 4 px radius. The `::before` reaches 2 px above
 * and below so the hit area is 44 px; the scroller pads 2 px at the top so that reach is not clipped.
 */
export const CHIP_CLASS =
  "relative flex h-10 shrink-0 items-center gap-2 rounded-[4px] border border-[var(--gold-line-strong)] bg-obsidian-800 px-3 transition-[background-color,transform] duration-150 hover:bg-[var(--gold-line)] active:scale-[0.96] cursor-pointer before:absolute before:inset-x-0 before:-top-0.5 before:-bottom-0.5 before:content-['']"

/** The chip's label: Cinzel 11 px tracking 0.2em, gold. */
export const CHIP_LABEL_CLASS = 'font-display inscribed text-[11px] tracking-[0.2em] text-gold-300'

/** The chip's energy: Cinzel 10 px, bone-dim. */
export const CHIP_ENERGY_CLASS = 'num font-display text-[10px] tracking-[0.05em] text-bone-dim'

type Props = {
  meals: readonly Meal[]
  unit: EnergyUnit
  onPick(meal: Meal): void
  /** a chip drawn first in the row, before the favourites (REPEAT YESTERDAY) */
  lead?: ReactNode
  className?: string
}

/**
 * The FAVOURITES chip row at the top of the sticky footer: 40 px stone chips (44 px hit area),
 * Cinzel 11 px tracking 0.2em, gold hairline, horizontal scroll, at most 8. One tap logs one portion.
 * REPEAT YESTERDAY, when there is a yesterday to repeat, leads the row.
 */
export function LogFavourites({ meals, unit, onPick, lead, className = '' }: Props) {
  if (!meals.length && !lead) return null
  return (
    <div
      className={`-mx-5 ${className}`}
      role={meals.length ? 'group' : undefined}
      aria-label={meals.length ? 'Favourites' : undefined}
      data-testid="tp-fav-chips"
    >
      <div className="flex gap-2 overflow-x-auto px-5 pt-0.5 pb-2.5 scrollbar-none">
        {lead}
        {meals.map((m) => (
          <button
            key={m.id}
            type="button"
            data-testid={`tp-fav-chip-${m.id}`}
            onClick={() => onPick(m)}
            aria-label={`Log ${m.name}, ${energyLine(m.macros.kcal, unit)}`}
            className={CHIP_CLASS}
          >
            <span className={`${CHIP_LABEL_CLASS} max-w-[140px] truncate`}>{m.name}</span>
            <span className={CHIP_ENERGY_CLASS}>{energyLine(m.macros.kcal, unit)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
