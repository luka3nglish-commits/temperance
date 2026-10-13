import type { Ingredient, LogEntry, Macros, MacroTargets, Meal } from '../lib/types'
import { dayKeyOffset } from '../lib/day'
import { sumMacros, ZERO_MACROS } from '../lib/macros'

/** Entries for one local day, oldest first. */
export function entriesForDay(entries: readonly LogEntry[], day: string): LogEntry[] {
  return entries.filter((e) => e.day === day).sort((a, b) => a.at - b.at)
}

export function totalsForDay(entries: readonly LogEntry[], day: string): Macros {
  return sumMacros(entries.filter((e) => e.day === day).map((e) => e.macros))
}

/** Positive while under goal, negative once over. */
export function remainingKcal(totals: Macros, goalKcal: number): number {
  return goalKcal - totals.kcal
}

/** 0..1 of the goal eaten (uncapped; 1.2 means 20 percent over). */
export function goalProgress(totals: Macros, goalKcal: number): number {
  return goalKcal > 0 ? totals.kcal / goalKcal : 0
}

/** Macro progress 0..1 each (uncapped) against daily gram targets. */
export function macroProgress(totals: Macros, targets: MacroTargets): { protein: number; carbs: number; fat: number } {
  const p = (v: number, t: number) => (t > 0 ? v / t : 0)
  return { protein: p(totals.protein, targets.protein), carbs: p(totals.carbs, targets.carbs), fat: p(totals.fat, targets.fat) }
}

/** Meals used before, most recent first. */
export function recentMeals(meals: Record<string, Meal>, limit = 8): Meal[] {
  return Object.values(meals)
    .filter((m) => typeof m.lastUsedAt === 'number')
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
    .slice(0, limit)
}

export function favouriteMeals(meals: Record<string, Meal>): Meal[] {
  return Object.values(meals)
    .filter((m) => m.favourite)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Favourites first, then alphabetical. */
export function libraryMeals(meals: Record<string, Meal>): Meal[] {
  return Object.values(meals).sort((a, b) => {
    if (a.favourite !== b.favourite) return a.favourite ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function libraryIngredients(ingredients: Record<string, Ingredient>): Ingredient[] {
  return Object.values(ingredients).sort((a, b) => {
    if (a.favourite !== b.favourite) return a.favourite ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/** Case-insensitive, word-prefix friendly search. */
export function matchesQuery(name: string, q: string): boolean {
  const query = q.trim().toLowerCase()
  if (!query) return true
  const hay = name.toLowerCase()
  if (hay.includes(query)) return true
  const words = query.split(/\s+/)
  return words.every((w) => hay.includes(w))
}

export function searchMeals(meals: Record<string, Meal>, q: string): Meal[] {
  return libraryMeals(meals).filter((m) => matchesQuery(m.name, q))
}

export function searchIngredients(ingredients: Record<string, Ingredient>, q: string): Ingredient[] {
  return libraryIngredients(ingredients).filter((g) => matchesQuery(g.name, q))
}

export type DaySummary = { day: string; totals: Macros; count: number }

/** The last `days` days ending at `today`, newest first, including empty days. */
export function historyDays(entries: readonly LogEntry[], today: string, days = 30): DaySummary[] {
  const byDay = new Map<string, LogEntry[]>()
  for (const e of entries) {
    const list = byDay.get(e.day)
    if (list) list.push(e)
    else byDay.set(e.day, [e])
  }
  const out: DaySummary[] = []
  for (let i = 0; i < days; i++) {
    const day = dayKeyOffset(today, -i)
    const list = byDay.get(day) ?? []
    out.push({ day, totals: list.length ? sumMacros(list.map((e) => e.macros)) : ZERO_MACROS, count: list.length })
  }
  return out
}

/** Every day that has at least one entry, newest first. */
export function loggedDays(entries: readonly LogEntry[]): DaySummary[] {
  const byDay = new Map<string, LogEntry[]>()
  for (const e of entries) {
    const list = byDay.get(e.day)
    if (list) list.push(e)
    else byDay.set(e.day, [e])
  }
  return [...byDay.entries()]
    .map(([day, list]) => ({ day, totals: sumMacros(list.map((e) => e.macros)), count: list.length }))
    .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0))
}

/**
 * Consecutive days, counting back from today (or yesterday if today is empty),
 * on which something was logged and the goal was not exceeded.
 */
export function disciplineStreak(entries: readonly LogEntry[], goalKcal: number, today: string): number {
  const days = new Map<string, number>()
  for (const e of entries) days.set(e.day, (days.get(e.day) ?? 0) + e.macros.kcal)
  let day = today
  if (!days.has(day)) day = dayKeyOffset(day, -1)
  let streak = 0
  while (days.has(day) && (days.get(day) ?? 0) <= goalKcal) {
    streak++
    day = dayKeyOffset(day, -1)
  }
  return streak
}
