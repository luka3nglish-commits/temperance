/**
 * Portions: how much was eaten.
 *
 * A meal's numbers are counted on a basis: one serving (Meal.per absent) or an amount such as
 * 100 g (Meal.per = { amount: 100, unit: 'g' }), the way a nutrition label prints them. Logging
 * turns "what was eaten" into a multiplier on those numbers (LogEntry.servings) and, for gram or
 * millilitre portions, keeps the amount for display (LogEntry.portion, e.g. 180 g).
 */
import type { AmountUnit, LogEntry, Portion } from './types'

export const MAX_SERVINGS = 1000

/** A typed amount made safe: positive and finite; servings to 3 decimals, g and ml to 1. Null when unusable. */
export function cleanAmount(amount: number, unit: AmountUnit): number | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null
  if (unit === 'serve') return Math.round(Math.min(amount, 100) * 1000) / 1000 || null
  return Math.round(Math.min(amount, 100000) * 10) / 10 || null
}

/** Multiplier rounding: 4 decimals keeps 7 g of a per-30 g basis exact enough; capped for sanity. */
export function cleanServings(s: number | undefined): number {
  const n = typeof s === 'number' && Number.isFinite(s) && s > 0 ? s : 1
  return Math.round(Math.min(n, MAX_SERVINGS) * 10000) / 10000
}

export type ResolvedPortion = { servings: number; portion?: Portion }

/**
 * Turn what was eaten into the multiplier on a meal's numbers.
 * - nothing given: the usual amount (or one basis / one serving)
 * - a number: that many servings (or that many bases for a per-100 g meal)
 * - a Portion in the basis unit: amount / per.amount; in 'serve': that many bases
 * Returns null when a gram or millilitre portion is given for a meal that has no matching basis.
 */
export function resolvePortion(per: Portion | undefined, p: number | Portion | undefined, usual?: number): ResolvedPortion | null {
  if (p === undefined) {
    const amount = typeof usual === 'number' && usual > 0 ? usual : per ? per.amount : 1
    return resolvePortion(per, { amount, unit: per ? per.unit : 'serve' })
  }
  if (typeof p === 'number') {
    const servings = cleanServings(p)
    if (!per) return { servings }
    const amount = cleanAmount(servings * per.amount, per.unit)
    return amount === null ? { servings } : { servings, portion: { amount, unit: per.unit } }
  }
  const amount = cleanAmount(p.amount, p.unit)
  if (amount === null) return null
  if (!per) return p.unit === 'serve' ? { servings: cleanServings(amount) } : null
  if (p.unit === per.unit) {
    const base = per.amount > 0 ? per.amount : 1
    return { servings: cleanServings(amount / base), portion: { amount, unit: per.unit } }
  }
  if (p.unit === 'serve') {
    const total = cleanAmount(amount * per.amount, per.unit)
    return total === null ? { servings: cleanServings(amount) } : { servings: cleanServings(amount), portion: { amount: total, unit: per.unit } }
  }
  return null
}

/** 180 → "180", 1.5 → "1.5", 1.25 → "1.25" (no trailing zeros). */
export function formatAmountNumber(amount: number): string {
  if (!Number.isFinite(amount)) return '0'
  const rounded = Math.round(amount * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

/** "180 g", "250 ml", "1 serve", "1.5 serves" */
export function formatAmount(amount: number, unit: AmountUnit): string {
  const n = formatAmountNumber(amount)
  if (unit === 'serve') return `${n} ${amount === 1 ? 'serve' : 'serves'}`
  return `${n} ${unit}`
}

/** "per 100 g", "per 250 ml", "per serve" */
export function basisLabel(per: Portion | undefined): string {
  if (!per || per.unit === 'serve') return per && per.amount !== 1 ? `per ${formatAmount(per.amount, 'serve')}` : 'per serve'
  return `per ${formatAmountNumber(per.amount)} ${per.unit}`
}

/** What a logged entry shows next to its name: "180 g", "× 1.5", or "" for exactly one serving. */
export function portionLabel(e: Pick<LogEntry, 'portion' | 'servings'>): string {
  if (e.portion) return formatAmount(e.portion.amount, e.portion.unit)
  if (Math.abs(e.servings - 1) < 1e-9) return ''
  return `× ${formatAmountNumber(e.servings)}`
}

/** The +/- step for a portion control: quarter servings, 5 g under 50 g, 10 g under 500 g, then 25 g. */
export function portionStep(unit: AmountUnit, amount: number): number {
  if (unit === 'serve') return 0.25
  if (amount < 50) return 5
  if (amount < 500) return 10
  return 25
}

/** Smallest sensible amount for a unit. */
export function portionMin(unit: AmountUnit): number {
  return unit === 'serve' ? 0.25 : 1
}

/** Step an amount up or down, snapping to the step grid so 183 g + 10 becomes 190 g. */
export function stepAmount(amount: number, unit: AmountUnit, direction: 1 | -1): number {
  const step = portionStep(unit, direction === -1 ? Math.max(portionMin(unit), amount - 1e-9) : amount)
  const snapped = direction === 1 ? Math.floor(amount / step + 1e-9) * step + step : Math.ceil(amount / step - 1e-9) * step - step
  const v = Math.max(portionMin(unit), snapped)
  return cleanAmount(v, unit) ?? portionMin(unit)
}
