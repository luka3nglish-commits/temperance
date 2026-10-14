import { describe, expect, it } from 'vitest'
import type { Ingredient, Macros } from './types'
import {
  ZERO_MACROS,
  addMacros,
  ingredientMacrosFor,
  isZeroMacros,
  kcalFromMacros,
  macroEnergySplit,
  makeComponent,
  roundMacros,
  scaleMacros,
  sumMacros,
} from './macros'

const m = (kcal: number, protein: number, carbs: number, fat: number): Macros => ({ kcal, protein, carbs, fat })

const ing = (over: Partial<Ingredient> = {}): Ingredient => ({
  id: 'ing-1',
  name: 'Oats',
  per: { amount: 100, unit: 'g' },
  macros: m(379, 13.2, 67.7, 6.5),
  favourite: false,
  createdAt: 0,
  updatedAt: 0,
  useCount: 0,
  ...over,
})

describe('addMacros and scaleMacros', () => {
  it('adds every field', () => {
    expect(addMacros(m(100, 10, 20, 5), m(50, 1, 2, 3))).toEqual(m(150, 11, 22, 8))
  })

  it('adding zero is the identity', () => {
    const a = m(123, 4.5, 6, 7.5)
    expect(addMacros(a, ZERO_MACROS)).toEqual(a)
    expect(addMacros(ZERO_MACROS, a)).toEqual(a)
  })

  it('does not mutate its inputs', () => {
    const a = m(100, 10, 20, 5)
    const b = m(1, 1, 1, 1)
    addMacros(a, b)
    expect(a).toEqual(m(100, 10, 20, 5))
    expect(b).toEqual(m(1, 1, 1, 1))
  })

  it('scales every field by the factor', () => {
    expect(scaleMacros(m(100, 10, 20, 5), 2)).toEqual(m(200, 20, 40, 10))
    expect(scaleMacros(m(100, 10, 20, 5), 0)).toEqual(m(0, 0, 0, 0))
  })

  it('scales fractionally without rounding', () => {
    const r = scaleMacros(m(100, 10, 20, 5), 1 / 3)
    expect(r.kcal).toBeCloseTo(33.3333, 3)
    expect(r.protein).toBeCloseTo(3.3333, 3)
  })
})

describe('roundMacros', () => {
  it('rounds to one decimal place', () => {
    expect(roundMacros(m(123.44, 1.04, 2.96, 0.01))).toEqual(m(123.4, 1, 3, 0))
  })

  it('rounds half up at one decimal', () => {
    // these halves are exact in binary so the rule is observable
    expect(roundMacros(m(6.75, 1.25, 2.75, 0.5))).toEqual(m(6.8, 1.3, 2.8, 0.5))
    expect(roundMacros(m(0.25, 10.75, 3.125, 7.5))).toEqual(m(0.3, 10.8, 3.1, 7.5))
  })

  it('leaves whole numbers alone', () => {
    expect(roundMacros(m(500, 40, 60, 12))).toEqual(m(500, 40, 60, 12))
  })
})

describe('sumMacros and isZeroMacros', () => {
  it('sums an empty list to zero', () => {
    expect(sumMacros([])).toEqual(ZERO_MACROS)
    expect(isZeroMacros(sumMacros([]))).toBe(true)
  })

  it('sums several', () => {
    expect(sumMacros([m(100, 1, 2, 3), m(200, 4, 5, 6), m(50, 0.5, 0.5, 0.5)])).toEqual(m(350, 5.5, 7.5, 9.5))
  })

  it('returns a fresh object, never the shared ZERO_MACROS, when summing non-empty lists', () => {
    const r = sumMacros([m(1, 0, 0, 0)])
    expect(r).not.toBe(ZERO_MACROS)
    expect(ZERO_MACROS).toEqual(m(0, 0, 0, 0))
  })

  it('isZeroMacros is strict on every field', () => {
    expect(isZeroMacros(m(0, 0, 0, 0))).toBe(true)
    expect(isZeroMacros(m(0, 0, 0, 0.1))).toBe(false)
    expect(isZeroMacros(m(1, 0, 0, 0))).toBe(false)
  })
})

describe('ingredientMacrosFor', () => {
  it('scales per 100 g', () => {
    expect(ingredientMacrosFor(ing(), 50)).toEqual(m(189.5, 6.6, 33.9, 3.3))
    expect(ingredientMacrosFor(ing(), 100)).toEqual(m(379, 13.2, 67.7, 6.5))
    expect(ingredientMacrosFor(ing(), 0)).toEqual(ZERO_MACROS)
  })

  it('scales per 1 serve', () => {
    const egg = ing({ name: 'Egg', per: { amount: 1, unit: 'serve' }, macros: m(78, 6.3, 0.6, 5.3) })
    expect(ingredientMacrosFor(egg, 3)).toEqual(m(234, 18.9, 1.8, 15.9))
    expect(ingredientMacrosFor(egg, 1)).toEqual(m(78, 6.3, 0.6, 5.3))
  })

  it('treats a non-positive per amount as 1', () => {
    const bad = ing({ per: { amount: 0, unit: 'g' }, macros: m(10, 1, 1, 1) })
    expect(ingredientMacrosFor(bad, 2)).toEqual(m(20, 2, 2, 2))
  })

  it('rounds the result to one decimal', () => {
    const r = ingredientMacrosFor(ing(), 33)
    expect(r.kcal).toBe(125.1)
    expect(r.carbs).toBe(22.3)
  })
})

describe('makeComponent', () => {
  it('snapshots the ingredient into a component', () => {
    const c = makeComponent(ing(), 250)
    expect(c).toEqual({
      ingredientId: 'ing-1',
      name: 'Oats',
      amount: 250,
      unit: 'g',
      macros: m(947.5, 33, 169.3, 16.3),
    })
  })

  it('carries the ingredient unit through', () => {
    const milk = ing({ id: 'milk', name: 'Milk', per: { amount: 100, unit: 'ml' }, macros: m(64, 3.4, 4.8, 3.6) })
    const c = makeComponent(milk, 200)
    expect(c.unit).toBe('ml')
    expect(c.macros).toEqual(m(128, 6.8, 9.6, 7.2))
  })

  it('does not keep a reference to the ingredient macros object', () => {
    const base = ing()
    const c = makeComponent(base, 100)
    expect(c.macros).not.toBe(base.macros)
  })
})

describe('kcalFromMacros', () => {
  it('uses 4 / 4 / 9', () => {
    expect(kcalFromMacros({ protein: 10, carbs: 20, fat: 5 })).toBe(165)
    expect(kcalFromMacros({ protein: 0, carbs: 0, fat: 0 })).toBe(0)
    expect(kcalFromMacros({ protein: 1, carbs: 0, fat: 0 })).toBe(4)
    expect(kcalFromMacros({ protein: 0, carbs: 0, fat: 1 })).toBe(9)
  })

  it('ignores the kcal field when given full macros', () => {
    expect(kcalFromMacros(m(9999, 10, 10, 10))).toBe(170)
  })
})

describe('macroEnergySplit', () => {
  it('is all zero on empty macros', () => {
    expect(macroEnergySplit(ZERO_MACROS)).toEqual({ protein: 0, carbs: 0, fat: 0 })
  })

  it('ignores the stored kcal and uses macro energy only', () => {
    expect(macroEnergySplit(m(1000, 0, 0, 0))).toEqual({ protein: 0, carbs: 0, fat: 0 })
  })

  it('sums to one', () => {
    const s = macroEnergySplit(m(0, 30, 50, 20))
    expect(s.protein + s.carbs + s.fat).toBeCloseTo(1, 10)
    expect(s.protein).toBeCloseTo(120 / 500)
    expect(s.carbs).toBeCloseTo(200 / 500)
    expect(s.fat).toBeCloseTo(180 / 500)
  })

  it('gives a single macro the whole share', () => {
    expect(macroEnergySplit(m(0, 25, 0, 0))).toEqual({ protein: 1, carbs: 0, fat: 0 })
    expect(macroEnergySplit(m(0, 0, 0, 7))).toEqual({ protein: 0, carbs: 0, fat: 1 })
  })
})
