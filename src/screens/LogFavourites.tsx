import type { ReactNode } from 'react'
import type { EnergyUnit, Meal } from '../lib/types'
import { formatAmount } from '../lib/portion'
import { Chip, ChipRow } from '../components/ui'
import { energyLine } from '../components/MealForm'

type Props = {
  meals: readonly Meal[]
  unit: EnergyUnit
  onPick(meal: Meal): void
  /** a chip drawn first in the row, before the favourites (REPEAT YESTERDAY) */
  lead?: ReactNode
  className?: string
}

/** What one tap on a favourite logs, spoken: `180 grams` for a per-100 g meal with a usual amount. */
function usualSpoken(m: Meal): string {
  if (m.per && m.per.unit !== 'serve') return formatAmount(m.usual && m.usual > 0 ? m.usual : m.per.amount, m.per.unit)
  if (m.usual && m.usual > 0 && m.usual !== 1) return formatAmount(m.usual, 'serve')
  return ''
}

/**
 * The favourites chip row at the top of the sticky footer (polish-spec 6.2 and 4.6): 40 px slab chips
 * with a gold edge, the name in Cinzel 700 12 px gold-300 (max 168 px, truncated), the row scrolling
 * sideways with its right edge faded. At most 8. One tap logs the meal's usual amount. REPEAT, when
 * there is a yesterday to repeat, leads the row.
 */
export function LogFavourites({ meals, unit, onPick, lead, className = '' }: Props) {
  if (!meals.length && !lead) return null
  return (
    <ChipRow testId="tp-fav-chips" label={meals.length ? 'Favourites' : undefined} className={`-mx-5 px-5 pt-0.5 pb-3 ${className}`}>
      {lead}
      {meals.map((m) => {
        const usual = usualSpoken(m)
        return (
          <Chip
            key={m.id}
            testId={`tp-fav-chip-${m.id}`}
            label={m.name}
            onClick={() => onPick(m)}
            aria-label={`Log ${m.name}${usual ? `, ${usual}` : ''}, ${energyLine(m.macros.kcal, unit)}${m.per && m.per.unit !== 'serve' ? ` per ${formatAmount(m.per.amount, m.per.unit)}` : ''}`}
          />
        )
      })}
    </ChipRow>
  )
}
