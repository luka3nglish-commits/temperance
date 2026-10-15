import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { searchIngredients } from '../store/selectors'
import type { AmountUnit, EnergyUnit, Ingredient, Macros, Meal, MealComponent, Portion } from '../lib/types'
import { kcalFromMacros, makeComponent, roundMacros, scaleMacros, sumMacros } from '../lib/macros'
import { formatEnergy, fromInputEnergy, parseNumber, toDisplayEnergy, unitLabel } from '../lib/units'
import { Button, EmptyLine, Field, IconButton, Input, PortionField, SectionHeading, Segmented, Sheet, Toggle, ValueUnit, decimalInputProps } from '../components/ui'
import { LibrarySearch } from './LibrarySearch'
import { basisLabel, energyText, fmtGrams, macroText } from './LibraryFormat'

export type EditorTarget = { kind: 'meal'; id?: string } | { kind: 'ingredient'; id?: string }

type Props = {
  target: EditorTarget | null
  onClose(): void
  onClosed?(): void
}

const UNITS: readonly { value: AmountUnit; label: string; testId: string }[] = [
  { value: 'g', label: 'g', testId: 'tp-ingredient-edit-unit-g' },
  { value: 'ml', label: 'ml', testId: 'tp-ingredient-edit-unit-ml' },
  { value: 'serve', label: 'serve', testId: 'tp-ingredient-edit-unit-serve' },
]

const KINDS: readonly { value: Meal['kind']; label: string; testId: string }[] = [
  { value: 'quick', label: 'Numbers', testId: 'tp-meal-edit-kind-quick' },
  { value: 'built', label: 'Built', testId: 'tp-meal-edit-kind-built' },
]

/** The usual amount a fresh basis starts at (mirrors the LOG sheet): 1 serve, 100 g, 250 ml. */
const DEFAULT_USUAL: Record<AmountUnit, number> = { serve: 1, g: 100, ml: 250 }

const text = (n: number | undefined) => (n === undefined || n === 0 ? '' : fmtGrams(n))
const grams = (t: string) => parseNumber(t) ?? 0
/** The energy field's first text: the stored kcal in the display unit, whole. */
const seedText = (kcal: number | undefined, unit: EnergyUnit) => (kcal === undefined ? '' : String(Math.round(toDisplayEnergy(kcal, unit))))

/** Add and edit forms for a meal or an ingredient, in a sheet sized to the form (tall for built and new meals) with SAVE in the sticky footer. */
export function LibraryEditor({ target, onClose, onClosed }: Props) {
  const [held, setHeld] = useState<EditorTarget | null>(target)
  useEffect(() => {
    if (target) setHeld(target)
  }, [target])
  const current = target ?? held
  const open = target !== null
  // short forms (an ingredient, a quick meal being edited) size to their content; built and new meals
  // stay tall, since a new meal can switch to BUILT and its search list would make the sheet jump
  const quickMeal = useStore((s) => (current?.kind === 'meal' && current.id ? s.meals[current.id]?.kind === 'quick' : false))
  const compact = current?.kind === 'ingredient' || quickMeal
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
      height={compact ? 'auto' : 'tall'}
      footer={
        <Button type="submit" form={formId} variant="gold" full disabled={!valid} data-testid={current?.kind === 'ingredient' ? 'tp-ingredient-edit-save' : 'tp-meal-edit-save'}>
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

/** The one quiet hint (polish-spec 6.2): only when the 4/4/9 sum differs from the typed energy by more than 8 percent. */
function MacroHint({ kcalTyped, macros, testId }: { kcalTyped: number | null; macros: Pick<Macros, 'protein' | 'carbs' | 'fat'>; testId: string }) {
  const unit = useStore((s) => s.settings.unit)
  const implied = kcalFromMacros(macros)
  const differs = implied > 0 && kcalTyped !== null && kcalTyped > 0 && Math.abs(kcalTyped - implied) / kcalTyped > 0.08
  // speaks only when it has something to say; it sits under the fields being typed, so nothing jumps
  // under the finger. The live region stays mounted (a zero-height line cancelling the form gap) so a
  // screen reader announces the sentence when it appears.
  return (
    <p data-testid={testId} data-shown={differs || undefined} className={differs ? 'hint num -mt-1' : '-mt-4 h-0 overflow-hidden'} aria-live="polite">
      {differs ? `Macros add to ${energyText(implied, unit)}.` : null}
    </p>
  )
}

/** Protein, carbs and fat as three 56 px carved thirds with their labels inside. */
function MacroFields({ p, c, f, onP, onC, onF, testPrefix }: { p: string; c: string; f: string; onP(v: string): void; onC(v: string): void; onF(v: string): void; testPrefix: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Protein" labelInside inputClassName="pr-8!" data-testid={`${testPrefix}-protein`} {...decimalInputProps} value={p} onChange={(e) => onP(e.target.value)} suffix="g" placeholder="0" />
      <Field label="Carbs" labelInside inputClassName="pr-8!" data-testid={`${testPrefix}-carbs`} {...decimalInputProps} value={c} onChange={(e) => onC(e.target.value)} suffix="g" placeholder="0" />
      <Field label="Fat" labelInside inputClassName="pr-8!" data-testid={`${testPrefix}-fat`} {...decimalInputProps} value={f} onChange={(e) => onF(e.target.value)} suffix="g" placeholder="0" />
    </div>
  )
}

/** The note and the favourite switch at the foot of a form. */
function FormFoot({ note, favourite, onFavourite }: { note: string; favourite: boolean; onFavourite(v: boolean): void }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 pt-1">
      <span className="hint">{note}</span>
      <Toggle label="Favourite" checked={favourite} onChange={onFavourite} />
    </div>
  )
}

/* ---------------- meal ---------------- */

/** perMacros / perAmount: the macros of a known amount, so a removed ingredient's row rescales without losing them at 0 */
type ComponentRow = { comp: MealComponent; amountText: string; perMacros: Macros; perAmount: number }

const rowFor = (comp: MealComponent): ComponentRow => ({ comp, amountText: fmtGrams(comp.amount), perMacros: comp.macros, perAmount: comp.amount > 0 ? comp.amount : 1 })

type FormProps = { id?: string; formId: string; onDone(): void; onValidity(valid: boolean): void }

function MealForm({ id, formId, onDone, onValidity }: FormProps) {
  const unit = useStore((s) => s.settings.unit)
  const existing = useStore((s) => (id ? s.meals[id] : undefined))
  const ingredients = useStore((s) => s.ingredients)

  const [name, setName] = useState(existing?.name ?? '')
  const [kind, setKind] = useState<Meal['kind']>(existing?.kind ?? 'quick')
  // the energy text as first shown; saving it unchanged keeps the stored kcal (no kJ round-trip drift)
  const [kcalSeed] = useState(() => seedText(existing?.macros.kcal, unit))
  const [kcalText, setKcalText] = useState(kcalSeed)
  const [p, setP] = useState(text(existing?.macros.protein))
  const [c, setC] = useState(text(existing?.macros.carbs))
  const [f, setF] = useState(text(existing?.macros.fat))
  const [favourite, setFavourite] = useState(existing?.favourite ?? false)
  const [rows, setRows] = useState<ComponentRow[]>(() => (existing?.components ?? []).map(rowFor))
  const [query, setQuery] = useState('')

  // the basis: per serve, or per an amount (per 100 g, per 100 ml) as a label prints it
  const [basis, setBasis] = useState<AmountUnit>(existing?.per?.unit ?? 'serve')
  // the basis amount for a unit: the meal's own (per 30 g stays per 30 g), else 100
  const perAmountFor = (u: AmountUnit) => (existing?.per && existing.per.unit === u ? existing.per.amount : 100)
  const [usual, setUsual] = useState<number>(() => existing?.usual ?? existing?.per?.amount ?? 1)

  const built = kind === 'built'
  const typedKcal = parseNumber(kcalText)
  const kcalIn = typedKcal === null ? null : existing && kcalText.trim() === kcalSeed ? existing.macros.kcal : fromInputEnergy(typedKcal, unit)
  const quickMacros: Macros = { kcal: kcalIn ?? 0, protein: grams(p), carbs: grams(c), fat: grams(f) }
  const totals = useMemo(() => roundMacros(sumMacros(rows.map((r) => r.comp.macros))), [rows])
  const results = useMemo(() => (built ? searchIngredients(ingredients, query).slice(0, 6) : []), [built, ingredients, query])
  const hasIngredients = Object.keys(ingredients).length > 0

  // built meals always count per serve
  const usualUnit: AmountUnit = built ? 'serve' : basis
  const per: Portion | undefined = !built && basis !== 'serve' ? { amount: perAmountFor(basis), unit: basis } : undefined
  const basisOptions = useMemo(
    () =>
      [
        { value: 'serve', label: 'Per serve', testId: 'tp-meal-edit-basis-serve' },
        { value: 'g', label: `Per ${fmtGrams(perAmountFor('g'))} g`, testId: 'tp-meal-edit-basis-g' },
        { value: 'ml', label: `Per ${fmtGrams(perAmountFor('ml'))} ml`, testId: 'tp-meal-edit-basis-ml' },
      ] as const,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existing?.per?.unit, existing?.per?.amount],
  )

  const valid = built ? rows.length > 0 : typedKcal !== null
  useEffect(() => onValidity(valid), [valid, onValidity])

  const changeBasis = (b: AmountUnit) => {
    if (b === basis) return
    setBasis(b)
    // switching never converts the typed numbers (they are label numbers); it resets the usual amount,
    // back to the meal's own when it returns to the meal's own basis
    const own = existing && existing.kind === 'quick' && (existing.per?.unit ?? 'serve') === b
    setUsual(own ? existing.usual ?? existing.per?.amount ?? 1 : DEFAULT_USUAL[b])
  }
  const changeKind = (k: Meal['kind']) => {
    setKind(k)
    if (k === 'built') setUsual(1)
    else setUsual(basis === 'serve' ? 1 : DEFAULT_USUAL[basis])
  }

  // energy of the usual amount, for the USUAL label row
  const usualKcal = built ? totals.kcal * usual : per ? (quickMacros.kcal * usual) / per.amount : quickMacros.kcal * usual

  const add = (ing: Ingredient) => {
    const comp = makeComponent(ing, ing.per.amount)
    setRows((r) => [...r, rowFor(comp)])
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
          : { ...row.comp, amount: n, macros: roundMacros(scaleMacros(row.perMacros, n / row.perAmount)) }
        return { ...row, comp, amountText }
      }),
    )
  }
  const remove = (i: number) => setRows((r) => r.filter((_, j) => j !== i))

  const save = () => {
    if (!valid) return
    const s = useStore.getState()
    if (built) {
      const components = rows.map((r) => r.comp)
      if (existing) s.updateMeal(existing.id, { name, components, favourite, usual })
      else {
        const meal = s.addBuiltMeal({ name, components, favourite })
        if (usual !== 1) s.updateMeal(meal.id, { usual }, meal.createdAt)
      }
    } else if (existing) s.updateMeal(existing.id, { name, macros: quickMacros, favourite, per, usual })
    else s.addQuickMeal({ name, macros: quickMacros, favourite, per, usual })
    onDone()
  }

  return (
    <form
      id={formId}
      data-testid="tp-meal-editor"
      data-kind={kind}
      data-basis={usualUnit}
      className="flex flex-col gap-4 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      {!existing ? (
        <div>
          <span className="label mb-2 block">Kind</span>
          <Segmented<Meal['kind']> label="Meal kind" size="lg" value={kind} onChange={changeKind} options={KINDS} testId="tp-meal-edit-kind" />
        </div>
      ) : null}

      <Field label="Name" data-testid="tp-meal-edit-name" type="text" autoComplete="off" autoCapitalize="sentences" placeholder="Meal" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />

      {built ? (
        <>
          <section aria-labelledby="lib-edit-built">
            <SectionHeading as="h3" id="lib-edit-built" right={rows.length ? rows.length : undefined}>
              Built from
            </SectionHeading>
            {rows.length === 0 ? (
              <EmptyLine className="py-3">Add an ingredient below.</EmptyLine>
            ) : (
              <ul>
                {rows.map((row, i) => {
                  const gone = !ingredients[row.comp.ingredientId]
                  const suffix = row.comp.unit === 'serve' ? (parseNumber(row.amountText) ?? 1) <= 1 ? 'serve' : 'serves' : row.comp.unit
                  return (
                    <li key={`${row.comp.ingredientId}:${i}`} className="row-rule py-2">
                      <div className="flex min-h-11 items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate font-body text-[18px] font-medium leading-[1.3] ${gone ? 'text-bone-mute' : 'text-bone'}`}>{row.comp.name}</span>
                        <ValueUnit value={formatEnergy(row.comp.macros.kcal, unit)} unit={unitLabel(unit)} />
                        <IconButton label={`Remove ${row.comp.name}`} onClick={() => remove(i)} className="-mr-2.5">
                          <X size={20} strokeWidth={1.5} />
                        </IconButton>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          {...decimalInputProps}
                          fieldSize="sm"
                          aria-label={`Amount of ${row.comp.name}`}
                          value={row.amountText}
                          onChange={(e) => setAmount(i, e.target.value)}
                          onFocus={(e) => e.currentTarget.select()}
                          suffix={suffix}
                          className="w-[132px] shrink-0"
                        />
                        <span className="meta min-w-0 truncate">
                          {gone ? 'removed · ' : ''}
                          {macroText(row.comp.macros)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="mt-3 flex items-baseline justify-between gap-3" data-testid="tp-meal-edit-totals">
              <ValueUnit value={formatEnergy(totals.kcal, unit)} unit={unitLabel(unit)} tone="gold" />
              <span className="meta">{macroText(totals)}</span>
            </div>
          </section>

          <div>
            <span className="label mb-2 block">Add ingredient</span>
            {hasIngredients ? (
              <>
                <LibrarySearch label="Search ingredients" placeholder="Ingredient" value={query} onChange={setQuery} />
                <ul className="mt-1">
                  {results.map((ing) => (
                    <li key={ing.id} className="row-rule">
                      <button type="button" onClick={() => add(ing)} className="row-press flex min-h-12 w-full items-center gap-3 py-1 text-left cursor-pointer">
                        <span className="min-w-0 flex-1 truncate font-body text-[18px] font-medium text-bone">{ing.name}</span>
                        <span className="hint num shrink-0">
                          {basisLabel(ing.per)} · {energyText(ing.macros.kcal, unit)}
                        </span>
                        <Plus size={18} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-gold-300" />
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
          <Segmented<AmountUnit> label="Counted" size="lg" value={basis} onChange={changeBasis} options={basisOptions} testId="tp-meal-edit-basis" />
          <Field
            label="Calories"
            labelRight={
              <span className="text-gold-300 tracking-[0.08em]" data-testid="tp-meal-edit-basis-tag">
                {basisLabel(per)}
              </span>
            }
            fieldSize="lg"
            data-testid="tp-meal-edit-kcal"
            {...decimalInputProps}
            value={kcalText}
            onChange={(e) => setKcalText(e.target.value)}
            suffix={unitLabel(unit)}
            placeholder="0"
            enterKeyHint="done"
          />
          <MacroFields p={p} c={c} f={f} onP={setP} onC={setC} onF={setF} testPrefix="tp-meal-edit" />
          <MacroHint kcalTyped={kcalIn} macros={quickMacros} testId="tp-meal-edit-hint" />
        </>
      )}

      <div>
        <div className="mb-2 flex h-5 items-baseline justify-between gap-3">
          <span className="label">Usual</span>
          <span className="hint num" data-testid="tp-meal-edit-usual-energy">
            {usualKcal > 0 ? `one tap logs ${energyText(usualKcal, unit)}` : 'one tap logs this'}
          </span>
        </div>
        <PortionField testId="tp-meal-edit-usual" label="Usual" unit={usualUnit} value={usual} onChange={setUsual} />
      </div>

      <FormFoot note={existing ? 'Past days keep their numbers.' : ''} favourite={favourite} onFavourite={setFavourite} />
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
  const [kcalSeed] = useState(() => seedText(existing?.macros.kcal, unit))
  const [kcalText, setKcalText] = useState(kcalSeed)
  const [p, setP] = useState(text(existing?.macros.protein))
  const [c, setC] = useState(text(existing?.macros.carbs))
  const [f, setF] = useState(text(existing?.macros.fat))
  const [favourite, setFavourite] = useState(existing?.favourite ?? false)

  const perAmount = parseNumber(perText)
  const typedKcal = parseNumber(kcalText)
  const kcalIn = typedKcal === null ? null : existing && kcalText.trim() === kcalSeed ? existing.macros.kcal : fromInputEnergy(typedKcal, unit)
  const macros: Macros = { kcal: kcalIn ?? 0, protein: grams(p), carbs: grams(c), fat: grams(f) }
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
      data-testid="tp-ingredient-editor"
      className="flex flex-col gap-4 pb-2"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <Field label="Name" data-testid="tp-ingredient-edit-name" type="text" autoComplete="off" autoCapitalize="sentences" placeholder="Ingredient" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />

      {/* the basis: an amount and its unit on one 44 px row (100 | G ML SERVE), so nothing clips at 360 px */}
      <div>
        <label htmlFor="lib-ing-per" className="label mb-2 block">
          Counted per
        </label>
        <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3">
          <Input
            id="lib-ing-per"
            fieldSize="sm"
            data-testid="tp-ingredient-edit-per"
            {...decimalInputProps}
            value={perText}
            onChange={(e) => setPerText(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            placeholder={perUnit === 'serve' ? '1' : '100'}
          />
          <Segmented<AmountUnit> label="Basis unit" size="md" full value={perUnit} onChange={onUnit} options={UNITS} testId="tp-ingredient-edit-unit" />
        </div>
      </div>

      <Field
        label="Calories"
        labelRight={<span className="text-gold-300 tracking-[0.08em]">{basisLabel(per)}</span>}
        fieldSize="lg"
        data-testid="tp-ingredient-edit-kcal"
        {...decimalInputProps}
        value={kcalText}
        onChange={(e) => setKcalText(e.target.value)}
        suffix={unitLabel(unit)}
        placeholder="0"
        enterKeyHint="done"
      />
      <MacroFields p={p} c={c} f={f} onP={setP} onC={setC} onF={setF} testPrefix="tp-ingredient-edit" />
      <MacroHint kcalTyped={kcalIn} macros={macros} testId="tp-ingredient-edit-hint" />

      <FormFoot note={existing ? 'Saved meals keep their numbers.' : ''} favourite={favourite} onFavourite={setFavourite} />
    </form>
  )
}
