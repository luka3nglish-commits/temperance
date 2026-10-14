import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './useStore'
import { entriesForDay, totalsForDay, recentMeals, favouriteMeals, historyDays, disciplineStreak } from './selectors'
import { localDayKey } from '../lib/day'
import { makeComponent } from '../lib/macros'

const T0 = new Date(2026, 9, 13, 8, 0, 0).getTime() // 13 Oct 2026, 8:00 local
const DAY = localDayKey(new Date(T0))

beforeEach(() => {
  useStore.getState().resetAll()
})

describe('quick meals and logging', () => {
  it('logs a quick meal as a snapshot and updates today totals', () => {
    const s = useStore.getState()
    const meal = s.addQuickMeal({ name: '  Oats  and   whey ', macros: { kcal: 520, protein: 42, carbs: 60, fat: 11 } }, T0)
    expect(meal.name).toBe('Oats and whey')
    const entry = s.logMeal(meal.id, 1, T0)
    expect(entry).not.toBeNull()
    expect(entry!.day).toBe(DAY)
    const totals = totalsForDay(useStore.getState().entries, DAY)
    expect(totals.kcal).toBe(520)
    expect(totals.protein).toBe(42)
  })

  it('editing the library meal never changes a past entry', () => {
    const s = useStore.getState()
    const meal = s.addQuickMeal({ name: 'Chicken rice', macros: { kcal: 700, protein: 55, carbs: 80, fat: 14 } }, T0)
    s.logMeal(meal.id, 1, T0)
    s.updateMeal(meal.id, { macros: { kcal: 900, protein: 60, carbs: 100, fat: 20 } }, T0 + 1000)
    const entry = entriesForDay(useStore.getState().entries, DAY)[0]
    expect(entry.macros.kcal).toBe(700)
    expect(useStore.getState().meals[meal.id].macros.kcal).toBe(900)
  })

  it('deleting a library meal keeps the logged entry', () => {
    const s = useStore.getState()
    const meal = s.addQuickMeal({ name: 'Toast', macros: { kcal: 200, protein: 6, carbs: 36, fat: 3 } }, T0)
    s.logMeal(meal.id, 2, T0)
    s.deleteMeal(meal.id)
    const entry = entriesForDay(useStore.getState().entries, DAY)[0]
    expect(entry.macros.kcal).toBe(400)
    expect(entry.servings).toBe(2)
    expect(useStore.getState().meals[meal.id]).toBeUndefined()
  })

  it('servings scale the snapshot', () => {
    const s = useStore.getState()
    const meal = s.addQuickMeal({ name: 'Egg', macros: { kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3 } }, T0)
    const e = s.logMeal(meal.id, 3, T0)!
    expect(e.macros.kcal).toBe(234)
    expect(e.macros.protein).toBe(18.9)
  })

  it('logQuick can save to the library and marks it as used', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'Kebab', macros: { kcal: 850, protein: 40, carbs: 70, fat: 42 }, saveToLibrary: true }, T0)
    const recents = recentMeals(useStore.getState().meals)
    expect(recents).toHaveLength(1)
    expect(recents[0].name).toBe('Kebab')
    expect(recents[0].useCount).toBe(1)
  })

  it('pulse reports over goal only when the total exceeds the goal', () => {
    const s = useStore.getState()
    s.setGoalKcal(1000)
    const a = s.addQuickMeal({ name: 'A', macros: { kcal: 600, protein: 0, carbs: 0, fat: 0 } }, T0)
    s.logMeal(a.id, 1, T0)
    expect(useStore.getState().pulse?.over).toBe(false)
    s.logMeal(a.id, 1, T0 + 1)
    const p = useStore.getState().pulse!
    expect(p.over).toBe(true)
    expect(p.totalKcal).toBe(1200)
    expect(p.deltaKcal).toBe(600)
  })

  it('deleting an entry emits a remove pulse and lowers the total', () => {
    const s = useStore.getState()
    const a = s.addQuickMeal({ name: 'A', macros: { kcal: 300, protein: 0, carbs: 0, fat: 0 } }, T0)
    const e = s.logMeal(a.id, 1, T0)!
    s.deleteEntry(e.id, T0 + 5)
    const p = useStore.getState().pulse!
    expect(p.kind).toBe('remove')
    expect(p.deltaKcal).toBe(-300)
    expect(totalsForDay(useStore.getState().entries, DAY).kcal).toBe(0)
  })
})

describe('built meals from ingredients', () => {
  it('scales ingredient macros per amount and sums the meal', () => {
    const s = useStore.getState()
    const rice = s.addIngredient({ name: 'Rice (cooked)', per: { amount: 100, unit: 'g' }, macros: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } }, T0)
    const chicken = s.addIngredient({ name: 'Chicken breast', per: { amount: 100, unit: 'g' }, macros: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } }, T0)
    const comps = [makeComponent(rice, 250), makeComponent(chicken, 200)]
    const meal = s.addBuiltMeal({ name: 'Chicken and rice', components: comps }, T0)
    expect(meal.kind).toBe('built')
    expect(meal.macros.kcal).toBe(130 * 2.5 + 165 * 2)
    // components are rounded to 1 decimal before summing: 6.75 -> 6.8, plus 62
    expect(meal.macros.protein).toBe(68.8)
    const e = s.logMeal(meal.id, 1, T0)!
    expect(e.components).toHaveLength(2)
    expect(useStore.getState().ingredients[rice.id].useCount).toBe(1)
  })
})

describe('day boundaries', () => {
  it('uses the local calendar day, not UTC', () => {
    const lateNight = new Date(2026, 9, 13, 23, 30).getTime()
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Late', macros: { kcal: 100, protein: 0, carbs: 0, fat: 0 } }, lateNight)
    const e = s.logMeal(m.id, 1, lateNight)!
    expect(e.day).toBe('2026-10-13')
  })

  it('history lists the last N days newest first including empty days', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'X', macros: { kcal: 100, protein: 0, carbs: 0, fat: 0 } }, T0)
    s.logMeal(m.id, 1, T0)
    const h = historyDays(useStore.getState().entries, DAY, 3)
    expect(h.map((d) => d.day)).toEqual(['2026-10-13', '2026-10-12', '2026-10-11'])
    expect(h[0].totals.kcal).toBe(100)
    expect(h[1].count).toBe(0)
  })

  it('discipline streak counts consecutive logged days at or under goal', () => {
    const s = useStore.getState()
    s.setGoalKcal(2000)
    const m = s.addQuickMeal({ name: 'X', macros: { kcal: 1500, protein: 0, carbs: 0, fat: 0 } }, T0)
    const day = (d: number) => new Date(2026, 9, d, 12).getTime()
    s.logMeal(m.id, 1, day(11))
    s.logMeal(m.id, 1, day(12))
    s.logMeal(m.id, 1, day(13))
    expect(disciplineStreak(useStore.getState().entries, 2000, '2026-10-13')).toBe(3)
    s.logMeal(m.id, 1, day(13)) // now 3000 today, over
    expect(disciplineStreak(useStore.getState().entries, 2000, '2026-10-13')).toBe(0)
  })

  it('repeatDay copies yesterday into today with new ids', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'X', macros: { kcal: 100, protein: 0, carbs: 0, fat: 0 } }, T0)
    const yesterday = new Date(2026, 9, 12, 9).getTime()
    s.logMeal(m.id, 1, yesterday)
    s.logMeal(m.id, 2, yesterday + 1)
    const copies = s.repeatDay('2026-10-12', '2026-10-13', T0)
    expect(copies).toHaveLength(2)
    const today = entriesForDay(useStore.getState().entries, '2026-10-13')
    expect(today).toHaveLength(2)
    expect(totalsForDay(useStore.getState().entries, '2026-10-13').kcal).toBe(300)
    expect(new Set(useStore.getState().entries.map((e) => e.id)).size).toBe(4)
  })
})

describe('favourites and settings', () => {
  it('toggles favourites and lists them', () => {
    const s = useStore.getState()
    const a = s.addQuickMeal({ name: 'Beta', macros: { kcal: 1, protein: 0, carbs: 0, fat: 0 } }, T0)
    const b = s.addQuickMeal({ name: 'Alpha', macros: { kcal: 1, protein: 0, carbs: 0, fat: 0 } }, T0)
    s.toggleFavouriteMeal(a.id, T0)
    s.toggleFavouriteMeal(b.id, T0)
    expect(favouriteMeals(useStore.getState().meals).map((m) => m.name)).toEqual(['Alpha', 'Beta'])
    s.toggleFavouriteMeal(a.id, T0)
    expect(favouriteMeals(useStore.getState().meals)).toHaveLength(1)
  })

  it('rejects bad goal and target values', () => {
    const s = useStore.getState()
    s.setGoalKcal(-5)
    expect(useStore.getState().settings.goalKcal).toBe(2500)
    s.setTargets({ protein: Number.NaN, fat: 70 })
    expect(useStore.getState().settings.targets.protein).toBe(180)
    expect(useStore.getState().settings.targets.fat).toBe(70)
  })
})

describe('export and import', () => {
  it('round-trips through export and replace', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'X', macros: { kcal: 100, protein: 5, carbs: 10, fat: 2 }, favourite: true }, T0)
    s.logMeal(m.id, 1, T0)
    s.setGoalKcal(2200)
    const file = s.exportData(T0)
    expect(file.app).toBe('temperance')
    s.resetAll()
    expect(useStore.getState().entries).toHaveLength(0)
    const res = s.importData(JSON.parse(JSON.stringify(file)), 'replace')
    expect(res).toEqual({ meals: 1, ingredients: 0, entries: 1 })
    expect(useStore.getState().settings.goalKcal).toBe(2200)
    expect(useStore.getState().meals[m.id].favourite).toBe(true)
  })

  it('merge adds only new items and keeps the newer library version', () => {
    const s = useStore.getState()
    const m = s.addQuickMeal({ name: 'Old name', macros: { kcal: 100, protein: 0, carbs: 0, fat: 0 } }, T0)
    const e = s.logMeal(m.id, 1, T0)!
    const file = s.exportData(T0)
    // local edits after the backup
    s.updateMeal(m.id, { name: 'Newer local name' }, T0 + 5000)
    const other = s.addQuickMeal({ name: 'Local only', macros: { kcal: 1, protein: 0, carbs: 0, fat: 0 } }, T0)
    const res = s.importData(file, 'merge')
    expect(res.entries).toBe(0)
    expect(res.meals).toBe(0)
    expect(useStore.getState().meals[m.id].name).toBe('Newer local name')
    expect(useStore.getState().meals[other.id]).toBeDefined()
    expect(useStore.getState().entries.filter((x) => x.id === e.id)).toHaveLength(1)
  })

  it('rejects files that are not Temperance backups', () => {
    const s = useStore.getState()
    expect(() => s.importData({ hello: 'world' }, 'merge')).toThrow()
    expect(() => s.importData('nope', 'replace')).toThrow()
  })

  it('drops malformed entries and keeps good ones', () => {
    const s = useStore.getState()
    const file = {
      app: 'temperance',
      version: 1,
      exportedAt: T0,
      settings: {},
      meals: {},
      ingredients: {},
      entries: [
        { id: 'ok', day: '2026-10-13', at: T0, name: 'Fine', servings: 1, macros: { kcal: 10, protein: 0, carbs: 0, fat: 0 } },
        { id: 'bad-day', day: '2026-13-45', at: T0, name: 'Nope', servings: 1, macros: { kcal: 10, protein: 0, carbs: 0, fat: 0 } },
        { id: 'ok', day: '2026-10-13', at: T0, name: 'Dup', servings: 1, macros: { kcal: 10, protein: 0, carbs: 0, fat: 0 } },
        'garbage',
      ],
    }
    const res = s.importData(file, 'replace')
    expect(res.entries).toBe(1)
    expect(useStore.getState().entries[0].name).toBe('Fine')
  })
})
