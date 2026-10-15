import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { EnergyUnit, LogEntry, Meal } from '../lib/types'
import { formatInt, toDisplayEnergy, unitLabel } from '../lib/units'
import { isReducedMotion } from '../lib/motion'
import { PortionField, PortionPicks, Segmented, ValueUnit } from './ui'
import type { SegmentedOption } from './ui'
import {
  DigitInput,
  NameInput,
  basisTag,
  hintFor,
  quickResult,
  saveToLibraryFor,
  switchBasis,
  useCountTo,
  type Basis,
  type QuickDraft,
} from './MealForm'
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

/** The basis switch: source text as written (the tour clicks `per 100 g`), uppercased by the segment style. */
const BASES: readonly SegmentedOption<Basis>[] = [
  { value: 'serve', label: 'Per serve', testId: 'tp-log-basis-serve' },
  { value: 'g', label: 'Per 100 g', testId: 'tp-log-basis-g' },
  { value: 'ml', label: 'Per 100 ml', testId: 'tp-log-basis-ml' },
]

/**
 * QUICK (polish-spec 6.2): NAME; the basis switch (per serve, or per 100 g / ml as a label prints
 * it); CALORIES with the basis tag; PROTEIN | CARBS | FAT; a rule; PORTION with the live result on its
 * label row, the 64 px PortionField and four quick picks; the macro hint with SAVE TO LIBRARY.
 * Strings stay as typed; the sheet converts on save. The typed numbers are label numbers: switching
 * basis never converts them, it resets the amount.
 */
export function MealFormQuick({ draft, onChange, unit, meals, suggestFrom, onSuggestion, caloriesRef, formId, onSubmit }: Props) {
  const set = <K extends keyof QuickDraft>(k: K, v: QuickDraft[K]) => onChange({ ...draft, [k]: v })
  const hint = useMemo(() => hintFor(draft, unit), [draft, unit])
  const save = saveToLibraryFor(draft, meals)
  const formRef = useRef<HTMLFormElement>(null)
  const portionRef = useRef<HTMLDivElement>(null)
  // the amount being typed, before it commits: the result line follows every keystroke
  const [preview, setPreview] = useState<number | null>(null)
  const usual = draft.source && draft.source.basis === draft.basis ? draft.source.usual : undefined

  const scrollPortion = () => {
    const el = portionRef.current
    if (!el || typeof el.scrollIntoView !== 'function') return
    requestAnimationFrame(() => el.scrollIntoView({ block: 'end' }))
    // again once the keyboard has finished rising and the sheet has shrunk
    window.setTimeout(() => {
      if (el.contains(document.activeElement)) el.scrollIntoView({ block: 'end' })
    }, 320)
  }

  return (
    <form
      ref={formRef}
      id={formId}
      noValidate
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div>
        <NameInput
          data-testid="tp-log-name"
          label="Name"
          placeholder="Meal"
          value={draft.name}
          maxLength={80}
          onChange={(e) => set('name', e.target.value)}
        />
        <LogSuggestions query={draft.name} entries={suggestFrom} unit={unit} onPick={onSuggestion} />
      </div>

      <Segmented<Basis>
        className="mt-4"
        label="Counted"
        size="lg"
        testId="tp-log-basis"
        value={draft.basis}
        options={BASES}
        onChange={(b) => {
          setPreview(null)
          onChange(switchBasis(draft, b))
        }}
      />

      <DigitInput
        ref={caloriesRef}
        data-testid="tp-log-kcal"
        className="mt-4"
        label="Calories"
        labelRight={<BasisTag basis={draft.basis} />}
        fieldSize="lg"
        suffix={unitLabel(unit)}
        placeholder="0"
        value={draft.energy}
        onChange={(v) => set('energy', v)}
        aria-required="true"
      />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <DigitInput data-testid="tp-log-protein" label="Protein" labelInside suffix="g" placeholder="0" value={draft.protein} onChange={(v) => set('protein', v)} />
        <DigitInput data-testid="tp-log-carbs" label="Carbs" labelInside suffix="g" placeholder="0" value={draft.carbs} onChange={(v) => set('carbs', v)} />
        <DigitInput data-testid="tp-log-fat" label="Fat" labelInside suffix="g" placeholder="0" value={draft.fat} onChange={(v) => set('fat', v)} />
      </div>

      <div aria-hidden="true" className="mt-5 h-px bg-[var(--rule)]" />

      <div ref={portionRef} className="mt-4 scroll-mb-3">
        <div className="mb-2 flex h-5 items-center justify-between gap-3">
          <span className="label">Portion</span>
          <PortionResult draft={draft} unit={unit} preview={preview} />
        </div>
        <PortionField
          testId="tp-log-portion"
          label="Portion"
          unit={draft.basis}
          value={draft.amount}
          onChange={(v) => set('amount', v)}
          onPreview={setPreview}
          onFocus={scrollPortion}
          enterKeyHint="go"
          onEnter={() => {
            // let the committed amount render, then log with it
            window.setTimeout(() => {
              const f = formRef.current
              if (!f) return
              if (typeof f.requestSubmit === 'function') f.requestSubmit()
              else f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
            }, 0)
          }}
        />
        <PortionPicks
          className="mt-2"
          testId="tp-log-portion"
          unit={draft.basis}
          value={preview ?? draft.amount}
          usual={usual}
          onChange={(v) => {
            setPreview(null)
            set('amount', v)
          }}
        />
      </div>

      <MealFormHint className="mt-3" hint={hint.text} saveToLibrary={save} onSaveToLibrary={(on) => set('saveOverride', on)} />
    </form>
  )
}

/** `PER 100 G` on the CALORIES label row, gold-300; cross-fades 160 ms when the basis changes. */
function BasisTag({ basis }: { basis: Basis }) {
  const ref = useRef<HTMLSpanElement>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = ref.current
    if (!el || isReducedMotion() || typeof el.animate !== 'function') return
    const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'cubic-bezier(0.7, 0, 0.2, 1)' })
    return () => a.cancel()
  }, [basis])
  return (
    <span ref={ref} data-testid="tp-log-basis-tag" className="tracking-[0.08em] text-gold-300">
      {basisTag(basis)}
    </span>
  )
}

/**
 * The live result on the PORTION label row: what LOG will add, `302 kcal · P 16`. The figure in
 * Cinzel 700 16 px gold-300, the unit and protein in Cormorant 15 px bone-soft. Empty until the
 * calories parse; counts to a new value over 380 ms (instant under reduced motion) with a 300 ms gold
 * glow behind it.
 */
function PortionResult({ draft, unit, preview }: { draft: QuickDraft; unit: EnergyUnit; preview: number | null }) {
  const result = quickResult(draft, unit, preview)
  const target = result ? Math.round(toDisplayEnergy(result.kcal, unit)) : 0
  const counted = Math.round(useCountTo(target))
  const glow = useRef<HTMLSpanElement>(null)
  const last = useRef(target)
  useEffect(() => {
    if (last.current === target) return
    last.current = target
    const el = glow.current
    if (!el || !result || isReducedMotion() || typeof el.animate !== 'function') return
    const a = el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 300, easing: 'ease-out' })
    return () => a.cancel()
  }, [target, result])

  const protein = result ? Math.round(result.protein) : 0
  return (
    <span
      data-testid="tp-log-result"
      data-kcal={result ? Math.round(result.kcal) : undefined}
      aria-live="polite"
      className="relative flex min-w-0 items-baseline whitespace-nowrap"
    >
      <span ref={glow} aria-hidden="true" className="gold-glow pointer-events-none absolute -inset-x-5 -inset-y-3 opacity-0" />
      {result ? (
        <>
          <span className="sr-only">{`Logs ${formatInt(target)} ${unitLabel(unit)}${protein ? `, protein ${protein} grams` : ''}`}</span>
          <span aria-hidden="true" className="relative flex items-baseline">
            <ValueUnit value={formatInt(counted)} unit={unitLabel(unit)} tone="gold" />
            {protein ? <span className="hint num">{`${' '}·${' '}P ${protein}`}</span> : null}
          </span>
        </>
      ) : null}
    </span>
  )
}
