import type { Ingredient, Macros, MealComponent } from './types'

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

export function addMacros(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat }
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return { kcal: m.kcal * factor, protein: m.protein * factor, carbs: m.carbs * factor, fat: m.fat * factor }
}

/** Round to 2 decimals so stored snapshots stay tidy and integer display rounds the true value once. */
export function roundMacros(m: Macros): Macros {
  const r = (n: number) => Math.round(n * 100) / 100
  return { kcal: r(m.kcal), protein: r(m.protein), carbs: r(m.carbs), fat: r(m.fat) }
}

export function sumMacros(list: readonly Macros[]): Macros {
  return list.reduce(addMacros, ZERO_MACROS)
}

export function isZeroMacros(m: Macros): boolean {
  return m.kcal === 0 && m.protein === 0 && m.carbs === 0 && m.fat === 0
}

/** Macros for `amount` of an ingredient whose macros are per `per.amount`. */
export function ingredientMacrosFor(ing: Ingredient, amount: number): Macros {
  const per = ing.per.amount > 0 ? ing.per.amount : 1
  return roundMacros(scaleMacros(ing.macros, amount / per))
}

/** Build a MealComponent snapshot from an ingredient and an amount. */
export function makeComponent(ing: Ingredient, amount: number): MealComponent {
  return {
    ingredientId: ing.id,
    name: ing.name,
    amount,
    unit: ing.per.unit,
    macros: ingredientMacrosFor(ing, amount),
  }
}

/** Energy implied by the macros alone (4/4/9). Useful to sanity-check a typed kcal. */
export function kcalFromMacros(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): number {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9
}

/** Share of energy from each macro, 0..1 each, summing to 1 when any energy exists. */
export function macroEnergySplit(m: Macros): { protein: number; carbs: number; fat: number } {
  const p = m.protein * 4
  const c = m.carbs * 4
  const f = m.fat * 9
  const total = p + c + f
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 }
  return { protein: p / total, carbs: c / total, fat: f / total }
}
