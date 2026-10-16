import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { EnergyUnit, Ingredient, Meal } from '../lib/types'
import { searchIngredients } from '../store/selectors'
import { formatEnergy, unitLabel } from '../lib/units'
import { EmptyLine, IconButton, Input, ValueUnit } from './ui'
import { DOT, DigitInput, NameInput, buildTotals, componentFromRow, energyLine, macroLine, rowFromIngredient, saveToLibraryFor, type BuildRow, THIN } from './MealForm'
import { MealFormHint } from './MealFormHint'

type Props = {
  rows: BuildRow[]
  onRows(rows: BuildRow[]): void
  name: string
  onName(name: string): void
  saveOverride: boolean | null
  onSaveOverride(on: boolean): void
  unit: EnergyUnit
  ingredients: Record<string, Ingredient>
  meals: Record<string, Meal>
  formId: string
  onSubmit(): void
}

const MAX_HITS = 6

/**
 * BUILD: INGREDIENT search over the library, one row per ingredient with its AMOUNT and kcal,
 * a totals bar, MEAL NAME and SAVE TO LIBRARY. Totals recompute on every keystroke via makeComponent.
 */
export function MealFormBuild({ rows, onRows, name, onName, saveOverride, onSaveOverride, unit, ingredients, meals, formId, onSubmit }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim()
  const library = useMemo(() => Object.keys(ingredients).length, [ingredients])
  const hits = useMemo(() => (q ? searchIngredients(ingredients, q).slice(0, MAX_HITS) : []), [ingredients, q])
  const totals = useMemo(() => buildTotals(rows, ingredients), [rows, ingredients])
  const save = saveToLibraryFor({ name, saveOverride }, meals)

  const add = (ing: Ingredient) => {
    onRows([...rows, rowFromIngredient(ing)])
    setQuery('')
  }
  const update = (key: string, amount: string) => onRows(rows.map((r) => (r.key === key ? { ...r, amount } : r)))
  const remove = (key: string) => onRows(rows.filter((r) => r.key !== key))

  return (
    <form
      id={formId}
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div>
        <div className="mb-2 flex min-h-3 items-baseline justify-between">
          <label htmlFor={`${formId}-ingredient`} className="label">
            Ingredient
          </label>
          {rows.length ? <span className="hint num leading-none">{rows.length} added</span> : null}
        </div>
        <div className="relative">
          <Search size={18} strokeWidth={1.5} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-gold-500" />
          <Input
            id={`${formId}-ingredient`}
            type="text"
            role="searchbox"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="search"
            placeholder={library ? 'Search' : 'No ingredients saved yet'}
            value={query}
            disabled={!library}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits.length) {
                e.preventDefault()
                add(hits[0])
              }
            }}
            style={{ height: 48, paddingLeft: 44 }}
          />
        </div>
        {q && hits.length ? (
          <ul role="listbox" aria-label="Ingredients" className="tablet mt-2 overflow-hidden">
            {hits.map((ing) => (
              <li key={ing.id} role="option" aria-selected="false" className="row-rule last:after:hidden">
                <button
                  type="button"
                  onClick={() => add(ing)}
                  className="row-press flex h-12 w-full items-center justify-between gap-3 px-4 text-left cursor-pointer [@media(hover:hover)]:hover:bg-obsidian-700"
                >
                  <span className="min-w-0 truncate font-body text-[19px] font-medium text-bone">{ing.name}</span>
                  <span className="hint num shrink-0">
                    per {ing.per.amount}
                    {THIN}
                    {ing.per.unit}
                    {DOT}
                    {energyLine(ing.macros.kcal, unit)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : q && library ? (
          <EmptyLine className="mt-2">Nothing by that name.</EmptyLine>
        ) : null}
      </div>

      {rows.length ? (
        <ul className="flex flex-col">
          {rows.map((r) => {
            const c = componentFromRow(r, ingredients)
            return (
              <li key={r.key} className="row-rule last:after:hidden grid min-h-16 grid-cols-[minmax(0,1fr)_96px_auto_44px] items-center gap-x-2 py-1.5">
                <div className="min-w-0">
                  <p className={`flex min-w-0 items-baseline gap-2 font-body text-[19px] font-medium leading-[1.25] ${r.removed ? 'text-bone-mute' : 'text-bone'}`}>
                    <span className="truncate">{r.name}</span>
                    {r.removed ? <span className="label shrink-0 text-bone-mute">Removed</span> : null}
                  </p>
                  <p className="meta truncate leading-[1.25]">{macroLine(c.macros)}</p>
                </div>
                <DigitInput
                  fieldSize="sm"
                  aria-label={`${r.name} amount in ${r.unit}`}
                  suffix={r.unit}
                  placeholder="0"
                  value={r.amount}
                  onChange={(v) => update(r.key, v)}
                  style={{ paddingLeft: 12 }}
                />
                <ValueUnit className="min-w-[64px] justify-end text-right" value={formatEnergy(c.macros.kcal, unit)} unit={unitLabel(unit)} />
                <IconButton label={`Remove ${r.name}`} className="shrink-0" onClick={() => remove(r.key)}>
                  <X size={22} strokeWidth={1.5} />
                </IconButton>
              </li>
            )
          })}
        </ul>
      ) : library && !q ? (
        <EmptyLine>Add ingredients to build a meal.</EmptyLine>
      ) : null}

      <p className="flex h-12 items-baseline gap-0 border-y border-[var(--gold-line)] pt-[15px]" aria-label={`Total ${energyLine(totals.kcal, unit)}, ${macroLine(totals)}`}>
        <ValueUnit value={formatEnergy(totals.kcal, unit)} unit={unitLabel(unit)} tone="gold" />
        <span className="meta num" aria-hidden="true">
          {` · ${macroLine(totals)}`}
        </span>
      </p>

      <NameInput label="Meal name" placeholder="Meal" value={name} maxLength={80} onChange={(e) => onName(e.target.value)} />

      <MealFormHint saveToLibrary={save} onSaveToLibrary={onSaveOverride} />
    </form>
  )
}
