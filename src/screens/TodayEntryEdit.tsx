/**
 * Edit one logged snapshot (TODAY sheet, polish-spec 6.1): name, portion, calories, macros.
 *
 *   ‹ BACK                                   3:20 pm      44
 *   NAME  [ Greek yoghurt                          ]      56
 *   PORTION                               was 180 g       label row (the right side only once changed)
 *   [ −  |        200 g         |  + ]                    64, PortionField
 *   [ 100 ][ 150 ][ ◆ 180 ][ 250 ]                        PortionPicks (the meal's usual marked)
 *   CALORIES [                              175 kcal ]    64
 *   [ PROTEIN 16 g ][ CARBS 7 g ][ FAT 9 g ]              56, inner labels
 *
 * An entry with a recorded portion (LogEntry.portion, e.g. 180 g) edits in that unit and saves
 * `{ portion }`; any other entry edits servings with any typed amount and saves `{ servings }`. The
 * fields always show the totals that will be saved: changing the portion (stepping, a pick, or each
 * keystroke while typing) rescales the untouched numbers by newAmount / oldAmount, and a typed number
 * wins from then on (each field on its own: the untyped ones keep following the portion). With nothing
 * typed the patch carries no macros, so the store rescales the exact snapshot by the portion (no
 * rounding drift, no stray strike); once a number is typed all four are sent and override the rescale.
 */
import { useId, useState, type FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button, Field, PortionField, PortionPicks, decimalInputProps } from '../components/ui'
import type { AmountUnit, EnergyUnit, LogEntry, Macros, Portion } from '../lib/types'
import { fromInputEnergy, parseNumber, toDisplayEnergy, unitLabel } from '../lib/units'
import { formatAmount } from '../lib/portion'
import { formatTime } from '../lib/day'
import { useStore } from '../store/useStore'

export type EntryPatch = { name: string; macros?: Macros; servings?: number; portion?: Portion }

type Props = {
  entry: LogEntry
  unit: EnergyUnit
  /** id for the <form>, so a Sheet footer button can submit it */
  formId: string
  onSave(patch: EntryPatch): void
  onBack(): void
}

const fmt = (n: number) => {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** The amount and unit the portion control edits: the recorded portion, else servings. */
export function entryPortion(entry: Pick<LogEntry, 'portion' | 'servings'>): { amount: number; unit: AmountUnit; recorded: boolean } {
  if (entry.portion) return { amount: entry.portion.amount, unit: entry.portion.unit, recorded: true }
  return { amount: entry.servings, unit: 'serve', recorded: false }
}

type PatchInput = {
  name: string
  /** the amount in the portion control */
  amount: number
  /** the recorded portion's unit when the entry has one (saves `portion`), else absent (saves `servings`) */
  portionUnit?: AmountUnit
  kcal: string
  protein: string
  carbs: string
  fat: string
  /** a number field was typed: send the macros; else leave them to the store's portion rescale */
  typedAny: boolean
}

/** Builds the patch from the typed strings; null when calories are missing. */
export function buildEntryPatch(input: PatchInput, unit: EnergyUnit): EntryPatch | null {
  const kcalIn = parseNumber(input.kcal)
  if (kcalIn === null) return null
  const g = (s: string) => parseNumber(s) ?? 0
  const macros = {
    kcal: Math.round(fromInputEnergy(kcalIn, unit)),
    protein: g(input.protein),
    carbs: g(input.carbs),
    fat: g(input.fat),
  }
  const typed = input.typedAny ? { macros } : {}
  if (input.portionUnit) return { name: input.name, portion: { amount: input.amount, unit: input.portionUnit }, ...typed }
  return { name: input.name, servings: input.amount, ...typed }
}

type Numbers = { kcal: string; protein: string; carbs: string; fat: string }

export function TodayEntryEdit({ entry, unit, formId, onSave, onBack }: Props) {
  const start = entryPortion(entry)
  const meal = useStore((s) => (entry.mealId ? s.meals[entry.mealId] : undefined))
  const usual = meal && (meal.per?.unit ?? 'serve') === start.unit ? meal.usual : undefined

  const [name, setName] = useState(entry.name)
  const [amount, setAmount] = useState(start.amount)
  const [preview, setPreview] = useState<number | null>(null)
  const [typed, setTyped] = useState<Partial<Numbers>>({})
  const nameId = useId()

  // untouched numbers follow the portion (live while typing it)
  const k = start.amount > 0 ? (preview ?? amount) / start.amount : 1
  const derived: Numbers = {
    // energy is whole, as everywhere else (the row reads 175 kcal, so the field does too)
    kcal: String(Math.round(toDisplayEnergy(entry.macros.kcal * k, unit))),
    protein: fmt(entry.macros.protein * k),
    carbs: fmt(entry.macros.carbs * k),
    fat: fmt(entry.macros.fat * k),
  }
  const nums: Numbers = { ...derived, ...typed }
  const type = (key: keyof Numbers) => (v: string) => setTyped((t) => ({ ...t, [key]: v }))

  const patch = buildEntryPatch(
    { name, amount, portionUnit: start.recorded ? start.unit : undefined, ...nums, typedAny: Object.keys(typed).length > 0 },
    unit,
  )
  const changed = Math.abs(amount - start.amount) > 1e-9

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (patch) onSave(patch)
  }

  return (
    <form id={formId} onSubmit={submit} className="flex flex-col pt-1" data-testid="tp-today-edit">
      <div className="flex h-11 items-center justify-between">
        <Button variant="ghost" size="sm" icon={<ChevronLeft size={18} strokeWidth={1.5} />} onClick={onBack} className="-ml-3">
          Back
        </Button>
        <span className="hint">{formatTime(entry.at)}</span>
      </div>

      <Field
        id={nameId}
        className="mt-3"
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Meal"
        autoComplete="off"
        maxLength={80}
        data-testid="tp-today-edit-name"
      />

      <div className="mt-4">
        <div className="mb-2 flex h-5 items-baseline justify-between">
          <span className="label">Portion</span>
          {changed ? (
            <span className="hint" data-testid="tp-today-edit-was">
              was {formatAmount(start.amount, start.unit)}
            </span>
          ) : null}
        </div>
        <PortionField
          testId="tp-today-edit-portion"
          unit={start.unit}
          value={amount}
          onChange={(v) => {
            setAmount(v)
            setPreview(null)
          }}
          onPreview={setPreview}
        />
        <PortionPicks
          testId="tp-today-edit-portion"
          className="mt-2"
          unit={start.unit}
          value={amount}
          usual={usual}
          onChange={(v) => {
            setAmount(v)
            setPreview(null)
          }}
        />
      </div>

      <Field
        className="mt-4"
        label="Calories"
        fieldSize="lg"
        suffix={unitLabel(unit)}
        value={nums.kcal}
        onChange={(e) => type('kcal')(e.target.value)}
        invalid={patch === null}
        enterKeyHint="done"
        data-testid="tp-today-edit-kcal"
        {...decimalInputProps}
      />
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Field label="Protein" labelInside suffix="g" value={nums.protein} onChange={(e) => type('protein')(e.target.value)} data-testid="tp-today-edit-protein" {...decimalInputProps} />
        <Field label="Carbs" labelInside suffix="g" value={nums.carbs} onChange={(e) => type('carbs')(e.target.value)} data-testid="tp-today-edit-carbs" {...decimalInputProps} />
        <Field
          label="Fat"
          labelInside
          suffix="g"
          value={nums.fat}
          onChange={(e) => type('fat')(e.target.value)}
          enterKeyHint="done"
          data-testid="tp-today-edit-fat"
          {...decimalInputProps}
        />
      </div>
    </form>
  )
}
