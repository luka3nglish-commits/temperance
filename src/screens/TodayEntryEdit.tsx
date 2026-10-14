/**
 * Edit one logged snapshot (TODAY sheet, spec section 10): name, portion, calories, macros.
 * The fields always show the totals that will be saved: moving the portion stepper rescales the
 * untouched numbers live, and a typed number wins. Saving calls updateEntry with name, servings and
 * macros together (the store scales by servings first, then the typed macros override).
 */
import { useId, useState, type FormEvent } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button, Field, Stepper, decimalInputProps } from '../components/ui'
import type { EnergyUnit, LogEntry, Macros } from '../lib/types'
import { fromInputEnergy, parseNumber, toDisplayEnergy, unitLabel } from '../lib/units'
import { formatTime } from '../lib/day'

export type EntryPatch = { name: string; servings: number; macros: Macros }

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

/** Builds the patch from the typed strings; null when calories are missing. */
export function buildEntryPatch(input: { name: string; servings: number; kcal: string; protein: string; carbs: string; fat: string }, unit: EnergyUnit): EntryPatch | null {
  const kcalIn = parseNumber(input.kcal)
  if (kcalIn === null) return null
  const g = (s: string) => parseNumber(s) ?? 0
  return {
    name: input.name,
    servings: input.servings,
    macros: {
      kcal: Math.round(fromInputEnergy(kcalIn, unit)),
      protein: g(input.protein),
      carbs: g(input.carbs),
      fat: g(input.fat),
    },
  }
}

export function TodayEntryEdit({ entry, unit, formId, onSave, onBack }: Props) {
  const [name, setName] = useState(entry.name)
  const [servings, setServings] = useState(entry.servings)
  const [kcal, setKcal] = useState(() => fmt(toDisplayEnergy(entry.macros.kcal, unit)))
  const [protein, setProtein] = useState(() => fmt(entry.macros.protein))
  const [carbs, setCarbs] = useState(() => fmt(entry.macros.carbs))
  const [fat, setFat] = useState(() => fmt(entry.macros.fat))
  const [touched, setTouched] = useState(false)
  const nameId = useId()

  const onPortion = (n: number) => {
    setServings(n)
    if (touched || entry.servings <= 0) return
    const k = n / entry.servings
    setKcal(fmt(toDisplayEnergy(entry.macros.kcal * k, unit)))
    setProtein(fmt(entry.macros.protein * k))
    setCarbs(fmt(entry.macros.carbs * k))
    setFat(fmt(entry.macros.fat * k))
  }

  const patch = buildEntryPatch({ name, servings, kcal, protein, carbs, fat }, unit)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (patch) onSave(patch)
  }

  const touch = (set: (v: string) => void) => (v: string) => {
    setTouched(true)
    set(v)
  }

  return (
    <form id={formId} onSubmit={submit} className="flex flex-col gap-3 pt-1">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" icon={<ChevronLeft size={16} strokeWidth={1.5} />} onClick={onBack} className="-ml-3">
          Back
        </Button>
        <span className="num font-body text-[15px] text-bone-dim">{formatTime(entry.at)}</span>
      </div>
      <Field id={nameId} label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal" autoComplete="off" maxLength={80} />
      <div className="grid grid-cols-3 gap-3">
        <Field
          className="col-span-2"
          label="Calories"
          suffix={unitLabel(unit)}
          value={kcal}
          onChange={(e) => touch(setKcal)(e.target.value)}
          invalid={patch === null}
          enterKeyHint="done"
          {...decimalInputProps}
        />
        <div>
          <div className="mb-1.5 flex items-baseline">
            <span className="font-display text-[10px] tracking-[0.35em] text-bone-dim">Portion</span>
          </div>
          <Stepper value={servings} onChange={onPortion} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Protein" suffix="g" value={protein} onChange={(e) => touch(setProtein)(e.target.value)} {...decimalInputProps} />
        <Field label="Carbs" suffix="g" value={carbs} onChange={(e) => touch(setCarbs)(e.target.value)} {...decimalInputProps} />
        <Field label="Fat" suffix="g" value={fat} onChange={(e) => touch(setFat)(e.target.value)} enterKeyHint="done" {...decimalInputProps} />
      </div>
    </form>
  )
}
