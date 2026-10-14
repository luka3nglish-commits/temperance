import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronRight, Pencil, SquarePlus, Star, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Ingredient, Macros, Meal } from '../lib/types'
import { ingredientMacrosFor, scaleMacros } from '../lib/macros'
import { formatEnergy, parseNumber, unitLabel } from '../lib/units'
import { vibrate } from '../lib/motion'
import { Input, Sheet, Stepper, decimalInputProps, useToast } from '../components/ui'
import { amountLabel, basisLabel, energyText, fmtGrams } from './LibraryFormat'

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

/** The MEAL DETAIL / INGREDIENT sheet: name, numbers, portion or amount, four hairline actions. */
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

function Numbers({ macros }: { macros: Macros }) {
  const unit = useStore((s) => s.settings.unit)
  return (
    <div className="mt-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="font-display text-[10px] tracking-[0.4em] text-bone-dim">{unitLabel(unit)}</div>
        <div className="font-display inscribed num mt-1.5 text-[32px] leading-[1.1] tracking-[0.02em] text-gold-400">{formatEnergy(macros.kcal, unit)}</div>
      </div>
      <dl className="flex shrink-0 gap-5">
        {(
          [
            ['Protein', 'P', macros.protein],
            ['Carbs', 'C', macros.carbs],
            ['Fat', 'F', macros.fat],
          ] as const
        ).map(([full, short, v]) => (
          <div key={short} className="text-right">
            <dt className="font-display text-[10px] tracking-[0.4em] text-bone-dim">
              <span aria-hidden="true">{short}</span>
              <span className="sr-only">{full}</span>
            </dt>
            <dd className="font-display inscribed num mt-1.5 text-[20px] leading-[1.1] tracking-[0.02em] text-bone">
              {fmtGrams(v)}
              <span className="ml-0.5 font-body text-[14px] text-bone-dim">g</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

type ActionProps = {
  icon: ReactNode
  label: string
  onClick(): void
  tone?: 'default' | 'ember'
  /** replaces the label while armed */
  armed?: boolean
  note?: ReactNode
  pressed?: boolean
  testId?: string
}

/** One of the four 56 px hairline actions. */
function Action({ icon, label, onClick, tone = 'default', armed, note, pressed, testId }: ActionProps) {
  const ember = tone === 'ember'
  return (
    <li data-delete={ember ? '' : undefined} className={`border-t transition-colors duration-150 ${armed ? 'border-ember' : 'border-[var(--gold-line)]'}`}>
      <button
        type="button"
        data-testid={testId}
        data-armed={armed ? '' : undefined}
        onClick={onClick}
        aria-pressed={pressed}
        className={`flex h-14 w-full items-center gap-4 text-left transition-colors duration-150 hover:bg-[var(--gold-line)] active:bg-[var(--gold-line)] cursor-pointer ${
          ember ? 'text-ember-text' : 'text-gold-400'
        }`}
      >
        <span aria-hidden="true" className="flex w-6 shrink-0 justify-center">
          {icon}
        </span>
        <span
          data-testid={armed ? 'tp-meal-delete-confirm' : undefined}
          className={`font-display inscribed flex-1 ${armed ? 'text-[10px] tracking-[0.4em] text-ember' : 'text-[14px] tracking-[0.3em]'}`}
        >
          {armed ? 'Delete?' : label}
        </span>
      </button>
      {note ? <p className="-mt-1 pb-3 pl-10 font-body text-[14px] italic leading-[1.4] text-bone-dim">{note}</p> : null}
    </li>
  )
}

/** Two-step delete: first tap arms (rule turns ember, DELETE?), second tap within 3.5 s deletes. */
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
      {favourite ? <Star aria-label="Favourite" size={14} strokeWidth={1.5} className="mt-2 shrink-0 fill-current text-gold-400" /> : null}
    </h3>
  )
}

/* ---------------- meal ---------------- */

function MealDetail({ meal, onClose, onEdit, onBuild }: { meal: Meal; onClose(): void; onEdit(): void; onBuild(): void }) {
  const unit = useStore((s) => s.settings.unit)
  const ingredients = useStore((s) => s.ingredients)
  const [portion, setPortion] = useState(1)
  const scaled = useMemo(() => scaleMacros(meal.macros, portion), [meal.macros, portion])

  const log = () => {
    const entry = useStore.getState().logMeal(meal.id, portion)
    if (!entry) return
    vibrate(8)
    useToast.getState().show({
      text: `Logged · ${energyText(entry.macros.kcal, unit)}`,
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
      onClickCapture={(e) => {
        // any other tap in the sheet disarms a pending delete
        if (del.armed && !(e.target as HTMLElement).closest('[data-delete]')) del.disarm()
      }}
    >
      <Title name={meal.name} favourite={meal.favourite} />
      <Numbers macros={scaled} />

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-display text-[10px] tracking-[0.35em] text-bone-dim">Portion</span>
          {portion !== 1 ? (
            <span className="num font-body text-[14px] text-bone-dim">
              one is {energyText(meal.macros.kcal, unit)}
            </span>
          ) : null}
        </div>
        <Stepper value={portion} onChange={setPortion} />
      </div>

      {components.length ? (
        <div className="mt-5">
          <div className="flex items-end justify-between border-b border-[var(--gold-line-strong)]">
            <span className="font-display pb-2 text-[10px] tracking-[0.4em] text-bone-dim">Built from</span>
            <button
              type="button"
              data-testid="tp-meal-detail-build"
              onClick={onBuild}
              className="font-display -mr-2 inline-flex h-11 min-w-11 items-center justify-center gap-1.5 px-2 text-[10px] tracking-[0.3em] text-gold-400 hover:text-gold-300 cursor-pointer"
            >
              Build
              <ChevronRight size={12} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          <ul>
            {components.map((c, i) => {
              const gone = !ingredients[c.ingredientId]
              const amount = c.amount * portion
              const kcal = c.macros.kcal * portion
              return (
                <li key={`${c.ingredientId}:${i}`} className="flex min-h-11 items-center gap-3 border-b border-[var(--gold-line)] py-1.5">
                  <span className={`min-w-0 flex-1 truncate font-body text-[17px] font-medium ${gone ? 'text-bone-mute' : 'text-bone'}`}>{c.name}</span>
                  {gone ? <span className="font-body text-[13px] italic text-bone-mute">removed</span> : null}
                  <span className="num shrink-0 font-body text-[14px] text-bone-dim">{amountLabel(amount, c.unit)}</span>
                  <span className="font-display inscribed num w-16 shrink-0 text-right text-[15px] tracking-[0.02em] text-gold-400">{formatEnergy(kcal, unit)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <ul className="mt-6 border-b border-[var(--gold-line)]">
        <Action testId="tp-meal-detail-log" icon={<SquarePlus size={20} strokeWidth={1.5} />} label="Log" onClick={log} />
        <Action
          testId="tp-meal-detail-edit"
          icon={<Pencil size={18} strokeWidth={1.5} />}
          label="Edit"
          onClick={onEdit}
          note="Edits change future logs only. Past days keep their numbers."
        />
        <Action
          testId="tp-meal-detail-fav"
          icon={<Star size={18} strokeWidth={1.5} className={meal.favourite ? 'fill-current' : ''} />}
          label="Favourite"
          pressed={meal.favourite}
          onClick={() => {
            vibrate(8)
            useStore.getState().toggleFavouriteMeal(meal.id)
          }}
        />
        <Action testId="tp-meal-detail-delete" icon={<X size={18} strokeWidth={1.5} />} label="Delete" tone="ember" armed={del.armed} onClick={del.tap} />
      </ul>
    </div>
  )
}

/* ---------------- ingredient ---------------- */

function IngredientDetail({ ingredient, onClose, onEdit }: { ingredient: Ingredient; onClose(): void; onEdit(): void }) {
  const unit = useStore((s) => s.settings.unit)
  const [amountText, setAmountText] = useState(() => fmtGrams(ingredient.per.amount))
  const amount = parseNumber(amountText)
  const effective = amount && amount > 0 ? amount : ingredient.per.amount
  const scaled = useMemo(() => ingredientMacrosFor(ingredient, effective), [ingredient, effective])
  const suffix = ingredient.per.unit === 'serve' ? (effective === 1 ? 'serve' : 'serves') : ingredient.per.unit

  const log = () => {
    const entry = useStore.getState().logQuick({ name: `${ingredient.name} · ${amountLabel(effective, ingredient.per.unit)}`, macros: scaled, servings: 1 })
    vibrate(8)
    useToast.getState().show({
      text: `Logged · ${energyText(entry.macros.kcal, unit)}`,
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
      onClickCapture={(e) => {
        if (del.armed && !(e.target as HTMLElement).closest('[data-delete]')) del.disarm()
      }}
    >
      <Title name={ingredient.name} favourite={ingredient.favourite} />
      <Numbers macros={scaled} />

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="lib-ing-amount" className="font-display text-[10px] tracking-[0.35em] text-bone-dim">
            Amount
          </label>
          <span className="num font-body text-[14px] text-bone-dim">{basisLabel(ingredient.per)} · {energyText(ingredient.macros.kcal, unit)}</span>
        </div>
        <Input
          id="lib-ing-amount"
          {...decimalInputProps}
          value={amountText}
          onChange={(e) => setAmountText(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          suffix={suffix}
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === 'Enter') log()
          }}
        />
      </div>

      <ul className="mt-6 border-b border-[var(--gold-line)]">
        <Action testId="tp-ingredient-detail-log" icon={<SquarePlus size={20} strokeWidth={1.5} />} label="Log" onClick={log} />
        <Action
          testId="tp-ingredient-detail-edit"
          icon={<Pencil size={18} strokeWidth={1.5} />}
          label="Edit"
          onClick={onEdit}
          note="Edits change future logs only. Past days and saved meals keep their numbers."
        />
        <Action
          testId="tp-ingredient-detail-fav"
          icon={<Star size={18} strokeWidth={1.5} className={ingredient.favourite ? 'fill-current' : ''} />}
          label="Favourite"
          pressed={ingredient.favourite}
          onClick={() => {
            vibrate(8)
            useStore.getState().toggleFavouriteIngredient(ingredient.id)
          }}
        />
        <Action testId="tp-ingredient-detail-delete" icon={<X size={18} strokeWidth={1.5} />} label="Delete" tone="ember" armed={del.armed} onClick={del.tap} />
      </ul>
    </div>
  )
}
