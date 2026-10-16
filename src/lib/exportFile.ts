import type { ExportFile, Ingredient, LogEntry, Macros, Meal, MealComponent, Portion, Settings, WeightEntry } from './types'
import { SCHEMA_VERSION } from './types'
import { isValidDayKey } from './day'
import { cleanAmount } from './portion'

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const num = (x: unknown, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback)
const str = (x: unknown, fallback = '') => (typeof x === 'string' ? x : fallback)
const bool = (x: unknown) => x === true

function macros(x: unknown): Macros {
  const m = isObj(x) ? x : {}
  return { kcal: num(m.kcal), protein: num(m.protein), carbs: num(m.carbs), fat: num(m.fat) }
}

function component(x: unknown): MealComponent | null {
  if (!isObj(x)) return null
  const unit = x.unit === 'ml' || x.unit === 'serve' ? x.unit : 'g'
  return { ingredientId: str(x.ingredientId), name: (str(x.name).trim() || 'Ingredient'), amount: num(x.amount), unit, macros: macros(x.macros) }
}

function components(x: unknown): MealComponent[] | undefined {
  if (!Array.isArray(x)) return undefined
  const out = x.map(component).filter((c): c is MealComponent => c !== null)
  return out.length ? out : undefined
}

/** A { amount, unit } with a positive amount and a known unit, or undefined. */
function portionOf(x: unknown): Portion | undefined {
  if (!isObj(x)) return undefined
  const unit = x.unit === 'ml' || x.unit === 'serve' || x.unit === 'g' ? x.unit : null
  if (!unit) return undefined
  const amount = cleanAmount(num(x.amount), unit)
  return amount === null ? undefined : { amount, unit }
}

function meal(x: unknown): Meal | null {
  if (!isObj(x) || typeof x.id !== 'string' || !x.id) return null
  const comps = components(x.components)
  const per = comps ? undefined : portionOf(x.per)
  const usual = typeof x.usual === 'number' ? cleanAmount(x.usual, per ? per.unit : 'serve') : null
  return {
    id: x.id,
    name: (str(x.name).trim() || 'Meal'),
    kind: x.kind === 'built' || comps ? 'built' : 'quick',
    macros: macros(x.macros),
    components: comps,
    ...(per && !(per.unit === 'serve' && per.amount === 1) ? { per } : {}),
    ...(usual !== null ? { usual } : {}),
    favourite: bool(x.favourite),
    createdAt: num(x.createdAt),
    updatedAt: num(x.updatedAt),
    lastUsedAt: typeof x.lastUsedAt === 'number' ? x.lastUsedAt : undefined,
    useCount: num(x.useCount),
  }
}

function ingredient(x: unknown): Ingredient | null {
  if (!isObj(x) || typeof x.id !== 'string' || !x.id) return null
  const per = isObj(x.per) ? x.per : {}
  const unit = per.unit === 'ml' || per.unit === 'serve' ? per.unit : 'g'
  const amount = num(per.amount, 100)
  return {
    id: x.id,
    name: (str(x.name).trim() || 'Ingredient'),
    per: { amount: amount > 0 ? amount : 100, unit },
    macros: macros(x.macros),
    favourite: bool(x.favourite),
    createdAt: num(x.createdAt),
    updatedAt: num(x.updatedAt),
    lastUsedAt: typeof x.lastUsedAt === 'number' ? x.lastUsedAt : undefined,
    useCount: num(x.useCount),
  }
}

function entry(x: unknown): LogEntry | null {
  if (!isObj(x) || typeof x.id !== 'string' || !x.id) return null
  if (typeof x.day !== 'string' || !isValidDayKey(x.day)) return null
  const servings = num(x.servings, 1)
  const portion = portionOf(x.portion)
  return {
    id: x.id,
    day: x.day,
    at: num(x.at),
    mealId: typeof x.mealId === 'string' ? x.mealId : undefined,
    name: (str(x.name).trim() || 'Meal'),
    servings: servings > 0 ? servings : 1,
    macros: macros(x.macros),
    components: components(x.components),
    ...(portion ? { portion } : {}),
  }
}

function settings(x: unknown): Settings {
  const s = isObj(x) ? x : {}
  const t = isObj(s.targets) ? s.targets : {}
  const goal = num(s.goalKcal, 2500)
  const motion = s.motion === 'on' || s.motion === 'off' ? s.motion : 'system'
  const opening = s.opening === 'full' || s.opening === 'off' ? s.opening : 'short'
  const hero = s.hero === 'eaten' ? 'eaten' : 'remaining'
  const hiddenRecents = Array.isArray(s.hiddenRecents) ? s.hiddenRecents.filter((k): k is string => typeof k === 'string').slice(-200) : []
  const tw = num(s.targetWeightKg, 0)
  return {
    ...(tw > 0 && tw < 500 ? { targetWeightKg: Math.round(tw * 10) / 10 } : {}),
    goalKcal: goal > 0 ? Math.round(goal) : 2500,
    targets: { protein: Math.max(0, num(t.protein, 180)), carbs: Math.max(0, num(t.carbs, 250)), fat: Math.max(0, num(t.fat, 80)) },
    unit: s.unit === 'kJ' ? 'kJ' : 'kcal',
    introCount: Math.max(0, num(s.introCount)),
    motion,
    opening,
    hero,
    tilt: bool(s.tilt),
    hiddenRecents,
    name: typeof s.name === 'string' && s.name.trim() ? s.name.trim() : undefined,
  }
}

function weight(x: unknown): WeightEntry | null {
  if (!isObj(x) || typeof x.id !== 'string' || !x.id) return null
  if (typeof x.day !== 'string' || !isValidDayKey(x.day)) return null
  const kg = num(x.kg)
  if (kg <= 0 || kg >= 500) return null
  return {
    id: x.id,
    day: x.day,
    at: num(x.at),
    kg: Math.round(kg * 10) / 10,
    note: typeof x.note === 'string' && x.note.trim() ? x.note.trim().slice(0, 120) : undefined,
  }
}

/** Backups from any schema version we know how to read. */
const READABLE_VERSIONS: readonly number[] = [1, 2, 3, 4]

/**
 * Validate and sanitise an untrusted parsed JSON value into an ExportFile (current schema).
 * Returns null when it is clearly not a Temperance backup.
 */
export function validateExportFile(raw: unknown): ExportFile | null {
  if (!isObj(raw)) return null
  if (raw.app !== 'temperance') return null
  if (typeof raw.version !== 'number' || !READABLE_VERSIONS.includes(raw.version)) return null

  const meals: Record<string, Meal> = {}
  const mealsSrc = isObj(raw.meals) ? Object.values(raw.meals) : Array.isArray(raw.meals) ? raw.meals : []
  for (const m of mealsSrc) {
    const v = meal(m)
    if (v) meals[v.id] = v
  }

  const ingredients: Record<string, Ingredient> = {}
  const ingSrc = isObj(raw.ingredients) ? Object.values(raw.ingredients) : Array.isArray(raw.ingredients) ? raw.ingredients : []
  for (const g of ingSrc) {
    const v = ingredient(g)
    if (v) ingredients[v.id] = v
  }

  const entries: LogEntry[] = []
  const seen = new Set<string>()
  for (const e of Array.isArray(raw.entries) ? raw.entries : []) {
    const v = entry(e)
    if (v && !seen.has(v.id)) {
      seen.add(v.id)
      entries.push(v)
    }
  }
  entries.sort((a, b) => a.at - b.at)

  // weights: one per day, the newest `at` wins, sorted by day
  const weightByDay = new Map<string, WeightEntry>()
  for (const w of Array.isArray(raw.weights) ? raw.weights : []) {
    const v = weight(w)
    if (!v) continue
    const cur = weightByDay.get(v.day)
    if (!cur || v.at > cur.at) weightByDay.set(v.day, v)
  }
  const weights = [...weightByDay.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))

  return {
    app: 'temperance',
    version: SCHEMA_VERSION,
    exportedAt: num(raw.exportedAt),
    settings: settings(raw.settings),
    meals,
    ingredients,
    entries,
    weights,
  }
}

/** Suggested file name for a backup, e.g. temperance-2026-10-13.json */
export function backupFileName(dayKey: string): string {
  return `temperance-${dayKey}.json`
}
