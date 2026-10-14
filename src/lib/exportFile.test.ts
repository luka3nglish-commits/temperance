import { describe, expect, it } from 'vitest'
import { backupFileName, validateExportFile } from './exportFile'
import { SCHEMA_VERSION } from './types'

const T0 = new Date(2026, 9, 13, 8, 0, 0).getTime()
const M = (kcal: number, protein = 0, carbs = 0, fat = 0) => ({ kcal, protein, carbs, fat })
const base = (extra: Record<string, unknown> = {}) => ({ app: 'temperance', version: 2, exportedAt: T0, settings: {}, meals: {}, ingredients: {}, entries: [], ...extra })

describe('validateExportFile: envelope', () => {
  it('rejects values that are not plain objects', () => {
    expect(validateExportFile(null)).toBeNull()
    expect(validateExportFile(undefined)).toBeNull()
    expect(validateExportFile('temperance')).toBeNull()
    expect(validateExportFile(42)).toBeNull()
    expect(validateExportFile([])).toBeNull()
  })

  it('rejects the wrong app and unknown versions', () => {
    expect(validateExportFile(base({ app: 'other' }))).toBeNull()
    expect(validateExportFile(base({ app: undefined }))).toBeNull()
    expect(validateExportFile(base({ version: 3 }))).toBeNull()
    expect(validateExportFile(base({ version: 0 }))).toBeNull()
    expect(validateExportFile(base({ version: '2' }))).toBeNull()
  })

  it('upgrades a v1 file to v2 with default opening, hero, tilt and hiddenRecents', () => {
    const v1 = {
      app: 'temperance',
      version: 1,
      exportedAt: T0,
      settings: { goalKcal: 2200, targets: { protein: 170, carbs: 240, fat: 75 }, unit: 'kJ', introCount: 3, motion: 'on' },
      meals: {},
      ingredients: {},
      entries: [],
    }
    const out = validateExportFile(v1)!
    expect(out).not.toBeNull()
    expect(out.version).toBe(SCHEMA_VERSION)
    expect(out.version).toBe(2)
    expect(out.app).toBe('temperance')
    expect(out.exportedAt).toBe(T0)
    expect(out.settings.goalKcal).toBe(2200)
    expect(out.settings.unit).toBe('kJ')
    expect(out.settings.introCount).toBe(3)
    expect(out.settings.motion).toBe('on')
    expect(out.settings.opening).toBe('short')
    expect(out.settings.hero).toBe('remaining')
    expect(out.settings.tilt).toBe(false)
    expect(out.settings.hiddenRecents).toEqual([])
    expect(out.settings.name).toBeUndefined()
  })

  it('accepts a minimal file with every collection missing', () => {
    const out = validateExportFile({ app: 'temperance', version: 2 })!
    expect(out).not.toBeNull()
    expect(out.meals).toEqual({})
    expect(out.ingredients).toEqual({})
    expect(out.entries).toEqual([])
    expect(out.exportedAt).toBe(0)
    expect(out.settings.goalKcal).toBe(2500)
  })

  it('exportedAt that is not a finite number becomes 0', () => {
    expect(validateExportFile(base({ exportedAt: 'yesterday' }))!.exportedAt).toBe(0)
    expect(validateExportFile(base({ exportedAt: Number.NaN }))!.exportedAt).toBe(0)
  })
})

describe('validateExportFile: meals', () => {
  const meal = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: 'M', kind: 'quick', macros: M(100), favourite: false, createdAt: 1, updatedAt: 1, useCount: 0, ...extra })

  it('reads meals from a record or from an array', () => {
    const asRecord = validateExportFile(base({ meals: { a: meal('a'), b: meal('b') } }))!
    expect(Object.keys(asRecord.meals).sort()).toEqual(['a', 'b'])
    const asArray = validateExportFile(base({ meals: [meal('a'), meal('b')] }))!
    expect(Object.keys(asArray.meals).sort()).toEqual(['a', 'b'])
    expect(validateExportFile(base({ meals: 'nope' }))!.meals).toEqual({})
  })

  it('drops malformed meals and keys the rest by id', () => {
    const out = validateExportFile(base({ meals: [meal('ok'), { name: 'no id' }, { id: '' }, { id: 7 }, null, 'junk'] }))!
    expect(Object.keys(out.meals)).toEqual(['ok'])
  })

  it('fills defaults for a bare meal and sanitises fields', () => {
    const out = validateExportFile(base({ meals: [{ id: 'x', favourite: 'yes', useCount: 'many', macros: { kcal: '9' } }] }))!
    const m = out.meals.x
    expect(m.name).toBe('Meal')
    expect(m.kind).toBe('quick')
    expect(m.macros).toEqual(M(0))
    expect(m.favourite).toBe(false)
    expect(m.useCount).toBe(0)
    expect(m.createdAt).toBe(0)
    expect(m.lastUsedAt).toBeUndefined()
    expect(m.components).toBeUndefined()
  })

  it('a meal with components is built even if it claims to be quick, and empty components vanish', () => {
    const out = validateExportFile(
      base({
        meals: [
          meal('built', { kind: 'quick', components: [{ ingredientId: 'g', name: 'Oats', amount: 80, unit: 'g', macros: M(300) }] }),
          meal('empty', { kind: 'built', components: [] }),
        ],
      }),
    )!
    expect(out.meals.built.kind).toBe('built')
    expect(out.meals.built.components).toHaveLength(1)
    expect(out.meals.empty.kind).toBe('built')
    expect(out.meals.empty.components).toBeUndefined()
  })

  it('sanitises component units and drops non-object components', () => {
    const out = validateExportFile(
      base({
        meals: [
          meal('m', {
            components: [
              { ingredientId: 'a', name: 'Milk', amount: 250, unit: 'ml', macros: M(100) },
              { ingredientId: 'b', name: 'Egg', amount: 2, unit: 'serve', macros: M(156) },
              { ingredientId: 'c', name: 'Mystery', amount: 10, unit: 'cups', macros: M(10) },
              { ingredientId: 'd', amount: 'lots', macros: null },
              'junk',
              null,
            ],
          }),
        ],
      }),
    )!
    const comps = out.meals.m.components!
    expect(comps).toHaveLength(4)
    expect(comps.map((c) => c.unit)).toEqual(['ml', 'serve', 'g', 'g'])
    expect(comps[3].name).toBe('Ingredient')
    expect(comps[3].amount).toBe(0)
    expect(comps[3].macros).toEqual(M(0))
  })

  it('duplicate meal ids: the last one wins', () => {
    const out = validateExportFile(base({ meals: [meal('d', { name: 'First' }), meal('d', { name: 'Second' })] }))!
    expect(Object.keys(out.meals)).toHaveLength(1)
    expect(out.meals.d.name).toBe('Second')
  })
})

describe('validateExportFile: ingredients', () => {
  const ing = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: 'G', per: { amount: 100, unit: 'g' }, macros: M(100), ...extra })

  it('reads ingredients from a record or an array and drops malformed ones', () => {
    expect(Object.keys(validateExportFile(base({ ingredients: { a: ing('a') } }))!.ingredients)).toEqual(['a'])
    expect(Object.keys(validateExportFile(base({ ingredients: [ing('a'), { per: {} }, 5] }))!.ingredients)).toEqual(['a'])
  })

  it('per.amount of 0, negative, NaN or missing becomes 100', () => {
    const out = validateExportFile(
      base({
        ingredients: [
          ing('zero', { per: { amount: 0, unit: 'g' } }),
          ing('neg', { per: { amount: -50, unit: 'ml' } }),
          ing('nan', { per: { amount: Number.NaN, unit: 'g' } }),
          ing('none', { per: undefined }),
          ing('fine', { per: { amount: 30, unit: 'g' } }),
        ],
      }),
    )!
    expect(out.ingredients.zero.per.amount).toBe(100)
    expect(out.ingredients.neg.per.amount).toBe(100)
    expect(out.ingredients.neg.per.unit).toBe('ml')
    expect(out.ingredients.nan.per.amount).toBe(100)
    expect(out.ingredients.none.per).toEqual({ amount: 100, unit: 'g' })
    expect(out.ingredients.fine.per.amount).toBe(30)
  })

  it('sanitises the per unit and keeps lastUsedAt only when numeric', () => {
    const out = validateExportFile(base({ ingredients: [ing('a', { per: { amount: 1, unit: 'serve' }, lastUsedAt: T0 }), ing('b', { per: { amount: 1, unit: 'cup' }, lastUsedAt: 'never' })] }))!
    expect(out.ingredients.a.per.unit).toBe('serve')
    expect(out.ingredients.a.lastUsedAt).toBe(T0)
    expect(out.ingredients.b.per.unit).toBe('g')
    expect(out.ingredients.b.lastUsedAt).toBeUndefined()
    expect(out.ingredients.b.name).toBe('G')
  })
})

describe('validateExportFile: entries', () => {
  const entry = (id: string, extra: Record<string, unknown> = {}) => ({ id, day: '2026-10-13', at: T0, name: 'E', servings: 1, macros: M(100), ...extra })

  it('drops entries with bad or missing day keys', () => {
    const out = validateExportFile(
      base({
        entries: [
          entry('ok'),
          entry('bad1', { day: '2026-02-30' }),
          entry('bad2', { day: '13/10/2026' }),
          entry('bad3', { day: undefined }),
          entry('bad4', { day: 20261013 }),
          entry('bad5', { day: '2026-10-13T00:00:00Z' }),
        ],
      }),
    )!
    expect(out.entries.map((e) => e.id)).toEqual(['ok'])
  })

  it('drops duplicate ids keeping the first, and entries without an id', () => {
    const out = validateExportFile(base({ entries: [entry('a', { name: 'First' }), entry('a', { name: 'Second' }), { day: '2026-10-13', name: 'no id' }] }))!
    expect(out.entries).toHaveLength(1)
    expect(out.entries[0].name).toBe('First')
  })

  it('sorts entries by at ascending regardless of input order', () => {
    const out = validateExportFile(base({ entries: [entry('c', { at: T0 + 20 }), entry('a', { at: T0 }), entry('b', { at: T0 + 10 }), entry('z', { at: 'soon' })] }))!
    expect(out.entries.map((e) => e.id)).toEqual(['z', 'a', 'b', 'c'])
    expect(out.entries[0].at).toBe(0)
  })

  it('sanitises servings, name, mealId and components on an entry', () => {
    const out = validateExportFile(
      base({
        entries: [
          entry('a', { servings: 0, name: 7, mealId: 12, components: [{ ingredientId: 'g', name: 'Oats', amount: 80, unit: 'oz', macros: M(300) }] }),
          entry('b', { servings: -2, mealId: 'meal-1', components: 'nope' }),
          entry('c', { servings: 2.5 }),
        ],
      }),
    )!
    const [a, b, c] = out.entries
    expect(a.servings).toBe(1)
    expect(a.name).toBe('Meal')
    expect(a.mealId).toBeUndefined()
    expect(a.components).toHaveLength(1)
    expect(a.components![0].unit).toBe('g')
    expect(b.servings).toBe(1)
    expect(b.mealId).toBe('meal-1')
    expect(b.components).toBeUndefined()
    expect(c.servings).toBe(2.5)
  })

  it('entries that are not an array are treated as none', () => {
    expect(validateExportFile(base({ entries: { a: entry('a') } }))!.entries).toEqual([])
  })
})

describe('validateExportFile: settings', () => {
  const withSettings = (settings: unknown) => validateExportFile(base({ settings }))!.settings

  it('uses defaults when settings are missing or not an object', () => {
    for (const s of [undefined, null, 'x', 7, []]) {
      const out = withSettings(s)
      expect(out.goalKcal).toBe(2500)
      expect(out.targets).toEqual({ protein: 180, carbs: 250, fat: 80 })
      expect(out.unit).toBe('kcal')
      expect(out.introCount).toBe(0)
      expect(out.motion).toBe('system')
    }
  })

  it('a negative, zero, NaN or non-numeric goal falls back to 2500, and a fractional goal is rounded', () => {
    expect(withSettings({ goalKcal: -5 }).goalKcal).toBe(2500)
    expect(withSettings({ goalKcal: 0 }).goalKcal).toBe(2500)
    expect(withSettings({ goalKcal: Number.NaN }).goalKcal).toBe(2500)
    expect(withSettings({ goalKcal: '2000' }).goalKcal).toBe(2500)
    expect(withSettings({ goalKcal: 2000.6 }).goalKcal).toBe(2001)
  })

  it('NaN targets fall back to defaults and negative targets clamp to 0', () => {
    const out = withSettings({ targets: { protein: Number.NaN, carbs: -10, fat: 'x' } })
    expect(out.targets.protein).toBe(180)
    expect(out.targets.carbs).toBe(0)
    expect(out.targets.fat).toBe(80)
    expect(withSettings({ targets: 'nope' }).targets).toEqual({ protein: 180, carbs: 250, fat: 80 })
  })

  it('unknown motion, opening, hero and unit strings fall back to their defaults', () => {
    const out = withSettings({ motion: 'fast', opening: 'epic', hero: 'both', unit: 'cal' })
    expect(out.motion).toBe('system')
    expect(out.opening).toBe('short')
    expect(out.hero).toBe('remaining')
    expect(out.unit).toBe('kcal')
    const ok = withSettings({ motion: 'off', opening: 'full', hero: 'eaten', unit: 'kJ', tilt: true })
    expect(ok.motion).toBe('off')
    expect(ok.opening).toBe('full')
    expect(ok.hero).toBe('eaten')
    expect(ok.unit).toBe('kJ')
    expect(ok.tilt).toBe(true)
  })

  it('tilt is only true for a real boolean true', () => {
    expect(withSettings({ tilt: 'true' }).tilt).toBe(false)
    expect(withSettings({ tilt: 1 }).tilt).toBe(false)
  })

  it('hiddenRecents keeps only strings and the last 200, and non-arrays become empty', () => {
    expect(withSettings({ hiddenRecents: ['a|1', 2, null, 'b|2', {}] }).hiddenRecents).toEqual(['a|1', 'b|2'])
    expect(withSettings({ hiddenRecents: 'a|1' }).hiddenRecents).toEqual([])
    const many = Array.from({ length: 250 }, (_, i) => `k${i}`)
    const kept = withSettings({ hiddenRecents: many }).hiddenRecents
    expect(kept).toHaveLength(200)
    expect(kept[0]).toBe('k50')
    expect(kept[199]).toBe('k249')
  })

  it('introCount clamps to 0 and name is trimmed or dropped', () => {
    expect(withSettings({ introCount: -3 }).introCount).toBe(0)
    expect(withSettings({ introCount: 4 }).introCount).toBe(4)
    expect(withSettings({ name: '  Jacob  ' }).name).toBe('Jacob')
    expect(withSettings({ name: '   ' }).name).toBeUndefined()
    expect(withSettings({ name: 42 }).name).toBeUndefined()
  })
})

describe('backupFileName', () => {
  it('names the file after the day key', () => {
    expect(backupFileName('2026-10-13')).toBe('temperance-2026-10-13.json')
    expect(backupFileName('2027-01-01')).toBe('temperance-2027-01-01.json')
  })
})
