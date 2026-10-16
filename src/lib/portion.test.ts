import { describe, expect, it } from 'vitest'
import { basisLabel, cleanAmount, cleanServings, formatAmount, formatAmountLong, formatAmountNumber, portionAria, portionLabel, portionStep, resolvePortion, stepAmount } from './portion'

describe('portion helpers', () => {
  it('cleans amounts by unit', () => {
    expect(cleanAmount(1.23456, 'serve')).toBe(1.235)
    expect(cleanAmount(183.26, 'g')).toBe(183.3)
    expect(cleanAmount(0, 'g')).toBeNull()
    expect(cleanAmount(-2, 'serve')).toBeNull()
    expect(cleanAmount(Number.NaN, 'ml')).toBeNull()
    expect(cleanAmount(500, 'serve')).toBe(100)
    expect(cleanServings(undefined)).toBe(1)
    expect(cleanServings(7 / 30)).toBe(0.2333)
  })

  it('resolves numbers, amounts and the usual amount', () => {
    // per serve meals
    expect(resolvePortion(undefined, undefined)).toEqual({ servings: 1 })
    expect(resolvePortion(undefined, 2.5)).toEqual({ servings: 2.5 })
    expect(resolvePortion(undefined, { amount: 1.5, unit: 'serve' })).toEqual({ servings: 1.5 })
    expect(resolvePortion(undefined, { amount: 180, unit: 'g' })).toBeNull()
    expect(resolvePortion(undefined, undefined, 2)).toEqual({ servings: 2 })
    // per 100 g meals
    const per = { amount: 100, unit: 'g' as const }
    expect(resolvePortion(per, { amount: 180, unit: 'g' })).toEqual({ servings: 1.8, portion: { amount: 180, unit: 'g' } })
    expect(resolvePortion(per, 2)).toEqual({ servings: 2, portion: { amount: 200, unit: 'g' } })
    expect(resolvePortion(per, { amount: 0.5, unit: 'serve' })).toEqual({ servings: 0.5, portion: { amount: 50, unit: 'g' } })
    expect(resolvePortion(per, undefined)).toEqual({ servings: 1, portion: { amount: 100, unit: 'g' } })
    expect(resolvePortion(per, undefined, 250)).toEqual({ servings: 2.5, portion: { amount: 250, unit: 'g' } })
    expect(resolvePortion(per, { amount: 250, unit: 'ml' })).toBeNull()
  })

  it('formats amounts and bases', () => {
    expect(formatAmountNumber(1.5)).toBe('1.5')
    expect(formatAmountNumber(1.25)).toBe('1.25')
    expect(formatAmountNumber(180)).toBe('180')
    expect(formatAmountNumber(1.333333)).toBe('1.33')
    expect(formatAmount(1, 'serve')).toBe('1 serve')
    expect(formatAmount(2, 'serve')).toBe('2 serves')
    expect(formatAmount(180, 'g')).toBe('180 g')
    expect(formatAmount(250, 'ml')).toBe('250 ml')
    expect(basisLabel(undefined)).toBe('per serve')
    expect(basisLabel({ amount: 100, unit: 'g' })).toBe('per 100 g')
    expect(basisLabel({ amount: 2, unit: 'serve' })).toBe('per 2 serves')
  })

  it('labels entries by the portion rule: nothing for one serve, singular at 1 or less, never a times sign', () => {
    expect(portionLabel({ servings: 1 })).toBe('')
    expect(portionLabel({ servings: 1.5 })).toBe('1.5 serves')
    expect(portionLabel({ servings: 0.5 })).toBe('0.5 serve')
    expect(portionLabel({ servings: 2 })).toBe('2 serves')
    expect(portionLabel({ servings: 1.8, portion: { amount: 180, unit: 'g' } })).toBe('180 g')
    expect(portionLabel({ servings: 2.5, portion: { amount: 250, unit: 'ml' } })).toBe('250 ml')
    // a per-serve basis meal logged as one serve carries a serve portion: still nothing
    expect(portionLabel({ servings: 1, portion: { amount: 1, unit: 'serve' } })).toBe('')
    expect(portionLabel({ servings: 2, portion: { amount: 2, unit: 'serve' } })).toBe('2 serves')
    for (const s of [0.25, 0.5, 1.5, 3]) expect(portionLabel({ servings: s })).not.toMatch(/×/)
    expect(portionAria({ servings: 1.8, portion: { amount: 180, unit: 'g' } })).toBe('180 grams')
    expect(portionAria({ servings: 1 })).toBe('')
    expect(portionAria({ servings: 0.5 })).toBe('0.5 serve')
    expect(formatAmountLong(250, 'ml')).toBe('250 millilitres')
    expect(formatAmount(0.5, 'serve')).toBe('0.5 serve')
  })

  it('steps on a grid', () => {
    expect(portionStep('serve', 1)).toBe(0.25)
    expect(portionStep('g', 30)).toBe(5)
    expect(portionStep('g', 180)).toBe(10)
    expect(portionStep('g', 600)).toBe(25)
    expect(stepAmount(1, 'serve', 1)).toBe(1.25)
    expect(stepAmount(1, 'serve', -1)).toBe(0.75)
    expect(stepAmount(0.25, 'serve', -1)).toBe(0.25)
    expect(stepAmount(183, 'g', 1)).toBe(190)
    expect(stepAmount(183, 'g', -1)).toBe(180)
    expect(stepAmount(5, 'g', -1)).toBe(1)
    expect(stepAmount(495, 'g', 1)).toBe(500)
    expect(stepAmount(500, 'g', 1)).toBe(525)
  })
})
