import type { EnergyUnit, Meal } from '../lib/types'
import { EmptyLine, SectionHeading } from '../components/ui'
import { LibraryRow } from './LibraryRow'
import { mealSubline, roman } from './LibraryFormat'

export type MealSort = 'alpha' | 'logged'

const SORTS: { value: MealSort; label: string }[] = [
  { value: 'alpha', label: 'A to Z' },
  { value: 'logged', label: 'Most logged' },
]

type Props = {
  meals: Meal[]
  total: number
  unit: EnergyUnit
  sort: MealSort
  searching: boolean
  onSort(sort: MealSort): void
  onOpen(id: string): void
  onLog(id: string): void
  onToggleFavourite(id: string): void
}

/** MEALS: 60 px rows, square-plus logs one portion at once, row tap opens the detail sheet. */
export function LibraryMeals({ meals, total, unit, sort, searching, onSort, onOpen, onLog, onToggleFavourite }: Props) {
  return (
    <section aria-labelledby="lib-meals-heading">
      <div role="radiogroup" aria-label="Sort meals" className="mb-3 flex justify-end gap-2">
        {SORTS.map((s) => {
          const active = s.value === sort
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSort(s.value)}
              className={`font-display inline-flex h-10 items-center rounded-[4px] border px-3 text-[11px] tracking-[0.2em] transition-colors duration-150 cursor-pointer ${
                active ? 'border-[var(--gold-line-strong)] bg-[var(--gold-line)] text-gold-300' : 'border-[var(--gold-line)] text-bone-dim hover:text-bone'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      <SectionHeading right={total > 0 ? <span aria-label={`${total} meals`}>{roman(total)}</span> : null}>
        <span id="lib-meals-heading">Meals</span>
      </SectionHeading>
      {meals.length === 0 ? (
        <EmptyLine className="py-4">{searching ? 'Nothing matches.' : 'Nothing saved yet.'}</EmptyLine>
      ) : (
        <ul>
          {meals.map((m) => (
            <LibraryRow
              key={m.id}
              id={m.id}
              name={m.name}
              subline={mealSubline(m.macros, unit)}
              favourite={m.favourite}
              trailing="log"
              onOpen={onOpen}
              onLog={onLog}
              onToggleFavourite={onToggleFavourite}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
