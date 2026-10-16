/**
 * Shared pieces of the meal forms (QUICK and BUILD). The LOG sheet uses them now; the library
 * can reuse them for its add and edit forms later. Everything that is not a component here is
 * pure and unit-tested in MealForm.test.ts.
 */
import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import type { AmountUnit, EnergyUnit, Ingredient, LogEntry, Macros, Meal, MealComponent, Portion } from '../lib/types'
import { cleanAmount, portionLabel } from '../lib/portion'
import { formatEnergy, fromInputEnergy, parseNumber, toDisplayEnergy, unitLabel } from '../lib/units'
import { kcalFromMacros, makeComponent, roundMacros, scaleMacros, sumMacros } from '../lib/macros'
import { isReducedMotion, vibrate } from '../lib/motion'
import { Field, Input, decimalInputProps, type FieldSize } from './ui'

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

/** The basis the QUICK numbers are counted on: one serve, or per 100 g / per 100 ml as printed on a label. */
export type Basis = AmountUnit

/** The label amount a g or ml basis is counted on. */
export const LABEL_AMOUNT = 100

/** What switching to a basis resets the amount to: 1 serve, 100 g, 250 ml. */
export const BASIS_DEFAULT: Record<Basis, number> = { serve: 1, g: 100, ml: 250 }

/** Where the numbers in a QUICK draft came from, so an untouched draft can log the library meal itself. */
export type DraftSource = {
  mealId: string
  name: string
  /** the label numbers as filled in (per serve, or per 100 g / ml) */
  macros: Macros
  /** the basis the meal counts on, as the draft shows it */
  basis: Basis
  /** the meal's usual amount in `basis` units, when it has one */
  usual?: number
}

/** The QUICK form as typed. Strings stay strings until save so a half-typed `12.` never fights the user. */
export type QuickDraft = {
  name: string
  /** typed in the display unit (kcal or kJ); per serve, or per 100 g / ml */
  energy: string
  /** what the numbers are counted on */
  basis: Basis
  /** what was eaten: servings for 'serve', grams for 'g', millilitres for 'ml' */
  amount: number
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
  basis: 'serve',
  amount: 1,
  protein: '',
  carbs: '',
  fat: '',
  source: null,
  saveOverride: null,
}

/** An amount made safe for a basis (positive, finite, never snapped to a step grid), else the basis default. */
export function amountFor(basis: Basis, amount: number | undefined): number {
  return (typeof amount === 'number' ? cleanAmount(amount, basis) : null) ?? BASIS_DEFAULT[basis]
}

/**
 * A draft filled from label numbers (a prefill, a suggestion chip, a long-pressed recent). `macros`
 * are per serve, or per 100 g / ml when `basis` is g or ml. `amount` is what was eaten in that basis.
 */
export function draftFrom(
  input: { name?: string; macros?: Macros; basis?: Basis; amount?: number; mealId?: string; usual?: number },
  unit: EnergyUnit,
): QuickDraft {
  const m = input.macros
  const basis = input.basis ?? 'serve'
  const usual = typeof input.usual === 'number' && input.usual > 0 ? input.usual : undefined
  return {
    name: input.name ?? '',
    energy: m ? energyString(m.kcal, unit) : '',
    basis,
    amount: amountFor(basis, input.amount),
    protein: m ? gramString(m.protein) : '',
    carbs: m ? gramString(m.carbs) : '',
    fat: m ? gramString(m.fat) : '',
    source: input.mealId && m ? { mealId: input.mealId, name: input.name ?? '', macros: m, basis, ...(usual ? { usual } : {}) } : null,
    saveOverride: null,
  }
}

/** Label numbers, basis and amount for a library meal: per serve, or rescaled to per 100 g / ml from any `per`. */
export function mealLabel(meal: Pick<Meal, 'macros' | 'per' | 'usual'>): { macros: Macros; basis: Basis; amount: number; usual?: number } {
  const per = meal.per
  const usual = typeof meal.usual === 'number' && meal.usual > 0 ? meal.usual : undefined
  if (!per || per.unit === 'serve') {
    const n = per && per.amount > 0 ? per.amount : 1
    return { macros: roundMacros(scaleMacros(meal.macros, 1 / n)), basis: 'serve', amount: amountFor('serve', usual ?? n), usual }
  }
  const base = per.amount > 0 ? per.amount : LABEL_AMOUNT
  return {
    macros: roundMacros(scaleMacros(meal.macros, LABEL_AMOUNT / base)),
    basis: per.unit,
    amount: amountFor(per.unit, usual ?? per.amount),
    usual,
  }
}

/**
 * Label numbers, basis and amount for a logged entry: a gram or millilitre portion reads back as per
 * 100 g / ml and the grams eaten; anything else as per serve and the servings eaten (1.3 stays 1.3).
 */
export function entryLabel(e: Pick<LogEntry, 'macros' | 'servings' | 'portion'>): { macros: Macros; basis: Basis; amount: number } {
  const p = e.portion
  if (p && p.amount > 0) {
    const factor = p.unit === 'serve' ? 1 / p.amount : LABEL_AMOUNT / p.amount
    return { macros: roundMacros(scaleMacros(e.macros, factor)), basis: p.unit, amount: amountFor(p.unit, p.amount) }
  }
  const n = e.servings > 0 ? e.servings : 1
  return { macros: roundMacros(scaleMacros(e.macros, 1 / n)), basis: 'serve', amount: amountFor('serve', n) }
}

/**
 * Switch the basis. The typed numbers are label numbers and never convert; the amount resets: serve
 * to 1, g to 100, ml to 250, or to the source meal's usual amount when its basis is the one chosen.
 */
export function switchBasis(d: QuickDraft, basis: Basis): QuickDraft {
  if (basis === d.basis) return d
  const usual = d.source && d.source.basis === basis ? d.source.usual : undefined
  return { ...d, basis, amount: amountFor(basis, usual) }
}

/** The multiplier an amount puts on the label numbers: servings as is, grams and millilitres over 100. */
export function basisFactor(basis: Basis, amount: number): number {
  return basis === 'serve' ? amount : amount / LABEL_AMOUNT
}

/** `Per serve`, `Per 100 g`, `Per 100 ml` (uppercased by CSS where it is a label). */
export function basisTag(basis: Basis): string {
  return basis === 'serve' ? 'Per serve' : `Per ${LABEL_AMOUNT} ${basis}`
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

/** The label numbers a QUICK draft holds (per serve, or per 100 g / ml), or null while calories are missing. */
export function draftMacros(d: Pick<QuickDraft, 'energy' | 'protein' | 'carbs' | 'fat'>, unit: EnergyUnit): Macros | null {
  const kcal = draftKcal(d, unit)
  if (kcal === null) return null
  return roundMacros({ kcal, protein: grams(d.protein), carbs: grams(d.carbs), fat: grams(d.fat) })
}

/**
 * What LOG would add right now: the label numbers times the amount (serve: x amount; g or ml: x
 * amount / 100). `amount` overrides the draft's while the portion is being typed. Null while
 * calories are missing.
 */
export function quickResult(d: QuickDraft, unit: EnergyUnit, amount?: number | null): Macros | null {
  const m = draftMacros(d, unit)
  if (!m) return null
  const a = typeof amount === 'number' && amount > 0 ? amount : d.amount
  return roundMacros(scaleMacros(m, basisFactor(d.basis, a)))
}

/** The store call a QUICK draft makes: the library meal itself when untouched, else typed numbers. */
export type QuickSubmission = {
  /** log the source meal with this portion (falls back to `quick` when the store refuses it) */
  meal?: { id: string; portion: number | Portion }
  quick: { name: string; macros: Macros; servings?: number; per?: Portion; amount?: number; saveToLibrary: boolean }
}

/**
 * The submit for a QUICK draft (polish-spec 6.2). Per serve: `servings` is the amount typed (1.3 stays
 * 1.3). Per 100 g or ml: `per` is the label basis and `amount` the grams or millilitres eaten. A draft
 * still holding exactly what a library meal filled in, on the meal's own basis, logs that meal.
 */
export function quickSubmission(d: QuickDraft, unit: EnergyUnit, meals: Record<string, Meal>): QuickSubmission | null {
  const macros = draftMacros(d, unit)
  if (!macros) return null
  const amount = amountFor(d.basis, d.amount)
  const quick: QuickSubmission['quick'] =
    d.basis === 'serve'
      ? { name: d.name, macros, servings: amount, saveToLibrary: saveToLibraryFor(d, meals) }
      : { name: d.name, macros, per: { amount: LABEL_AMOUNT, unit: d.basis }, amount, saveToLibrary: saveToLibraryFor(d, meals) }
  const src = d.source
  const meal = src ? meals[src.mealId] : undefined
  // a per-N-serves meal counts bases, not serves: only a plain serve or g / ml basis maps one to one
  const mapsOneToOne = !!meal && (!meal.per || meal.per.unit !== 'serve')
  if (src && meal && mapsOneToOne && src.basis === d.basis && (meal.per?.unit ?? 'serve') === d.basis && draftUntouched(d, unit)) {
    return { meal: { id: src.mealId, portion: d.basis === 'serve' ? amount : { amount, unit: d.basis } }, quick }
  }
  return { quick }
}

/** True when the LOG button may fire: calories alone are enough. */
export function canLogDraft(d: QuickDraft, unit: EnergyUnit): boolean {
  return draftKcal(d, unit) !== null
}

export type HintState = {
  /** `Macros add to 526 kcal.` while they differ, else empty */
  text: string
  /** typed calories differ from the 4/4/9 sum by more than 8 percent */
  differs: boolean
}

/**
 * The one quiet hint under the portion (polish-spec 6.2). Never blocks and only speaks when the typed
 * calories differ from the 4/4/9 sum by more than 8 percent; both are label numbers, so the basis
 * does not matter. An empty form never nags.
 */
export function hintFor(d: Pick<QuickDraft, 'energy' | 'protein' | 'carbs' | 'fat'>, unit: EnergyUnit): HintState {
  const sum = kcalFromMacros({ protein: grams(d.protein), carbs: grams(d.carbs), fat: grams(d.fat) })
  const typed = draftKcal(d, unit)
  const differs = typed !== null && typed > 0 && sum > 0 && Math.abs(typed - sum) > 0.08 * typed
  return { text: differs ? `Macros add to ${energyLine(sum, unit)}.` : '', differs }
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
 * True when the draft still holds exactly what its source filled in (name, basis and the four
 * numbers). The amount is not part of it: it is the `logMeal` argument.
 */
export function draftUntouched(d: QuickDraft, unit: EnergyUnit): boolean {
  const s = d.source
  if (!s) return false
  if (s.basis !== d.basis) return false
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

const sameMacros = (a: Macros, b: Macros) =>
  Math.abs(a.kcal - b.kcal) < 0.6 && Math.abs(a.protein - b.protein) < 0.06 && Math.abs(a.carbs - b.carbs) < 0.06 && Math.abs(a.fat - b.fat) < 0.06

/** The meal a logged entry still points at, only when the library copy matches the snapshot per basis. */
export function liveMealFor(entry: LogEntry, meals: Record<string, Meal>): Meal | undefined {
  if (!entry.mealId) return undefined
  const m = meals[entry.mealId]
  if (!m) return undefined
  return sameMacros(m.macros, perServingMacros(entry)) ? m : undefined
}

/**
 * A QUICK draft from a logged entry (a suggestion chip, a long-pressed recent): its basis and the
 * amount eaten come through (180 g stays 180 g, 1.3 serves stays 1.3). When the library meal still
 * matches, the draft remembers it, so an untouched LOG logs the meal itself.
 */
export function draftForEntry(e: LogEntry, meals: Record<string, Meal>, unit: EnergyUnit): QuickDraft {
  const own = entryLabel(e)
  const live = liveMealFor(e, meals)
  if (live) {
    const lab = mealLabel(live)
    if (lab.basis === own.basis) return draftFrom({ name: e.name, macros: lab.macros, basis: lab.basis, amount: own.amount, mealId: live.id, usual: lab.usual }, unit)
  }
  return draftFrom({ name: e.name, macros: own.macros, basis: own.basis, amount: own.amount }, unit)
}

/** A QUICK draft from a library meal: its basis (Meal.per) and its usual amount (Meal.usual). */
export function draftForMeal(meal: Meal, unit: EnergyUnit, servings?: number): QuickDraft {
  const lab = mealLabel(meal)
  // a prefill's servings count bases: 2 of a per-100 g meal is 200 g
  const per = meal.per && meal.per.unit !== 'serve' ? meal.per.amount : 1
  const amount = typeof servings === 'number' && servings > 0 ? servings * per : lab.amount
  return draftFrom({ name: meal.name, macros: lab.macros, basis: lab.basis, amount, mealId: meal.id, usual: lab.usual }, unit)
}

/** The toast after a log:`Logged · 180 g · 175 kcal`, or `Logged · 612 kcal` for exactly one serve. */
export function loggedToastText(entry: Pick<LogEntry, 'macros' | 'servings' | 'portion'>, unit: EnergyUnit): string {
  const label = portionLabel(entry)
  return `Logged${DOT}${label ? `${label}${DOT}` : ''}${energyLine(entry.macros.kcal, unit)}`
}

// ---------------------------------------------------------------------------
// DigitInput and NameInput: the carved fields of the meal forms
// ---------------------------------------------------------------------------

type DigitInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string
  onChange(value: string): void
  suffix?: ReactNode
  label?: string
  labelRight?: ReactNode
  /** draw the label inside the field (the 56 px macro thirds) */
  labelInside?: boolean
  /** sm 44, md 56 (default), lg 64 with a 28 px value (CALORIES) */
  fieldSize?: FieldSize
}

/** Right padding that leaves room for the unit: 36 px for `g` and `ml`, 56 px for `kcal`, `kJ` and `serve`. */
export function suffixPadding(suffix: ReactNode): number {
  if (suffix === undefined || suffix === null || suffix === '') return 16
  return typeof suffix === 'string' && suffix.length <= 2 ? 36 : 56
}

/**
 * Decimal input on the phone keypad, carved (`.tablet-inset`), Cormorant 600 `.num` bone, the unit
 * inside at the right. Only digits and one decimal mark get through; a typed digit buzzes 8 ms.
 */
export const DigitInput = forwardRef<HTMLInputElement, DigitInputProps>(function DigitInput(
  { value, onChange, suffix, label, labelRight, labelInside, fieldSize, className = '', style, ...rest },
  ref,
) {
  const prevLen = useRef(value.length)
  useEffect(() => {
    // exactly one new character: a typed digit, not a prefill
    if (value.length === prevLen.current + 1) vibrate(8)
    prevLen.current = value.length
  }, [value])

  const inputProps = {
    ...decimalInputProps,
    pattern: undefined,
    enterKeyHint: 'go' as const,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value.replace(/[^0-9.,]/g, '')),
    // inline padding beats the primitive's pr-14 so a short unit does not eat the thirds at 360 px
    style: { paddingRight: suffixPadding(suffix), ...style },
    suffix,
    fieldSize,
    ...rest,
  }

  if (label) return <Field ref={ref} label={label} labelRight={labelRight} labelInside={labelInside} className={className} {...inputProps} />
  return <Input ref={ref} className={className} {...inputProps} />
})

/** A 56 px carved text field for names: Cormorant 600 22 px, no number styling. */
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

/** Counts a number to its new value over `ms` (rAF, ease-out); instant under reduced motion or on first paint. */
export function useCountTo(target: number, ms = 380): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  const raf = useRef(0)
  useEffect(() => {
    cancelAnimationFrame(raf.current)
    const start = from.current
    if (start === target || isReducedMotion() || typeof requestAnimationFrame !== 'function') {
      from.current = target
      setShown(target)
      return
    }
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      const v = start + (target - start) * eased
      from.current = v
      setShown(v)
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else from.current = target
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, ms])
  return shown
}
