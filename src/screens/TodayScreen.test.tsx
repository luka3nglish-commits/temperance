import { describe, expect, it } from 'vitest'
import { formatHeaderDate } from './TodayHeader'
import { heroLabel } from './TodayNumber'
import { macroLine } from './TodaySheet'
import { buildEntryPatch } from './TodayEntryEdit'
import type { LogEntry } from '../lib/types'

const entry: LogEntry = {
  id: 'e1',
  day: '2026-10-13',
  at: 0,
  name: 'Oats',
  servings: 1,
  macros: { kcal: 612, protein: 32.4, carbs: 47.6, fat: 12 },
}

describe('today copy helpers', () => {
  it('header date reads like MON 13 OCT (uppercased by CSS), from a local day key', () => {
    expect(formatHeaderDate('2026-10-13')).toBe('Tue 13 Oct')
    expect(formatHeaderDate('2026-01-01')).toBe('Thu 1 Jan')
  })

  it('hero label: over the line always wins, then the chosen figure', () => {
    expect(heroLabel(true, 'remaining')).toBe('Over the line')
    expect(heroLabel(true, 'eaten')).toBe('Over the line')
    expect(heroLabel(false, 'remaining')).toBe('Remaining')
    expect(heroLabel(false, 'eaten')).toBe('Eaten')
  })

  it('macro line uses middle dots and whole grams', () => {
    const line = macroLine(entry)
    expect(line).toBe('P 32 · C 48 · F 12')
    expect(line).not.toMatch(/[–—]/)
  })
})

describe('entry edit patch', () => {
  it('returns null without calories and parses grams with 0 defaults', () => {
    expect(buildEntryPatch({ name: 'Oats', servings: 1, kcal: '', protein: '1', carbs: '', fat: '' }, 'kcal')).toBeNull()
    const p = buildEntryPatch({ name: 'Oats', servings: 1.5, kcal: '612', protein: '32', carbs: '', fat: '12.5' }, 'kcal')
    expect(p).toEqual({ name: 'Oats', servings: 1.5, macros: { kcal: 612, protein: 32, carbs: 0, fat: 12.5 } })
  })

  it('typed kJ is stored as kcal (symmetric with the display conversion)', () => {
    const p = buildEntryPatch({ name: 'Oats', servings: 1, kcal: '2560', protein: '0', carbs: '0', fat: '0' }, 'kJ')
    expect(p?.macros.kcal).toBe(612)
  })
})
