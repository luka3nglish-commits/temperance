import { describe, expect, it } from 'vitest'
import type { Ingredient } from './types'
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

const M = (kcal: number, protein = 0, carbs = 0, fat = 0) => ({ kcal, protein, carbs, fat })
const ing = (per: Ingredient['per'], macros = M(130, 2.7, 28, 0.3)): Ingredient => ({
  id: 'ing-1',
  name: 'Rice (cooked)',
  per,
  macros,
  favourite: false,
  createdAt: 0,
  updatedAt: 0,
  useCount: 0,
})

describe('arithmetic', () => {
  it('addMacros adds every field and does not mutate inputs', () => {
    const a = M(100, 10, 20, 5)
    const b = M(50, 1.5, 2.5, 0.5)
    expect(addMacros(a, b)).toEqual(M(150, 11.5, 22.5, 5.5))
    expect(a).toEqual(M(100, 10, 20, 5))
    expect(addMacros(a, ZERO_MACROS)).toEqual(a)
  })

  it('scaleMacros multiplies every field', () => {
    expect(scaleMacros(M(100, 10, 20, 5), 2.5)).toEqual(M(250, 25, 50, 12.5))
    expect(scaleMacros(M(100, 10, 20, 5), 0)).toEqual(M(0))
    expect(scaleMacros(M(100, 10, 20, 5), 1)).toEqual(M(100, 10, 20, 5))
  })

  it('roundMacros rounds half-up at one decimal', () => {
    expect(roundMacros(M(0.25, 6.75, 1.125, 0.05))).toEqual(M(0.3, 6.8, 1.1, 0.1))
    expect(roundMacros(M(100.04, 10.96, 2, 0.449))).toEqual(M(100, 11, 2, 0.4))
    expect(roundMacros(M(234, 18.9, 1.8, 15.9))).toEqual(M(234, 18.9, 1.8, 15.9))
  })

  it('sumMacros of an empty list is zero and never the shared constant mutated', () => {
    const empty = sumMacros([])
    expect(empty).toEqual(M(0))
    expect(isZeroMacros(empty)).toBe(true)
    expect(sumMacros([M(1, 1, 1, 1), M(2, 2, 2, 2), M(3, 3, 3, 3)])).toEqual(M(6, 6, 6, 6))
    expect(ZERO_MACROS).toEqual(M(0))
  })

  it('isZeroMacros is only true when every field is 0', () => {
    expect(isZeroMacros(ZERO_MACROS)).toBe(true)
    expect(isZeroMacros(M(0, 0, 0, 0.1))).toBe(false)
    expect(isZeroMacros(M(1))).toBe(false)
    expect(isZeroMacros(M(0, 0, 5, 0))).toBe(false)
  })
})

describe('ingredients', () => {
  it('ingredientMacrosFor scales a per 100 g ingredient', () => {
    const r = ing({ amount: 100, unit: 'g' })
    expect(ingredientMacrosFor(r, 250)).toEqual(M(325, 6.8, 70, 0.8))
    expect(ingredientMacrosFor(r, 100)).toEqual(M(130, 2.7, 28, 0.3))
    expect(ingredientMacrosFor(r, 0)).toEqual(M(0))
  })

  it('ingredientMacrosFor scales a per 1 serve ingredient', () => {
    const egg = ing({ amount: 1, unit: 'serve' }, M(78, 6.3, 0.6, 5.3))
    expect(ingredientMacrosFor(egg, 3)).toEqual(M(234, 18.9, 1.8, 15.9))
    expect(ingredientMacrosFor(egg, 1)).toEqual(M(78, 6.3, 0.6, 5.3))
  })

  it('ingredientMacrosFor treats a non-positive per amount as 1', () => {
    const broken = ing({ amount: 0, unit: 'g' }, M(10, 1, 1, 1))
    expect(ingredientMacrosFor(broken, 2)).toEqual(M(20, 2, 2, 2))
  })

  it('makeComponent produces a snapshot with the ingredient unit and scaled macros', () => {
    const r = ing({ amount: 100, unit: 'g' })
    const c = makeComponent(r, 150)
    expect(c).toEqual({ ingredientId: 'ing-1', name: 'Rice (cooked)', amount: 150, unit: 'g', macros: M(195, 4.1, 42, 0.5) })
    expect(Object.keys(c).sort()).toEqual(['amount', 'ingredientId', 'macros', 'name', 'unit'])
    // the snapshot is detached from the ingredient object
    expect(c.macros).not.toBe(r.macros)
    const milk = makeComponent(ing({ amount: 100, unit: 'ml' }, M(64, 3.4, 4.8, 3.6)), 250)
    expect(milk.unit).toBe('ml')
    expect(milk.macros.kcal).toBe(160)
  })
})

describe('energy', () => {
  it('kcalFromMacros uses 4, 4 and 9', () => {
    expect(kcalFromMacros({ protein: 10, carbs: 10, fat: 10 })).toBe(170)
    expect(kcalFromMacros({ protein: 0, carbs: 0, fat: 0 })).toBe(0)
    expect(kcalFromMacros({ protein: 42, carbs: 60, fat: 11 })).toBe(507)
    expect(kcalFromMacros(M(999, 1, 0, 0))).toBe(4)
  })

  it('macroEnergySplit sums to 1 and matches the 4/4/9 weights', () => {
    const split = macroEnergySplit(M(0, 10, 10, 10))
    expect(split.protein + split.carbs + split.fat).toBeCloseTo(1, 12)
    expect(split.protein).toBeCloseTo(40 / 170)
    expect(split.carbs).toBeCloseTo(40 / 170)
    expect(split.fat).toBeCloseTo(90 / 170)
    const only = macroEnergySplit(M(0, 50, 0, 0))
    expect(only).toEqual({ protein: 1, carbs: 0, fat: 0 })
  })

  it('macroEnergySplit is all zero when there is no macro energy', () => {
    expect(macroEnergySplit(ZERO_MACROS)).toEqual({ protein: 0, carbs: 0, fat: 0 })
    // a typed kcal without macros still has no split
    expect(macroEnergySplit(M(500))).toEqual({ protein: 0, carbs: 0, fat: 0 })
  })
})
