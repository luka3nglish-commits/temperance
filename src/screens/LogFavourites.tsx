import type { EnergyUnit, Meal } from '../lib/types'
import { energyLine } from '../components/MealForm'

type Props = {
  meals: readonly Meal[]
  unit: EnergyUnit
  onPick(meal: Meal): void
  className?: string
}

/**
 * The FAVOURITES chip row at the top of the sticky footer: 40 px stone chips, Cinzel 11 px
 * tracking 0.2em, gold hairline, horizontal scroll, at most 8. One tap logs one portion.
 */
export function LogFavourites({ meals, unit, onPick, className = '' }: Props) {
  if (!meals.length) return null
  return (
    <div className={`-mx-5 ${className}`} role="group" aria-label="Favourites">
      <div className="flex gap-2 overflow-x-auto px-5 pb-3 scrollbar-none">
        {meals.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m)}
            aria-label={`Log ${m.name}, ${energyLine(m.macros.kcal, unit)}`}
            className="flex h-10 shrink-0 items-center gap-2 rounded-[4px] border border-[var(--gold-line-strong)] bg-obsidian-800 px-3 transition-[background-color,transform] duration-150 hover:bg-[var(--gold-line)] active:scale-[0.96] cursor-pointer"
          >
            <span className="font-display inscribed max-w-[140px] truncate text-[11px] tracking-[0.2em] text-gold-300">{m.name}</span>
            <span className="num font-display text-[10px] tracking-[0.05em] text-bone-dim">{energyLine(m.macros.kcal, unit)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
