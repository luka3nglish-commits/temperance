import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { searchIngredients } from '../store/selectors'
import type { AmountUnit, Ingredient, Macros, Meal, MealComponent } from '../lib/types'
import { kcalFromMacros, makeComponent, roundMacros, scaleMacros, sumMacros } from '../lib/macros'
import { formatEnergy, fromInputEnergy, parseNumber, toDisplayEnergy, unitLabel } from '../lib/units'
import { Button, Field, Input, Segmented, Sheet, Toggle, decimalInputProps, EmptyLine } from '../components/ui'
import { LibrarySearch } from './LibrarySearch'
import { basisLabel, energyText, fmtGrams, macroText } from './LibraryFormat'

export type EditorTarget = { kind: 'meal'; id?: string } | { kind: 'ingredient'; id?: string }

type Props = {
  target: EditorTarget | null
  onClose(): void
  onClosed?(): void
}

const UNITS: readonly { value: AmountUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'serve', label: 'serve' },
]

const KINDS: readonly { value: Meal['kind']; label: string }[] = [
  { value: 'quick', label: 'Quick' },
  { value: 'built', label: 'Built' },
]

const text = (n: number | undefined) => (n === undefined || n === 0 ? '' : fmtGrams(n))
const grams = (t: string) => parseNumber(t) ?? 0

/** Add and edit forms for a meal or an ingredient, in a tall sheet with SAVE in the sticky footer. */
export function LibraryEditor({ target, onClose, onClosed }: Props) {
  const [held, setHeld] = useState<EditorTarget | null>(target)
  useEffect(() => {
    if (target) setHeld(target)
  }, [target])
  const current = target ?? held
  const open = target !== null
  const [valid, setValid] = useState(false)

  const title = current?.kind === 'ingredient' ? (current.id ? 'Edit ingredient' : 'New ingredient') : current?.id ? 'Edit meal' : 'New meal'
  const formId = 'lib-editor-form'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      onClosed={() => {
        setHeld(null)
        onClosed?.()
      }}
      title={title}
      height="tall"
      footer={
        <Button type="submit" form={formId} variant="gold" full disabled={!valid}>
          Save
        </Button>
      }
    >
      {current?.kind === 'meal' ? (
        <MealForm key={current.id ?? 'new'} id={current.id} formId={formId} onDone={onClose} onValidity={setValid} />
      ) : current?.kind === 'ingredient' ? (
        <IngredientForm key={current.id ?? 'new'} id={current.id} formId={formId} onDone={onClose} onValidity={setValid} />
      ) : null}
    </Sheet>
  )
}

/* ---------------- shared ---------------- */

/** The one quiet hint: energy implied by the grams, and whether the typed energy disagrees by more than 8 percent. */
function MacroHint({ kcalTyped, macros }: { kcalTyped: number | null; macros: Pick<Macros, 'protein' | 'carbs' | 'fat'> }) {
  const unit = useStore((s) => s.settings.unit)
  const implied = kcalFromMacros(macros)
  if (implied <= 0) return <div className="h-9" aria-hidden="true" />
  const differs = kcalTyped !== null && kcalTyped > 0 && Math.abs(kcalTyped - implied) / kcalTyped > 0.08
  return (
    <p className="num flex h-9 items-center font-body text-[14px] text-bone-dim">
      macros = {energyText(implied, unit)}
      {differs ? ' · differs from calories' : ''}
    </p>
  )
}

function MacroFields({ p, c, f, onP, onC, onF }: { p: string; c: string; f: string; onP(v: string): void; onC(v: string): void; onF(v: string): void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Protein" {...decimalInputProps} value={p} onChange={(e) => onP(e.target.value)} suffix="g" placeholder="0" />
      <Field label="Carbs" {...decimalInputProps} value={c} onChange={(e) => onC(e.target.value)} suffix="g" placeholder="0" />
      <Field label="Fat" {...decimalInputProps} value={f} onChange={(e) => onF(e.target.value)} suffix="g" placeholder="0" />
    </div>
  )
}

/* ---------------- meal ---------------- */

type ComponentRow = { comp: MealComponent; amountText: string }

type FormProps = { id?: string; formId: string; onDone(): void; onValidity(valid: boolean): void }

function MealForm({ id, formId, onDone, onValidity }: FormProps) {
  const unit = useStore((s) => s.settings.unit)
  const existing = useStore((s) => (id ? s.meals[id] : undefined))
  const ingredients = useStore((s) => s.ingredients)

  const [name, setName] = useState(existing?.name ?? '')
  const [kind, setKind] = useState<Meal['kind']>(existing?.kind ?? 'quick')
  const [kcalText, setKcalText] = useState(existing ? String(Math.round(toDisplayEnergy(existing.macros.kcal, unit))) : '')
  const [p, setP] = useState(text(existing?.macros.protein))
  const [c, setC] = useState(text(existing?.macros.carbs))
  const [f, setF] = useState(text(existing?.macros.fat))
  const [favourite, setFavourite] = useState(existing?.favourite ?? false)
  const [rows, setRows] = useState<ComponentRow[]>(() => (existing?.components ?? []).map((comp) => ({ comp, amountText: fmtGrams(comp.amount) })))
  const [query, setQuery] = useState('')

  const built = kind === 'built'
  const typedKcal = parseNumber(kcalText)
  const quickMacros: Macros = { kcal: typedKcal === null ? 0 : fromInputEnergy(typedKcal, unit), protein: grams(p), carbs: grams(c), fat: grams(f) }
  const totals = useMemo(() => roundMacros(sumMacros(rows.map((r) => r.comp.macros))), [rows])
  const results = useMemo(() => (built ? searchIngredients(ingredients, query).slice(0, 6) : []), [built, ingredients, query])
  const hasIngredients = Object.keys(ingredients).length > 0

  const valid = built ? rows.length > 0 : typedKcal !== null
  useEffect(() => onValidity(valid), [valid, onValidity])

  const add = (ing: Ingredient) => {
    const comp = makeComponent(ing, ing.per.amount)
    setRows((r) => [...r, { comp, amountText: fmtGrams(comp.amount) }])
    setQuery('')
  }
  const setAmount = (i: number, amountText: string) => {
    setRows((r) =>
      r.map((row, j) => {
        if (j !== i) return row
        const n = parseNumber(amountText)
        if (n === null) return { ...row, amountText }
        const ing = ingredients[row.comp.ingredientId]
        const comp: MealComponent = ing
          ? makeComponent(ing, n)
          : { ...row.comp, amount: n, macros: roundMacros(scaleMacros(row.comp.macros, row.comp.amount > 0 ? n / row.comp.amount : 0)) }
        return { comp, amountText }
      }),
    )
  }
  const remove = (i: number) => setRows((r) => r.filter((_, j) => j !== i))

  const save = () => {
    if (!valid) return
    const s = useStore.getState()
    if (built) {
      const components = rows.map((r) => r.comp)
      if (existing) s.updateMeal(existing.id, { name, components, favourite })
      else s.addBuiltMeal({ name, components, favourite })
    } else if (existing) s.updateMeal(existing.id, { name, macros: quickMacros, favourite })
    else s.addQuickMeal({ name, macros: quickMacros, favourite })
    onDone()
  }

  return (
    <form
      id={formId}
      className="flex flex-col gap-3 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      {!existing ? (
        <div className="flex items-center justify-between">
          <span className="font-display text-[10px] tracking-[0.35em] text-bone-dim">Kind</span>
          <Segmented<Meal['kind']> label="Meal kind" value={kind} onChange={setKind} options={KINDS} />
        </div>
      ) : null}

      <Field label="Name" type="text" autoComplete="off" autoCapitalize="sentences" placeholder="Meal" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />

      {built ? (
        <>
          <div>
            <div className="font-display border-b border-[var(--gold-line-strong)] pb-2 text-[10px] tracking-[0.4em] text-bone-dim">Built from</div>
            {rows.length === 0 ? (
              <EmptyLine className="py-3">Add an ingredient below.</EmptyLine>
            ) : (
              <ul>
                {rows.map((row, i) => {
                  const gone = !ingredients[row.comp.ingredientId]
                  const suffix = row.comp.unit === 'serve' ? 'serve' : row.comp.unit
                  return (
                    <li key={`${row.comp.ingredientId}:${i}`} className="flex items-center gap-2 border-b border-[var(--gold-line)] py-2">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={`truncate font-body text-[17px] font-medium ${gone ? 'text-bone-mute' : 'text-bone'}`}>{row.comp.name}</span>
                        <span className="num truncate font-body text-[13px] text-bone-dim">
                          {gone ? 'removed · ' : ''}
                          {macroText(row.comp.macros)}
                        </span>
                      </span>
                      <Input
                        {...decimalInputProps}
                        aria-label={`Amount of ${row.comp.name}`}
                        value={row.amountText}
                        onChange={(e) => setAmount(i, e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        suffix={suffix}
                        className="w-[108px] shrink-0"
                      />
                      <span className="font-display inscribed num w-14 shrink-0 text-right text-[15px] tracking-[0.02em] text-gold-400">{formatEnergy(row.comp.macros.kcal, unit)}</span>
                      <button type="button" aria-label={`Remove ${row.comp.name}`} onClick={() => remove(i)} className="flex h-11 w-11 shrink-0 items-center justify-center text-bone-dim hover:text-bone cursor-pointer">
                        <X size={18} strokeWidth={1.5} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="num mt-3 flex items-center justify-between font-display inscribed text-[15px] tracking-[0.02em] text-bone">
              <span className="text-gold-400">{energyText(totals.kcal, unit)}</span>
              <span className="text-bone-dim">P {fmtGrams(totals.protein)} · C {fmtGrams(totals.carbs)} · F {fmtGrams(totals.fat)}</span>
            </div>
          </div>

          <div>
            <span className="font-display mb-1.5 block text-[10px] tracking-[0.35em] text-bone-dim">Add ingredient</span>
            {hasIngredients ? (
              <>
                <LibrarySearch label="Search ingredients" placeholder="Ingredient" value={query} onChange={setQuery} />
                <ul className="mt-1">
                  {results.map((ing) => (
                    <li key={ing.id} className="border-b border-[var(--gold-line)]">
                      <button type="button" onClick={() => add(ing)} className="flex min-h-11 w-full items-center gap-3 py-1 text-left hover:bg-[var(--gold-line)] active:bg-[var(--gold-line)] cursor-pointer">
                        <span className="min-w-0 flex-1 truncate font-body text-[17px] font-medium text-bone">{ing.name}</span>
                        <span className="num shrink-0 font-body text-[13px] text-bone-dim">
                          {basisLabel(ing.per)} · {energyText(ing.macros.kcal, unit)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {query && results.length === 0 ? (
                    <li>
                      <EmptyLine className="py-3">Nothing matches.</EmptyLine>
                    </li>
                  ) : null}
                </ul>
              </>
            ) : (
              <EmptyLine>No ingredients yet. Add one from the library first.</EmptyLine>
            )}
          </div>
        </>
      ) : (
        <>
          <Field label="Calories" {...decimalInputProps} value={kcalText} onChange={(e) => setKcalText(e.target.value)} suffix={unitLabel(unit)} placeholder="0" enterKeyHint="done" />
          <MacroFields p={p} c={c} f={f} onP={setP} onC={setC} onF={setF} />
          <MacroHint kcalTyped={typedKcal === null ? null : fromInputEnergy(typedKcal, unit)} macros={quickMacros} />
        </>
      )}

      <div className="flex min-h-9 items-center justify-between">
        <span className="font-body text-[14px] text-bone-dim">{existing ? 'Past days keep their numbers.' : ''}</span>
        <Toggle label="Favourite" checked={favourite} onChange={setFavourite} />
      </div>
    </form>
  )
}

/* ---------------- ingredient ---------------- */

function IngredientForm({ id, formId, onDone, onValidity }: FormProps) {
  const unit = useStore((s) => s.settings.unit)
  const existing = useStore((s) => (id ? s.ingredients[id] : undefined))

  const [name, setName] = useState(existing?.name ?? '')
  const [perText, setPerText] = useState(existing ? fmtGrams(existing.per.amount) : '100')
  const [perUnit, setPerUnit] = useState<AmountUnit>(existing?.per.unit ?? 'g')
  const [kcalText, setKcalText] = useState(existing ? String(Math.round(toDisplayEnergy(existing.macros.kcal, unit))) : '')
  const [p, setP] = useState(text(existing?.macros.protein))
  const [c, setC] = useState(text(existing?.macros.carbs))
  const [f, setF] = useState(text(existing?.macros.fat))
  const [favourite, setFavourite] = useState(existing?.favourite ?? false)

  const perAmount = parseNumber(perText)
  const typedKcal = parseNumber(kcalText)
  const macros: Macros = { kcal: typedKcal === null ? 0 : fromInputEnergy(typedKcal, unit), protein: grams(p), carbs: grams(c), fat: grams(f) }
  const valid = typedKcal !== null && perAmount !== null && perAmount > 0
  const per = { amount: perAmount && perAmount > 0 ? perAmount : 1, unit: perUnit }
  useEffect(() => onValidity(valid), [valid, onValidity])

  const onUnit = (u: AmountUnit) => {
    setPerUnit(u)
    // a sensible default basis when switching: 100 g, 100 ml, 1 serve
    if (!existing && (perText === '' || perText === '100' || perText === '1')) setPerText(u === 'serve' ? '1' : '100')
  }

  const save = () => {
    if (!valid) return
    const s = useStore.getState()
    if (existing) s.updateIngredient(existing.id, { name, per, macros, favourite })
    else s.addIngredient({ name, per, macros, favourite })
    onDone()
  }

  return (
    <form
      id={formId}
      className="flex flex-col gap-3 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <Field label="Name" type="text" autoComplete="off" autoCapitalize="sentences" placeholder="Ingredient" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />

      <div className="grid grid-cols-3 items-end gap-3">
        <Field
          label="Per"
          className="col-span-2"
          {...decimalInputProps}
          value={perText}
          onChange={(e) => setPerText(e.target.value)}
          suffix={perUnit === 'serve' ? (perAmount === 1 ? 'serve' : 'serves') : perUnit}
          placeholder={perUnit === 'serve' ? '1' : '100'}
        />
        <div className="flex h-14 items-center">
          <Segmented label="Basis unit" size="md" value={perUnit} onChange={onUnit} options={UNITS} className="w-full [&>button]:flex-1 [&>button]:px-0" />
        </div>
      </div>

      <Field label={`Calories ${basisLabel(per)}`} {...decimalInputProps} value={kcalText} onChange={(e) => setKcalText(e.target.value)} suffix={unitLabel(unit)} placeholder="0" enterKeyHint="done" />
      <MacroFields p={p} c={c} f={f} onP={setP} onC={setC} onF={setF} />
      <MacroHint kcalTyped={typedKcal === null ? null : fromInputEnergy(typedKcal, unit)} macros={macros} />

      <div className="flex min-h-9 items-center justify-between">
        <span className="num font-body text-[14px] text-bone-dim">{existing ? 'Saved meals keep their numbers.' : ''}</span>
        <Toggle label="Favourite" checked={favourite} onChange={setFavourite} />
      </div>
    </form>
  )
}
