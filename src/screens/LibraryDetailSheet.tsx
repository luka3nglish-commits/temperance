import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, Pencil, Star, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { AmountUnit, EnergyUnit, Ingredient, Macros, Meal } from '../lib/types'
import { ingredientMacrosFor, scaleMacros } from '../lib/macros'
import { formatEnergy, unitLabel } from '../lib/units'
import { formatAmount } from '../lib/portion'
import { vibrate } from '../lib/motion'
import { Button, PortionField, PortionPicks, SectionHeading, Sheet, Tablet, ValueUnit, useStaggerOnce, useToast } from '../components/ui'
import { amountLabel, basisLabel, energyText, fmtGrams, loggedText } from './LibraryFormat'

export type DetailTarget = { kind: 'meal'; id: string } | { kind: 'ingredient'; id: string }

type Props = {
  target: DetailTarget | null
  onClose(): void
  /** fires after the close transition finished */
  onClosed?(): void
  onEdit(target: DetailTarget): void
  /** reopen an assembled meal in the LOG sheet's BUILD mode (fires after this sheet has left) */
  onBuild(mealId: string): void
}

const DELETE_ARM_MS = 3500

/**
 * The MEAL DETAIL / INGREDIENT sheet (polish-spec 6.3): the name, the numbers tablet (energy in flat
 * gold, protein, carbs and fat in bone) scaling live with the portion, the PORTION label row with the
 * basis at the right, the PortionField in the item's basis with its quick picks, LOG in gold with the
 * amount and energy under it, then EDIT, FAVOURITE and DELETE (two-step) and the quiet note.
 */
export function LibraryDetailSheet({ target, onClose, onClosed, onEdit, onBuild }: Props) {
  // keep the last target so the sheet can animate out after it is cleared
  const [held, setHeld] = useState<DetailTarget | null>(target)
  useEffect(() => {
    if (target) setHeld(target)
  }, [target])
  const open = target !== null
  const current = target ?? held

  const liveMeal = useStore((s) => (current?.kind === 'meal' ? s.meals[current.id] : undefined))
  const liveIngredient = useStore((s) => (current?.kind === 'ingredient' ? s.ingredients[current.id] : undefined))
  const item = current?.kind === 'meal' ? liveMeal : liveIngredient

  // the item vanished (deleted here or elsewhere): close, but keep its last shape for the exit
  useEffect(() => {
    if (open && current && !item) onClose()
  }, [open, current, item, onClose])
  const meal = useLast(liveMeal)
  const ingredient = useLast(liveIngredient)

  return (
    <Sheet
      open={open && !!item}
      onClose={onClose}
      onClosed={() => {
        setHeld(null)
        onClosed?.()
      }}
      title={current?.kind === 'ingredient' ? 'Ingredient' : 'Meal detail'}
      height="auto"
    >
      {current?.kind === 'meal' && meal ? (
        <MealDetail key={meal.id} meal={meal} onClose={onClose} onEdit={() => onEdit(current)} onBuild={() => onBuild(meal.id)} />
      ) : current?.kind === 'ingredient' && ingredient ? (
        <IngredientDetail key={ingredient.id} ingredient={ingredient} onClose={onClose} onEdit={() => onEdit(current)} />
      ) : null}
    </Sheet>
  )
}

/** The last defined value, so a deleted item still renders while its sheet slides away. */
function useLast<T>(value: T | undefined): T | undefined {
  const last = useRef(value)
  if (value !== undefined) last.current = value
  return value ?? last.current
}

/* ---------------- shared pieces ---------------- */

/** The raised numbers tablet: energy in flat gold-300 32 px, then protein, carbs and fat in bone. */
function Numbers({ macros, eu }: { macros: Macros; eu: EnergyUnit }) {
  return (
    <Tablet className="mt-4" testId="tp-detail-numbers">
      <ValueUnit value={formatEnergy(macros.kcal, eu)} unit={unitLabel(eu)} size={32} tone="gold" className="leading-none" testId="tp-detail-kcal" />
      <dl className="mt-4 grid grid-cols-3 gap-3">
        {(
          [
            ['Protein', macros.protein],
            ['Carbs', macros.carbs],
            ['Fat', macros.fat],
          ] as const
        ).map(([full, v]) => (
          <div key={full} className="min-w-0">
            <dt className="label">{full}</dt>
            <dd className="mt-2">
              <ValueUnit value={fmtGrams(v)} unit="g" size={20} />
            </dd>
          </div>
        ))}
      </dl>
    </Tablet>
  )
}

/** Two-step delete: first tap arms (DELETE? on an ember wash), second tap within 3.5 s deletes. */
function useArmedDelete(onDelete: () => void) {
  const [armed, setArmed] = useState(false)
  const timer = useRef(0)
  const disarm = useCallback(() => {
    window.clearTimeout(timer.current)
    setArmed(false)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const tap = useCallback(() => {
    if (armed) {
      disarm()
      onDelete()
      return
    }
    vibrate(10)
    setArmed(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setArmed(false), DELETE_ARM_MS)
  }, [armed, disarm, onDelete])
  return { armed, tap, disarm }
}

function Title({ name, favourite }: { name: string; favourite: boolean }) {
  return (
    <h3 className="flex items-start gap-2 font-body text-[26px] font-medium leading-[1.2] text-bone">
      <span className="min-w-0 break-words">{name}</span>
      {favourite ? <Star aria-label="Favourite" size={14} strokeWidth={1.5} className="mt-2.5 shrink-0 fill-current text-gold-400" /> : null}
    </h3>
  )
}

type PortionProps = {
  testId: string
  unit: AmountUnit
  value: number
  onChange(v: number): void
  onPreview(n: number | null): void
  /** right side of the label row: the basis and its energy */
  basis: string
  usual?: number
  picks?: readonly number[]
}

/** PORTION label row (basis at the right), the 64 px PortionField and the four picks under it. */
function PortionBlock({ testId, unit, value, onChange, onPreview, basis, usual, picks }: PortionProps) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex h-5 items-baseline justify-between gap-3">
        <span className="label">Portion</span>
        <span className="hint num truncate" data-testid={`${testId}-basis`}>
          {basis}
        </span>
      </div>
      <PortionField testId={testId} unit={unit} value={value} onChange={onChange} onPreview={onPreview} />
      <PortionPicks testId={testId} unit={unit} value={value} usual={usual} picks={picks} onChange={onChange} className="mt-2" />
    </div>
  )
}

type ActionsProps = {
  kind: 'meal' | 'ingredient'
  onLog(): void
  /** `180 g · 175 kcal` under LOG */
  meta: string
  onEdit(): void
  favourite: boolean
  onFavourite(): void
  del: { armed: boolean; tap(): void }
  note: ReactNode
}

/** Under 380 px the half-width EDIT and FAVOURITE buttons take 12 px sides and a 6 px gap so FAVOURITE fits whole. */
const NARROW_PAD = 'max-[379px]:px-3! max-[379px]:gap-1.5'

/** LOG (gold) with its meta line, then EDIT and FAVOURITE side by side, DELETE under them, then the note. */
function Actions({ kind, onLog, meta, onEdit, favourite, onFavourite, del, note }: ActionsProps) {
  return (
    <div className="mt-6">
      <Button variant="gold" full data-testid={`tp-${kind}-detail-log`} onClick={onLog}>
        Log
      </Button>
      <p className="hint num mt-2 text-center" data-testid={`tp-${kind}-detail-meta`}>
        {meta}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="hairline" size="lg" full className={NARROW_PAD} data-testid={`tp-${kind}-detail-edit`} icon={<Pencil size={16} strokeWidth={1.5} />} onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant="hairline"
          size="lg"
          full
          className={NARROW_PAD}
          data-testid={`tp-${kind}-detail-fav`}
          aria-pressed={favourite}
          icon={<Star size={16} strokeWidth={1.5} className={favourite ? 'fill-current' : ''} />}
          onClick={onFavourite}
        >
          Favourite
        </Button>
        {/* DELETE sits alone and centred at half width: there, never loud */}
        <div data-delete="" className="col-span-2 w-[calc(50%-6px)] justify-self-center">
          <Button
            variant="danger"
            size="lg"
            full
            armed={del.armed}
            data-testid={`tp-${kind}-detail-delete`}
            data-armed={del.armed ? '' : undefined}
            icon={<X size={16} strokeWidth={1.5} />}
            onClick={del.tap}
          >
            {del.armed ? <span data-testid={`tp-${kind}-delete-confirm`}>Delete?</span> : 'Delete'}
          </Button>
        </div>
      </div>
      <p className="mt-4 text-center font-body text-[16px] font-medium italic leading-[1.4] text-bone-soft">{note}</p>
    </div>
  )
}

/* ---------------- meal ---------------- */

function MealDetail({ meal, onClose, onEdit, onBuild }: { meal: Meal; onClose(): void; onEdit(): void; onBuild(): void }) {
  const eu = useStore((s) => s.settings.unit)
  const ingredients = useStore((s) => s.ingredients)
  const stagger = useStaggerOnce()
  // the meal's basis: per serve, or per an amount (per 100 g) as printed on a label
  const unit: AmountUnit = meal.per?.unit ?? 'serve'
  const base = meal.per && meal.per.amount > 0 ? meal.per.amount : 1
  const [amount, setAmount] = useState(() => meal.usual ?? meal.per?.amount ?? 1)
  const [preview, setPreview] = useState<number | null>(null)
  const shown = preview ?? amount
  // what the amount multiplies: servings, or amount over the basis amount
  const factor = unit === 'serve' && !meal.per ? shown : shown / base
  const scaled = useMemo(() => scaleMacros(meal.macros, factor), [meal.macros, factor])

  const log = () => {
    const entry = useStore.getState().logMeal(meal.id, meal.per ? { amount, unit } : amount)
    if (!entry) return
    vibrate(8)
    useToast.getState().show({
      text: loggedText(entry, eu),
      action: { label: 'Undo', icon: 'undo', onClick: () => useStore.getState().deleteEntry(entry.id) },
    })
    onClose()
  }

  const del = useArmedDelete(() => {
    useStore.getState().deleteMeal(meal.id)
    useToast.getState().show({ text: `Removed · ${meal.name}` })
    onClose()
  })

  const components = meal.kind === 'built' ? meal.components ?? [] : []

  return (
    <div
      data-testid="tp-meal-detail"
      data-kind={meal.kind}
      data-unit={unit}
      onClickCapture={(e) => {
        // any other tap in the sheet disarms a pending delete
        if (del.armed && !(e.target as HTMLElement).closest('[data-delete]')) del.disarm()
      }}
    >
      <Title name={meal.name} favourite={meal.favourite} />
      <Numbers macros={scaled} eu={eu} />

      <PortionBlock
        testId="tp-meal-detail-portion"
        unit={unit}
        value={amount}
        onChange={setAmount}
        onPreview={setPreview}
        basis={`${basisLabel(meal.per)} · ${energyText(meal.macros.kcal, eu)}`}
        usual={meal.usual}
      />

      <Actions
        kind="meal"
        onLog={log}
        meta={`${formatAmount(shown, unit)} · ${energyText(scaled.kcal, eu)}`}
        onEdit={onEdit}
        favourite={meal.favourite}
        onFavourite={() => {
          vibrate(8)
          useStore.getState().toggleFavouriteMeal(meal.id)
        }}
        del={del}
        note="Edits change future logs only. Past days keep their numbers."
      />

      {components.length ? (
        <section className="mt-7" aria-labelledby="lib-detail-built">
          <SectionHeading
            as="h3"
            id="lib-detail-built"
            right={
              <button
                type="button"
                data-testid="tp-meal-detail-build"
                onClick={onBuild}
                className="label press -my-2.5 -mr-2 inline-flex h-11 min-w-11 items-center justify-center gap-1 px-2 text-gold-300 cursor-pointer"
              >
                Build
                <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            }
          >
            Built from
          </SectionHeading>
          <ul className={stagger}>
            {components.map((c, i) => {
              const gone = !ingredients[c.ingredientId]
              return (
                <li key={`${c.ingredientId}:${i}`} className="row-rule grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-1.5">
                  <span className="min-w-0">
                    <span className={`block truncate font-body text-[18px] font-medium leading-[1.3] ${gone ? 'text-bone-mute' : 'text-bone'}`}>{c.name}</span>
                    {gone ? <span className="hint block italic">removed from the library</span> : null}
                  </span>
                  <span className="meta shrink-0">{amountLabel(c.amount * factor, c.unit)}</span>
                  <ValueUnit value={formatEnergy(c.macros.kcal * factor, eu)} unit={unitLabel(eu)} className="min-w-[72px] justify-end" />
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/* ---------------- ingredient ---------------- */

/**
 * Quick picks for an ingredient: whole items for a per-serve basis (1, 2, 3, 4 eggs), multiples of a
 * small basis (olive oil per 10 ml: 10, 20, 30, 40), else the standard four (100, 150, 200, 250 g).
 */
function ingredientPicks(per: Ingredient['per']): readonly number[] | undefined {
  if (per.unit !== 'serve' && per.amount >= 50) return undefined
  return [1, 2, 3, 4].map((k) => k * per.amount)
}

function IngredientDetail({ ingredient, onClose, onEdit }: { ingredient: Ingredient; onClose(): void; onEdit(): void }) {
  const eu = useStore((s) => s.settings.unit)
  const unit = ingredient.per.unit
  const [amount, setAmount] = useState(() => (ingredient.per.amount > 0 ? ingredient.per.amount : 1))
  const [preview, setPreview] = useState<number | null>(null)
  const shown = preview ?? amount
  const scaled = useMemo(() => ingredientMacrosFor(ingredient, shown), [ingredient, shown])

  const log = () => {
    // the entry records the amount eaten (180 g), so the TODAY sheet and recents can show it
    const entry = useStore.getState().logQuick({ name: ingredient.name, macros: ingredient.macros, per: ingredient.per, amount })
    vibrate(8)
    useToast.getState().show({
      text: loggedText(entry, eu),
      action: { label: 'Undo', icon: 'undo', onClick: () => useStore.getState().deleteEntry(entry.id) },
    })
    onClose()
  }

  const del = useArmedDelete(() => {
    useStore.getState().deleteIngredient(ingredient.id)
    useToast.getState().show({ text: `Removed · ${ingredient.name}` })
    onClose()
  })

  return (
    <div
      data-testid="tp-ingredient-detail"
      data-unit={unit}
      onClickCapture={(e) => {
        if (del.armed && !(e.target as HTMLElement).closest('[data-delete]')) del.disarm()
      }}
    >
      <Title name={ingredient.name} favourite={ingredient.favourite} />
      <Numbers macros={scaled} eu={eu} />

      <PortionBlock
        testId="tp-ingredient-detail-portion"
        unit={unit}
        value={amount}
        onChange={setAmount}
        onPreview={setPreview}
        basis={`${basisLabel(ingredient.per)} · ${energyText(ingredient.macros.kcal, eu)}`}
        picks={ingredientPicks(ingredient.per)}
      />

      <Actions
        kind="ingredient"
        onLog={log}
        meta={`${formatAmount(shown, unit)} · ${energyText(scaled.kcal, eu)}`}
        onEdit={onEdit}
        favourite={ingredient.favourite}
        onFavourite={() => {
          vibrate(8)
          useStore.getState().toggleFavouriteIngredient(ingredient.id)
        }}
        del={del}
        note="Edits change future logs only. Past days and saved meals keep their numbers."
      />
    </div>
  )
}
