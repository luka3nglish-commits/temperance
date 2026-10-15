import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './useStore'
import { validateExportFile } from '../lib/exportFile'

const T0 = new Date(2026, 9, 15, 8, 0, 0).getTime()
const per100 = { amount: 100, unit: 'g' as const }

beforeEach(() => {
  useStore.getState().resetAll()
})

describe('custom portions', () => {
  it('logs typed numbers per 100 g by the grams eaten and saves the basis and usual amount', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Chicken breast', macros: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, per: per100, amount: 180, saveToLibrary: true }, T0)
    expect(e.servings).toBe(1.8)
    expect(e.portion).toEqual({ amount: 180, unit: 'g' })
    expect(e.macros.kcal).toBe(297)
    expect(e.macros.protein).toBe(55.8)
    const meal = useStore.getState().meals[e.mealId!]
    expect(meal.per).toEqual(per100)
    expect(meal.usual).toBe(180)
    expect(meal.macros.kcal).toBe(165)
  })

  it('logMeal takes any amount, remembers it, and one-tap uses it', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Rice', macros: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }, per: per100, usual: 200 }, T0)
    const a = s.logMeal(m.id, undefined, T0)!
    expect(a.portion).toEqual({ amount: 200, unit: 'g' })
    expect(a.macros.kcal).toBe(260)
    const b = s.logMeal(m.id, { amount: 275, unit: 'g' }, T0 + 1)!
    expect(b.servings).toBe(2.75)
    expect(b.macros.kcal).toBe(357.5)
    expect(useStore.getState().meals[m.id].usual).toBe(275)
    const c = s.logMeal(m.id, undefined, T0 + 2)!
    expect(c.portion).toEqual({ amount: 275, unit: 'g' })
    // grams for a per-serve meal cannot apply
    const plain = s.addQuickMeal({ name: 'Wrap', macros: { kcal: 400, protein: 20, carbs: 40, fat: 15 } }, T0)
    expect(s.logMeal(plain.id, { amount: 150, unit: 'g' }, T0)).toBeNull()
    // any typed number of servings
    const d = s.logMeal(plain.id, 1.3, T0)!
    expect(d.servings).toBe(1.3)
    expect(d.macros.kcal).toBe(520)
    expect(d.portion).toBeUndefined()
    expect(useStore.getState().meals[plain.id].usual).toBe(1.3)
  })

  it('updateEntry rescales by grams or by servings and keeps the portion in step', () => {
    const s = useStore.getState()
    const e = s.logQuick({ name: 'Oats', macros: { kcal: 380, protein: 13, carbs: 60, fat: 7 }, per: per100, amount: 80 }, T0)
    s.updateEntry(e.id, { portion: { amount: 120, unit: 'g' } }, T0)
    let cur = useStore.getState().entries[0]
    expect(cur.portion).toEqual({ amount: 120, unit: 'g' })
    expect(cur.servings).toBe(1.2)
    expect(cur.macros.kcal).toBe(456)
    s.updateEntry(e.id, { servings: 0.6 }, T0)
    cur = useStore.getState().entries[0]
    expect(cur.portion).toEqual({ amount: 60, unit: 'g' })
    expect(cur.macros.kcal).toBe(228)
    // a mismatched unit is ignored
    s.updateEntry(e.id, { portion: { amount: 2, unit: 'ml' } }, T0)
    expect(useStore.getState().entries[0].macros.kcal).toBe(228)
  })

  it('relogEntry copies an entry to today with its portion and bumps the meal', () => {
    const s = useStore.getState()
    const yesterday = new Date(2026, 9, 14, 12).getTime()
    const e = s.logQuick({ name: 'Steak', macros: { kcal: 250, protein: 26, carbs: 0, fat: 15 }, per: per100, amount: 300, saveToLibrary: true }, yesterday)
    const again = s.relogEntry(e.id, T0)!
    expect(again.id).not.toBe(e.id)
    expect(again.day).toBe('2026-10-15')
    expect(again.portion).toEqual({ amount: 300, unit: 'g' })
    expect(again.macros.kcal).toBe(750)
    expect(useStore.getState().meals[e.mealId!].useCount).toBe(2)
    expect(useStore.getState().pulse?.kind).toBe('log')
    expect(s.relogEntry('missing', T0)).toBeNull()
  })

  it('updateMeal switches the basis and drops a usual amount in the old unit', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Yoghurt', macros: { kcal: 100, protein: 10, carbs: 6, fat: 3 }, usual: 2 }, T0)
    s.updateMeal(m.id, { per: { amount: 100, unit: 'g' } }, T0)
    expect(useStore.getState().meals[m.id].per).toEqual(per100)
    expect(useStore.getState().meals[m.id].usual).toBeUndefined()
    s.updateMeal(m.id, { usual: 170 }, T0)
    expect(useStore.getState().meals[m.id].usual).toBe(170)
    s.updateMeal(m.id, { per: undefined }, T0)
    expect(useStore.getState().meals[m.id].per).toBeUndefined()
  })

  it('round-trips basis, usual and portion through the backup (v4) and reads v3 files', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'Milk', macros: { kcal: 64, protein: 3.4, carbs: 4.8, fat: 3.6 }, per: { amount: 100, unit: 'ml' }, amount: 250, saveToLibrary: true }, T0)
    const file = s.exportData(T0)
    expect(file.version).toBe(4)
    const back = validateExportFile(JSON.parse(JSON.stringify(file)))!
    const meal = Object.values(back.meals)[0]
    expect(meal.per).toEqual({ amount: 100, unit: 'ml' })
    expect(meal.usual).toBe(250)
    expect(back.entries[0].portion).toEqual({ amount: 250, unit: 'ml' })
    const v3 = { app: 'temperance', version: 3, settings: {}, meals: {}, ingredients: {}, entries: [], weights: [] }
    expect(validateExportFile(v3)).not.toBeNull()
    // junk bases and portions are dropped
    const junk = {
      app: 'temperance',
      version: 4,
      settings: {},
      meals: { a: { id: 'a', name: 'A', macros: {}, per: { amount: -1, unit: 'g' }, usual: 'x' } },
      ingredients: {},
      entries: [{ id: 'e', day: '2026-10-15', at: 1, name: 'E', servings: 1, macros: {}, portion: { amount: 5, unit: 'cups' } }],
      weights: [],
    }
    const out = validateExportFile(junk)!
    expect(out.meals.a.per).toBeUndefined()
    expect(out.meals.a.usual).toBeUndefined()
    expect(out.entries[0].portion).toBeUndefined()
  })
})
