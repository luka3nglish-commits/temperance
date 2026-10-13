import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../lib/types'
import { averageKcal, historyDays, recentEntries, recentKey, underTheLine } from './selectors'

const mk = (id: string, name: string, kcal: number, at: number, servings = 1, day = '2026-10-13'): LogEntry => ({
  id,
  day,
  at,
  name,
  servings,
  macros: { kcal: kcal * servings, protein: 0, carbs: 0, fat: 0 },
})

describe('recentEntries', () => {
  it('dedupes by name + per-serving kcal, newest first, across days', () => {
    const entries = [
      mk('a', 'Oats', 400, 1, 1, '2026-10-11'),
      mk('b', 'Kebab', 850, 2, 1, '2026-10-12'),
      mk('c', 'Oats', 400, 3, 2, '2026-10-13'),
      mk('d', 'oats ', 400, 4, 1, '2026-10-13'),
      mk('e', 'Oats', 520, 5, 1, '2026-10-13'),
    ]
    const r = recentEntries(entries, 12)
    expect(r.map((e) => e.id)).toEqual(['e', 'd', 'b'])
  })

  it('respects the limit and hidden keys', () => {
    const entries = [mk('a', 'A', 100, 1), mk('b', 'B', 200, 2), mk('c', 'C', 300, 3)]
    expect(recentEntries(entries, 2).map((e) => e.id)).toEqual(['c', 'b'])
    expect(recentEntries(entries, 12, [recentKey(entries[2])]).map((e) => e.id)).toEqual(['b', 'a'])
  })
})

describe('history stats', () => {
  it('averages only logged days and counts under the line', () => {
    const entries = [mk('a', 'A', 1800, 1, 1, '2026-10-13'), mk('b', 'B', 2600, 2, 1, '2026-10-12'), mk('c', 'C', 2000, 3, 1, '2026-10-10')]
    const days = historyDays(entries, '2026-10-13', 7)
    expect(averageKcal(days, 7)).toBe(Math.round((1800 + 2600 + 2000) / 3))
    expect(underTheLine(days, 2200, 7)).toEqual({ under: 2, logged: 3 })
  })
})
