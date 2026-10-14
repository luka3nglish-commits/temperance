import { describe, expect, it } from 'vitest'
import type { Ingredient, LogEntry, Meal } from '../lib/types'
import {
  averageKcal,
  disciplineStreak,
  favouritesByUse,
  goalProgress,
  libraryIngredients,
  libraryMeals,
  loggedDays,
  macroProgress,
  matchesQuery,
  perServingKcal,
  recentKey,
  remainingKcal,
  searchIngredients,
  searchMeals,
  underTheLine,
} from './selectors'

const M = (kcal: number, protein = 0, carbs = 0, fat = 0) => ({ kcal, protein, carbs, fat })

const meal = (id: string, name: string, extra: Partial<Meal> = {}): Meal => ({
  id,
  name,
  kind: 'quick',
  macros: M(100),
  favourite: false,
  createdAt: 0,
  updatedAt: 0,
  useCount: 0,
  ...extra,
})

const ing = (id: string, name: string, favourite = false): Ingredient => ({
  id,
  name,
  per: { amount: 100, unit: 'g' },
  macros: M(100),
  favourite,
  createdAt: 0,
  updatedAt: 0,
  useCount: 0,
})

const entry = (id: string, day: string, kcal: number, at = 0, extra: Partial<LogEntry> = {}): LogEntry => ({
  id,
  day,
  at,
  name: id,
  servings: 1,
  macros: M(kcal),
  ...extra,
})

const record = <T extends { id: string }>(list: T[]): Record<string, T> => Object.fromEntries(list.map((x) => [x.id, x]))

describe('favouritesByUse', () => {
  it('orders favourites by last use, newest first, then by name', () => {
    const meals = record([
      meal('a', 'Zeta', { favourite: true, lastUsedAt: 100 }),
      meal('b', 'Alpha', { favourite: true, lastUsedAt: 300 }),
      meal('c', 'Mid', { favourite: true, lastUsedAt: 100 }),
      meal('d', 'Never', { favourite: true }),
      meal('e', 'Not fav', { favourite: false, lastUsedAt: 999 }),
    ])
    expect(favouritesByUse(meals).map((m) => m.name)).toEqual(['Alpha', 'Mid', 'Zeta', 'Never'])
  })

  it('returns an empty list when nothing is a favourite', () => {
    expect(favouritesByUse(record([meal('a', 'A'), meal('b', 'B')]))).toEqual([])
    expect(favouritesByUse({})).toEqual([])
  })
})

describe('library ordering', () => {
  it('libraryMeals puts favourites first then sorts alphabetically within each group', () => {
    const meals = record([meal('a', 'Toast'), meal('b', 'Oats', { favourite: true }), meal('c', 'Beans'), meal('d', 'Whey', { favourite: true })])
    expect(libraryMeals(meals).map((m) => m.name)).toEqual(['Oats', 'Whey', 'Beans', 'Toast'])
  })

  it('libraryIngredients does the same for ingredients', () => {
    const ings = record([ing('a', 'Rice'), ing('b', 'Chicken', true), ing('c', 'Avocado'), ing('d', 'Egg', true)])
    expect(libraryIngredients(ings).map((g) => g.name)).toEqual(['Chicken', 'Egg', 'Avocado', 'Rice'])
    expect(libraryIngredients({})).toEqual([])
  })
})

describe('matchesQuery and search', () => {
  it('an empty or whitespace query matches everything', () => {
    expect(matchesQuery('Chicken and rice', '')).toBe(true)
    expect(matchesQuery('Chicken and rice', '   ')).toBe(true)
    expect(matchesQuery('', '')).toBe(true)
  })

  it('is case-insensitive and substring friendly', () => {
    expect(matchesQuery('Chicken and rice', 'CHICK')).toBe(true)
    expect(matchesQuery('Chicken and rice', 'and r')).toBe(true)
    expect(matchesQuery('Chicken and rice', 'beef')).toBe(false)
  })

  it('a multi-word query matches when every word appears, in any order', () => {
    expect(matchesQuery('Chicken and rice', 'rice chicken')).toBe(true)
    expect(matchesQuery('Chicken and rice', '  rice   chicken ')).toBe(true)
    expect(matchesQuery('Chicken and rice', 'rice beef')).toBe(false)
  })

  it('searchMeals keeps library ordering and filters by name', () => {
    const meals = record([meal('a', 'Chicken rice'), meal('b', 'Chicken wrap', { favourite: true }), meal('c', 'Beef rice')])
    expect(searchMeals(meals, 'chicken').map((m) => m.name)).toEqual(['Chicken wrap', 'Chicken rice'])
    expect(searchMeals(meals, 'rice').map((m) => m.name)).toEqual(['Beef rice', 'Chicken rice'])
    expect(searchMeals(meals, 'zzz')).toEqual([])
    expect(searchMeals(meals, '')).toHaveLength(3)
  })

  it('searchIngredients filters the same way', () => {
    const ings = record([ing('a', 'Brown rice'), ing('b', 'White rice', true), ing('c', 'Oats')])
    expect(searchIngredients(ings, 'rice').map((g) => g.name)).toEqual(['White rice', 'Brown rice'])
  })
})

describe('loggedDays', () => {
  it('lists only days with entries, newest first, with totals and counts', () => {
    const entries = [
      entry('a', '2026-10-11', 500, 1),
      entry('b', '2026-10-13', 300, 5),
      entry('c', '2026-10-11', 700, 2),
      entry('d', '2026-09-30', 100, 0),
    ]
    const days = loggedDays(entries)
    expect(days.map((d) => d.day)).toEqual(['2026-10-13', '2026-10-11', '2026-09-30'])
    expect(days[1].totals.kcal).toBe(1200)
    expect(days[1].count).toBe(2)
    expect(days[0].count).toBe(1)
    expect(loggedDays([])).toEqual([])
  })
})

describe('disciplineStreak', () => {
  it('starts from yesterday when today is empty', () => {
    const entries = [entry('a', '2026-10-12', 1500), entry('b', '2026-10-11', 1800), entry('c', '2026-10-10', 1900)]
    expect(disciplineStreak(entries, 2000, '2026-10-13')).toBe(3)
  })

  it('breaks on a gap day and on an over-goal day', () => {
    const gap = [entry('a', '2026-10-12', 1500), entry('b', '2026-10-10', 1500)]
    expect(disciplineStreak(gap, 2000, '2026-10-13')).toBe(1)
    const over = [entry('a', '2026-10-13', 1500), entry('b', '2026-10-12', 2500), entry('c', '2026-10-11', 1500)]
    expect(disciplineStreak(over, 2000, '2026-10-13')).toBe(1)
    expect(disciplineStreak([], 2000, '2026-10-13')).toBe(0)
  })

  it('exactly at the goal still counts', () => {
    expect(disciplineStreak([entry('a', '2026-10-13', 2000)], 2000, '2026-10-13')).toBe(1)
  })
})

describe('progress', () => {
  it('goalProgress is 0 for a zero or negative goal and uncapped otherwise', () => {
    expect(goalProgress(M(500), 0)).toBe(0)
    expect(goalProgress(M(500), -100)).toBe(0)
    expect(goalProgress(M(500), 1000)).toBe(0.5)
    expect(goalProgress(M(1200), 1000)).toBeCloseTo(1.2)
    expect(remainingKcal(M(1200), 1000)).toBe(-200)
  })

  it('macroProgress returns 0 for a zero target and ratios otherwise', () => {
    expect(macroProgress(M(0, 90, 50, 20), { protein: 0, carbs: 0, fat: 0 })).toEqual({ protein: 0, carbs: 0, fat: 0 })
    const p = macroProgress(M(0, 90, 125, 100), { protein: 180, carbs: 250, fat: 80 })
    expect(p.protein).toBe(0.5)
    expect(p.carbs).toBe(0.5)
    expect(p.fat).toBe(1.25)
    expect(macroProgress(M(0, 90, 0, 0), { protein: 0, carbs: 250, fat: 80 })).toEqual({ protein: 0, carbs: 0, fat: 0 })
  })
})

describe('recents helpers', () => {
  it('perServingKcal divides by servings and rounds', () => {
    expect(perServingKcal(entry('a', '2026-10-13', 1000, 0, { servings: 3 }))).toBe(333)
    expect(perServingKcal(entry('b', '2026-10-13', 850, 0, { servings: 1 }))).toBe(850)
    expect(perServingKcal(entry('c', '2026-10-13', 412.6, 0, { servings: 0 }))).toBe(413)
  })

  it('recentKey lowercases and trims the name and appends per-serving kcal', () => {
    expect(recentKey(entry('a', '2026-10-13', 800, 0, { name: '  Chicken Rice ', servings: 2 }))).toBe('chicken rice|400')
    expect(recentKey(entry('a', '2026-10-13', 400, 0, { name: 'chicken rice' }))).toBe('chicken rice|400')
  })
})

describe('averageKcal and underTheLine with no data', () => {
  it('returns 0 and zero counts when nothing is logged', () => {
    expect(averageKcal([], 7)).toBe(0)
    const empty = [{ day: '2026-10-13', totals: M(0), count: 0 }]
    expect(averageKcal(empty, 7)).toBe(0)
    expect(underTheLine(empty, 2000, 7)).toEqual({ under: 0, logged: 0 })
    expect(underTheLine([], 2000, 7)).toEqual({ under: 0, logged: 0 })
  })

  it('averageKcal only looks at the first n days', () => {
    const days = [
      { day: '2026-10-13', totals: M(1000), count: 1 },
      { day: '2026-10-12', totals: M(3000), count: 1 },
      { day: '2026-10-11', totals: M(9000), count: 1 },
    ]
    expect(averageKcal(days, 2)).toBe(2000)
  })
})
