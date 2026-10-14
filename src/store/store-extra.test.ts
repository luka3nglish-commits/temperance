import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, useStore } from './useStore'
import { entriesForDay, totalsForDay } from './selectors'
import { localDayKey } from '../lib/day'
import { makeComponent } from '../lib/macros'
import { SCHEMA_VERSION } from '../lib/types'

const T0 = new Date(2026, 9, 13, 8, 0, 0).getTime() // 13 Oct 2026, 8:00 local
const TODAY = localDayKey(new Date(T0))
const YESTERDAY_NOON = new Date(2026, 9, 12, 12, 0, 0).getTime()

const macros = (kcal: number, protein = 0, carbs = 0, fat = 0) => ({ kcal, protein, carbs, fat })

beforeEach(() => {
  useStore.getState().resetAll()
  useStore.getState().clearPulse()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hideRecent', () => {
  it('appends a key once and ignores duplicates', () => {
    const s = useStore.getState()
    s.hideRecent('oats|400')
    const after = useStore.getState().settings.hiddenRecents
    expect(after).toEqual(['oats|400'])
    s.hideRecent('oats|400')
    expect(useStore.getState().settings.hiddenRecents).toBe(after)
    s.hideRecent('kebab|850')
    expect(useStore.getState().settings.hiddenRecents).toEqual(['oats|400', 'kebab|850'])
  })

  it('caps the list at the last 200 keys', () => {
    const s = useStore.getState()
    for (let i = 0; i < 201; i++) s.hideRecent(`k|${i}`)
    const list = useStore.getState().settings.hiddenRecents
    expect(list).toHaveLength(200)
    expect(list[0]).toBe('k|1')
    expect(list[199]).toBe('k|200')
    expect(list.includes('k|0')).toBe(false)
  })
})

describe('settings setters', () => {
  it('setHero, setOpening, setMotion store valid values', () => {
    const s = useStore.getState()
    s.setHero('eaten')
    s.setOpening('full')
    s.setMotion('off')
    const st = useStore.getState().settings
    expect(st.hero).toBe('eaten')
    expect(st.opening).toBe('full')
    expect(st.motion).toBe('off')
    s.setOpening('off')
    s.setMotion('on')
    expect(useStore.getState().settings.opening).toBe('off')
    expect(useStore.getState().settings.motion).toBe('on')
  })

  it('setHero, setOpening, setMotion guard against bad strings', () => {
    const s = useStore.getState()
    s.setHero('eaten')
    s.setOpening('full')
    s.setMotion('on')
    s.setHero('nonsense' as never)
    s.setOpening('nonsense' as never)
    s.setMotion('nonsense' as never)
    const st = useStore.getState().settings
    expect(st.hero).toBe('remaining')
    expect(st.opening).toBe('short')
    expect(st.motion).toBe('system')
  })

  it('setTilt coerces to boolean', () => {
    const s = useStore.getState()
    s.setTilt(true)
    expect(useStore.getState().settings.tilt).toBe(true)
    s.setTilt(0 as never)
    expect(useStore.getState().settings.tilt).toBe(false)
  })

  it('markIntroPlayed increments and resetIntro zeroes', () => {
    const s = useStore.getState()
    expect(useStore.getState().settings.introCount).toBe(0)
    s.markIntroPlayed()
    s.markIntroPlayed()
    expect(useStore.getState().settings.introCount).toBe(2)
    s.resetIntro()
    expect(useStore.getState().settings.introCount).toBe(0)
  })

  it('setName cleans whitespace and clears on blank', () => {
    const s = useStore.getState()
    s.setName('  Marcus   Aurelius ')
    expect(useStore.getState().settings.name).toBe('Marcus Aurelius')
    s.setName('   ')
    expect(useStore.getState().settings.name).toBeUndefined()
  })

  it('setUnit only accepts kcal or kJ', () => {
    const s = useStore.getState()
    s.setUnit('kJ')
    expect(useStore.getState().settings.unit).toBe('kJ')
    s.setUnit('cal' as never)
    expect(useStore.getState().settings.unit).toBe('kcal')
  })
})

describe('updateEntry', () => {
  it('scales macros and components when servings change', () => {
    const s = useStore.getState()
    const rice = s.addIngredient({ name: 'Rice', per: { amount: 100, unit: 'g' }, macros: macros(130, 2.7, 28, 0.3) }, T0)
    const chicken = s.addIngredient({ name: 'Chicken', per: { amount: 100, unit: 'g' }, macros: macros(165, 31, 0, 3.6) }, T0)
    const meal = s.addBuiltMeal({ name: 'Bowl', components: [makeComponent(rice, 100), makeComponent(chicken, 100)] }, T0)
    const e = s.logMeal(meal.id, 1, T0)!
    expect(e.macros.kcal).toBe(295)
    s.updateEntry(e.id, { servings: 2 }, T0 + 10)
    const next = useStore.getState().entries.find((x) => x.id === e.id)!
    expect(next.servings).toBe(2)
    expect(next.macros).toEqual(macros(590, 67.4, 56, 7.8))
    expect(next.components).toHaveLength(2)
    expect(next.components![0].amount).toBe(200)
    expect(next.components![0].macros).toEqual(macros(260, 5.4, 56, 0.6))
    expect(next.components![1].amount).toBe(200)
    expect(next.components![1].macros).toEqual(macros(330, 62, 0, 7.2))
    // the library meal is untouched
    expect(useStore.getState().meals[meal.id].components![0].amount).toBe(100)
  })

  it('scales down and rounds to two decimals of servings', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Soup', macros: macros(400, 20, 40, 10), servings: 2 }, T0)
    expect(e.macros.kcal).toBe(800)
    s.updateEntry(e.id, { servings: 0.5 }, T0 + 10)
    const next = useStore.getState().entries[0]
    expect(next.servings).toBe(0.5)
    expect(next.macros).toEqual(macros(200, 10, 20, 5))
    expect(next.components).toBeUndefined()
  })

  it('a macros patch replaces the numbers without touching servings', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Guess', macros: macros(500, 30, 50, 10), servings: 2 }, T0)
    s.updateEntry(e.id, { macros: macros(612.44, 40.06, 60, 12) }, T0 + 10)
    const next = useStore.getState().entries[0]
    expect(next.servings).toBe(2)
    expect(next.macros).toEqual(macros(612.4, 40.1, 60, 12))
  })

  it('a macros patch wins over a servings patch in the same call', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Both', macros: macros(100), servings: 1 }, T0)
    s.updateEntry(e.id, { servings: 3, macros: macros(50) }, T0 + 10)
    const next = useStore.getState().entries[0]
    expect(next.servings).toBe(3)
    expect(next.macros.kcal).toBe(50)
  })

  it('renames with cleaning and keeps the old name on blank', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Old', macros: macros(100) }, T0)
    s.updateEntry(e.id, { name: '  New   name ' }, T0 + 10)
    expect(useStore.getState().entries[0].name).toBe('New name')
    s.updateEntry(e.id, { name: '   ' }, T0 + 20)
    expect(useStore.getState().entries[0].name).toBe('New name')
  })

  it('emits a pulse with the kcal delta for a today edit, none for a past day', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'A', macros: macros(300) }, T0)
    s.clearPulse()
    s.updateEntry(e.id, { servings: 2 }, T0 + 10)
    const p = useStore.getState().pulse!
    expect(p.kind).toBe('log')
    expect(p.deltaKcal).toBe(300)
    expect(p.totalKcal).toBe(600)
    s.clearPulse()
    s.updateEntry(e.id, { servings: 1 }, T0 + 20)
    expect(useStore.getState().pulse!.kind).toBe('remove')
    expect(useStore.getState().pulse!.deltaKcal).toBe(-300)

    const past = s.logQuick({ name: 'P', macros: macros(100) }, YESTERDAY_NOON)
    s.clearPulse()
    s.updateEntry(past.id, { servings: 2 }, T0 + 30)
    expect(useStore.getState().pulse).toBeNull()
  })

  it('is a no-op for an unknown id', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'A', macros: macros(100) }, T0)
    const before = useStore.getState().entries
    s.updateEntry('missing', { servings: 5 }, T0)
    expect(useStore.getState().entries).toBe(before)
  })
})

describe('deleteEntry and restoreEntry', () => {
  it('does not emit a pulse when deleting a past day entry', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Yesterday', macros: macros(400) }, YESTERDAY_NOON)
    s.clearPulse()
    s.deleteEntry(e.id, T0)
    expect(useStore.getState().pulse).toBeNull()
    expect(useStore.getState().entries).toHaveLength(0)
  })

  it('restoreEntry puts the exact entry back and refuses duplicates', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Gone', macros: macros(250) }, T0)
    s.deleteEntry(e.id, T0 + 1)
    s.clearPulse()
    s.restoreEntry(e, T0 + 2)
    expect(useStore.getState().entries).toEqual([e])
    expect(useStore.getState().pulse!.kind).toBe('log')
    expect(useStore.getState().pulse!.deltaKcal).toBe(250)
    s.restoreEntry(e, T0 + 3)
    expect(useStore.getState().entries).toHaveLength(1)
  })

  it('restoreEntry keeps entries sorted by time', () => {
    const s = useStore.getState()
    const a = s.logQuick({ name: 'A', macros: macros(1) }, T0)
    s.logQuick({ name: 'B', macros: macros(1) }, T0 + 100)
    s.deleteEntry(a.id, T0 + 200)
    s.restoreEntry(a, T0 + 300)
    expect(useStore.getState().entries.map((x) => x.name)).toEqual(['A', 'B'])
  })
})

describe('logQuick and logMeal', () => {
  it('logQuick with saveToLibrary false leaves the library empty and sets no mealId', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Street food', macros: macros(900, 30, 80, 45) }, T0)
    expect(e.mealId).toBeUndefined()
    expect(useStore.getState().meals).toEqual({})
    expect(entriesForDay(useStore.getState().entries, TODAY)).toHaveLength(1)
  })

  it('logQuick with components and saveToLibrary builds a meal and totals from the components', () => {
    const s = useStore.getState()
    const rice = s.addIngredient({ name: 'Rice', per: { amount: 100, unit: 'g' }, macros: macros(130, 2.7, 28, 0.3) }, T0)
    const comps = [makeComponent(rice, 200)]
    const e = s.logQuick({ name: 'Rice only', macros: macros(9999), components: comps, saveToLibrary: true }, T0)
    expect(e.macros).toEqual(macros(260, 5.4, 56, 0.6))
    const meal = useStore.getState().meals[e.mealId!]
    expect(meal.kind).toBe('built')
    expect(meal.useCount).toBe(1)
    expect(meal.lastUsedAt).toBe(T0)
  })

  it('logQuick cleans the name and clamps silly servings', () => {
    const s = useStore.getState()
    const a = s.logQuick({ name: '   ', macros: macros(100), servings: -2 }, T0)
    expect(a.name).toBe('Meal')
    expect(a.servings).toBe(1)
    expect(a.macros.kcal).toBe(100)
    const b = s.logQuick({ name: 'X', macros: macros(100), servings: 1.555 }, T0 + 1)
    expect(b.servings).toBe(1.56)
    expect(b.macros.kcal).toBe(156)
  })

  it('logMeal returns null for a missing meal and leaves the log alone', () => {
    const s = useStore.getState()
    expect(s.logMeal('nope', 1, T0)).toBeNull()
    expect(useStore.getState().entries).toHaveLength(0)
    expect(useStore.getState().pulse).toBeNull()
  })

  it('logMeal with a built meal bumps the ingredients used', () => {
    const s = useStore.getState()
    const rice = s.addIngredient({ name: 'Rice', per: { amount: 100, unit: 'g' }, macros: macros(130) }, T0)
    const meal = s.addBuiltMeal({ name: 'Bowl', components: [makeComponent(rice, 150)] }, T0)
    s.logMeal(meal.id, 2, T0)
    s.logMeal(meal.id, 1, T0 + 1)
    expect(useStore.getState().ingredients[rice.id].useCount).toBe(2)
    expect(useStore.getState().ingredients[rice.id].lastUsedAt).toBe(T0 + 1)
    expect(useStore.getState().meals[meal.id].useCount).toBe(2)
    expect(totalsForDay(useStore.getState().entries, TODAY).kcal).toBe(585)
  })
})

describe('addBuiltMeal and updateMeal', () => {
  it('addBuiltMeal totals the rounded components', () => {
    const s = useStore.getState()
    const comps = [
      { ingredientId: 'a', name: 'A', amount: 100, unit: 'g' as const, macros: macros(100.04, 10.04, 20.04, 5.04) },
      { ingredientId: 'b', name: 'B', amount: 50, unit: 'g' as const, macros: macros(50.06, 5.06, 10.06, 2.06) },
    ]
    const meal = s.addBuiltMeal({ name: 'Two parts', components: comps }, T0)
    expect(meal.kind).toBe('built')
    expect(meal.components![0].macros).toEqual(macros(100, 10, 20, 5))
    expect(meal.components![1].macros).toEqual(macros(50.1, 5.1, 10.1, 2.1))
    expect(meal.macros).toEqual(macros(150.1, 15.1, 30.1, 7.1))
    expect(meal.useCount).toBe(0)
    expect(meal.favourite).toBe(false)
  })

  it('addBuiltMeal with no components is a zero meal', () => {
    const meal = useStore.getState().addBuiltMeal({ name: 'Empty', components: [] }, T0)
    expect(meal.macros).toEqual(macros(0))
    expect(meal.components).toEqual([])
  })

  it('updateMeal with components flips a quick meal to built and recomputes totals', () => {
    const s = useStore.getState()
    const meal = s.addQuickMeal({ name: 'Guess', macros: macros(500, 30, 50, 10) }, T0)
    expect(meal.kind).toBe('quick')
    s.updateMeal(meal.id, { components: [{ ingredientId: 'a', name: 'A', amount: 1, unit: 'serve', macros: macros(78, 6.3, 0.6, 5.3) }] }, T0 + 10)
    const next = useStore.getState().meals[meal.id]
    expect(next.kind).toBe('built')
    expect(next.macros).toEqual(macros(78, 6.3, 0.6, 5.3))
    expect(next.components).toHaveLength(1)
    expect(next.updatedAt).toBe(T0 + 10)
  })

  it('updateMeal ignores a macros patch when components are also given', () => {
    const s = useStore.getState()
    const meal = s.addQuickMeal({ name: 'G', macros: macros(500) }, T0)
    s.updateMeal(meal.id, { macros: macros(1), components: [{ ingredientId: 'a', name: 'A', amount: 1, unit: 'g', macros: macros(10) }] }, T0 + 1)
    expect(useStore.getState().meals[meal.id].macros.kcal).toBe(10)
  })

  it('updateMeal is a no-op for an unknown id and keeps the name on blank', () => {
    const s = useStore.getState()
    const meal = s.addQuickMeal({ name: 'Keep', macros: macros(1) }, T0)
    const before = useStore.getState().meals
    s.updateMeal('missing', { name: 'X' }, T0)
    expect(useStore.getState().meals).toBe(before)
    s.updateMeal(meal.id, { name: '  ' }, T0 + 1)
    expect(useStore.getState().meals[meal.id].name).toBe('Keep')
  })

  it('updateIngredient rejects a non-positive per amount', () => {
    const s = useStore.getState()
    const g = s.addIngredient({ name: 'Rice', per: { amount: 100, unit: 'g' }, macros: macros(130) }, T0)
    s.updateIngredient(g.id, { per: { amount: 0, unit: 'ml' } }, T0 + 1)
    expect(useStore.getState().ingredients[g.id].per).toEqual({ amount: 100, unit: 'g' })
    s.updateIngredient(g.id, { per: { amount: 250, unit: 'ml' } }, T0 + 2)
    expect(useStore.getState().ingredients[g.id].per).toEqual({ amount: 250, unit: 'ml' })
  })
})

describe('export and import extras', () => {
  it('exportData has the version 2 shape', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'X', macros: macros(100) }, T0)
    s.logMeal(m.id, 1, T0)
    const file = s.exportData(T0)
    expect(SCHEMA_VERSION).toBe(3)
    expect(file.version).toBe(3)
    expect(file.app).toBe('temperance')
    expect(file.exportedAt).toBe(T0)
    expect(Object.keys(file).sort()).toEqual(['app', 'entries', 'exportedAt', 'ingredients', 'meals', 'settings', 'version', 'weights'])
    expect(file.settings).toEqual({ ...DEFAULT_SETTINGS })
    expect(file.meals[m.id]).toBeDefined()
    expect(file.entries).toHaveLength(1)
    expect(file.ingredients).toEqual({})
  })

  it('merge keeps the newer library version by updatedAt when the file is newer', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Local', macros: macros(100) }, T0)
    const g = s.addIngredient({ name: 'Local ing', per: { amount: 100, unit: 'g' }, macros: macros(50) }, T0)
    const file = JSON.parse(JSON.stringify(s.exportData(T0))) as ReturnType<typeof s.exportData>
    file.meals[m.id] = { ...file.meals[m.id], name: 'From backup', updatedAt: T0 + 5000 }
    file.ingredients[g.id] = { ...file.ingredients[g.id], name: 'Backup ing', updatedAt: T0 + 5000 }
    const res = s.importData(file, 'merge')
    expect(res).toEqual({ meals: 0, ingredients: 0, entries: 0 })
    expect(useStore.getState().meals[m.id].name).toBe('From backup')
    expect(useStore.getState().ingredients[g.id].name).toBe('Backup ing')
  })

  it('merge keeps the local version on an equal updatedAt and keeps local settings', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Local', macros: macros(100) }, T0)
    s.setGoalKcal(1800)
    const file = JSON.parse(JSON.stringify(s.exportData(T0))) as ReturnType<typeof s.exportData>
    file.meals[m.id] = { ...file.meals[m.id], name: 'Same time' }
    file.settings.goalKcal = 3000
    s.importData(file, 'merge')
    expect(useStore.getState().meals[m.id].name).toBe('Local')
    expect(useStore.getState().settings.goalKcal).toBe(1800)
  })

  it('merge adds new entries and sorts them into place', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'Local later', macros: macros(1) }, T0 + 500)
    const file = {
      app: 'temperance',
      version: 2,
      exportedAt: T0,
      settings: {},
      meals: {},
      ingredients: {},
      entries: [{ id: 'imported', day: TODAY, at: T0, name: 'Imported earlier', servings: 1, macros: macros(5) }],
    }
    const res = s.importData(file, 'merge')
    expect(res.entries).toBe(1)
    expect(useStore.getState().entries.map((e) => e.name)).toEqual(['Imported earlier', 'Local later'])
    expect(useStore.getState().pulse).toBeNull()
  })

  it('replace resets the pulse and replaces everything', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'Before', macros: macros(100) }, T0)
    expect(useStore.getState().pulse).not.toBeNull()
    const file = { app: 'temperance', version: 2, exportedAt: T0, settings: { goalKcal: 1900, hero: 'eaten' }, meals: {}, ingredients: {}, entries: [] }
    const res = s.importData(file, 'replace')
    expect(res).toEqual({ meals: 0, ingredients: 0, entries: 0 })
    expect(useStore.getState().pulse).toBeNull()
    expect(useStore.getState().entries).toEqual([])
    expect(useStore.getState().settings.goalKcal).toBe(1900)
    expect(useStore.getState().settings.hero).toBe('eaten')
    expect(useStore.getState().settings.targets).toEqual(DEFAULT_SETTINGS.targets)
  })

  it('a thrown import leaves the store untouched', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'Keep', macros: macros(100) }, T0)
    const before = useStore.getState().entries
    expect(() => s.importData({ app: 'temperance', version: 9 }, 'replace')).toThrow(/not a Temperance backup/)
    expect(useStore.getState().entries).toBe(before)
  })
})

describe('persist failure', () => {
  it('flags persistFailed when localStorage writes throw, and clears it once they succeed again', () => {
    const s = useStore.getState()
    expect(useStore.getState().persistFailed).toBe(false)
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    try {
      const e = s.logQuick({ name: 'Offline', macros: macros(100) }, T0)
      // the log itself still lands in memory
      expect(useStore.getState().entries.map((x) => x.id)).toEqual([e.id])
      expect(useStore.getState().persistFailed).toBe(true)
    } finally {
      spy.mockRestore()
    }
    s.logQuick({ name: 'Back online', macros: macros(100) }, T0 + 1)
    expect(useStore.getState().persistFailed).toBe(false)
    expect(useStore.getState().entries).toHaveLength(2)
  })

  it('setPersistFailed is a no-op when nothing changes and self-heals on the next good write', () => {
    const s = useStore.getState()
    const before = useStore.getState()
    s.setPersistFailed(false)
    expect(useStore.getState()).toBe(before)
    // while storage works, the write triggered by this very set succeeds and clears the flag again
    s.setPersistFailed(true)
    expect(useStore.getState().persistFailed).toBe(false)
  })

  it('a failing write during a settings change is also flagged', () => {
    const s = useStore.getState()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private mode')
    })
    try {
      s.setGoalKcal(1234)
      expect(useStore.getState().settings.goalKcal).toBe(1234)
      expect(useStore.getState().persistFailed).toBe(true)
    } finally {
      spy.mockRestore()
    }
    s.setGoalKcal(2345)
    expect(useStore.getState().persistFailed).toBe(false)
  })
})
