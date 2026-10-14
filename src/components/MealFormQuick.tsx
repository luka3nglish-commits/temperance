import { useMemo, type RefObject } from 'react'
import type { EnergyUnit, LogEntry, Meal } from '../lib/types'
import { unitLabel } from '../lib/units'
import { Stepper } from './ui'
import { DigitInput, NameInput, hintFor, saveToLibraryFor, type QuickDraft } from './MealForm'
import { MealFormHint } from './MealFormHint'
import { LogSuggestions } from '../screens/LogSuggestions'

type Props = {
  draft: QuickDraft
  onChange(next: QuickDraft): void
  unit: EnergyUnit
  meals: Record<string, Meal>
  /** recents the NAME field suggests from as he types */
  suggestFrom: readonly LogEntry[]
  /** a suggestion chip was tapped (the sheet fills the draft and remembers the meal) */
  onSuggestion(entry: LogEntry): void
  caloriesRef?: RefObject<HTMLInputElement | null>
  /** the form submits on Enter or Go when calories exist; the sheet owns the handler */
  formId: string
  onSubmit(): void
}

/**
 * QUICK: NAME, CALORIES beside PORTION, PROTEIN | CARBS | FAT, the macros hint with SAVE TO LIBRARY.
 * Strings stay as typed; the sheet converts on save.
 */
export function MealFormQuick({ draft, onChange, unit, meals, suggestFrom, onSuggestion, caloriesRef, formId, onSubmit }: Props) {
  const set = <K extends keyof QuickDraft>(k: K, v: QuickDraft[K]) => onChange({ ...draft, [k]: v })
  const hint = useMemo(() => hintFor(draft, unit), [draft, unit])
  const save = saveToLibraryFor(draft, meals)

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
        <NameInput
          label="Name"
          placeholder="Meal"
          value={draft.name}
          maxLength={80}
          onChange={(e) => set('name', e.target.value)}
        />
        <LogSuggestions query={draft.name} entries={suggestFrom} unit={unit} onPick={onSuggestion} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <DigitInput
          ref={caloriesRef}
          className="col-span-2"
          label="Calories"
          suffix={unitLabel(unit)}
          placeholder="0"
          value={draft.energy}
          onChange={(v) => set('energy', v)}
          aria-required="true"
        />
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-display text-[10px] tracking-[0.35em] text-bone-dim">Portion</span>
          </div>
          <Stepper value={draft.servings} onChange={(v) => set('servings', v)} min={0.5} max={4} step={0.5} label="Portion" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <DigitInput label="Protein" suffix="g" placeholder="0" value={draft.protein} onChange={(v) => set('protein', v)} />
        <DigitInput label="Carbs" suffix="g" placeholder="0" value={draft.carbs} onChange={(v) => set('carbs', v)} />
        <DigitInput label="Fat" suffix="g" placeholder="0" value={draft.fat} onChange={(v) => set('fat', v)} />
      </div>

      <MealFormHint hint={hint.text} differs={hint.differs} saveToLibrary={save} onSaveToLibrary={(on) => set('saveOverride', on)} />
    </form>
  )
}
