import { describe, expect, it } from 'vitest'
import type { Ingredient, LogEntry, Meal } from '../lib/types'
import {
  averageKcal,
  disciplineStreak,
  favouritesByUse,
  goalProgress,
  historyDays,
  libraryIngredients,
  libraryMeals,
  loggedDays,
  macroProgress,
  matchesQuery,
  perServingKcal,
  recentKey,
  searchIngredients,
  searchMeals,
} from './selectors'

const meal = (id: string, name: string, favourite = false, lastUsedAt?: number): Meal => ({
  id,
  name,
  kind: 'quick',
  macros: { kcal: 100, protein: 0, carbs: 0, fat: 0 },
  favourite,
  createdAt: 0,
  updatedAt: 0,
  lastUsedAt,
  useCount: 0,
})

const ingredient = (id: string, name: string, favourite = false): Ingredient => ({
  id,
  name,
  per: { amount: 100, unit: 'g' },
  macros: { kcal: 100, protein: 0, carbs: 0, fat: 0 },
  favourite,
  createdAt: 0,
  updatedAt: 0,
  useCount: 0,
})

const entry = (id: string, day: string, kcal: number, at: number, servings = 1, name = 'X'): LogEntry => ({
  id,
  day,
  at,
  name,
  servings,
  macros: { kcal, protein: 0, carbs: 0, fat: 0 },
})

const record = <T extends { id: string }>(list: T[]): Record<string, T> => Object.fromEntries(list.map((x) => [x.id, x]))

describe('favouritesByUse', () => {
  it('orders by last use, then name, and excludes non-favourites', () => {
    const meals = record([
      meal('a', 'Zeta', true, 100),
      meal('b', 'Alpha', true, 300),
      meal('c', 'Beta', true),
      meal('d', 'Aardvark', false, 999),
      meal('e', 'Gamma', true, 100),
    ])
    expect(favouritesByUse(meals).map((m) => m.id)).toEqual(['b', 'e', 'a', 'c'])
  })

  it('is empty with no favourites', () => {
    expect(favouritesByUse(record([meal('a', 'A')]))).toEqual([])
    expect(favouritesByUse({})).toEqual([])
  })
})

describe('libraryMeals and libraryIngredients', () => {
  it('puts favourites first, then alphabetical within each group', () => {
    const meals = record([meal('a', 'Oats'), meal('b', 'Kebab', true), meal('c', 'Apple'), meal('d', 'Zucchini', true)])
    expect(libraryMeals(meals).map((m) => m.name)).toEqual(['Kebab', 'Zucchini', 'Apple', 'Oats'])
  })

  it('ignores last use entirely', () => {
    const meals = record([meal('a', 'B', false, 999), meal('b', 'A', false, 1)])
    expect(libraryMeals(meals).map((m) => m.name)).toEqual(['A', 'B'])
  })

  it('sorts ingredients the same way', () => {
    const ings = record([ingredient('a', 'Rice'), ingredient('b', 'Whey', true), ingredient('c', 'Butter'), ingredient('d', 'Avocado', true)])
    expect(libraryIngredients(ings).map((g) => g.name)).toEqual(['Avocado', 'Whey', 'Butter', 'Rice'])
    expect(libraryIngredients({})).toEqual([])
  })
})

describe('matchesQuery', () => {
  it('matches everything on an empty or whitespace query', () => {
    expect(matchesQuery('Chicken rice', '')).toBe(true)
    expect(matchesQuery('Chicken rice', '   ')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(matchesQuery('Chicken rice', 'CHICK')).toBe(true)
    expect(matchesQuery('CHICKEN RICE', 'rice')).toBe(true)
  })

  it('matches multi-word queries in any order', () => {
    expect(matchesQuery('Rice with chicken', 'chicken rice')).toBe(true)
    expect(matchesQuery('Rice with chicken', 'rice chicken')).toBe(true)
    expect(matchesQuery('Rice with chicken', 'rice beef')).toBe(false)
  })

  it('matches substrings inside words', () => {
    expect(matchesQuery('Overnight oats', 'night')).toBe(true)
    expect(matchesQuery('Overnight oats', 'beef')).toBe(false)
  })
})

describe('searchMeals and searchIngredients', () => {
  const meals = record([meal('a', 'Chicken rice'), meal('b', 'Rice pudding', true), meal('c', 'Oats'), meal('d', 'Fried rice')])

  it('filters while keeping library order', () => {
    expect(searchMeals(meals, 'rice').map((m) => m.name)).toEqual(['Rice pudding', 'Chicken rice', 'Fried rice'])
    expect(searchMeals(meals, 'chicken rice').map((m) => m.name)).toEqual(['Chicken rice'])
    expect(searchMeals(meals, 'xyz')).toEqual([])
    expect(searchMeals(meals, '')).toHaveLength(4)
  })

  it('searches ingredients', () => {
    const ings = record([ingredient('a', 'Whey'), ingredient('b', 'Wheat flour'), ingredient('c', 'Rice')])
    expect(searchIngredients(ings, 'whe').map((g) => g.name)).toEqual(['Wheat flour', 'Whey'])
  })
})

describe('loggedDays', () => {
  it('lists only days with entries, newest first, with totals and counts', () => {
    const entries = [
      entry('a', '2026-10-11', 500, 1),
      entry('b', '2026-10-13', 300, 2),
      entry('c', '2026-10-11', 200, 3),
      entry('d', '2026-09-30', 100, 4),
    ]
    const days = loggedDays(entries)
    expect(days.map((d) => d.day)).toEqual(['2026-10-13', '2026-10-11', '2026-09-30'])
    expect(days[1].totals.kcal).toBe(700)
    expect(days[1].count).toBe(2)
    expect(days[0].count).toBe(1)
  })

  it('is empty with no entries', () => {
    expect(loggedDays([])).toEqual([])
  })
})

describe('disciplineStreak', () => {
  it('counts from yesterday when today is still empty', () => {
    const entries = [entry('a', '2026-10-12', 1500, 1), entry('b', '2026-10-11', 1800, 2), entry('c', '2026-10-10', 1900, 3)]
    expect(disciplineStreak(entries, 2000, '2026-10-13')).toBe(3)
  })

  it('breaks on an over day and on a gap', () => {
    const over = [entry('a', '2026-10-12', 1500, 1), entry('b', '2026-10-11', 2500, 2), entry('c', '2026-10-10', 1900, 3)]
    expect(disciplineStreak(over, 2000, '2026-10-13')).toBe(1)
    const gap = [entry('a', '2026-10-12', 1500, 1), entry('c', '2026-10-10', 1900, 3)]
    expect(disciplineStreak(gap, 2000, '2026-10-13')).toBe(1)
  })

  it('is zero when neither today nor yesterday is logged', () => {
    expect(disciplineStreak([entry('a', '2026-10-10', 100, 1)], 2000, '2026-10-13')).toBe(0)
    expect(disciplineStreak([], 2000, '2026-10-13')).toBe(0)
  })

  it('counts a day exactly on the goal as under the line', () => {
    expect(disciplineStreak([entry('a', '2026-10-13', 2000, 1)], 2000, '2026-10-13')).toBe(1)
  })
})

describe('goalProgress and macroProgress', () => {
  const totals = { kcal: 1250, protein: 90, carbs: 0, fat: 40 }

  it('is a fraction of the goal, uncapped', () => {
    expect(goalProgress(totals, 2500)).toBe(0.5)
    expect(goalProgress({ ...totals, kcal: 3000 }, 2500)).toBe(1.2)
  })

  it('is zero with a zero or negative goal', () => {
    expect(goalProgress(totals, 0)).toBe(0)
    expect(goalProgress(totals, -10)).toBe(0)
  })

  it('macroProgress handles zero targets per macro', () => {
    expect(macroProgress(totals, { protein: 180, carbs: 0, fat: 80 })).toEqual({ protein: 0.5, carbs: 0, fat: 0.5 })
    expect(macroProgress(totals, { protein: 0, carbs: 0, fat: 0 })).toEqual({ protein: 0, carbs: 0, fat: 0 })
  })

  it('macroProgress is uncapped', () => {
    expect(macroProgress({ kcal: 0, protein: 200, carbs: 0, fat: 0 }, { protein: 100, carbs: 1, fat: 1 }).protein).toBe(2)
  })
})

describe('perServingKcal and recentKey', () => {
  it('divides by servings and rounds', () => {
    expect(perServingKcal(entry('a', '2026-10-13', 1200, 1, 3))).toBe(400)
    expect(perServingKcal(entry('a', '2026-10-13', 1000, 1, 3))).toBe(333)
    expect(perServingKcal(entry('a', '2026-10-13', 612.4, 1, 1))).toBe(612)
  })

  it('falls back to the raw kcal when servings is zero', () => {
    expect(perServingKcal(entry('a', '2026-10-13', 250.6, 1, 0))).toBe(251)
  })

  it('builds the key from the trimmed lowercase name and per-serving kcal', () => {
    expect(recentKey(entry('a', '2026-10-13', 800, 1, 2, '  Kebab '))).toBe('kebab|400')
    expect(recentKey(entry('a', '2026-10-13', 800, 1, 2, 'KEBAB'))).toBe(recentKey(entry('b', '2026-10-12', 400, 2, 1, 'kebab')))
  })
})

describe('averageKcal', () => {
  it('is zero with no days or no logged days', () => {
    expect(averageKcal([])).toBe(0)
    expect(averageKcal(historyDays([], '2026-10-13', 7))).toBe(0)
  })

  it('averages only the window asked for', () => {
    const entries = [entry('a', '2026-10-13', 1000, 1), entry('b', '2026-10-12', 2000, 2), entry('c', '2026-10-01', 9000, 3)]
    const days = historyDays(entries, '2026-10-13', 30)
    expect(averageKcal(days, 7)).toBe(1500)
    expect(averageKcal(days, 30)).toBe(4000)
  })
})
