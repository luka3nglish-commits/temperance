import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  EnergyUnit,
  ExportFile,
  ImportMode,
  ImportResult,
  Ingredient,
  LogEntry,
  Macros,
  MacroTargets,
  Meal,
  MealComponent,
  Settings,
} from '../lib/types'
import { SCHEMA_VERSION } from '../lib/types'
import { newId } from '../lib/id'
import { localDayKey } from '../lib/day'
import { roundMacros, scaleMacros, sumMacros } from '../lib/macros'
import { validateExportFile } from '../lib/exportFile'

export const STORAGE_KEY = 'temperance.v1'

export const DEFAULT_SETTINGS: Settings = {
  goalKcal: 2500,
  targets: { protein: 180, carbs: 250, fat: 80 },
  unit: 'kcal',
  introCount: 0,
  motion: 'system',
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
}

export interface TemperanceStore extends Data {
  pulse: Pulse | null

  // meals
  addQuickMeal(input: { name: string; macros: Macros; favourite?: boolean }, now?: number): Meal
  addBuiltMeal(input: { name: string; components: MealComponent[]; favourite?: boolean }, now?: number): Meal
  updateMeal(id: string, patch: Partial<Pick<Meal, 'name' | 'macros' | 'components' | 'favourite'>>, now?: number): void
  deleteMeal(id: string): void
  toggleFavouriteMeal(id: string, now?: number): void

  // ingredients
  addIngredient(input: { name: string; per: Ingredient['per']; macros: Macros; favourite?: boolean }, now?: number): Ingredient
  updateIngredient(id: string, patch: Partial<Pick<Ingredient, 'name' | 'per' | 'macros' | 'favourite'>>, now?: number): void
  deleteIngredient(id: string): void
  toggleFavouriteIngredient(id: string, now?: number): void

  // log
  logMeal(mealId: string, servings?: number, now?: number): LogEntry | null
  logQuick(
    input: { name: string; macros: Macros; servings?: number; components?: MealComponent[]; saveToLibrary?: boolean; favourite?: boolean },
    now?: number,
  ): LogEntry
  updateEntry(id: string, patch: { name?: string; servings?: number; macros?: Macros }, now?: number): void
  deleteEntry(id: string, now?: number): void
  /** Copy every entry from `fromDay` into `toDay` (default today). Returns how many were copied. */
  repeatDay(fromDay: string, toDay?: string, now?: number): number

  // settings
  setGoalKcal(kcal: number): void
  setTargets(t: Partial<MacroTargets>): void
  setUnit(u: EnergyUnit): void
  setMotion(m: Settings['motion']): void
  setName(name: string): void
  markIntroPlayed(): void
  clearPulse(): void

  // data
  exportData(now?: number): ExportFile
  importData(file: unknown, mode: ImportMode): ImportResult
  resetAll(): void
}

const clampServings = (s: number | undefined) => {
  const n = typeof s === 'number' && Number.isFinite(s) && s > 0 ? s : 1
  return Math.round(n * 100) / 100
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

export const useStore = create<TemperanceStore>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      meals: {},
      ingredients: {},
      entries: [],
      pulse: null,

      // ---------- meals ----------
      addQuickMeal({ name, macros, favourite = false }, now = Date.now()) {
        const meal: Meal = {
          id: newId(),
          name: cleanName(name) || 'Meal',
          kind: 'quick',
          macros: roundMacros(macros),
          favourite,
          createdAt: now,
          updatedAt: now,
          useCount: 0,
        }
        set((s) => ({ meals: { ...s.meals, [meal.id]: meal } }))
        return meal
      },

      addBuiltMeal({ name, components, favourite = false }, now = Date.now()) {
        const meal: Meal = {
          id: newId(),
          name: cleanName(name) || 'Meal',
          kind: 'built',
          components: components.map((c) => ({ ...c, macros: roundMacros(c.macros) })),
          macros: roundMacros(sumMacros(components.map((c) => c.macros))),
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
          if (patch.components) {
            next.components = patch.components.map((c) => ({ ...c, macros: roundMacros(c.macros) }))
            next.macros = roundMacros(sumMacros(patch.components.map((c) => c.macros)))
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
      logMeal(mealId, servings, now = Date.now()) {
        const meal = get().meals[mealId]
        if (!meal) return null
        const n = clampServings(servings)
        const entry: LogEntry = {
          id: newId(),
          day: localDayKey(new Date(now)),
          at: now,
          mealId,
          name: meal.name,
          servings: n,
          macros: roundMacros(scaleMacros(meal.macros, n)),
          components: meal.components?.map((c) => ({ ...c, amount: c.amount * n, macros: roundMacros(scaleMacros(c.macros, n)) })),
        }
        set((s) => {
          const entries = [...s.entries, entry]
          const touched: Meal = { ...meal, lastUsedAt: now, useCount: meal.useCount + 1 }
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

      logQuick({ name, macros, servings, components, saveToLibrary = false, favourite = false }, now = Date.now()) {
        const n = clampServings(servings)
        let mealId: string | undefined
        if (saveToLibrary) {
          const meal = components && components.length
            ? get().addBuiltMeal({ name, components, favourite }, now)
            : get().addQuickMeal({ name, macros, favourite }, now)
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
        }
        set((s) => {
          const entries = [...s.entries, entry]
          const meals = { ...s.meals }
          if (mealId && meals[mealId]) meals[mealId] = { ...meals[mealId], lastUsedAt: now, useCount: 1 }
          return { entries, meals, pulse: makePulse('log', entry.macros.kcal, entries, s.settings, now) }
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
          if (patch.servings !== undefined) {
            const n = clampServings(patch.servings)
            const f = cur.servings > 0 ? n / cur.servings : 1
            next = {
              ...next,
              servings: n,
              macros: roundMacros(scaleMacros(cur.macros, f)),
              components: cur.components?.map((c) => ({ ...c, amount: c.amount * f, macros: roundMacros(scaleMacros(c.macros, f)) })),
            }
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

      repeatDay(fromDay, toDay, now = Date.now()) {
        const target = toDay ?? localDayKey(new Date(now))
        const source = get().entries.filter((e) => e.day === fromDay).sort((a, b) => a.at - b.at)
        if (!source.length) return 0
        const copies: LogEntry[] = source.map((e, i) => ({ ...e, id: newId(), day: target, at: now + i }))
        set((s) => {
          const entries = [...s.entries, ...copies]
          const added = sumMacros(copies.map((c) => c.macros)).kcal
          return { entries, pulse: makePulse('log', added, entries, s.settings, now) }
        })
        return copies.length
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
        set((s) => ({ settings: { ...s.settings, motion: m } }))
      },
      setName(name) {
        set((s) => ({ settings: { ...s.settings, name: cleanName(name) || undefined } }))
      },
      markIntroPlayed() {
        set((s) => ({ settings: { ...s.settings, introCount: s.settings.introCount + 1 } }))
      },
      clearPulse() {
        if (get().pulse) set({ pulse: null })
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
        set({ meals, ingredients, entries, pulse: null })
        return { meals: mealsAdded, ingredients: ingAdded, entries: entriesAdded }
      },

      resetAll() {
        set({ settings: { ...DEFAULT_SETTINGS }, meals: {}, ingredients: {}, entries: [], pulse: null })
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings, meals: s.meals, ingredients: s.ingredients, entries: s.entries }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>
        return {
          ...current,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}), targets: { ...DEFAULT_SETTINGS.targets, ...(p.settings?.targets ?? {}) } },
          meals: p.meals ?? {},
          ingredients: p.ingredients ?? {},
          entries: Array.isArray(p.entries) ? p.entries : [],
        }
      },
    },
  ),
)
