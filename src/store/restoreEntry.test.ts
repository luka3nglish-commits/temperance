import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './useStore'
import { totalsForDay } from './selectors'

const T0 = new Date(2026, 9, 13, 8, 0, 0).getTime()

beforeEach(() => {
  useStore.getState().resetAll()
})

describe('restoreEntry', () => {
  it('puts a deleted entry back and re-emits a log pulse', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Soup', macros: { kcal: 300, protein: 10, carbs: 30, fat: 8 } }, T0)
    const e = s.logMeal(m.id, 1, T0)!
    s.deleteEntry(e.id, T0 + 1)
    expect(totalsForDay(useStore.getState().entries, e.day).kcal).toBe(0)
    s.restoreEntry(e, T0 + 2)
    expect(totalsForDay(useStore.getState().entries, e.day).kcal).toBe(300)
    expect(useStore.getState().pulse?.kind).toBe('log')
    s.restoreEntry(e, T0 + 3)
    expect(useStore.getState().entries).toHaveLength(1)
  })
})
