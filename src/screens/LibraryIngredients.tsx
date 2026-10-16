import type { EnergyUnit, Ingredient } from '../lib/types'
import { EmptyLine, SectionHeading } from '../components/ui'
import { LibraryRow } from './LibraryRow'
import { ingredientSubline } from './LibraryFormat'

type Props = {
  ingredients: Ingredient[]
  total: number
  unit: EnergyUnit
  searching: boolean
  /** the list stagger class for this visit (`tp-stagger` or '') */
  stagger?: string
  onOpen(id: string): void
  onToggleFavourite(id: string): void
}

/**
 * INGREDIENTS: 60 px rows with the basis first in the meta line (`per 100 g · P 31 · C 0 · F 4`) and
 * the energy per that basis in the value column. The star marks a favourite; an ingredient is logged
 * from its detail sheet, where the amount is chosen.
 */
export function LibraryIngredients({ ingredients, total, unit, searching, stagger = '', onOpen, onToggleFavourite }: Props) {
  return (
    <section data-testid="tp-ingredients" aria-labelledby="lib-ing-heading">
      <SectionHeading id="lib-ing-heading" right={total > 0 ? <span className="hint num" aria-label={`${total} ingredients`}>{total}</span> : null}>
        Ingredients
      </SectionHeading>
      {ingredients.length === 0 ? (
        <EmptyLine className="py-4">{searching ? 'Nothing matches.' : 'No ingredients yet.'}</EmptyLine>
      ) : (
        <ul className={stagger}>
          {ingredients.map((g) => (
            <LibraryRow
              key={g.id}
              id={g.id}
              name={g.name}
              meta={ingredientSubline(g)}
              kcal={g.macros.kcal}
              unit={unit}
              favourite={g.favourite}
              onOpen={onOpen}
              onToggleFavourite={onToggleFavourite}
              testIds={{ row: `tp-ingredient-row-${g.id}`, fav: `tp-ingredient-fav-${g.id}` }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
