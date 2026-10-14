import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './useStore'
import { totalsForDay } from './selectors'

const T0 = new Date(2026, 9, 13, 8, 0, 0).getTime()

beforeEach(() => {
  useStore.getState().resetAll()
})

describe('deleteEntries', () => {
  it('removes several entries in one write with a single remove pulse', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Rice', macros: { kcal: 200, protein: 4, carbs: 44, fat: 1 } }, T0)
    const a = s.logMeal(m.id, 1, T0)!
    const b = s.logMeal(m.id, 2, T0 + 1)!
    s.deleteEntries([a.id, b.id, 'missing'], T0 + 2)
    expect(useStore.getState().entries).toHaveLength(0)
    const p = useStore.getState().pulse!
    expect(p.kind).toBe('remove')
    expect(p.deltaKcal).toBe(-600)
    expect(p.totalKcal).toBe(0)
  })

  it('repeatDay counts the repeated meals as used again', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Rice', macros: { kcal: 200, protein: 4, carbs: 44, fat: 1 } }, T0)
    const yesterday = new Date(2026, 9, 12, 9).getTime()
    s.logMeal(m.id, 1, yesterday)
    expect(useStore.getState().meals[m.id].useCount).toBe(1)
    s.repeatDay('2026-10-12', '2026-10-13', T0)
    expect(useStore.getState().meals[m.id].useCount).toBe(2)
    expect(useStore.getState().meals[m.id].lastUsedAt).toBe(T0)
  })
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
