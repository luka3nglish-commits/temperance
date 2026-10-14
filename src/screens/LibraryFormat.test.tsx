import { describe, expect, it } from 'vitest'
import type { Ingredient, Meal } from '../lib/types'
import { amountLabel, basisLabel, favouriteItems, fmtGrams, ingredientSubline, mealSubline, mostLogged, roman } from './LibraryFormat'

const meal = (over: Partial<Meal>): Meal => ({
  id: 'm',
  name: 'Meal',
  kind: 'quick',
  macros: { kcal: 612, protein: 32, carbs: 48, fat: 12 },
  favourite: false,
  createdAt: 0,
  updatedAt: 0,
  useCount: 0,
  ...over,
})

const ing = (over: Partial<Ingredient>): Ingredient => ({
  id: 'i',
  name: 'Chicken',
  per: { amount: 100, unit: 'g' },
  macros: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  favourite: false,
  createdAt: 0,
  updatedAt: 0,
  useCount: 0,
  ...over,
})

describe('library formatting', () => {
  it('grams: whole when whole, one decimal otherwise', () => {
    expect(fmtGrams(32)).toBe('32')
    expect(fmtGrams(3.6)).toBe('3.6')
    expect(fmtGrams(3.64)).toBe('3.6')
    expect(fmtGrams(0)).toBe('0')
  })

  it('meal sub-line in kcal and kJ', () => {
    expect(mealSubline({ kcal: 612, protein: 32, carbs: 48, fat: 12 }, 'kcal')).toBe('612 kcal · P 32 C 48 F 12')
    expect(mealSubline({ kcal: 612, protein: 32, carbs: 48, fat: 12 }, 'kJ')).toBe('2 561 kJ · P 32 C 48 F 12')
  })

  it('basis labels', () => {
    expect(basisLabel({ amount: 100, unit: 'g' })).toBe('per 100 g')
    expect(basisLabel({ amount: 250, unit: 'ml' })).toBe('per 250 ml')
    expect(basisLabel({ amount: 1, unit: 'serve' })).toBe('per serve')
    expect(basisLabel({ amount: 2, unit: 'serve' })).toBe('per 2 serves')
    expect(amountLabel(1, 'serve')).toBe('1 serve')
    expect(amountLabel(150, 'g')).toBe('150 g')
  })

  it('ingredient sub-line carries the basis first', () => {
    expect(ingredientSubline(ing({}), 'kcal')).toBe('per 100 g · 165 kcal · P 31 C 0 F 3.6')
  })

  it('never emits a dash', () => {
    for (const s of [mealSubline({ kcal: 1234, protein: 1.5, carbs: 0, fat: 0 }, 'kJ'), ingredientSubline(ing({}), 'kJ'), basisLabel({ amount: 2, unit: 'serve' })]) {
      expect(s).not.toMatch(/[–—]/)
    }
  })
})

describe('favourites folder order', () => {
  it('merges meals and ingredients, last used first, then name', () => {
    const meals = {
      a: meal({ id: 'a', name: 'Zeta', favourite: true, lastUsedAt: 10 }),
      b: meal({ id: 'b', name: 'Alpha', favourite: true }),
      c: meal({ id: 'c', name: 'Not kept', favourite: false, lastUsedAt: 99 }),
    }
    const ingredients = {
      x: ing({ id: 'x', name: 'Beta', favourite: true }),
      y: ing({ id: 'y', name: 'Yolk', favourite: true, lastUsedAt: 20 }),
    }
    const out = favouriteItems(meals, ingredients).map((f) => `${f.kind}:${f.item.name}`)
    expect(out).toEqual(['ingredient:Yolk', 'meal:Zeta', 'meal:Alpha', 'ingredient:Beta'])
  })
})

describe('most logged sort', () => {
  it('useCount desc, then name', () => {
    const out = mostLogged([meal({ name: 'B', useCount: 2 }), meal({ name: 'A', useCount: 2 }), meal({ name: 'C', useCount: 9 })]).map((m) => m.name)
    expect(out).toEqual(['C', 'A', 'B'])
  })
})

describe('roman numerals', () => {
  it('counts like an inscription', () => {
    expect(roman(1)).toBe('I')
    expect(roman(4)).toBe('IV')
    expect(roman(24)).toBe('XXIV')
    expect(roman(300)).toBe('CCC')
    expect(roman(1994)).toBe('MCMXCIV')
    expect(roman(0)).toBe('0')
  })
})
