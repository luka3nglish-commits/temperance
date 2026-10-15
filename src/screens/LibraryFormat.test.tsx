import { describe, expect, it } from 'vitest'
import type { Ingredient, Meal } from '../lib/types'
import { amountLabel, basisLabel, energyText, favouriteItems, fmtGrams, ingredientSubline, loggedText, macroText, mealSubline, mostLogged } from './LibraryFormat'

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

  it('list meta lines carry whole grams and middle dots (polish-spec 4.11)', () => {
    expect(macroText({ protein: 68.8, carbs: 70, fat: 3.6 })).toBe('P 69 · C 70 · F 4')
    expect(mealSubline(meal({}))).toBe('P 32 · C 48 · F 12')
    expect(mealSubline(meal({ macros: { kcal: 97, protein: 9, carbs: 3.6, fat: 5 }, per: { amount: 100, unit: 'g' } }))).toBe('per 100 g · P 9 · C 4 · F 5')
    expect(mealSubline(meal({ per: { amount: 1, unit: 'serve' } }))).toBe('P 32 · C 48 · F 12')
  })

  it('energy in kcal and kJ', () => {
    expect(energyText(612, 'kcal')).toBe('612 kcal')
    expect(energyText(612, 'kJ')).toBe('2 561 kJ')
  })

  it('toast copy follows the portion label rule', () => {
    expect(loggedText({ servings: 1, macros: { kcal: 612, protein: 0, carbs: 0, fat: 0 } }, 'kcal')).toBe('Logged · 612 kcal')
    expect(loggedText({ servings: 1.8, portion: { amount: 180, unit: 'g' }, macros: { kcal: 175, protein: 0, carbs: 0, fat: 0 } }, 'kcal')).toBe('Logged · 180 g · 175 kcal')
    expect(loggedText({ servings: 1.5, macros: { kcal: 1050, protein: 0, carbs: 0, fat: 0 } }, 'kcal')).toBe('Logged · 1.5 serves · 1 050 kcal')
  })

  it('basis labels', () => {
    expect(basisLabel({ amount: 100, unit: 'g' })).toBe('per 100 g')
    expect(basisLabel({ amount: 250, unit: 'ml' })).toBe('per 250 ml')
    expect(basisLabel({ amount: 1, unit: 'serve' })).toBe('per serve')
    expect(basisLabel({ amount: 2, unit: 'serve' })).toBe('per 2 serves')
    expect(amountLabel(1, 'serve')).toBe('1 serve')
    expect(amountLabel(150, 'g')).toBe('150 g')
    expect(amountLabel(0.5, 'serve')).toBe('0.5 serve')
    expect(basisLabel(undefined)).toBe('per serve')
  })

  it('ingredient sub-line carries the basis first', () => {
    expect(ingredientSubline(ing({}))).toBe('per 100 g · P 31 · C 0 · F 4')
    expect(ingredientSubline(ing({ per: { amount: 10, unit: 'ml' } }))).toBe('per 10 ml · P 31 · C 0 · F 4')
  })

  it('never emits a dash', () => {
    for (const s of [mealSubline(meal({})), ingredientSubline(ing({})), basisLabel({ amount: 2, unit: 'serve' }), energyText(1234, 'kJ')]) {
      expect(s).not.toMatch(/[\u2013\u2014]/)
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
