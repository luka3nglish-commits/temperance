import { describe, expect, it } from 'vitest'
import type { Ingredient, LogEntry, Meal } from '../lib/types'
import {
  EMPTY_DRAFT,
  buildTotals,
  canLogDraft,
  componentFromRow,
  draftFrom,
  draftMacros,
  draftUntouched,
  energyLine,
  hintFor,
  macroLine,
  perServingComponents,
  perServingMacros,
  rowFromComponent,
  rowFromIngredient,
  saveToLibraryFor,
} from './MealForm'

const THIN = ' '

const meal = (name: string, kcal: number): Meal => ({
  id: `m-${name}`,
  name,
  kind: 'quick',
  macros: { kcal, protein: 10, carbs: 20, fat: 5 },
  favourite: false,
  createdAt: 0,
  updatedAt: 0,
  useCount: 0,
})

describe('copy helpers', () => {
  it('prints energy in the display unit with a thin space before the unit', () => {
    expect(energyLine(612, 'kcal')).toBe(`612${THIN}kcal`)
    expect(energyLine(612, 'kJ')).toBe(`2${THIN}561${THIN}kJ`)
    expect(energyLine(-40, 'kcal')).not.toContain('-')
  })
  it('prints P C F with middle dots and whole grams', () => {
    expect(macroLine({ protein: 31.6, carbs: 48, fat: 12.2 })).toBe('P 32 · C 48 · F 12')
  })
})

describe('quick draft', () => {
  it('needs calories alone to log', () => {
    expect(canLogDraft(EMPTY_DRAFT, 'kcal')).toBe(false)
    expect(canLogDraft({ ...EMPTY_DRAFT, energy: '612' }, 'kcal')).toBe(true)
    expect(canLogDraft({ ...EMPTY_DRAFT, energy: '12.' }, 'kcal')).toBe(true)
    expect(canLogDraft({ ...EMPTY_DRAFT, energy: '.' }, 'kcal')).toBe(false)
  })
  it('converts typed kJ to stored kcal and parses commas', () => {
    const m = draftMacros({ ...EMPTY_DRAFT, energy: '2561', protein: '31,5' }, 'kJ')
    expect(m?.kcal).toBeCloseTo(612.1, 0)
    expect(m?.protein).toBe(31.5)
    expect(draftMacros({ ...EMPTY_DRAFT, energy: '612' }, 'kcal')).toEqual({ kcal: 612, protein: 0, carbs: 0, fat: 0 })
  })
  it('fills a draft from stored kcal in the display unit', () => {
    const d = draftFrom({ name: 'Oats', macros: { kcal: 612, protein: 31.5, carbs: 48, fat: 12 }, servings: 2, mealId: 'm-Oats' }, 'kJ')
    expect(d.energy).toBe('2561')
    expect(d.protein).toBe('31.5')
    expect(d.carbs).toBe('48')
    expect(d.servings).toBe(2)
    expect(d.source?.mealId).toBe('m-Oats')
    expect(draftFrom({ servings: 9 }, 'kcal').servings).toBe(4)
    expect(draftFrom({ servings: 0.2 }, 'kcal').servings).toBe(0.5)
  })
  it('knows when the prefilled numbers are untouched, even after a kJ round trip', () => {
    const macros = { kcal: 612, protein: 31.5, carbs: 48, fat: 12 }
    const kj = draftFrom({ name: 'Oats', macros, mealId: 'm-Oats' }, 'kJ')
    expect(draftUntouched(kj, 'kJ')).toBe(true)
    expect(draftUntouched({ ...kj, servings: 2 }, 'kJ')).toBe(true)
    expect(draftUntouched({ ...kj, energy: '2600' }, 'kJ')).toBe(false)
    expect(draftUntouched({ ...kj, name: 'Oats and honey' }, 'kJ')).toBe(false)
    expect(draftUntouched({ ...kj, source: null }, 'kJ')).toBe(false)
  })
})

describe('hint', () => {
  it('reads the 4/4/9 sum in the display unit', () => {
    const h = hintFor({ energy: '', protein: '30', carbs: '50', fat: '10' }, 'kcal')
    expect(h.text).toBe(`macros = 410${THIN}kcal`)
    expect(h.differs).toBe(false)
    expect(hintFor({ energy: '', protein: '30', carbs: '50', fat: '10' }, 'kJ').text).toBe(`macros = 1${THIN}715${THIN}kJ`)
  })
  it('flags calories that differ from the macros by more than 8 percent, never on an empty form', () => {
    expect(hintFor({ energy: '410', protein: '30', carbs: '50', fat: '10' }, 'kcal').differs).toBe(false)
    expect(hintFor({ energy: '440', protein: '30', carbs: '50', fat: '10' }, 'kcal').differs).toBe(false)
    expect(hintFor({ energy: '500', protein: '30', carbs: '50', fat: '10' }, 'kcal').differs).toBe(true)
    expect(hintFor({ energy: '500', protein: '', carbs: '', fat: '' }, 'kcal').differs).toBe(false)
    expect(hintFor({ energy: '', protein: '30', carbs: '50', fat: '10' }, 'kcal').differs).toBe(false)
  })
})

describe('save to library default', () => {
  const meals = { 'm-Oats': meal('Oats', 400) }
  it('is on for a new name, off for an empty name or a library meal, and an explicit choice wins', () => {
    expect(saveToLibraryFor({ name: 'Porridge', saveOverride: null }, meals)).toBe(true)
    expect(saveToLibraryFor({ name: '', saveOverride: null }, meals)).toBe(false)
    expect(saveToLibraryFor({ name: '  oats ', saveOverride: null }, meals)).toBe(false)
    expect(saveToLibraryFor({ name: 'oats', saveOverride: true }, meals)).toBe(true)
    expect(saveToLibraryFor({ name: 'Porridge', saveOverride: false }, meals)).toBe(false)
  })
})

describe('recent snapshots', () => {
  const entry: LogEntry = {
    id: 'e1',
    day: '2026-10-13',
    at: 0,
    name: 'Oats',
    servings: 2,
    macros: { kcal: 800, protein: 40, carbs: 100, fat: 20 },
    components: [{ ingredientId: 'i1', name: 'Oats', amount: 200, unit: 'g', macros: { kcal: 800, protein: 40, carbs: 100, fat: 20 } }],
  }
  it('divides the snapshot back to one serving, components included', () => {
    expect(perServingMacros(entry)).toEqual({ kcal: 400, protein: 20, carbs: 50, fat: 10 })
    expect(perServingComponents(entry)?.[0].amount).toBe(100)
    expect(perServingComponents(entry)?.[0].macros.kcal).toBe(400)
    expect(perServingComponents({ ...entry, components: undefined })).toBeUndefined()
  })
})

describe('build rows', () => {
  const oats: Ingredient = {
    id: 'i1',
    name: 'Oats',
    per: { amount: 100, unit: 'g' },
    macros: { kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
    favourite: false,
    createdAt: 0,
    updatedAt: 0,
    useCount: 0,
  }
  const ingredients = { i1: oats }
  it('starts at the ingredient basis and scales with the typed amount', () => {
    const row = rowFromIngredient(oats)
    expect(row.amount).toBe('100')
    expect(componentFromRow(row, ingredients).macros.kcal).toBe(389)
    expect(componentFromRow({ ...row, amount: '50' }, ingredients).macros.kcal).toBe(194.5)
    expect(componentFromRow({ ...row, amount: '' }, ingredients).macros.kcal).toBe(0)
    expect(buildTotals([row, { ...row, key: 'x', amount: '50' }], ingredients).kcal).toBe(583.5)
  })
  it('keeps a deleted ingredient as a snapshot row that still scales', () => {
    const c = { ingredientId: 'gone', name: 'Honey', amount: 20, unit: 'g' as const, macros: { kcal: 60, protein: 0, carbs: 16, fat: 0 } }
    const row = rowFromComponent(c, ingredients)
    expect(row.removed).toBe(true)
    expect(componentFromRow(row, ingredients).macros.kcal).toBe(60)
    expect(componentFromRow({ ...row, amount: '40' }, ingredients).macros.kcal).toBe(120)
    const live = rowFromComponent({ ...c, ingredientId: 'i1', name: 'Oats' }, ingredients)
    expect(live.removed).toBe(false)
    expect(componentFromRow(live, ingredients).macros.kcal).toBeCloseTo(77.8, 1)
  })
})
