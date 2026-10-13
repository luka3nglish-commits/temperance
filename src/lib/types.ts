/**
 * Core data types for Temperance.
 *
 * Rules that every consumer must respect:
 * - Energy is ALWAYS stored in kcal. kJ is a display conversion only (see units.ts).
 * - A LogEntry is a SNAPSHOT. Editing or deleting a Meal/Ingredient never changes a past entry.
 * - Day keys are local calendar days, "YYYY-MM-DD" (see day.ts). Never UTC.
 */

export type Macros = {
  /** kilocalories */
  kcal: number
  /** grams */
  protein: number
  /** grams */
  carbs: number
  /** grams */
  fat: number
}

export type AmountUnit = 'g' | 'ml' | 'serve'

/** A reusable building block. Macros are per `per.amount` of `per.unit` (e.g. per 100 g). */
export type Ingredient = {
  id: string
  name: string
  per: { amount: number; unit: AmountUnit }
  macros: Macros
  favourite: boolean
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
  useCount: number
}

/** One ingredient inside a built meal, with its macros already scaled to `amount`. */
export type MealComponent = {
  ingredientId: string
  name: string
  amount: number
  unit: AmountUnit
  macros: Macros
}

export type MealKind = 'quick' | 'built'

/** A saved meal in the library. `macros` is the total for ONE serving. */
export type Meal = {
  id: string
  name: string
  kind: MealKind
  macros: Macros
  components?: MealComponent[]
  favourite: boolean
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
  useCount: number
}

/** A logged meal on a given local day. All numbers are snapshots scaled by `servings`. */
export type LogEntry = {
  id: string
  /** local day key YYYY-MM-DD */
  day: string
  /** epoch ms */
  at: number
  /** reference to the library meal, if it was logged from one (may no longer exist) */
  mealId?: string
  name: string
  servings: number
  macros: Macros
  components?: MealComponent[]
}

export type EnergyUnit = 'kcal' | 'kJ'

export type MacroTargets = { protein: number; carbs: number; fat: number }

export type Settings = {
  /** daily goal, stored in kcal */
  goalKcal: number
  /** daily macro targets in grams */
  targets: MacroTargets
  unit: EnergyUnit
  /** how many times the opening sequence has played */
  introCount: number
  /** 'system' follows prefers-reduced-motion; 'on' forces reduced; 'off' forces full motion */
  motion: 'system' | 'on' | 'off'
  /** display name, optional */
  name?: string
}

export const SCHEMA_VERSION = 1 as const

/** The on-disk / export shape. */
export type ExportFile = {
  app: 'temperance'
  version: typeof SCHEMA_VERSION
  exportedAt: number
  settings: Settings
  meals: Record<string, Meal>
  ingredients: Record<string, Ingredient>
  entries: LogEntry[]
}

export type ImportMode = 'replace' | 'merge'

export type ImportResult = { meals: number; ingredients: number; entries: number }
