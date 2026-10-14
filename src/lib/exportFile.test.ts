import { beforeEach, describe, expect, it } from 'vitest'
import { backupFileName, validateExportFile } from './exportFile'
import { SCHEMA_VERSION } from './types'
import { useStore } from '../store/useStore'

const T0 = new Date(2026, 9, 13, 8, 0, 0).getTime()

const macros = { kcal: 100, protein: 5, carbs: 10, fat: 2 }

/** A minimal, fully valid v2 backup. Tests clone and mutate it. */
function valid(): Record<string, unknown> {
  return {
    app: 'temperance',
    version: 2,
    exportedAt: T0,
    settings: {
      goalKcal: 2200,
      targets: { protein: 150, carbs: 200, fat: 70 },
      unit: 'kJ',
      introCount: 3,
      motion: 'off',
      opening: 'full',
      hero: 'eaten',
      tilt: true,
      hiddenRecents: ['oats|400'],
      name: 'J',
    },
    meals: {
      m1: { id: 'm1', name: 'Oats', kind: 'quick', macros, favourite: true, createdAt: T0, updatedAt: T0, useCount: 2, lastUsedAt: T0 },
    },
    ingredients: {
      i1: { id: 'i1', name: 'Rice', per: { amount: 100, unit: 'g' }, macros, favourite: false, createdAt: T0, updatedAt: T0, useCount: 0 },
    },
    entries: [{ id: 'e1', day: '2026-10-13', at: T0, mealId: 'm1', name: 'Oats', servings: 1, macros }],
  }
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

describe('validateExportFile · gatekeeping', () => {
  it('rejects anything that is not a plain object', () => {
    expect(validateExportFile(null)).toBeNull()
    expect(validateExportFile(undefined)).toBeNull()
    expect(validateExportFile('temperance')).toBeNull()
    expect(validateExportFile(42)).toBeNull()
    expect(validateExportFile([])).toBeNull()
  })

  it('rejects the wrong app', () => {
    expect(validateExportFile({ ...valid(), app: 'other' })).toBeNull()
    expect(validateExportFile({ ...valid(), app: undefined })).toBeNull()
    expect(validateExportFile({ ...valid(), app: 'Temperance' })).toBeNull()
  })

  it('rejects unknown or non-numeric versions', () => {
    expect(validateExportFile({ ...valid(), version: 4 })).toBeNull()
    expect(validateExportFile({ ...valid(), version: 0 })).toBeNull()
    expect(validateExportFile({ ...valid(), version: '2' })).toBeNull()
    expect(validateExportFile({ ...valid(), version: undefined })).toBeNull()
  })

  it('accepts a valid v2 file and stamps the current schema version', () => {
    const f = validateExportFile(valid())
    expect(f).not.toBeNull()
    expect(f!.app).toBe('temperance')
    expect(f!.version).toBe(SCHEMA_VERSION)
    expect(f!.exportedAt).toBe(T0)
  })

  it('coerces a bad exportedAt to zero', () => {
    expect(validateExportFile({ ...valid(), exportedAt: 'yesterday' })!.exportedAt).toBe(0)
    expect(validateExportFile({ ...valid(), exportedAt: Number.NaN })!.exportedAt).toBe(0)
  })
})

describe('validateExportFile · v1 upgrade', () => {
  it('upgrades a v1 file to v2 with default opening, hero, tilt and hiddenRecents', () => {
    const v1 = {
      app: 'temperance',
      version: 1,
      exportedAt: T0,
      settings: { goalKcal: 2000, targets: { protein: 100, carbs: 150, fat: 60 }, unit: 'kcal', introCount: 1, motion: 'on' },
      meals: {},
      ingredients: {},
      entries: [],
    }
    const f = validateExportFile(v1)!
    expect(f.version).toBe(3)
    expect(f.settings.goalKcal).toBe(2000)
    expect(f.settings.targets).toEqual({ protein: 100, carbs: 150, fat: 60 })
    expect(f.settings.motion).toBe('on')
    expect(f.settings.introCount).toBe(1)
    expect(f.settings.opening).toBe('short')
    expect(f.settings.hero).toBe('remaining')
    expect(f.settings.tilt).toBe(false)
    expect(f.settings.hiddenRecents).toEqual([])
    expect(f.settings.name).toBeUndefined()
  })
})

describe('validateExportFile · meals and ingredients', () => {
  it('reads meals and ingredients from a record', () => {
    const f = validateExportFile(valid())!
    expect(Object.keys(f.meals)).toEqual(['m1'])
    expect(Object.keys(f.ingredients)).toEqual(['i1'])
    expect(f.meals.m1.favourite).toBe(true)
    expect(f.meals.m1.lastUsedAt).toBe(T0)
  })

  it('reads meals and ingredients from arrays too', () => {
    const raw = valid()
    raw.meals = Object.values(raw.meals as Record<string, unknown>)
    raw.ingredients = Object.values(raw.ingredients as Record<string, unknown>)
    const f = validateExportFile(raw)!
    expect(f.meals.m1.name).toBe('Oats')
    expect(f.ingredients.i1.name).toBe('Rice')
  })

  it('treats a non-object, non-array library as empty', () => {
    const f = validateExportFile({ ...valid(), meals: 'junk', ingredients: 7 })!
    expect(f.meals).toEqual({})
    expect(f.ingredients).toEqual({})
  })

  it('drops a meal without an id and keeps the rest', () => {
    const raw = valid()
    raw.meals = { bad: { name: 'No id', macros }, empty: { id: '', name: 'Empty id', macros }, ...(raw.meals as object) }
    const f = validateExportFile(raw)!
    expect(Object.keys(f.meals)).toEqual(['m1'])
  })

  it('keys the record by the meal id, not the record key', () => {
    const raw = valid()
    raw.meals = { wrongKey: { id: 'real', name: 'X', macros } }
    const f = validateExportFile(raw)!
    expect(f.meals.real).toBeDefined()
    expect(f.meals.wrongKey).toBeUndefined()
  })

  it('fills meal defaults and trims the name', () => {
    const raw = valid()
    raw.meals = { m: { id: 'm', name: '  ' } }
    const m = validateExportFile(raw)!.meals.m
    expect(m.name).toBe('Meal')
    expect(m.kind).toBe('quick')
    expect(m.macros).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
    expect(m.favourite).toBe(false)
    expect(m.useCount).toBe(0)
    expect(m.lastUsedAt).toBeUndefined()
    expect(m.components).toBeUndefined()
  })

  it('flips kind to built when components are present and drops empty component lists', () => {
    const raw = valid()
    raw.meals = {
      a: { id: 'a', kind: 'quick', macros, components: [{ ingredientId: 'i1', name: 'Rice', amount: 100, unit: 'g', macros }] },
      b: { id: 'b', kind: 'built', macros, components: [] },
    }
    const f = validateExportFile(raw)!
    expect(f.meals.a.kind).toBe('built')
    expect(f.meals.a.components).toHaveLength(1)
    expect(f.meals.b.kind).toBe('built')
    expect(f.meals.b.components).toBeUndefined()
  })

  it('sanitises component units and names', () => {
    const raw = valid()
    raw.meals = {
      a: {
        id: 'a',
        macros,
        components: [
          { ingredientId: 'i1', name: 'Milk', amount: 200, unit: 'ml', macros },
          { ingredientId: 'i2', name: 'Egg', amount: 2, unit: 'serve', macros },
          { ingredientId: 'i3', name: '', amount: 'lots', unit: 'cups', macros },
          'garbage',
          null,
        ],
      },
    }
    const comps = validateExportFile(raw)!.meals.a.components!
    expect(comps).toHaveLength(3)
    expect(comps[0].unit).toBe('ml')
    expect(comps[1].unit).toBe('serve')
    expect(comps[2].unit).toBe('g')
    expect(comps[2].name).toBe('Ingredient')
    expect(comps[2].amount).toBe(0)
  })

  it('replaces a zero or negative per amount with 100', () => {
    const raw = valid()
    raw.ingredients = {
      z: { id: 'z', name: 'Zero', per: { amount: 0, unit: 'g' }, macros },
      n: { id: 'n', name: 'Neg', per: { amount: -50, unit: 'ml' }, macros },
      s: { id: 's', name: 'Str', per: { amount: '100', unit: 'g' }, macros },
      ok: { id: 'ok', name: 'Fine', per: { amount: 250, unit: 'ml' }, macros },
    }
    const f = validateExportFile(raw)!
    expect(f.ingredients.z.per).toEqual({ amount: 100, unit: 'g' })
    expect(f.ingredients.n.per).toEqual({ amount: 100, unit: 'ml' })
    expect(f.ingredients.s.per).toEqual({ amount: 100, unit: 'g' })
    expect(f.ingredients.ok.per).toEqual({ amount: 250, unit: 'ml' })
  })

  it('defaults an ingredient with no per block and a bad unit', () => {
    const raw = valid()
    raw.ingredients = { a: { id: 'a', name: 'A', macros }, b: { id: 'b', name: 'B', per: { amount: 1, unit: 'cup' }, macros } }
    const f = validateExportFile(raw)!
    expect(f.ingredients.a.per).toEqual({ amount: 100, unit: 'g' })
    expect(f.ingredients.b.per).toEqual({ amount: 1, unit: 'g' })
    expect(f.ingredients.a.name).toBe('A')
  })

  it('coerces non-finite macro fields to zero', () => {
    const raw = valid()
    raw.meals = { m: { id: 'm', macros: { kcal: '500', protein: Number.NaN, carbs: 10, fat: null } } }
    expect(validateExportFile(raw)!.meals.m.macros).toEqual({ kcal: 0, protein: 0, carbs: 10, fat: 0 })
  })
})

describe('validateExportFile · entries', () => {
  it('drops entries with bad day keys', () => {
    const raw = valid()
    raw.entries = [
      { id: 'a', day: '2026-02-30', at: 1, name: 'A', servings: 1, macros },
      { id: 'b', day: '13/10/2026', at: 2, name: 'B', servings: 1, macros },
      { id: 'c', day: 20261013, at: 3, name: 'C', servings: 1, macros },
      { id: 'd', day: '2026-10-13', at: 4, name: 'D', servings: 1, macros },
    ]
    expect(validateExportFile(raw)!.entries.map((e) => e.id)).toEqual(['d'])
  })

  it('drops duplicate ids, keeping the first', () => {
    const raw = valid()
    raw.entries = [
      { id: 'x', day: '2026-10-13', at: 1, name: 'First', servings: 1, macros },
      { id: 'x', day: '2026-10-13', at: 2, name: 'Second', servings: 1, macros },
    ]
    const entries = validateExportFile(raw)!.entries
    expect(entries).toHaveLength(1)
    expect(entries[0].name).toBe('First')
  })

  it('sorts entries by at, oldest first', () => {
    const raw = valid()
    raw.entries = [
      { id: 'c', day: '2026-10-13', at: 300, name: 'C', servings: 1, macros },
      { id: 'a', day: '2026-10-11', at: 100, name: 'A', servings: 1, macros },
      { id: 'b', day: '2026-10-12', at: 200, name: 'B', servings: 1, macros },
    ]
    expect(validateExportFile(raw)!.entries.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })

  it('fixes servings and mealId, and treats a non-array as no entries', () => {
    const raw = valid()
    raw.entries = [
      { id: 'a', day: '2026-10-13', at: 1, name: 'A', servings: 0, macros, mealId: 7 },
      { id: 'b', day: '2026-10-13', at: 2, name: 'B', servings: -2, macros, mealId: 'm1' },
      { id: 'c', day: '2026-10-13', at: 3, name: '   ', servings: 1.5, macros },
    ]
    const f = validateExportFile(raw)!
    expect(f.entries[0].servings).toBe(1)
    expect(f.entries[0].mealId).toBeUndefined()
    expect(f.entries[1].servings).toBe(1)
    expect(f.entries[1].mealId).toBe('m1')
    expect(f.entries[2].servings).toBe(1.5)
    expect(f.entries[2].name).toBe('Meal')
    expect(validateExportFile({ ...valid(), entries: { not: 'array' } })!.entries).toEqual([])
  })
})

describe('validateExportFile · settings', () => {
  it('passes through valid settings', () => {
    const s = validateExportFile(valid())!.settings
    expect(s).toEqual({
      goalKcal: 2200,
      targets: { protein: 150, carbs: 200, fat: 70 },
      unit: 'kJ',
      introCount: 3,
      motion: 'off',
      opening: 'full',
      hero: 'eaten',
      tilt: true,
      hiddenRecents: ['oats|400'],
      name: 'J',
    })
  })

  it('falls back to defaults when settings is missing entirely', () => {
    const s = validateExportFile({ ...valid(), settings: undefined })!.settings
    expect(s.goalKcal).toBe(2500)
    expect(s.targets).toEqual({ protein: 180, carbs: 250, fat: 80 })
    expect(s.unit).toBe('kcal')
    expect(s.introCount).toBe(0)
    expect(s.motion).toBe('system')
  })

  it('sanitises a negative, zero, fractional or non-numeric goal', () => {
    const goal = (g: unknown) => validateExportFile({ ...valid(), settings: { goalKcal: g } })!.settings.goalKcal
    expect(goal(-100)).toBe(2500)
    expect(goal(0)).toBe(2500)
    expect(goal('2000')).toBe(2500)
    expect(goal(2000.6)).toBe(2001)
    expect(goal(Number.POSITIVE_INFINITY)).toBe(2500)
  })

  it('sanitises NaN and negative targets', () => {
    const s = validateExportFile({ ...valid(), settings: { targets: { protein: Number.NaN, carbs: -20, fat: 'x' } } })!.settings
    expect(s.targets).toEqual({ protein: 180, carbs: 0, fat: 80 })
  })

  it('rejects unknown motion, opening and hero strings', () => {
    const s = validateExportFile({ ...valid(), settings: { motion: 'fast', opening: 'long', hero: 'both', unit: 'cal' } })!.settings
    expect(s.motion).toBe('system')
    expect(s.opening).toBe('short')
    expect(s.hero).toBe('remaining')
    expect(s.unit).toBe('kcal')
  })

  it('only accepts a literal true for tilt', () => {
    expect(validateExportFile({ ...valid(), settings: { tilt: 'true' } })!.settings.tilt).toBe(false)
    expect(validateExportFile({ ...valid(), settings: { tilt: 1 } })!.settings.tilt).toBe(false)
    expect(validateExportFile({ ...valid(), settings: { tilt: true } })!.settings.tilt).toBe(true)
  })

  it('clamps a negative introCount to zero', () => {
    expect(validateExportFile({ ...valid(), settings: { introCount: -3 } })!.settings.introCount).toBe(0)
  })

  it('keeps only strings in hiddenRecents and caps at the last 200', () => {
    const mixed = validateExportFile({ ...valid(), settings: { hiddenRecents: ['a|1', 3, null, 'b|2', {}] } })!.settings.hiddenRecents
    expect(mixed).toEqual(['a|1', 'b|2'])
    const many = Array.from({ length: 250 }, (_, i) => `k|${i}`)
    const capped = validateExportFile({ ...valid(), settings: { hiddenRecents: many } })!.settings.hiddenRecents
    expect(capped).toHaveLength(200)
    expect(capped[0]).toBe('k|50')
    expect(capped[199]).toBe('k|249')
    expect(validateExportFile({ ...valid(), settings: { hiddenRecents: 'nope' } })!.settings.hiddenRecents).toEqual([])
  })

  it('trims the name and drops a blank one', () => {
    expect(validateExportFile({ ...valid(), settings: { name: '  Marcus  ' } })!.settings.name).toBe('Marcus')
    expect(validateExportFile({ ...valid(), settings: { name: '   ' } })!.settings.name).toBeUndefined()
    expect(validateExportFile({ ...valid(), settings: { name: 42 } })!.settings.name).toBeUndefined()
  })
})

describe('validateExportFile · round trip with the store', () => {
  beforeEach(() => {
    useStore.getState().resetAll()
  })

  it('is the identity on a real export after JSON serialisation', () => {
    const s = useStore.getState()
    const rice = s.addIngredient({ name: 'Rice', per: { amount: 100, unit: 'g' }, macros: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } }, T0)
    const meal = s.addBuiltMeal({ name: 'Rice bowl', components: [{ ingredientId: rice.id, name: rice.name, amount: 200, unit: 'g', macros: { kcal: 260, protein: 5.4, carbs: 56, fat: 0.6 } }], favourite: true }, T0)
    s.logMeal(meal.id, 1.5, T0)
    s.setGoalKcal(2100)
    s.hideRecent('toast|200')
    const file = s.exportData(T0)
    expect(validateExportFile(clone(file))).toEqual(file)
  })
})

describe('backupFileName', () => {
  it('names the file after the day key', () => {
    expect(backupFileName('2026-10-13')).toBe('temperance-2026-10-13.json')
    expect(backupFileName('2027-01-01')).toBe('temperance-2027-01-01.json')
  })
})
