/**
 * Pure helpers for the LIBRARY screen: sub-line copy, basis labels, favourites merge, sorting.
 * Kept free of React so they can be unit tested.
 */
import type { EnergyUnit, Ingredient, LogEntry, Macros, Meal } from '../lib/types'
import { formatEnergy, unitLabel } from '../lib/units'
import { portionLabel } from '../lib/portion'

/** Grams: whole when stored whole, one decimal otherwise (spec section 18). */
export function fmtGrams(g: number): string {
  if (!Number.isFinite(g)) return '0'
  const r = Math.round(g * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** A whole number of grams for list meta lines (polish-spec 4.11: macros rounded to integers). */
const whole = (g: number) => String(Number.isFinite(g) ? Math.round(g) : 0)

/** `612 kcal` or `2 561 kJ`, always the display unit. */
export function energyText(kcal: number, unit: EnergyUnit): string {
  return `${formatEnergy(kcal, unit)} ${unitLabel(unit)}`
}

/** `P 32 · C 48 · F 12`, whole grams. */
export function macroText(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): string {
  return `P ${whole(m.protein)} · C ${whole(m.carbs)} · F ${whole(m.fat)}`
}

/** `per 100 g`, `per 250 ml`, `per serve`, `per 2 serves` */
export function basisLabel(per: Ingredient['per'] | undefined): string {
  if (!per) return 'per serve'
  const amount = per.amount > 0 ? per.amount : 1
  if (per.unit === 'serve') {
    if (amount === 1) return 'per serve'
    return `per ${fmtGrams(amount)} serves`
  }
  return `per ${fmtGrams(amount)} ${per.unit}`
}

/** `100 g`, `1 serve`, `2 serves` for a component amount (singular at 1 or less). */
export function amountLabel(amount: number, unit: Ingredient['per']['unit']): string {
  if (unit === 'serve') return `${fmtGrams(amount)} ${amount <= 1 ? 'serve' : 'serves'}`
  return `${fmtGrams(amount)} ${unit}`
}

/** True when a meal is counted per an amount (per 100 g, per 100 ml) rather than per serve. */
export function hasBasis(per: Meal['per']): per is NonNullable<Meal['per']> {
  return !!per && !(per.unit === 'serve' && per.amount === 1)
}

/**
 * Meal row meta line: `P 32 · C 48 · F 12`. A meal counted per an amount says so first:
 * `per 100 g · P 9 · C 4 · F 5`. The energy sits in the row's value column.
 */
export function mealSubline(meal: Pick<Meal, 'macros' | 'per'>): string {
  const macros = macroText(meal.macros)
  return hasBasis(meal.per) ? `${basisLabel(meal.per)} · ${macros}` : macros
}

/** Ingredient row meta line: `per 100 g · P 31 · C 0 · F 4` (the basis always comes first). */
export function ingredientSubline(ing: Pick<Ingredient, 'per' | 'macros'>): string {
  return `${basisLabel(ing.per)} · ${macroText(ing.macros)}`
}

/** Toast copy after a log: `Logged · 180 g · 175 kcal`, or `Logged · 612 kcal` for one serve. */
export function loggedText(entry: Pick<LogEntry, 'portion' | 'servings' | 'macros'>, unit: EnergyUnit): string {
  const label = portionLabel(entry)
  return `Logged · ${label ? `${label} · ` : ''}${energyText(entry.macros.kcal, unit)}`
}

export type FavouriteItem = { kind: 'meal'; item: Meal } | { kind: 'ingredient'; item: Ingredient }

const byUseThenName = (a: { lastUsedAt?: number; name: string }, b: { lastUsedAt?: number; name: string }) =>
  (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || a.name.localeCompare(b.name)

/** Favourite meals and ingredients together, last used first, then name. */
export function favouriteItems(meals: Record<string, Meal>, ingredients: Record<string, Ingredient>): FavouriteItem[] {
  const out: FavouriteItem[] = []
  for (const m of Object.values(meals)) if (m.favourite) out.push({ kind: 'meal', item: m })
  for (const g of Object.values(ingredients)) if (g.favourite) out.push({ kind: 'ingredient', item: g })
  return out.sort((a, b) => byUseThenName(a.item, b.item))
}

/** Most logged first; ties alphabetical. */
export function mostLogged<T extends { useCount: number; name: string }>(list: readonly T[]): T[] {
  return list.slice().sort((a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name))
}

/** localStorage key for the collapsed favourites folder. */
export const FAV_COLLAPSED_KEY = 'temperance.fav.collapsed'

export function readFavCollapsed(): boolean {
  try {
    return localStorage.getItem(FAV_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeFavCollapsed(collapsed: boolean): void {
  try {
    if (collapsed) localStorage.setItem(FAV_COLLAPSED_KEY, '1')
    else localStorage.removeItem(FAV_COLLAPSED_KEY)
  } catch {
    /* private mode: the folder simply opens next time */
  }
}
