import { describe, expect, it } from 'vitest'
import { toRoman } from './HistoryStones'

describe('toRoman', () => {
  it('reads 0 and negatives as a plain 0', () => {
    expect(toRoman(0)).toBe('0')
    expect(toRoman(-3)).toBe('0')
    expect(toRoman(Number.NaN)).toBe('0')
  })
  it('writes the subtractive forms', () => {
    expect(toRoman(1)).toBe('I')
    expect(toRoman(4)).toBe('IV')
    expect(toRoman(9)).toBe('IX')
    expect(toRoman(14)).toBe('XIV')
    expect(toRoman(40)).toBe('XL')
    expect(toRoman(90)).toBe('XC')
    expect(toRoman(400)).toBe('CD')
    expect(toRoman(1994)).toBe('MCMXCIV')
    expect(toRoman(3999)).toBe('MMMCMXCIX')
  })
  it('floors fractions and falls back to digits past 3999', () => {
    expect(toRoman(7.9)).toBe('VII')
    expect(toRoman(4000)).toBe('4000')
  })
})
