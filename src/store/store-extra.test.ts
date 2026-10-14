import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, useStore } from './useStore'
import { entriesForDay, totalsForDay } from './selectors'
import { makeComponent } from '../lib/macros'
import { SCHEMA_VERSION } from '../lib/types'
import type { Macros, MealComponent } from '../lib/types'

const T0 = new Date(2026, 9, 13, 8, 0, 0).getTime() // 13 Oct 2026, 8:00 local
const YESTERDAY = new Date(2026, 9, 12, 9, 0, 0).getTime()
const M = (kcal: number, protein = 0, carbs = 0, fat = 0): Macros => ({ kcal, protein, carbs, fat })

beforeEach(() => {
  useStore.getState().resetAll()
  useStore.getState().setPersistFailed(false)
})

describe('settings actions', () => {
  it('hideRecent dedupes keys', () => {
    const s = useStore.getState()
    s.hideRecent('oats|400')
    s.hideRecent('oats|400')
    s.hideRecent('kebab|850')
    expect(useStore.getState().settings.hiddenRecents).toEqual(['oats|400', 'kebab|850'])
  })

  it('hideRecent keeps only the most recent 200 keys', () => {
    const s = useStore.getState()
    for (let i = 0; i < 205; i++) s.hideRecent(`k${i}`)
    const hidden = useStore.getState().settings.hiddenRecents
    expect(hidden).toHaveLength(200)
    expect(hidden[0]).toBe('k5')
    expect(hidden[199]).toBe('k204')
    expect(hidden).not.toContain('k4')
  })

  it('setHero, setOpening, setTilt and setMotion write through', () => {
    const s = useStore.getState()
    s.setHero('eaten')
    expect(useStore.getState().settings.hero).toBe('eaten')
    s.setHero('remaining')
    expect(useStore.getState().settings.hero).toBe('remaining')
    s.setOpening('full')
    expect(useStore.getState().settings.opening).toBe('full')
    s.setOpening('off')
    expect(useStore.getState().settings.opening).toBe('off')
    s.setTilt(true)
    expect(useStore.getState().settings.tilt).toBe(true)
    s.setTilt(false)
    expect(useStore.getState().settings.tilt).toBe(false)
    s.setMotion('on')
    expect(useStore.getState().settings.motion).toBe('on')
    s.setMotion('system')
    expect(useStore.getState().settings.motion).toBe('system')
  })

  it('markIntroPlayed counts up and resetIntro zeroes it', () => {
    const s = useStore.getState()
    expect(useStore.getState().settings.introCount).toBe(0)
    s.markIntroPlayed()
    s.markIntroPlayed()
    expect(useStore.getState().settings.introCount).toBe(2)
    s.resetIntro()
    expect(useStore.getState().settings.introCount).toBe(0)
  })

  it('setUnit only accepts the two known units', () => {
    const s = useStore.getState()
    s.setUnit('kJ')
    expect(useStore.getState().settings.unit).toBe('kJ')
    s.setUnit('bogus' as never)
    expect(useStore.getState().settings.unit).toBe('kcal')
  })

  it('setName trims, collapses whitespace and clears on empty', () => {
    const s = useStore.getState()
    s.setName('  Marcus   Aurelius ')
    expect(useStore.getState().settings.name).toBe('Marcus Aurelius')
    s.setName('   ')
    expect(useStore.getState().settings.name).toBeUndefined()
  })
})

describe('updateEntry', () => {
  it('scales macros and components when servings change', () => {
    const s = useStore.getState()
    const rice = s.addIngredient({ name: 'Rice', per: { amount: 100, unit: 'g' }, macros: M(130, 2.7, 28, 0.3) }, T0)
    const comps = [makeComponent(rice, 100)]
    const e = s.logQuick({ name: 'Rice bowl', macros: M(130, 2.7, 28, 0.3), components: comps, servings: 1 }, T0)
    s.updateEntry(e.id, { servings: 2 }, T0 + 1)
    const next = useStore.getState().entries.find((x) => x.id === e.id)!
    expect(next.servings).toBe(2)
    expect(next.macros.kcal).toBe(260)
    expect(next.macros.protein).toBe(5.4)
    expect(next.components).toHaveLength(1)
    expect(next.components![0].amount).toBe(200)
    expect(next.components![0].macros.kcal).toBe(260)
    expect(next.components![0].macros.carbs).toBe(56)
    // the library ingredient is untouched
    expect(useStore.getState().ingredients[rice.id].macros.kcal).toBe(130)
  })

  it('scaling down then up round-trips the snapshot', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Soup', macros: M(300, 10, 30, 8), servings: 2 }, T0)
    expect(e.macros.kcal).toBe(600)
    s.updateEntry(e.id, { servings: 1 }, T0 + 1)
    expect(useStore.getState().entries[0].macros.kcal).toBe(300)
    s.updateEntry(e.id, { servings: 3 }, T0 + 2)
    expect(useStore.getState().entries[0].macros.kcal).toBe(900)
    expect(useStore.getState().entries[0].macros.fat).toBe(24)
  })

  it('applies a macros patch with rounding and emits a pulse for today', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Guess', macros: M(500, 20, 50, 10) }, T0)
    s.clearPulse()
    s.updateEntry(e.id, { macros: { kcal: 612.04, protein: 33.25, carbs: 40, fat: 9.96 } }, T0 + 1)
    const next = useStore.getState().entries[0]
    expect(next.macros).toEqual({ kcal: 612, protein: 33.3, carbs: 40, fat: 10 })
    const p = useStore.getState().pulse!
    expect(p.kind).toBe('log')
    expect(p.deltaKcal).toBe(112)
    expect(p.totalKcal).toBe(612)
  })

  it('a lower macros patch emits a remove pulse, and a no-change patch leaves the pulse alone', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Guess', macros: M(500) }, T0)
    s.clearPulse()
    s.updateEntry(e.id, { macros: M(400) }, T0 + 1)
    expect(useStore.getState().pulse?.kind).toBe('remove')
    expect(useStore.getState().pulse?.deltaKcal).toBe(-100)
    s.clearPulse()
    s.updateEntry(e.id, { name: 'Renamed' }, T0 + 2)
    expect(useStore.getState().pulse).toBeNull()
    expect(useStore.getState().entries[0].name).toBe('Renamed')
  })

  it('renaming to blank keeps the old name', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Keep me', macros: M(100) }, T0)
    s.updateEntry(e.id, { name: '   ' }, T0 + 1)
    expect(useStore.getState().entries[0].name).toBe('Keep me')
  })

  it('ignores an unknown id', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'A', macros: M(100) }, T0)
    const before = useStore.getState().entries
    s.updateEntry('nope', { servings: 5 }, T0 + 1)
    expect(useStore.getState().entries).toBe(before)
  })
})

describe('deleteEntry and pulses', () => {
  it('does not emit a pulse when deleting an entry from a past day', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Old', macros: M(400) }, YESTERDAY)
    s.clearPulse()
    expect(useStore.getState().pulse).toBeNull()
    s.deleteEntry(e.id, T0)
    expect(useStore.getState().pulse).toBeNull()
    expect(useStore.getState().entries).toHaveLength(0)
  })

  it('does not emit a pulse when editing an entry from a past day', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Old', macros: M(400) }, YESTERDAY)
    s.clearPulse()
    s.updateEntry(e.id, { servings: 2 }, T0)
    expect(useStore.getState().pulse).toBeNull()
    expect(useStore.getState().entries[0].macros.kcal).toBe(800)
  })

  it('ignores an unknown id', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'A', macros: M(100) }, T0)
    s.clearPulse()
    s.deleteEntry('nope', T0)
    expect(useStore.getState().entries).toHaveLength(1)
    expect(useStore.getState().pulse).toBeNull()
  })

  it('clearPulse is a no-op when there is no pulse', () => {
    const s = useStore.getState()
    expect(useStore.getState().pulse).toBeNull()
    s.clearPulse()
    expect(useStore.getState().pulse).toBeNull()
  })
})

describe('logging', () => {
  it('logQuick without saveToLibrary leaves the library empty', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Street food', macros: M(900, 30, 90, 40) }, T0)
    expect(e.mealId).toBeUndefined()
    expect(Object.keys(useStore.getState().meals)).toHaveLength(0)
    expect(useStore.getState().entries).toHaveLength(1)
    expect(useStore.getState().pulse?.deltaKcal).toBe(900)
  })

  it('logQuick with components and saveToLibrary saves a built meal', () => {
    const s = useStore.getState()
    const egg = s.addIngredient({ name: 'Egg', per: { amount: 1, unit: 'serve' }, macros: M(78, 6.3, 0.6, 5.3) }, T0)
    const comps = [makeComponent(egg, 2)]
    const e = s.logQuick({ name: 'Eggs', macros: M(156, 12.6, 1.2, 10.6), components: comps, saveToLibrary: true }, T0)
    const meal = useStore.getState().meals[e.mealId!]
    expect(meal.kind).toBe('built')
    expect(meal.components).toHaveLength(1)
    expect(meal.useCount).toBe(1)
    expect(meal.lastUsedAt).toBe(T0)
  })

  it('logQuick clamps servings and cleans the name', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: '   ', macros: M(100), servings: -2 }, T0)
    expect(e.name).toBe('Meal')
    expect(e.servings).toBe(1)
    const f = s.logQuick({ name: 'Half', macros: M(100), servings: 0.333 }, T0 + 1)
    expect(f.servings).toBe(0.33)
    expect(f.macros.kcal).toBe(33)
  })

  it('logMeal returns null for a missing meal and logs nothing', () => {
    const s = useStore.getState()
    expect(s.logMeal('missing', 1, T0)).toBeNull()
    expect(useStore.getState().entries).toHaveLength(0)
    expect(useStore.getState().pulse).toBeNull()
  })

  it('logMeal scales built-meal components by servings', () => {
    const s = useStore.getState()
    const rice = s.addIngredient({ name: 'Rice', per: { amount: 100, unit: 'g' }, macros: M(130, 2.7, 28, 0.3) }, T0)
    const meal = s.addBuiltMeal({ name: 'Rice', components: [makeComponent(rice, 100)] }, T0)
    const e = s.logMeal(meal.id, 1.5, T0)!
    expect(e.components![0].amount).toBe(150)
    expect(e.components![0].macros.kcal).toBe(195)
    expect(e.macros.kcal).toBe(195)
    expect(useStore.getState().meals[meal.id].useCount).toBe(1)
    expect(useStore.getState().ingredients[rice.id].lastUsedAt).toBe(T0)
  })

  it('repeatDay returns 0 for an empty source day', () => {
    const s = useStore.getState()
    expect(s.repeatDay('2026-10-01', '2026-10-13', T0)).toBe(0)
    expect(useStore.getState().entries).toHaveLength(0)
  })
})

describe('library', () => {
  it('addBuiltMeal sums component macros into one serving', () => {
    const s = useStore.getState()
    const rice = s.addIngredient({ name: 'Rice', per: { amount: 100, unit: 'g' }, macros: M(130, 2.7, 28, 0.3) }, T0)
    const chicken = s.addIngredient({ name: 'Chicken', per: { amount: 100, unit: 'g' }, macros: M(165, 31, 0, 3.6) }, T0)
    const comps = [makeComponent(rice, 200), makeComponent(chicken, 150)]
    const meal = s.addBuiltMeal({ name: 'Bowl', components: comps, favourite: true }, T0)
    expect(meal.kind).toBe('built')
    expect(meal.favourite).toBe(true)
    expect(meal.macros.kcal).toBe(260 + 247.5)
    expect(meal.macros.protein).toBe(5.4 + 46.5)
    expect(meal.macros.carbs).toBe(56)
    expect(meal.macros.fat).toBe(0.6 + 5.4)
    expect(meal.components).toHaveLength(2)
    expect(meal.useCount).toBe(0)
  })

  it('addBuiltMeal with no components yields zero macros', () => {
    const s = useStore.getState()
    const meal = s.addBuiltMeal({ name: '', components: [] }, T0)
    expect(meal.name).toBe('Meal')
    expect(meal.macros).toEqual(M(0))
  })

  it('updateMeal with components flips a quick meal to built and recomputes totals', () => {
    const s = useStore.getState()
    const meal = s.addQuickMeal({ name: 'Guess', macros: M(500, 20, 50, 10) }, T0)
    expect(meal.kind).toBe('quick')
    const comps: MealComponent[] = [
      { ingredientId: 'x', name: 'Oats', amount: 80, unit: 'g', macros: M(300, 10.04, 54, 6) },
      { ingredientId: 'y', name: 'Whey', amount: 30, unit: 'g', macros: M(120, 24, 3, 2) },
    ]
    s.updateMeal(meal.id, { components: comps }, T0 + 1)
    const next = useStore.getState().meals[meal.id]
    expect(next.kind).toBe('built')
    expect(next.macros.kcal).toBe(420)
    expect(next.macros.protein).toBe(34)
    expect(next.components![0].macros.protein).toBe(10)
    expect(next.updatedAt).toBe(T0 + 1)
  })

  it('updateMeal rounds a macros patch and ignores unknown ids', () => {
    const s = useStore.getState()
    const meal = s.addQuickMeal({ name: 'A', macros: M(100) }, T0)
    s.updateMeal(meal.id, { macros: M(150.26, 1.25) }, T0 + 1)
    expect(useStore.getState().meals[meal.id].macros.kcal).toBe(150.3)
    expect(useStore.getState().meals[meal.id].macros.protein).toBe(1.3)
    const before = useStore.getState().meals
    s.updateMeal('nope', { name: 'X' }, T0 + 2)
    expect(useStore.getState().meals).toBe(before)
  })

  it('addIngredient falls back to per 100 for a bad amount and updateIngredient keeps the old per on a bad patch', () => {
    const s = useStore.getState()
    const ing = s.addIngredient({ name: 'Oil', per: { amount: 0, unit: 'ml' }, macros: M(884, 0, 0, 100) }, T0)
    expect(ing.per).toEqual({ amount: 100, unit: 'ml' })
    s.updateIngredient(ing.id, { per: { amount: -5, unit: 'g' } }, T0 + 1)
    expect(useStore.getState().ingredients[ing.id].per).toEqual({ amount: 100, unit: 'ml' })
    s.updateIngredient(ing.id, { per: { amount: 15, unit: 'ml' } }, T0 + 2)
    expect(useStore.getState().ingredients[ing.id].per).toEqual({ amount: 15, unit: 'ml' })
  })

  it('toggleFavouriteIngredient flips and deleteIngredient removes', () => {
    const s = useStore.getState()
    const ing = s.addIngredient({ name: 'Oats', per: { amount: 100, unit: 'g' }, macros: M(379, 13, 68, 7) }, T0)
    s.toggleFavouriteIngredient(ing.id, T0 + 1)
    expect(useStore.getState().ingredients[ing.id].favourite).toBe(true)
    s.deleteIngredient(ing.id)
    expect(useStore.getState().ingredients[ing.id]).toBeUndefined()
  })
})

describe('export and import extras', () => {
  it('exportData has the version 2 shape', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'X', macros: M(100) }, T0)
    s.logMeal(m.id, 1, T0)
    const file = s.exportData(T0)
    expect(file.app).toBe('temperance')
    expect(file.version).toBe(SCHEMA_VERSION)
    expect(file.version).toBe(2)
    expect(file.exportedAt).toBe(T0)
    expect(file.settings).toEqual(useStore.getState().settings)
    expect(Object.keys(file.meals)).toEqual([m.id])
    expect(file.ingredients).toEqual({})
    expect(file.entries).toHaveLength(1)
    expect(file.settings.hero).toBe('remaining')
    expect(file.settings.hiddenRecents).toEqual([])
  })

  it('merge keeps the newer library version by updatedAt when the file is newer', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Local name', macros: M(100) }, T0)
    const file = JSON.parse(JSON.stringify(s.exportData(T0)))
    file.meals[m.id].name = 'Backup name'
    file.meals[m.id].updatedAt = T0 + 10_000
    const res = s.importData(file, 'merge')
    expect(res.meals).toBe(0)
    expect(useStore.getState().meals[m.id].name).toBe('Backup name')
  })

  it('merge keeps local settings and resets the pulse', () => {
    const s = useStore.getState()
    s.setGoalKcal(1800)
    const file = s.exportData(T0)
    s.setGoalKcal(2100)
    s.logQuick({ name: 'A', macros: M(100) }, T0)
    expect(useStore.getState().pulse).not.toBeNull()
    s.importData(JSON.parse(JSON.stringify(file)), 'merge')
    expect(useStore.getState().pulse).toBeNull()
    expect(useStore.getState().settings.goalKcal).toBe(2100)
  })

  it('replace resets the pulse and fills missing settings with defaults', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'A', macros: M(100) }, T0)
    expect(useStore.getState().pulse).not.toBeNull()
    const res = s.importData({ app: 'temperance', version: 1, settings: { goalKcal: 1900 }, entries: [] }, 'replace')
    expect(res).toEqual({ meals: 0, ingredients: 0, entries: 0 })
    expect(useStore.getState().pulse).toBeNull()
    expect(useStore.getState().entries).toHaveLength(0)
    expect(useStore.getState().settings.goalKcal).toBe(1900)
    expect(useStore.getState().settings.opening).toBe(DEFAULT_SETTINGS.opening)
    expect(useStore.getState().settings.targets).toEqual(DEFAULT_SETTINGS.targets)
  })

  it('merge adds new ingredients and entries from the file sorted by time', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'Later', macros: M(100) }, T0 + 500)
    const file = {
      app: 'temperance',
      version: 2,
      exportedAt: T0,
      settings: {},
      meals: {},
      ingredients: { g1: { id: 'g1', name: 'Oats', per: { amount: 100, unit: 'g' }, macros: M(379) } },
      entries: [{ id: 'early', day: '2026-10-13', at: T0, name: 'Earlier', servings: 1, macros: M(50) }],
    }
    const res = s.importData(file, 'merge')
    expect(res).toEqual({ meals: 0, ingredients: 1, entries: 1 })
    expect(useStore.getState().ingredients.g1.name).toBe('Oats')
    expect(useStore.getState().entries.map((e) => e.name)).toEqual(['Earlier', 'Later'])
    expect(totalsForDay(useStore.getState().entries, '2026-10-13').kcal).toBe(150)
    expect(entriesForDay(useStore.getState().entries, '2026-10-13')).toHaveLength(2)
  })
})

describe('persist failure path', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    useStore.getState().setPersistFailed(false)
  })

  it('flags persistFailed when localStorage.setItem throws and clears it once writes succeed again', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    try {
      expect(useStore.getState().persistFailed).toBe(false)
      const e = useStore.getState().logQuick({ name: 'A', macros: M(100) }, T0)
      expect(spy).toHaveBeenCalled()
      expect(useStore.getState().persistFailed).toBe(true)
      // the log itself still landed in memory
      expect(useStore.getState().entries.map((x) => x.id)).toContain(e.id)
    } finally {
      spy.mockRestore()
    }
    useStore.getState().logQuick({ name: 'B', macros: M(200) }, T0 + 1)
    expect(useStore.getState().persistFailed).toBe(false)
    expect(useStore.getState().entries).toHaveLength(2)
  })

  it('setPersistFailed is idempotent while storage is failing, and a working write clears a stale flag', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    try {
      useStore.getState().setPersistFailed(true)
      const before = useStore.getState()
      useStore.getState().setPersistFailed(true)
      expect(useStore.getState()).toBe(before)
      expect(useStore.getState().persistFailed).toBe(true)
    } finally {
      spy.mockRestore()
    }
    // storage works again: any successful write resets the flag
    useStore.getState().setGoalKcal(2400)
    expect(useStore.getState().persistFailed).toBe(false)
  })
})
