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
/** How much of something: `amount` of `unit` ('serve' counts servings). */
export type Portion = { amount: number; unit: AmountUnit }

export type Meal = {
  id: string
  name: string
  kind: MealKind
  macros: Macros
  components?: MealComponent[]
  /**
   * The basis `macros` are counted on. Absent: one serving. Set (e.g. { amount: 100, unit: 'g' }):
   * the numbers are per 100 g, as printed on a label, and logging it asks how many grams were eaten.
   */
  per?: Portion
  /** The amount usually eaten, in `per.unit` (or servings when `per` is absent). One-tap logs use it. */
  usual?: number
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
  /** multiplier on the meal's numbers (servings, or amount / per.amount for a per-100 g meal) */
  servings: number
  macros: Macros
  components?: MealComponent[]
  /** What was eaten, for display (e.g. 180 g). Absent: `servings` servings. */
  portion?: Portion
}

export type EnergyUnit = 'kcal' | 'kJ'

export type MacroTargets = { protein: number; carbs: number; fat: number }

export type MotionPref = 'system' | 'on' | 'off'
export type OpeningPref = 'short' | 'full' | 'off'
export type HeroFigure = 'remaining' | 'eaten'

export type Settings = {
  /** daily goal, stored in kcal */
  goalKcal: number
  /** daily macro targets in grams; 0 hides the ghost arcs */
  targets: MacroTargets
  unit: EnergyUnit
  /** how many times the full opening sequence has played */
  introCount: number
  /** 'system' follows prefers-reduced-motion; 'on' forces reduced; 'off' forces full motion */
  motion: MotionPref
  /** which opening plays on launch after the first */
  opening: OpeningPref
  /** the big number on the home screen */
  hero: HeroFigure
  /** gold follows device tilt (opt-in on iOS) */
  tilt: boolean
  /** `name|kcalPerServing` keys hidden from the recents list */
  hiddenRecents: string[]
  /** target body weight in kg, optional */
  targetWeightKg?: number
  /** display name, optional */
  name?: string
}

/** One weigh-in. At most one per local day (adding again that day replaces it). */
export type WeightEntry = {
  id: string
  /** local day key YYYY-MM-DD */
  day: string
  /** epoch ms */
  at: number
  /** kilograms, one decimal */
  kg: number
  note?: string
}

/**
 * v1 shipped without opening/hero/tilt/hiddenRecents. v2 added them with defaults.
 * v3 added weights and targetWeightKg. v4 adds Meal.per, Meal.usual and LogEntry.portion
 * (custom portion amounts, per-100 g meals); all optional, so older backups read unchanged.
 */
export const SCHEMA_VERSION = 4 as const

/** The on-disk / export shape. Progress photos are not part of it (they live in IndexedDB). */
export type ExportFile = {
  app: 'temperance'
  version: typeof SCHEMA_VERSION
  exportedAt: number
  settings: Settings
  meals: Record<string, Meal>
  ingredients: Record<string, Ingredient>
  entries: LogEntry[]
  weights: WeightEntry[]
}

export type ImportMode = 'replace' | 'merge'

export type ImportResult = { meals: number; ingredients: number; entries: number }
