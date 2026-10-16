import type { EnergyUnit, Meal } from '../lib/types'
import { EmptyLine, SectionHeading, Segmented } from '../components/ui'
import { LibraryRow } from './LibraryRow'
import { mealSubline } from './LibraryFormat'

export type MealSort = 'alpha' | 'logged'

const SORTS = [
  { value: 'alpha', label: 'A to Z', testId: 'tp-meals-sort-alpha' },
  { value: 'logged', label: 'Most', testId: 'tp-meals-sort-logged' },
] as const

type Props = {
  meals: Meal[]
  total: number
  unit: EnergyUnit
  sort: MealSort
  searching: boolean
  /** the screen's first visible section carries the one strong gold rule */
  lead?: boolean
  /** the list stagger class for this visit (`tp-stagger` or '') */
  stagger?: string
  onSort(sort: MealSort): void
  onOpen(id: string): void
  onLog(id: string): void
  onToggleFavourite(id: string): void
}

/**
 * MEALS (polish-spec 6.3): the heading carries the count (Arabic) and the sort switch (Segmented sm,
 * A TO Z | MOST). Rows: name, `P 69 · C 70 · F 18` (a per 100 g meal says so first), the energy in
 * bone, the star, and the square-plus that logs the usual amount at once. A row tap opens the detail.
 */
export function LibraryMeals({ meals, total, unit, sort, searching, lead, stagger = '', onSort, onOpen, onLog, onToggleFavourite }: Props) {
  return (
    <section data-testid="tp-meals" aria-labelledby="lib-meals-heading" data-sort={sort}>
      <SectionHeading
        id="lib-meals-heading"
        rule={lead ? 'strong' : 'quiet'}
        right={
          total > 0 ? (
            <div className="flex items-center gap-3">
              <span className="hint num" aria-label={`${total} meals`}>
                {total}
              </span>
              <Segmented<MealSort> size="sm" label="Sort meals" value={sort} onChange={onSort} options={SORTS} testId="tp-meals-sort" />
            </div>
          ) : null
        }
      >
        Meals
      </SectionHeading>
      {meals.length === 0 ? (
        <EmptyLine className="py-4">{searching ? 'Nothing matches.' : 'No meals yet.'}</EmptyLine>
      ) : (
        <ul className={stagger}>
          {meals.map((m) => (
            <LibraryRow
              key={m.id}
              id={m.id}
              name={m.name}
              meta={mealSubline(m)}
              kcal={m.macros.kcal}
              unit={unit}
              favourite={m.favourite}
              onOpen={onOpen}
              onLog={onLog}
              onToggleFavourite={onToggleFavourite}
              testIds={{ row: `tp-meal-row-${m.id}`, fav: `tp-meal-fav-${m.id}`, log: `tp-meal-log-${m.id}` }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
