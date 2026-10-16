/**
 * The half-typed LOG sheet kept across a reload (MealFormDraft.ts): saved on every edit, taken back
 * once after a reload, never when stale, empty, in the other energy unit or malformed, and given up
 * after LOG_DRAFT_MAX_RESTORES boots without an edit so a draft can never hold a crash loop open.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Ingredient } from '../lib/types'
import { EMPTY_DRAFT, rowFromIngredient, type QuickDraft } from './MealForm'
import {
  LOG_DRAFT_KEY,
  LOG_DRAFT_MAX_AGE_MS,
  LOG_DRAFT_MAX_RESTORES,
  bootLogDraft,
  clearLogDraft,
  hasLogDraftContent,
  resetLogDraftBootForTests,
  saveLogDraft,
  takeLogDraft,
  type LogDraftState,
} from './MealFormDraft'

const NOW = 1_760_000_000_000
const OATS: Ingredient = {
  id: 'ing-oats',
  name: 'Oats',
  macros: { kcal: 389, protein: 17, carbs: 66, fat: 7 },
  per: { amount: 100, unit: 'g' },
  createdAt: NOW,
  updatedAt: NOW,
} as Ingredient

const typed: QuickDraft = { ...EMPTY_DRAFT, name: 'Chicken wrap', energy: '612', protein: '38' }
const quick = (draft: QuickDraft = typed): LogDraftState => ({ mode: 'quick', draft, rows: [], buildName: '', buildSave: null })
const stored = () => JSON.parse(localStorage.getItem(LOG_DRAFT_KEY) ?? 'null')

beforeEach(() => {
  localStorage.clear()
  resetLogDraftBootForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the LOG draft kept across a reload', () => {
  it('a typed QUICK draft comes back after a reload', () => {
    saveLogDraft(quick(), 'kcal', NOW)
    const back = takeLogDraft('kcal', NOW + 60_000)
    expect(back?.mode).toBe('quick')
    expect(back?.draft).toEqual(typed)
  })

  it('BUILD rows come back with fresh keys, so a row added after the reload never shares one', () => {
    const rows = [rowFromIngredient(OATS, 60)]
    saveLogDraft({ mode: 'build', draft: EMPTY_DRAFT, rows, buildName: 'Porridge', buildSave: true }, 'kcal', NOW)
    expect(stored().rows[0].key).toBeUndefined()
    const back = takeLogDraft('kcal', NOW + 1000)
    expect(back?.mode).toBe('build')
    expect(back?.buildName).toBe('Porridge')
    expect(back?.buildSave).toBe(true)
    expect(back?.rows).toHaveLength(1)
    const { key, ...row } = back!.rows[0]
    const { key: oldKey, ...oldRow } = rows[0]
    expect(row).toEqual(oldRow)
    expect(key).not.toBe(oldKey)
    expect(key).not.toBe(rowFromIngredient(OATS).key)
  })

  it('an empty sheet is never kept, and emptying the form forgets the old draft', () => {
    expect(hasLogDraftContent(quick(EMPTY_DRAFT))).toBe(false)
    const emptyBuild: LogDraftState = { mode: 'build', draft: EMPTY_DRAFT, rows: [], buildName: '  ', buildSave: null }
    expect(hasLogDraftContent(emptyBuild)).toBe(false)
    saveLogDraft(quick(), 'kcal', NOW)
    expect(stored()).not.toBeNull()
    saveLogDraft(quick(EMPTY_DRAFT), 'kcal', NOW + 1000)
    expect(stored()).toBeNull()
    expect(takeLogDraft('kcal', NOW + 2000)).toBeNull()
  })

  it('a portion change alone counts as something typed', () => {
    expect(hasLogDraftContent(quick({ ...EMPTY_DRAFT, basis: 'g', amount: 183 }))).toBe(true)
    expect(hasLogDraftContent(quick({ ...EMPTY_DRAFT, amount: 1.5 }))).toBe(true)
  })

  it('a draft older than 30 minutes is dropped', () => {
    saveLogDraft(quick(), 'kcal', NOW)
    expect(takeLogDraft('kcal', NOW + LOG_DRAFT_MAX_AGE_MS + 1)).toBeNull()
    expect(stored()).toBeNull()
  })

  it('a draft from a clock in the future is dropped', () => {
    saveLogDraft(quick(), 'kcal', NOW + 10 * 60_000)
    expect(takeLogDraft('kcal', NOW)).toBeNull()
  })

  it('a draft typed in the other energy unit is dropped (the numbers would be read wrong)', () => {
    saveLogDraft(quick(), 'kJ', NOW)
    expect(takeLogDraft('kcal', NOW + 1000)).toBeNull()
    expect(stored()).toBeNull()
  })

  it('gives up after the restore limit without an edit, so a crash in the sheet cannot loop', () => {
    saveLogDraft(quick(), 'kcal', NOW)
    for (let i = 0; i < LOG_DRAFT_MAX_RESTORES; i++) expect(takeLogDraft('kcal', NOW + 1000 + i)).not.toBeNull()
    expect(takeLogDraft('kcal', NOW + 5000)).toBeNull()
    expect(stored()).toBeNull()
  })

  it('saving the same content again keeps the restore count and the time; an edit resets both', () => {
    saveLogDraft(quick(), 'kcal', NOW)
    const back = takeLogDraft('kcal', NOW + 1000)!
    // the restored sheet re-renders with exactly what it was given: not an edit
    saveLogDraft(back, 'kcal', NOW + 2000)
    expect(stored().restores).toBe(1)
    expect(stored().at).toBe(NOW)
    saveLogDraft(quick({ ...typed, energy: '640' }), 'kcal', NOW + 3000)
    expect(stored().restores).toBe(0)
    expect(stored().at).toBe(NOW + 3000)
  })

  it('malformed storage never throws and is dropped; bad rows are left out', () => {
    localStorage.setItem(LOG_DRAFT_KEY, '{not json')
    expect(takeLogDraft('kcal', NOW)).toBeNull()
    localStorage.setItem(LOG_DRAFT_KEY, JSON.stringify({ v: 99, at: NOW, unit: 'kcal', restores: 0, mode: 'quick', draft: typed }))
    expect(takeLogDraft('kcal', NOW)).toBeNull()
    localStorage.setItem(LOG_DRAFT_KEY, JSON.stringify({ v: 1, at: NOW, unit: 'kcal', restores: 0, mode: 'quick', draft: { ...typed, energy: 612 } }))
    expect(takeLogDraft('kcal', NOW)).toBeNull()
    const good = rowFromIngredient(OATS, 50)
    const { key: _k, ...goodRow } = good
    localStorage.setItem(
      LOG_DRAFT_KEY,
      JSON.stringify({ v: 1, at: NOW, unit: 'kcal', restores: 0, mode: 'build', draft: EMPTY_DRAFT, rows: [goodRow, { ...goodRow, perAmount: 0 }, null, 'x'], buildName: 'Bowl', buildSave: null }),
    )
    const back = takeLogDraft('kcal', NOW)
    expect(back?.rows).toHaveLength(1)
    expect(back?.rows[0].name).toBe('Oats')
  })

  it('a broken source is dropped but the typed numbers are kept', () => {
    localStorage.setItem(
      LOG_DRAFT_KEY,
      JSON.stringify({ v: 1, at: NOW, unit: 'kcal', restores: 0, mode: 'quick', draft: { ...typed, source: { mealId: 7 } }, rows: [], buildName: '', buildSave: null }),
    )
    const back = takeLogDraft('kcal', NOW)
    expect(back?.draft.source).toBeNull()
    expect(back?.draft.energy).toBe('612')
  })

  it('storage that throws is ignored', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => saveLogDraft(quick(), 'kcal', NOW)).not.toThrow()
    expect(takeLogDraft('kcal', NOW)).toBeNull()
    expect(() => clearLogDraft()).not.toThrow()
  })

  it('the boot draft is read once per page load and forgotten once cleared', () => {
    saveLogDraft(quick(), 'kcal', Date.now())
    // the page reloads
    resetLogDraftBootForTests()
    const first = bootLogDraft('kcal')
    expect(first?.draft.energy).toBe('612')
    // a second call in the same load (React StrictMode runs initializers twice) gets the same draft
    expect(bootLogDraft('kcal')).toBe(first)
    expect(stored().restores).toBe(1)
    clearLogDraft()
    expect(bootLogDraft('kcal')).toBeNull()
    expect(stored()).toBeNull()
  })
})
