import type { EnergyUnit, Ingredient } from '../lib/types'
import { EmptyLine, SectionHeading } from '../components/ui'
import { LibraryRow } from './LibraryRow'
import { ingredientSubline, roman } from './LibraryFormat'

type Props = {
  ingredients: Ingredient[]
  total: number
  unit: EnergyUnit
  searching: boolean
  onOpen(id: string): void
  onToggleFavourite(id: string): void
}

/**
 * INGREDIENTS: 60 px rows with the basis in the sub-line. The trailing star marks a favourite;
 * logging an amount happens from the detail sheet where the amount can be set.
 */
export function LibraryIngredients({ ingredients, total, unit, searching, onOpen, onToggleFavourite }: Props) {
  return (
    <section data-testid="tp-ingredients" aria-labelledby="lib-ing-heading">
      <SectionHeading right={total > 0 ? <span aria-label={`${total} ingredients`}>{roman(total)}</span> : null}>
        <span id="lib-ing-heading">Ingredients</span>
      </SectionHeading>
      {ingredients.length === 0 ? (
        <EmptyLine className="py-4">{searching ? 'Nothing matches.' : 'No ingredients yet.'}</EmptyLine>
      ) : (
        <ul>
          {ingredients.map((g) => (
            <LibraryRow
              key={g.id}
              id={g.id}
              name={g.name}
              subline={ingredientSubline(g, unit)}
              favourite={g.favourite}
              onOpen={onOpen}
              onToggleFavourite={onToggleFavourite}
              testIds={{ row: `tp-ingredient-row-${g.id}` }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
