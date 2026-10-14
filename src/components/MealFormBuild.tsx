import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { EnergyUnit, Ingredient, Meal } from '../lib/types'
import { searchIngredients } from '../store/selectors'
import { EmptyLine, IconButton, Input } from './ui'
import { DigitInput, NameInput, buildTotals, componentFromRow, energyLine, macroLine, rowFromIngredient, saveToLibraryFor, type BuildRow, THIN } from './MealForm'
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
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor={`${formId}-ingredient`} className="font-display text-[10px] tracking-[0.35em] text-bone-dim">
            Ingredient
          </label>
          {rows.length ? <span className="num font-display text-[10px] tracking-[0.3em] text-bone-dim">{rows.length} added</span> : null}
        </div>
        <div className="relative">
          <Search size={16} strokeWidth={1.5} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bone-dim" />
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
          <ul role="listbox" aria-label="Ingredients" className="mt-1 overflow-hidden rounded-[4px] border border-obsidian-600 bg-obsidian-800">
            {hits.map((ing) => (
              <li key={ing.id} role="option" aria-selected="false">
                <button
                  type="button"
                  onClick={() => add(ing)}
                  className="flex h-12 w-full items-center justify-between gap-3 border-b border-[var(--bone-08)] px-4 text-left transition-colors duration-150 last:border-b-0 hover:bg-[var(--gold-line)] cursor-pointer"
                >
                  <span className="min-w-0 truncate font-body text-[18px] font-medium text-bone">{ing.name}</span>
                  <span className="num shrink-0 font-body text-[14px] text-bone-dim">
                    per {ing.per.amount}
                    {THIN}
                    {ing.per.unit}
                    {' · '}
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
              <li key={r.key} className="flex items-center gap-3 border-b border-[var(--gold-line)] py-2">
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-body text-[18px] font-medium ${r.removed ? 'text-bone-mute' : 'text-bone'}`}>
                    {r.name}
                    {r.removed ? <span className="font-display ml-2 text-[9px] tracking-[0.3em] text-bone-mute">removed</span> : null}
                  </p>
                  <p className="num font-body text-[13px] text-bone-dim">{macroLine(c.macros)}</p>
                </div>
                <DigitInput
                  compact
                  className="w-[104px] shrink-0"
                  aria-label={`${r.name} amount in ${r.unit}`}
                  suffix={r.unit}
                  placeholder="0"
                  value={r.amount}
                  onChange={(v) => update(r.key, v)}
                />
                <span className="num font-display inscribed w-[72px] shrink-0 text-right text-[15px] tracking-[0.02em] text-gold-400">{energyLine(c.macros.kcal, unit)}</span>
                <IconButton label={`Remove ${r.name}`} className="-mr-2 shrink-0" onClick={() => remove(r.key)}>
                  <X size={18} strokeWidth={1.5} />
                </IconButton>
              </li>
            )
          })}
        </ul>
      ) : library ? (
        <EmptyLine>Add ingredients to build a meal.</EmptyLine>
      ) : null}

      <div className="flex h-11 items-center justify-between border-y border-[var(--gold-line-strong)]">
        <span className="num font-display inscribed text-[15px] tracking-[0.04em] text-gold-400">{energyLine(totals.kcal, unit)}</span>
        <span className="num font-display inscribed text-[15px] tracking-[0.04em] text-bone">{macroLine(totals)}</span>
      </div>

      <NameInput label="Meal name" placeholder="Meal" value={name} maxLength={80} onChange={(e) => onName(e.target.value)} />

      <MealFormHint saveToLibrary={save} onSaveToLibrary={onSaveOverride} />
    </form>
  )
}
