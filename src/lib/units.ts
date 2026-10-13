import type { EnergyUnit } from './types'

export const KJ_PER_KCAL = 4.184

/** Convert stored kcal to the display unit. */
export function toDisplayEnergy(kcal: number, unit: EnergyUnit): number {
  return unit === 'kJ' ? kcal * KJ_PER_KCAL : kcal
}

/** Convert a number typed by the user in the display unit back to stored kcal. */
export function fromInputEnergy(value: number, unit: EnergyUnit): number {
  return unit === 'kJ' ? value / KJ_PER_KCAL : value
}

/** Whole-number display with thin thousands grouping, e.g. "2 450". */
export function formatEnergy(kcal: number, unit: EnergyUnit): string {
  const v = Math.round(toDisplayEnergy(kcal, unit))
  return formatInt(v)
}

export function formatInt(n: number): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(Math.round(n))
  // thin space grouping reads better in Cinzel than commas
  return sign + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function unitLabel(unit: EnergyUnit): string {
  return unit === 'kJ' ? 'kJ' : 'kcal'
}

/** Grams, rounded to the nearest whole gram for display. */
export function formatGrams(g: number): string {
  return `${Math.round(g)} g`
}

/** Parse a user-typed number safely. Returns null for empty / invalid / negative. */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, '').replace(',', '.')
  if (cleaned === '' || cleaned === '.' || cleaned === '-') return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}
