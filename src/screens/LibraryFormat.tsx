/**
 * Pure helpers for the LIBRARY screen: sub-line copy, basis labels, favourites merge, sorting.
 * Kept free of React so they can be unit tested.
 */
import type { EnergyUnit, Ingredient, Macros, Meal } from '../lib/types'
import { formatEnergy, unitLabel } from '../lib/units'

/** Grams: whole when stored whole, one decimal otherwise (spec section 18). */
export function fmtGrams(g: number): string {
  if (!Number.isFinite(g)) return '0'
  const r = Math.round(g * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** `612 kcal` or `2 561 kJ`, always the display unit. */
export function energyText(kcal: number, unit: EnergyUnit): string {
  return `${formatEnergy(kcal, unit)} ${unitLabel(unit)}`
}

/** `P 32 C 48 F 12` */
export function macroText(m: Macros): string {
  return `P ${fmtGrams(m.protein)} C ${fmtGrams(m.carbs)} F ${fmtGrams(m.fat)}`
}

/** Meal row sub-line: `612 kcal · P 32 C 48 F 12` */
export function mealSubline(m: Macros, unit: EnergyUnit): string {
  return `${energyText(m.kcal, unit)} · ${macroText(m)}`
}

/** `per 100 g`, `per 250 ml`, `per serve`, `per 2 serves` */
export function basisLabel(per: Ingredient['per']): string {
  const amount = per.amount > 0 ? per.amount : 1
  if (per.unit === 'serve') {
    if (amount === 1) return 'per serve'
    return `per ${fmtGrams(amount)} serves`
  }
  return `per ${fmtGrams(amount)} ${per.unit}`
}

/** `100 g`, `1 serve`, `2 serves` for a component amount. */
export function amountLabel(amount: number, unit: Ingredient['per']['unit']): string {
  if (unit === 'serve') return `${fmtGrams(amount)} ${amount === 1 ? 'serve' : 'serves'}`
  return `${fmtGrams(amount)} ${unit}`
}

/** Ingredient row sub-line: `per 100 g · 165 kcal · P 31 C 0 F 3.6` */
export function ingredientSubline(ing: Pick<Ingredient, 'per' | 'macros'>, unit: EnergyUnit): string {
  return `${basisLabel(ing.per)} · ${mealSubline(ing.macros, unit)}`
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

/** Roman numerals for the inscribed counts beside section headings. 0 and anything over 3999 fall back to digits. */
export function roman(n: number): string {
  if (!Number.isInteger(n) || n <= 0 || n >= 4000) return String(n)
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  let rest = n
  for (const [v, s] of table) {
    while (rest >= v) {
      out += s
      rest -= v
    }
  }
  return out
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
