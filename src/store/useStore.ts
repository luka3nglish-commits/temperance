import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  EnergyUnit,
  ExportFile,
  HeroFigure,
  ImportMode,
  ImportResult,
  Ingredient,
  LogEntry,
  Macros,
  MacroTargets,
  Meal,
  MealComponent,
  MotionPref,
  OpeningPref,
  Portion,
  Settings,
  WeightEntry,
} from '../lib/types'
import { SCHEMA_VERSION } from '../lib/types'
import { newId } from '../lib/id'
import { localDayKey } from '../lib/day'
import { roundMacros, scaleMacros, sumMacros } from '../lib/macros'
import { validateExportFile } from '../lib/exportFile'
import { cleanAmount, cleanServings, resolvePortion } from '../lib/portion'

export const STORAGE_KEY = 'temperance.v1'

export const DEFAULT_SETTINGS: Settings = {
  goalKcal: 2500,
  targets: { protein: 180, carbs: 250, fat: 80 },
  unit: 'kcal',
  introCount: 0,
  motion: 'system',
  opening: 'short',
  hero: 'remaining',
  tilt: false,
  hiddenRecents: [],
}

/**
 * A transient event the 3D scene listens to. Set when today's log changes.
 * Not persisted.
 */
export type Pulse = {
  id: string
  kind: 'log' | 'remove'
  /** kcal added (positive) or removed (negative) */
  deltaKcal: number
  /** today's kcal total after the change */
  totalKcal: number
  /** true when today's total now exceeds the goal */
  over: boolean
  at: number
}

type Data = {
  settings: Settings
  meals: Record<string, Meal>
  ingredients: Record<string, Ingredient>
  entries: LogEntry[]
  weights: WeightEntry[]
}

const clampKg = (kg: number): number | null => {
  if (!Number.isFinite(kg) || kg <= 0 || kg >= 500) return null
  return Math.round(kg * 10) / 10
}

export interface TemperanceStore extends Data {
  pulse: Pulse | null
  /** true when the last persist write failed (quota, private mode); data is in memory only */
  persistFailed: boolean

  // meals
  /** `per` makes the macros count per that amount (e.g. per 100 g); `usual` is the amount usually eaten. */
  addQuickMeal(input: { name: string; macros: Macros; favourite?: boolean; per?: Portion; usual?: number }, now?: number): Meal
  addBuiltMeal(input: { name: string; components: MealComponent[]; favourite?: boolean }, now?: number): Meal
  /** Pass `per: undefined` to make a meal count per serve again. */
  updateMeal(id: string, patch: Partial<Pick<Meal, 'name' | 'macros' | 'components' | 'favourite' | 'per' | 'usual'>>, now?: number): void
  deleteMeal(id: string): void
  toggleFavouriteMeal(id: string, now?: number): void

  // ingredients
  addIngredient(input: { name: string; per: Ingredient['per']; macros: Macros; favourite?: boolean }, now?: number): Ingredient
  updateIngredient(id: string, patch: Partial<Pick<Ingredient, 'name' | 'per' | 'macros' | 'favourite'>>, now?: number): void
  deleteIngredient(id: string): void
  toggleFavouriteIngredient(id: string, now?: number): void

  // log
  /**
   * Log a library meal. `portion`: a number is servings (or bases for a per-100 g meal); a Portion
   * is an amount, e.g. { amount: 180, unit: 'g' }; omitted, the meal's usual amount is used.
   * An explicit portion becomes the meal's new usual amount. Null when the meal is gone or the
   * portion cannot apply (grams for a per-serve meal).
   */
  logMeal(mealId: string, portion?: number | Portion, now?: number): LogEntry | null
  /**
   * Log typed numbers. With `per` (e.g. { amount: 100, unit: 'g' }) the macros are per that amount
   * and `amount` is what was eaten in `per.unit`; without it `servings` multiplies the macros.
   */
  logQuick(
    input: {
      name: string
      macros: Macros
      servings?: number
      per?: Portion
      amount?: number
      components?: MealComponent[]
      saveToLibrary?: boolean
      favourite?: boolean
    },
    now?: number,
  ): LogEntry
  /** Log an earlier entry again today, exactly as it was (recents). */
  relogEntry(entryId: string, now?: number): LogEntry | null
  /** `portion` rescales a gram or millilitre entry by amount; `servings` rescales by multiplier. */
  updateEntry(id: string, patch: { name?: string; servings?: number; portion?: Portion; macros?: Macros }, now?: number): void
  deleteEntry(id: string, now?: number): void
  /** Remove several entries in one write with one pulse (UNDO of a repeated day). */
  deleteEntries(ids: readonly string[], now?: number): void
  /** Put a deleted entry back exactly as it was (UNDO). No-op if an entry with that id exists. */
  restoreEntry(entry: LogEntry, now?: number): void
  /** Copy every entry from `fromDay` into `toDay` (default today). Returns the copies (for UNDO). */
  repeatDay(fromDay: string, toDay?: string, now?: number): LogEntry[]

  // weight
  /** Record a weigh-in for `day` (default today). A second weigh-in on the same day replaces the first. */
  addWeight(kg: number, day?: string, now?: number): WeightEntry | null
  updateWeight(id: string, patch: { kg?: number; note?: string }): void
  deleteWeight(id: string): void
  /** Put a deleted weigh-in back exactly as it was (UNDO); replaces any entry that day. */
  restoreWeight(entry: WeightEntry): void
  setTargetWeight(kg: number | null): void

  // settings
  setGoalKcal(kcal: number): void
  setTargets(t: Partial<MacroTargets>): void
  setUnit(u: EnergyUnit): void
  setMotion(m: MotionPref): void
  setOpening(o: OpeningPref): void
  setHero(h: HeroFigure): void
  setTilt(on: boolean): void
  setName(name: string): void
  markIntroPlayed(): void
  /** Play the full opening again on the next launch. */
  resetIntro(): void
  hideRecent(key: string): void
  clearPulse(): void
  setPersistFailed(failed: boolean): void

  // data
  exportData(now?: number): ExportFile
  importData(file: unknown, mode: ImportMode): ImportResult
  resetAll(): void
}

const clampServings = cleanServings

/** A meal basis made safe: positive amount, known unit; a 1-serve basis is the same as none. */
function cleanPer(per: Portion | undefined): Portion | undefined {
  if (!per) return undefined
  const unit = per.unit === 'ml' || per.unit === 'serve' ? per.unit : 'g'
  const amount = cleanAmount(per.amount, unit)
  if (amount === null) return undefined
  if (unit === 'serve' && amount === 1) return undefined
  return { amount, unit }
}

const cleanName = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 80)

function totalsFor(entries: LogEntry[], day: string): Macros {
  return sumMacros(entries.filter((e) => e.day === day).map((e) => e.macros))
}

function makePulse(kind: Pulse['kind'], deltaKcal: number, entries: LogEntry[], settings: Settings, now: number): Pulse {
  const today = localDayKey(new Date(now))
  const total = totalsFor(entries, today).kcal
  return { id: newId(), kind, deltaKcal, totalKcal: total, over: total > settings.goalKcal, at: now }
}

/** Storage that reports failures instead of throwing inside zustand. */
function safeStorage() {
  return {
    getItem: (name: string) => {
      try {
        return localStorage.getItem(name)
      } catch {
        return null
      }
    },
    setItem: (name: string, value: string) => {
      try {
        localStorage.setItem(name, value)
        if (useStore.getState().persistFailed) useStore.getState().setPersistFailed(false)
      } catch {
        useStore.getState().setPersistFailed(true)
      }
    },
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(name)
      } catch {
        /* ignore */
      }
    },
  }
}

export const useStore = create<TemperanceStore>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      meals: {},
      ingredients: {},
      entries: [],
      weights: [],
      pulse: null,
      persistFailed: false,

      // ---------- meals ----------
      addQuickMeal({ name, macros, favourite = false, per, usual }, now = Date.now()) {
        const basis = cleanPer(per)
        const usualAmount = typeof usual === 'number' ? cleanAmount(usual, basis ? basis.unit : 'serve') : null
        const meal: Meal = {
          id: newId(),
          name: cleanName(name) || 'Meal',
          kind: 'quick',
          macros: roundMacros(macros),
          ...(basis ? { per: basis } : {}),
          ...(usualAmount !== null ? { usual: usualAmount } : {}),
          favourite,
          createdAt: now,
          updatedAt: now,
          useCount: 0,
        }
        set((s) => ({ meals: { ...s.meals, [meal.id]: meal } }))
        return meal
      },

      addBuiltMeal({ name, components, favourite = false }, now = Date.now()) {
        const rounded = components.map((c) => ({ ...c, macros: roundMacros(c.macros) }))
        const meal: Meal = {
          id: newId(),
          name: cleanName(name) || 'Meal',
          kind: 'built',
          components: rounded,
          macros: roundMacros(sumMacros(rounded.map((c) => c.macros))),
          favourite,
          createdAt: now,
          updatedAt: now,
          useCount: 0,
        }
        set((s) => ({ meals: { ...s.meals, [meal.id]: meal } }))
        return meal
      },

      updateMeal(id, patch, now = Date.now()) {
        set((s) => {
          const cur = s.meals[id]
          if (!cur) return {}
          const next: Meal = { ...cur, ...patch, updatedAt: now }
          if (patch.name !== undefined) next.name = cleanName(patch.name) || cur.name
          if ('per' in patch) {
            const basis = cleanPer(patch.per)
            if (basis) next.per = basis
            else delete next.per
            // a usual amount in the old unit means nothing in the new one
            if ((basis?.unit ?? 'serve') !== (cur.per?.unit ?? 'serve') && !('usual' in patch)) delete next.usual
          }
          if ('usual' in patch) {
            const u = typeof patch.usual === 'number' ? cleanAmount(patch.usual, next.per ? next.per.unit : 'serve') : null
            if (u === null) delete next.usual
            else next.usual = u
          }
          if (patch.components) {
            const rounded = patch.components.map((c) => ({ ...c, macros: roundMacros(c.macros) }))
            next.components = rounded
            next.macros = roundMacros(sumMacros(rounded.map((c) => c.macros)))
            next.kind = 'built'
          } else if (patch.macros) {
            next.macros = roundMacros(patch.macros)
          }
          return { meals: { ...s.meals, [id]: next } }
        })
      },

      deleteMeal(id) {
        set((s) => {
          if (!s.meals[id]) return {}
          const meals = { ...s.meals }
          delete meals[id]
          return { meals }
        })
      },

      toggleFavouriteMeal(id, now = Date.now()) {
        set((s) => {
          const cur = s.meals[id]
          if (!cur) return {}
          return { meals: { ...s.meals, [id]: { ...cur, favourite: !cur.favourite, updatedAt: now } } }
        })
      },

      // ---------- ingredients ----------
      addIngredient({ name, per, macros, favourite = false }, now = Date.now()) {
        const ing: Ingredient = {
          id: newId(),
          name: cleanName(name) || 'Ingredient',
          per: { amount: per.amount > 0 ? per.amount : 100, unit: per.unit },
          macros: roundMacros(macros),
          favourite,
          createdAt: now,
          updatedAt: now,
          useCount: 0,
        }
        set((s) => ({ ingredients: { ...s.ingredients, [ing.id]: ing } }))
        return ing
      },

      updateIngredient(id, patch, now = Date.now()) {
        set((s) => {
          const cur = s.ingredients[id]
          if (!cur) return {}
          const next: Ingredient = { ...cur, ...patch, updatedAt: now }
          if (patch.name !== undefined) next.name = cleanName(patch.name) || cur.name
          if (patch.macros) next.macros = roundMacros(patch.macros)
          if (patch.per && !(patch.per.amount > 0)) next.per = cur.per
          return { ingredients: { ...s.ingredients, [id]: next } }
        })
      },

      deleteIngredient(id) {
        set((s) => {
          if (!s.ingredients[id]) return {}
          const ingredients = { ...s.ingredients }
          delete ingredients[id]
          return { ingredients }
        })
      },

      toggleFavouriteIngredient(id, now = Date.now()) {
        set((s) => {
          const cur = s.ingredients[id]
          if (!cur) return {}
          return { ingredients: { ...s.ingredients, [id]: { ...cur, favourite: !cur.favourite, updatedAt: now } } }
        })
      },

      // ---------- log ----------
      logMeal(mealId, portionArg, now = Date.now()) {
        const meal = get().meals[mealId]
        if (!meal) return null
        const resolved = resolvePortion(meal.per, portionArg, meal.usual)
        if (!resolved) return null
        const n = resolved.servings
        const entry: LogEntry = {
          id: newId(),
          day: localDayKey(new Date(now)),
          at: now,
          mealId,
          name: meal.name,
          servings: n,
          macros: roundMacros(scaleMacros(meal.macros, n)),
          components: meal.components?.map((c) => ({ ...c, amount: c.amount * n, macros: roundMacros(scaleMacros(c.macros, n)) })),
          ...(resolved.portion ? { portion: resolved.portion } : {}),
        }
        set((s) => {
          const entries = [...s.entries, entry]
          const touched: Meal = { ...meal, lastUsedAt: now, useCount: meal.useCount + 1 }
          // an explicit amount becomes the usual one, so the next one-tap log matches it
          if (portionArg !== undefined) touched.usual = resolved.portion ? resolved.portion.amount : n
          const ingredients = { ...s.ingredients }
          for (const c of meal.components ?? []) {
            const ing = ingredients[c.ingredientId]
            if (ing) ingredients[c.ingredientId] = { ...ing, lastUsedAt: now, useCount: ing.useCount + 1 }
          }
          return {
            entries,
            meals: { ...s.meals, [mealId]: touched },
            ingredients,
            pulse: makePulse('log', entry.macros.kcal, entries, s.settings, now),
          }
        })
        return entry
      },

      logQuick({ name, macros: givenMacros, servings, per, amount, components, saveToLibrary = false, favourite = false }, now = Date.now()) {
        const built = !!(components && components.length)
        // a built meal is always per serve; a per-100 g basis needs an amount eaten
        const basis = built ? undefined : cleanPer(per)
        const resolved = basis && typeof amount === 'number' ? resolvePortion(basis, { amount, unit: basis.unit }) : null
        const n = resolved ? resolved.servings : clampServings(servings)
        const portion = resolved?.portion
        // a built meal's numbers are its components; never let a caller's total drift from them
        const macros = built ? sumMacros(components!.map((c) => roundMacros(c.macros))) : givenMacros
        let mealId: string | undefined
        if (saveToLibrary) {
          const meal = built
            ? get().addBuiltMeal({ name, components: components!, favourite }, now)
            : get().addQuickMeal(
                { name, macros, favourite, ...(resolved && basis ? { per: basis, usual: portion?.amount } : { usual: n }) },
                now,
              )
          mealId = meal.id
        }
        const entry: LogEntry = {
          id: newId(),
          day: localDayKey(new Date(now)),
          at: now,
          mealId,
          name: cleanName(name) || 'Meal',
          servings: n,
          macros: roundMacros(scaleMacros(macros, n)),
          components: components?.map((c) => ({ ...c, amount: c.amount * n, macros: roundMacros(scaleMacros(c.macros, n)) })),
          ...(portion ? { portion } : {}),
        }
        set((s) => {
          const entries = [...s.entries, entry]
          const meals = { ...s.meals }
          if (mealId && meals[mealId]) meals[mealId] = { ...meals[mealId], lastUsedAt: now, useCount: 1 }
          return { entries, meals, pulse: makePulse('log', entry.macros.kcal, entries, s.settings, now) }
        })
        return entry
      },

      relogEntry(entryId, now = Date.now()) {
        const src = get().entries.find((e) => e.id === entryId)
        if (!src) return null
        const entry: LogEntry = { ...src, id: newId(), day: localDayKey(new Date(now)), at: now }
        set((s) => {
          const entries = [...s.entries, entry]
          const meals = { ...s.meals }
          const ingredients = { ...s.ingredients }
          if (entry.mealId && meals[entry.mealId]) {
            const m = meals[entry.mealId]
            meals[entry.mealId] = { ...m, lastUsedAt: now, useCount: m.useCount + 1 }
          }
          for (const c of entry.components ?? []) {
            const ing = ingredients[c.ingredientId]
            if (ing) ingredients[c.ingredientId] = { ...ing, lastUsedAt: now, useCount: ing.useCount + 1 }
          }
          return { entries, meals, ingredients, pulse: makePulse('log', entry.macros.kcal, entries, s.settings, now) }
        })
        return entry
      },

      updateEntry(id, patch, now = Date.now()) {
        set((s) => {
          const idx = s.entries.findIndex((e) => e.id === id)
          if (idx < 0) return {}
          const cur = s.entries[idx]
          let next: LogEntry = { ...cur }
          if (patch.name !== undefined) next.name = cleanName(patch.name) || cur.name
          // the new multiplier: from an amount (same unit as recorded) or straight from servings
          let n: number | null = null
          let portion: Portion | undefined = cur.portion
          if (patch.portion) {
            const amount = cleanAmount(patch.portion.amount, patch.portion.unit)
            if (amount !== null && cur.portion && patch.portion.unit === cur.portion.unit && cur.portion.amount > 0) {
              n = clampServings((cur.servings * amount) / cur.portion.amount)
              portion = { amount, unit: cur.portion.unit }
            } else if (amount !== null && !cur.portion && patch.portion.unit === 'serve') {
              n = clampServings(amount)
            }
          } else if (patch.servings !== undefined) {
            n = clampServings(patch.servings)
            if (cur.portion && cur.servings > 0) {
              const amount = cleanAmount((cur.portion.amount * n) / cur.servings, cur.portion.unit)
              portion = amount === null ? undefined : { amount, unit: cur.portion.unit }
            }
          }
          if (n !== null) {
            const f = cur.servings > 0 ? n / cur.servings : 1
            next = {
              ...next,
              servings: n,
              macros: roundMacros(scaleMacros(cur.macros, f)),
              components: cur.components?.map((c) => ({ ...c, amount: c.amount * f, macros: roundMacros(scaleMacros(c.macros, f)) })),
            }
            if (portion) next.portion = portion
            else delete next.portion
          }
          if (patch.macros) next.macros = roundMacros(patch.macros)
          const entries = s.entries.slice()
          entries[idx] = next
          const delta = next.macros.kcal - cur.macros.kcal
          const today = localDayKey(new Date(now))
          const pulse = cur.day === today && delta !== 0 ? makePulse(delta >= 0 ? 'log' : 'remove', delta, entries, s.settings, now) : s.pulse
          return { entries, pulse }
        })
      },

      deleteEntry(id, now = Date.now()) {
        set((s) => {
          const cur = s.entries.find((e) => e.id === id)
          if (!cur) return {}
          const entries = s.entries.filter((e) => e.id !== id)
          const today = localDayKey(new Date(now))
          const pulse = cur.day === today ? makePulse('remove', -cur.macros.kcal, entries, s.settings, now) : s.pulse
          return { entries, pulse }
        })
      },

      deleteEntries(ids, now = Date.now()) {
        const drop = new Set(ids)
        set((s) => {
          const gone = s.entries.filter((e) => drop.has(e.id))
          if (!gone.length) return {}
          const entries = s.entries.filter((e) => !drop.has(e.id))
          const today = localDayKey(new Date(now))
          const todayKcal = gone.filter((e) => e.day === today).reduce((sum, e) => sum + e.macros.kcal, 0)
          const pulse = todayKcal !== 0 ? makePulse('remove', -todayKcal, entries, s.settings, now) : s.pulse
          return { entries, pulse }
        })
      },

      restoreEntry(entry, now = Date.now()) {
        set((s) => {
          if (s.entries.some((e) => e.id === entry.id)) return {}
          const entries = [...s.entries, entry].sort((a, b) => a.at - b.at)
          const today = localDayKey(new Date(now))
          const pulse = entry.day === today ? makePulse('log', entry.macros.kcal, entries, s.settings, now) : s.pulse
          return { entries, pulse }
        })
      },

      repeatDay(fromDay, toDay, now = Date.now()) {
        const target = toDay ?? localDayKey(new Date(now))
        const source = get().entries.filter((e) => e.day === fromDay).sort((a, b) => a.at - b.at)
        if (!source.length) return []
        const copies: LogEntry[] = source.map((e, i) => ({ ...e, id: newId(), day: target, at: now + i }))
        set((s) => {
          const entries = [...s.entries, ...copies]
          const added = sumMacros(copies.map((c) => c.macros)).kcal
          // the library meals (and the ingredients inside built ones) count as used again
          const meals = { ...s.meals }
          const ingredients = { ...s.ingredients }
          for (const c of copies) {
            if (c.mealId && meals[c.mealId]) {
              const m = meals[c.mealId]
              meals[c.mealId] = { ...m, lastUsedAt: now, useCount: m.useCount + 1 }
            }
            for (const comp of c.components ?? []) {
              const ing = ingredients[comp.ingredientId]
              if (ing) ingredients[comp.ingredientId] = { ...ing, lastUsedAt: now, useCount: ing.useCount + 1 }
            }
          }
          return { entries, meals, ingredients, pulse: makePulse('log', added, entries, s.settings, now) }
        })
        return copies
      },

      // ---------- weight ----------
      addWeight(kg, day, now = Date.now()) {
        const v = clampKg(kg)
        if (v === null) return null
        const d = day ?? localDayKey(new Date(now))
        let entry: WeightEntry | null = null
        set((s) => {
          const existing = s.weights.find((w) => w.day === d)
          if (existing) {
            entry = { ...existing, kg: v, at: now }
            return { weights: s.weights.map((w) => (w.id === existing.id ? entry! : w)) }
          }
          entry = { id: newId(), day: d, at: now, kg: v }
          return { weights: [...s.weights, entry].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0)) }
        })
        return entry
      },
      updateWeight(id, patch) {
        set((s) => {
          const cur = s.weights.find((w) => w.id === id)
          if (!cur) return {}
          const next: WeightEntry = { ...cur }
          if (patch.kg !== undefined) {
            const v = clampKg(patch.kg)
            if (v !== null) next.kg = v
          }
          if (patch.note !== undefined) next.note = patch.note.trim().slice(0, 120) || undefined
          return { weights: s.weights.map((w) => (w.id === id ? next : w)) }
        })
      },
      deleteWeight(id) {
        set((s) => (s.weights.some((w) => w.id === id) ? { weights: s.weights.filter((w) => w.id !== id) } : {}))
      },
      restoreWeight(entry) {
        const v = clampKg(entry.kg)
        if (v === null) return
        set((s) => {
          const weights = s.weights.filter((w) => w.day !== entry.day && w.id !== entry.id)
          weights.push({ ...entry, kg: v })
          weights.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
          return { weights }
        })
      },
      setTargetWeight(kg) {
        // null clears; an invalid number is ignored rather than clearing
        if (kg !== null && clampKg(kg) === null) return
        set((s) => {
          const v = kg === null ? null : clampKg(kg)
          const settings = { ...s.settings }
          if (v === null) delete settings.targetWeightKg
          else settings.targetWeightKg = v
          return { settings }
        })
      },

      // ---------- settings ----------
      setGoalKcal(kcal) {
        const v = Number.isFinite(kcal) && kcal > 0 ? Math.round(kcal) : DEFAULT_SETTINGS.goalKcal
        set((s) => ({ settings: { ...s.settings, goalKcal: v } }))
      },
      setTargets(t) {
        set((s) => {
          const next = { ...s.settings.targets }
          for (const k of ['protein', 'carbs', 'fat'] as const) {
            const v = t[k]
            if (typeof v === 'number' && Number.isFinite(v) && v >= 0) next[k] = Math.round(v)
          }
          return { settings: { ...s.settings, targets: next } }
        })
      },
      setUnit(u) {
        set((s) => ({ settings: { ...s.settings, unit: u === 'kJ' ? 'kJ' : 'kcal' } }))
      },
      setMotion(m) {
        const v: MotionPref = m === 'on' || m === 'off' ? m : 'system'
        set((s) => ({ settings: { ...s.settings, motion: v } }))
      },
      setOpening(o) {
        const v: OpeningPref = o === 'full' || o === 'off' ? o : 'short'
        set((s) => ({ settings: { ...s.settings, opening: v } }))
      },
      setHero(h) {
        const v: HeroFigure = h === 'eaten' ? 'eaten' : 'remaining'
        set((s) => ({ settings: { ...s.settings, hero: v } }))
      },
      setTilt(on) {
        set((s) => ({ settings: { ...s.settings, tilt: !!on } }))
      },
      setName(name) {
        set((s) => ({ settings: { ...s.settings, name: cleanName(name) || undefined } }))
      },
      markIntroPlayed() {
        set((s) => ({ settings: { ...s.settings, introCount: s.settings.introCount + 1 } }))
      },
      resetIntro() {
        set((s) => ({ settings: { ...s.settings, introCount: 0 } }))
      },
      hideRecent(key) {
        set((s) => {
          if (s.settings.hiddenRecents.includes(key)) return {}
          return { settings: { ...s.settings, hiddenRecents: [...s.settings.hiddenRecents, key].slice(-200) } }
        })
      },
      clearPulse() {
        if (get().pulse) set({ pulse: null })
      },
      setPersistFailed(failed) {
        if (get().persistFailed !== failed) set({ persistFailed: failed })
      },

      // ---------- data ----------
      exportData(now = Date.now()) {
        const s = get()
        return {
          app: 'temperance',
          version: SCHEMA_VERSION,
          exportedAt: now,
          settings: s.settings,
          meals: s.meals,
          ingredients: s.ingredients,
          entries: s.entries,
          weights: s.weights,
        }
      },

      importData(raw, mode) {
        const file = validateExportFile(raw)
        if (!file) throw new Error('That file is not a Temperance backup.')
        if (mode === 'replace') {
          set({
            settings: { ...DEFAULT_SETTINGS, ...file.settings },
            meals: file.meals,
            ingredients: file.ingredients,
            entries: file.entries.slice().sort((a, b) => a.at - b.at),
            weights: file.weights.slice(),
            pulse: null,
          })
          return { meals: Object.keys(file.meals).length, ingredients: Object.keys(file.ingredients).length, entries: file.entries.length }
        }
        // merge: newest updatedAt wins for library items; entries union by id
        const s = get()
        let mealsAdded = 0
        let ingAdded = 0
        let entriesAdded = 0
        const meals = { ...s.meals }
        for (const m of Object.values(file.meals)) {
          const cur = meals[m.id]
          if (!cur) { meals[m.id] = m; mealsAdded++ } else if (m.updatedAt > cur.updatedAt) meals[m.id] = m
        }
        const ingredients = { ...s.ingredients }
        for (const g of Object.values(file.ingredients)) {
          const cur = ingredients[g.id]
          if (!cur) { ingredients[g.id] = g; ingAdded++ } else if (g.updatedAt > cur.updatedAt) ingredients[g.id] = g
        }
        const seen = new Set(s.entries.map((e) => e.id))
        const entries = s.entries.slice()
        for (const e of file.entries) {
          if (!seen.has(e.id)) { entries.push(e); seen.add(e.id); entriesAdded++ }
        }
        entries.sort((a, b) => a.at - b.at)
        // weights: one per day; the newer `at` wins
        const byDay = new Map(s.weights.map((w) => [w.day, w]))
        for (const w of file.weights) {
          const cur = byDay.get(w.day)
          if (!cur || w.at > cur.at) byDay.set(w.day, w)
        }
        const weights = [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
        set({ meals, ingredients, entries, weights, pulse: null })
        return { meals: mealsAdded, ingredients: ingAdded, entries: entriesAdded }
      },

      resetAll() {
        set({ settings: { ...DEFAULT_SETTINGS }, meals: {}, ingredients: {}, entries: [], weights: [], pulse: null })
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(safeStorage),
      partialize: (s) => ({ settings: s.settings, meals: s.meals, ingredients: s.ingredients, entries: s.entries, weights: s.weights }),
      // v1 -> v4: new fields are optional or filled by `merge` below; nothing changed shape.
      migrate: (persisted) => persisted as Data,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>
        return {
          ...current,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(p.settings ?? {}),
            targets: { ...DEFAULT_SETTINGS.targets, ...(p.settings?.targets ?? {}) },
            hiddenRecents: Array.isArray(p.settings?.hiddenRecents) ? p.settings.hiddenRecents : [],
          },
          meals: p.meals ?? {},
          ingredients: p.ingredients ?? {},
          entries: Array.isArray(p.entries) ? p.entries : [],
          weights: Array.isArray(p.weights) ? p.weights : [],
        }
      },
    },
  ),
)
