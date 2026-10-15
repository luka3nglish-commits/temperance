import { describe, expect, it } from 'vitest'
import type { Ingredient, LogEntry, Meal } from '../lib/types'
import {
  EMPTY_DRAFT,
  basisFactor,
  basisTag,
  buildTotals,
  canLogDraft,
  componentFromRow,
  draftForEntry,
  draftForMeal,
  draftFrom,
  entryLabel,
  loggedToastText,
  mealLabel,
  quickResult,
  quickSubmission,
  switchBasis,
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
  suffixPadding,
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

describe('digit field padding', () => {
  it('leaves 36 px for a unit of one or two letters and 56 px for kcal and serve, so thirds fit at 360 px', () => {
    expect(suffixPadding('g')).toBe(36)
    expect(suffixPadding('ml')).toBe(36)
    expect(suffixPadding('kJ')).toBe(36)
    expect(suffixPadding('kcal')).toBe(56)
    expect(suffixPadding('serve')).toBe(56)
    expect(suffixPadding(undefined)).toBe(16)
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
    const d = draftFrom({ name: 'Oats', macros: { kcal: 612, protein: 31.5, carbs: 48, fat: 12 }, amount: 2, mealId: 'm-Oats' }, 'kJ')
    expect(d.energy).toBe('2561')
    expect(d.protein).toBe('31.5')
    expect(d.carbs).toBe('48')
    expect(d.basis).toBe('serve')
    expect(d.amount).toBe(2)
    expect(d.source?.mealId).toBe('m-Oats')
    expect(d.source?.basis).toBe('serve')
  })
  it('keeps any typed amount: no rounding to half serves and no ceiling of 4 (the old clamp is gone)', () => {
    expect(draftFrom({ amount: 1.8 }, 'kcal').amount).toBe(1.8)
    expect(draftFrom({ amount: 5 }, 'kcal').amount).toBe(5)
    expect(draftFrom({ amount: 1.3 }, 'kcal').amount).toBe(1.3)
    expect(draftFrom({ basis: 'g', amount: 183 }, 'kcal').amount).toBe(183)
    // nonsense falls back to the basis default
    expect(draftFrom({ amount: 0 }, 'kcal').amount).toBe(1)
    expect(draftFrom({ basis: 'g' }, 'kcal').amount).toBe(100)
    expect(draftFrom({ basis: 'ml', amount: Number.NaN }, 'kcal').amount).toBe(250)
  })
  it('knows when the prefilled numbers are untouched, even after a kJ round trip', () => {
    const macros = { kcal: 612, protein: 31.5, carbs: 48, fat: 12 }
    const kj = draftFrom({ name: 'Oats', macros, mealId: 'm-Oats' }, 'kJ')
    expect(draftUntouched(kj, 'kJ')).toBe(true)
    expect(draftUntouched({ ...kj, amount: 2 }, 'kJ')).toBe(true)
    expect(draftUntouched({ ...kj, energy: '2600' }, 'kJ')).toBe(false)
    expect(draftUntouched({ ...kj, name: 'Oats and honey' }, 'kJ')).toBe(false)
    expect(draftUntouched({ ...kj, source: null }, 'kJ')).toBe(false)
    // the same numbers on another basis mean something else
    expect(draftUntouched({ ...kj, basis: 'g' }, 'kJ')).toBe(false)
  })
})

describe('basis and portion', () => {
  const label = { kcal: 97, protein: 9, carbs: 4, fat: 5 }
  it('switching basis never converts the label numbers and resets the amount: 1 serve, 100 g, 250 ml', () => {
    const d = draftFrom({ name: 'Yoghurt', macros: label, amount: 1.5 }, 'kcal')
    const g = switchBasis(d, 'g')
    expect(g.basis).toBe('g')
    expect(g.amount).toBe(100)
    expect(g.energy).toBe('97')
    expect(switchBasis(g, 'ml').amount).toBe(250)
    expect(switchBasis(g, 'serve').amount).toBe(1)
    expect(switchBasis(g, 'g')).toBe(g)
  })
  it("switching back to the source meal's basis restores its usual amount", () => {
    const d = draftFrom({ name: 'Yoghurt', macros: label, basis: 'g', amount: 120, mealId: 'm1', usual: 180 }, 'kcal')
    const back = switchBasis(switchBasis(d, 'serve'), 'g')
    expect(back.amount).toBe(180)
    expect(switchBasis(d, 'ml').amount).toBe(250)
  })
  it('the live result: serve multiplies by the amount, g and ml by amount over 100, a typed preview wins', () => {
    const serve = draftFrom({ macros: { kcal: 200, protein: 10, carbs: 20, fat: 5 }, amount: 1.3 }, 'kcal')
    expect(quickResult(serve, 'kcal')).toEqual({ kcal: 260, protein: 13, carbs: 26, fat: 6.5 })
    const g = draftFrom({ macros: label, basis: 'g', amount: 183 }, 'kcal')
    expect(quickResult(g, 'kcal')?.kcal).toBeCloseTo(177.5, 1)
    expect(quickResult(g, 'kcal', 200)?.kcal).toBe(194)
    expect(quickResult(g, 'kcal', null)?.kcal).toBeCloseTo(177.5, 1)
    expect(quickResult(EMPTY_DRAFT, 'kcal')).toBeNull()
    // kJ typed on the label still logs kcal
    const kj = { ...g, energy: '406' }
    expect(quickResult(kj, 'kJ', 100)?.kcal).toBeCloseTo(97, 0)
  })
  it('basis tags read as the label prints them', () => {
    expect(basisTag('serve')).toBe('Per serve')
    expect(basisTag('g')).toBe('Per 100 g')
    expect(basisTag('ml')).toBe('Per 100 ml')
    expect(basisFactor('g', 250)).toBe(2.5)
    expect(basisFactor('serve', 1.3)).toBe(1.3)
  })
})

describe('submit', () => {
  const label = { kcal: 97, protein: 9, carbs: 4, fat: 5 }
  const yog: Meal = { ...meal('Greek yoghurt', 97), id: 'm-yog', macros: label, per: { amount: 100, unit: 'g' }, usual: 180 }
  const oats = meal('Oats', 400)
  const meals = { [yog.id]: yog, [oats.id]: oats }

  it('per serve logs typed numbers with the servings typed (1.3 stays 1.3)', () => {
    const d = { ...draftFrom({ name: 'Porridge', macros: { kcal: 300, protein: 10, carbs: 50, fat: 6 } }, 'kcal'), amount: 1.3 }
    const s = quickSubmission(d, 'kcal', meals)
    expect(s?.meal).toBeUndefined()
    expect(s?.quick).toEqual({ name: 'Porridge', macros: { kcal: 300, protein: 10, carbs: 50, fat: 6 }, servings: 1.3, saveToLibrary: true })
  })
  it('per 100 g logs the label numbers with per and the grams eaten', () => {
    const d = { ...switchBasis(draftFrom({ name: 'Skyr', macros: label }, 'kcal'), 'g'), amount: 183 }
    const s = quickSubmission(d, 'kcal', meals)
    expect(s?.quick).toEqual({ name: 'Skyr', macros: label, per: { amount: 100, unit: 'g' }, amount: 183, saveToLibrary: true })
    const ml = quickSubmission({ ...d, basis: 'ml', amount: 330 }, 'kcal', meals)
    expect(ml?.quick.per).toEqual({ amount: 100, unit: 'ml' })
    expect(ml?.quick.amount).toBe(330)
  })
  it('an untouched library meal logs the meal itself on its own basis, typed numbers otherwise', () => {
    const d = { ...draftForMeal(yog, 'kcal'), amount: 150 }
    expect(d.basis).toBe('g')
    expect(d.amount).toBe(150)
    expect(quickSubmission(d, 'kcal', meals)?.meal).toEqual({ id: 'm-yog', portion: { amount: 150, unit: 'g' } })
    const serve = { ...draftForMeal(oats, 'kcal'), amount: 1.5 }
    expect(quickSubmission(serve, 'kcal', meals)?.meal).toEqual({ id: oats.id, portion: 1.5 })
    // touched numbers, or a basis switched away from the meal's, log typed numbers
    expect(quickSubmission({ ...d, energy: '120' }, 'kcal', meals)?.meal).toBeUndefined()
    expect(quickSubmission(switchBasis(d, 'serve'), 'kcal', meals)?.meal).toBeUndefined()
    // a meal deleted since the prefill falls back to typed numbers
    expect(quickSubmission(d, 'kcal', { [oats.id]: oats })?.meal).toBeUndefined()
    expect(quickSubmission(EMPTY_DRAFT, 'kcal', meals)).toBeNull()
  })
  it('the toast names the portion unless it is exactly one serve', () => {
    expect(loggedToastText({ macros: { kcal: 175, protein: 16, carbs: 7, fat: 9 }, servings: 1.8, portion: { amount: 180, unit: 'g' } }, 'kcal')).toBe(`Logged · 180 g · 175${THIN}kcal`)
    expect(loggedToastText({ macros: { kcal: 612, protein: 0, carbs: 0, fat: 0 }, servings: 1 }, 'kcal')).toBe(`Logged · 612${THIN}kcal`)
    expect(loggedToastText({ macros: { kcal: 390, protein: 0, carbs: 0, fat: 0 }, servings: 1.3 }, 'kcal')).toBe(`Logged · 1.3 serves · 390${THIN}kcal`)
  })
})

describe('prefills keep their basis', () => {
  const label = { kcal: 97, protein: 9, carbs: 4, fat: 5 }
  it('a library meal brings its basis and usual amount; a per-30 g basis reads as per 100 g', () => {
    const yog: Meal = { ...meal('Greek yoghurt', 97), macros: label, per: { amount: 100, unit: 'g' }, usual: 180 }
    expect(mealLabel(yog)).toEqual({ macros: label, basis: 'g', amount: 180, usual: 180 })
    const bar: Meal = { ...meal('Bar', 120), macros: { kcal: 120, protein: 6, carbs: 15, fat: 3 }, per: { amount: 30, unit: 'g' } }
    const lab = mealLabel(bar)
    expect(lab.basis).toBe('g')
    expect(lab.macros.kcal).toBe(400)
    expect(lab.amount).toBe(30)
    const oats = { ...meal('Oats', 400), usual: 1.5 }
    expect(mealLabel(oats)).toEqual({ macros: oats.macros, basis: 'serve', amount: 1.5, usual: 1.5 })
    // a prefill's servings count bases
    expect(draftForMeal(yog, 'kcal', 2).amount).toBe(200)
  })
  it('a logged entry reads back as per 100 g and the grams eaten, or per serve and the servings', () => {
    const e: LogEntry = { id: 'e', day: '2026-10-15', at: 0, name: 'Greek yoghurt', servings: 1.8, macros: { kcal: 174.6, protein: 16.2, carbs: 7.2, fat: 9 }, portion: { amount: 180, unit: 'g' } }
    const lab = entryLabel(e)
    expect(lab.basis).toBe('g')
    expect(lab.amount).toBe(180)
    expect(lab.macros).toEqual(label)
    const s = entryLabel({ ...e, portion: undefined, servings: 1.3, macros: { kcal: 260, protein: 13, carbs: 26, fat: 6.5 } })
    expect(s).toEqual({ macros: { kcal: 200, protein: 10, carbs: 20, fat: 5 }, basis: 'serve', amount: 1.3 })
  })
  it('a suggestion or long press remembers a library meal that still matches, with the amount eaten', () => {
    const yog: Meal = { ...meal('Greek yoghurt', 97), id: 'm-yog', macros: label, per: { amount: 100, unit: 'g' }, usual: 180 }
    const e: LogEntry = { id: 'e', day: '2026-10-15', at: 0, mealId: 'm-yog', name: 'Greek yoghurt', servings: 1.5, macros: { kcal: 145.5, protein: 13.5, carbs: 6, fat: 7.5 }, portion: { amount: 150, unit: 'g' } }
    const d = draftForEntry(e, { 'm-yog': yog }, 'kcal')
    expect(d.basis).toBe('g')
    expect(d.amount).toBe(150)
    expect(d.energy).toBe('97')
    expect(d.source).toMatchObject({ mealId: 'm-yog', basis: 'g', usual: 180 })
    // the meal changed since: the entry's own numbers, no source
    const edited = { ...yog, macros: { ...label, kcal: 120 } }
    expect(draftForEntry(e, { 'm-yog': edited }, 'kcal').source).toBeNull()
  })
})

describe('hint', () => {
  it('stays empty while calories and the 4/4/9 sum agree, or either is missing', () => {
    expect(hintFor({ energy: '', protein: '30', carbs: '50', fat: '10' }, 'kcal')).toEqual({ text: '', differs: false })
    expect(hintFor({ energy: '410', protein: '30', carbs: '50', fat: '10' }, 'kcal').text).toBe('')
  })
  it('reads Macros add to N when they differ, in the display unit', () => {
    expect(hintFor({ energy: '600', protein: '38', carbs: '62', fat: '14' }, 'kcal').text).toBe(`Macros add to 526${THIN}kcal.`)
    expect(hintFor({ energy: '3000', protein: '30', carbs: '50', fat: '10' }, 'kJ').text).toBe(`Macros add to 1${THIN}715${THIN}kJ.`)
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
