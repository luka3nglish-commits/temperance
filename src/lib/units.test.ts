import { describe, expect, it } from 'vitest'
import { formatEnergy, formatInt, fromInputEnergy, parseNumber, toDisplayEnergy } from './units'

describe('units', () => {
  it('converts kcal to kJ for display and back for input', () => {
    expect(toDisplayEnergy(1000, 'kJ')).toBeCloseTo(4184)
    expect(toDisplayEnergy(1000, 'kcal')).toBe(1000)
    expect(fromInputEnergy(4184, 'kJ')).toBeCloseTo(1000)
    expect(fromInputEnergy(500, 'kcal')).toBe(500)
  })

  it('round trips without drift', () => {
    const kcal = 2345
    expect(fromInputEnergy(toDisplayEnergy(kcal, 'kJ'), 'kJ')).toBeCloseTo(kcal, 9)
  })

  it('formats with thin-space grouping', () => {
    expect(formatInt(2450)).toBe('2 450')
    expect(formatInt(-120)).toBe('-120')
    expect(formatInt(999)).toBe('999')
    expect(formatEnergy(1000, 'kJ')).toBe('4 184')
  })

  it('parses typed numbers safely', () => {
    expect(parseNumber('520')).toBe(520)
    expect(parseNumber(' 1,5 ')).toBe(1.5)
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('-3')).toBeNull()
  })
})
