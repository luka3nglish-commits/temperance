/**
 * Shared pieces of the meal forms (QUICK and BUILD). The LOG sheet uses them now; the library
 * can reuse them for its add and edit forms later. Everything that is not a component here is
 * pure and unit-tested in MealForm.test.ts.
 */
import { forwardRef, useEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react'
import type { EnergyUnit, Ingredient, LogEntry, Macros, Meal, MealComponent } from '../lib/types'
import { formatEnergy, fromInputEnergy, parseNumber, toDisplayEnergy, unitLabel } from '../lib/units'
import { kcalFromMacros, makeComponent, roundMacros, scaleMacros, sumMacros } from '../lib/macros'
import { isReducedMotion, vibrate } from '../lib/motion'
import { Field, Input } from './ui'

export { MealFormQuick } from './MealFormQuick'
export { MealFormBuild } from './MealFormBuild'
export { MealFormHint } from './MealFormHint'

/** Thin space (U+2009): the gap before a unit and the thousands separator. */
export const THIN = ' '
/** Middle dot with spaces: the only separator inside a line of copy. */
export const DOT = ' · '

/** `612 kcal` or `2 561 kJ` in the display unit, thin space before the unit. Always a magnitude: never a minus sign on energy. */
export function energyLine(kcal: number, unit: EnergyUnit): string {
  return `${formatEnergy(Math.abs(kcal), unit)}${THIN}${unitLabel(unit)}`
}

/** `P 32 · C 48 · F 12`, grams rounded. */
export function macroLine(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): string {
  return `P ${Math.round(m.protein)}${DOT}C ${Math.round(m.carbs)}${DOT}F ${Math.round(m.fat)}`
}

/** Grams for an input field: one decimal only where the value has one. */
export function gramString(g: number): string {
  if (!Number.isFinite(g) || g === 0) return ''
  return String(Math.round(g * 10) / 10)
}

/** The energy field string for a stored kcal value in the display unit. */
export function energyString(kcal: number, unit: EnergyUnit): string {
  if (!Number.isFinite(kcal) || kcal === 0) return ''
  return String(Math.round(toDisplayEnergy(kcal, unit)))
}

/** Where the numbers in a QUICK draft came from, so an untouched draft can log the library meal itself. */
export type DraftSource = { mealId: string; name: string; macros: Macros }

/** The QUICK form as typed. Strings stay strings until save so a half-typed `12.` never fights the user. */
export type QuickDraft = {
  name: string
  /** typed in the display unit (kcal or kJ) */
  energy: string
  servings: number
  protein: string
  carbs: string
  fat: string
  /** set when a suggestion chip or a prefill filled the numbers */
  source: DraftSource | null
  /** user's explicit SAVE TO LIBRARY choice; null = the default rule */
  saveOverride: boolean | null
}

export const EMPTY_DRAFT: QuickDraft = {
  name: '',
  energy: '',
  servings: 1,
  protein: '',
  carbs: '',
  fat: '',
  source: null,
  saveOverride: null,
}

export function clampServings(n: number): number {
  const v = Number.isFinite(n) ? Math.round(n * 2) / 2 : 1
  return Math.min(4, Math.max(0.5, v))
}

/** A draft filled from numbers (a prefill, a suggestion chip, a long-pressed recent). */
export function draftFrom(input: { name?: string; macros?: Macros; servings?: number; mealId?: string }, unit: EnergyUnit): QuickDraft {
  const m = input.macros
  return {
    name: input.name ?? '',
    energy: m ? energyString(m.kcal, unit) : '',
    servings: clampServings(input.servings ?? 1),
    protein: m ? gramString(m.protein) : '',
    carbs: m ? gramString(m.carbs) : '',
    fat: m ? gramString(m.fat) : '',
    source: input.mealId && m ? { mealId: input.mealId, name: input.name ?? '', macros: m } : null,
    saveOverride: null,
  }
}

/** Per-serving macros of a logged entry (the snapshot divided by its servings). */
export function perServingMacros(e: LogEntry): Macros {
  const n = e.servings > 0 ? e.servings : 1
  return roundMacros(scaleMacros(e.macros, 1 / n))
}

/** Per-serving components of a logged entry, so a re-log keeps its build. */
export function perServingComponents(e: LogEntry): MealComponent[] | undefined {
  if (!e.components?.length) return undefined
  const n = e.servings > 0 ? e.servings : 1
  return e.components.map((c) => ({ ...c, amount: Math.round((c.amount / n) * 100) / 100, macros: roundMacros(scaleMacros(c.macros, 1 / n)) }))
}

const grams = (s: string) => parseNumber(s) ?? 0

/** Typed calories as stored kcal, or null when the field is empty or invalid. */
export function draftKcal(d: Pick<QuickDraft, 'energy'>, unit: EnergyUnit): number | null {
  const v = parseNumber(d.energy)
  if (v === null) return null
  return fromInputEnergy(v, unit)
}

/** The per-serving macros a QUICK draft would log, or null while calories are missing. */
export function draftMacros(d: QuickDraft, unit: EnergyUnit): Macros | null {
  const kcal = draftKcal(d, unit)
  if (kcal === null) return null
  return roundMacros({ kcal, protein: grams(d.protein), carbs: grams(d.carbs), fat: grams(d.fat) })
}

/** True when the LOG button may fire: calories alone are enough. */
export function canLogDraft(d: QuickDraft, unit: EnergyUnit): boolean {
  return draftKcal(d, unit) !== null
}

export type HintState = {
  /** `macros = 1 012 kcal` */
  text: string
  /** typed calories differ from the 4/4/9 sum by more than 8 percent */
  differs: boolean
}

/**
 * The one quiet hint under the macros. Never blocks. `differs` only fires when both a calorie
 * value and some macros exist, so an empty form never nags.
 */
export function hintFor(d: Pick<QuickDraft, 'energy' | 'protein' | 'carbs' | 'fat'>, unit: EnergyUnit): HintState {
  const sum = kcalFromMacros({ protein: grams(d.protein), carbs: grams(d.carbs), fat: grams(d.fat) })
  const typed = draftKcal(d, unit)
  const differs = typed !== null && typed > 0 && sum > 0 && Math.abs(typed - sum) > 0.08 * typed
  return { text: `macros = ${energyLine(sum, unit)}`, differs }
}

/** Exact, case-insensitive name match against the library. */
export function findMealByName(meals: Record<string, Meal>, name: string): Meal | undefined {
  const q = name.trim().toLowerCase()
  if (!q) return undefined
  return Object.values(meals).find((m) => m.name.trim().toLowerCase() === q)
}

/**
 * SAVE TO LIBRARY default: on for a new, non-empty name; off when the name is empty or already
 * a library meal. An explicit toggle wins.
 */
export function saveToLibraryFor(d: Pick<QuickDraft, 'name' | 'saveOverride'>, meals: Record<string, Meal>): boolean {
  if (d.saveOverride !== null) return d.saveOverride
  const name = d.name.trim()
  if (!name) return false
  return !findMealByName(meals, name)
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol

/**
 * True when the draft still holds exactly what its source filled in (name and the four numbers).
 * Servings are not part of it: they are the `logMeal` argument.
 */
export function draftUntouched(d: QuickDraft, unit: EnergyUnit): boolean {
  const s = d.source
  if (!s) return false
  const m = draftMacros(d, unit)
  if (!m) return false
  if (d.name.trim().toLowerCase() !== s.name.trim().toLowerCase()) return false
  // kJ input rounds to a whole kJ, which is under 0.12 kcal; grams round to a tenth
  return near(m.kcal, s.macros.kcal, 0.6) && near(m.protein, s.macros.protein, 0.06) && near(m.carbs, s.macros.carbs, 0.06) && near(m.fat, s.macros.fat, 0.06)
}

/** One line in the BUILD form. The ingredient may have been deleted; the snapshot then carries the numbers. */
export type BuildRow = {
  key: string
  ingredientId: string
  name: string
  /** typed amount in `unit` */
  amount: string
  unit: MealComponent['unit']
  /** macros per `perAmount` of `unit` (from the ingredient, or from the snapshot when it is gone) */
  perMacros: Macros
  perAmount: number
  /** the ingredient no longer exists in the library */
  removed: boolean
}

let rowSeq = 0
const nextRowKey = () => `r${++rowSeq}`

export function rowFromIngredient(ing: Ingredient, amount?: number): BuildRow {
  return {
    key: nextRowKey(),
    ingredientId: ing.id,
    name: ing.name,
    amount: amount !== undefined ? String(amount) : String(ing.per.amount),
    unit: ing.per.unit,
    perMacros: ing.macros,
    perAmount: ing.per.amount > 0 ? ing.per.amount : 1,
    removed: false,
  }
}

/** A row for a saved component; uses the live ingredient when it still exists. */
export function rowFromComponent(c: MealComponent, ingredients: Record<string, Ingredient>): BuildRow {
  const ing = ingredients[c.ingredientId]
  if (ing) return rowFromIngredient(ing, c.amount)
  return {
    key: nextRowKey(),
    ingredientId: c.ingredientId,
    name: c.name,
    amount: String(c.amount),
    unit: c.unit,
    perMacros: c.macros,
    perAmount: c.amount > 0 ? c.amount : 1,
    removed: true,
  }
}

/** The component a row would save, computed the same way `makeComponent` does. */
export function componentFromRow(row: BuildRow, ingredients: Record<string, Ingredient>): MealComponent {
  const amount = parseNumber(row.amount) ?? 0
  const ing = ingredients[row.ingredientId]
  if (ing && !row.removed) return makeComponent(ing, amount)
  return {
    ingredientId: row.ingredientId,
    name: row.name,
    amount,
    unit: row.unit,
    macros: roundMacros(scaleMacros(row.perMacros, amount / row.perAmount)),
  }
}

export function buildTotals(rows: readonly BuildRow[], ingredients: Record<string, Ingredient>): Macros {
  return roundMacros(sumMacros(rows.map((r) => componentFromRow(r, ingredients).macros)))
}

// ---------------------------------------------------------------------------
// DigitInput: a number field whose typed digits land with a 120 ms clip wipe
// ---------------------------------------------------------------------------

type DigitInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string
  onChange(value: string): void
  suffix?: ReactNode
  label?: string
  labelRight?: ReactNode
  /** 56 px (default) or 48 px */
  compact?: boolean
}

const DIGIT_EASE = 'cubic-bezier(0.7, 0, 0.2, 1)'

/**
 * Decimal input on the phone keypad. The native text is transparent; a mirror draws the same
 * glyphs on top and the newest digit wipes in from the top of its cell (120 ms, --ease-cut) with
 * a short vibration. The caret and the placeholder stay native. Reduced motion: digits just appear.
 */
export const DigitInput = forwardRef<HTMLInputElement, DigitInputProps>(function DigitInput(
  { value, onChange, suffix, label, labelRight, compact, className = '', ...rest },
  ref,
) {
  const lastRef = useRef<HTMLSpanElement>(null)
  const prevLen = useRef(value.length)

  useEffect(() => {
    // exactly one new character: a typed digit, not a prefill
    const typed = value.length === prevLen.current + 1
    prevLen.current = value.length
    if (!typed) return
    vibrate(8)
    const el = lastRef.current
    if (!el || isReducedMotion() || typeof el.animate !== 'function') return
    const anim = el.animate([{ clipPath: 'inset(100% 0 0 0)', opacity: 0.6 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], {
      duration: 120,
      easing: DIGIT_EASE,
      fill: 'none',
    })
    return () => anim.cancel()
  }, [value])

  const chars = value.split('')
  const mirror = (
    <span
      aria-hidden="true"
      className={`num pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden whitespace-pre pl-4 font-body text-[20px] font-medium text-bone ${
        suffix ? 'right-14' : 'right-4'
      }`}
    >
      {chars.map((ch, i) => (
        <span key={i} ref={i === chars.length - 1 ? lastRef : undefined} className="inline-block">
          {ch}
        </span>
      ))}
    </span>
  )

  const inputProps = {
    type: 'text' as const,
    inputMode: 'decimal' as const,
    autoComplete: 'off',
    autoCorrect: 'off',
    spellCheck: false,
    enterKeyHint: 'go' as const,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.replace(/[^0-9.,]/g, '')),
    style: { color: 'transparent', caretColor: '#e7e1d2', ...(compact ? { height: 48 } : {}) },
    suffix,
    ...rest,
  }

  if (label) {
    return (
      <div className={`relative ${className}`}>
        <Field ref={ref} label={label} labelRight={labelRight} {...inputProps} />
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 ${compact ? 'h-12' : 'h-14'}`}>{mirror}</div>
      </div>
    )
  }
  return (
    <div className={`relative ${className}`}>
      <Input ref={ref} {...inputProps} />
      {mirror}
    </div>
  )
})

/** A 56 px text field for names: Cormorant 500 20 px, no number styling. */
export const NameInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; labelRight?: ReactNode }>(
  function NameInput({ label, labelRight, className = '', ...rest }, ref) {
    return (
      <Field
        ref={ref}
        label={label}
        labelRight={labelRight}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="sentences"
        enterKeyHint="go"
        className={className}
        {...rest}
      />
    )
  },
)
