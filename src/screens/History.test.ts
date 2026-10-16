/**
 * HISTORY · LEDGER: the pure pieces behind the colonnade, the stat stones, the week rows and the day
 * sheet rows (polish-spec 6.4). Rendered behaviour lives in HistoryWeightChart.test.ts.
 */
import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../lib/types'
import { portionLabel } from '../lib/portion'
import { formatInt } from '../lib/units'
import { stoneValues } from './HistoryStones'
import { columnHeight } from './HistoryColonnade'
import { dayStamp, dayStampLong, deltaText, entryMeta } from './HistoryWeek'

const entry = (over: Partial<LogEntry> = {}): LogEntry =>
  ({
    id: 'e1',
    day: '2026-10-15',
    at: new Date(2026, 9, 15, 15, 20).getTime(),
    name: 'Greek yoghurt',
    macros: { kcal: 175, protein: 16.4, carbs: 7.2, fat: 8.6 },
    servings: 1,
    ...over,
  }) as LogEntry

describe('stat stones', () => {
  it('reads Arabic numerals with the unit beside the average', () => {
    expect(stoneValues(2015, { under: 7, logged: 7 }, 12, 'kcal')).toEqual({ avg: formatInt(2015), under: '7 of 7', streak: '12' })
  })
  it('shows a middle dot (empty value) when nothing was logged', () => {
    expect(stoneValues(0, { under: 0, logged: 0 }, 0, 'kcal')).toEqual({ avg: '', under: '', streak: '' })
  })
  it('reads a broken streak as 0 once anything was logged', () => {
    expect(stoneValues(2400, { under: 3, logged: 5 }, 0, 'kcal').streak).toBe('0')
    expect(stoneValues(0, { under: 0, logged: 0 }, 0, 'kcal', true).streak).toBe('0')
  })
  it('converts the average to kJ for display', () => {
    expect(stoneValues(1000, { under: 1, logged: 1 }, 1, 'kJ').avg).toBe(formatInt(4184))
  })
})

describe('colonnade', () => {
  it('stands a day at the goal on the line at 60 percent of the column', () => {
    const atGoal = columnHeight(2600, 2600, true)
    expect(atGoal).toBe(Math.round(154 * 0.6))
    expect(columnHeight(1300, 2600, true)).toBe(Math.round(atGoal / 2))
  })
  it('caps at the strip, floors at a stub, and draws untracked days as stubs', () => {
    expect(columnHeight(99999, 2600, true)).toBe(154)
    expect(columnHeight(1, 2600, true)).toBe(4)
    expect(columnHeight(2000, 2600, false)).toBe(4)
    expect(columnHeight(2000, 0, true)).toBe(4)
  })
})

describe('week rows', () => {
  it('stamps days for the Cinzel column', () => {
    expect(dayStamp('2026-10-15')).toBe('Thu 15')
    expect(dayStampLong('2026-10-15')).toBe('Thu 15 Oct')
  })
  it('reads the delta as a magnitude, never a minus sign', () => {
    expect(deltaText(1328, 2600, 'kcal')).toEqual({ over: false, text: `${formatInt(1272)} left` })
    expect(deltaText(2940, 2600, 'kcal')).toEqual({ over: true, text: '340 over' })
    const dashes = new RegExp('[-\u2212\u2013\u2014]')
    for (const k of [0, 1500, 4000]) expect(deltaText(k, 2600, 'kJ').text).not.toMatch(dashes)
    expect(deltaText(2600, 2600, 'kcal')).toEqual({ over: false, text: '0 left' })
  })
})

describe('day sheet rows', () => {
  it('writes the meta line with integer macros and the time', () => {
    expect(entryMeta(entry())).toBe('3:20 pm · P 16 · C 7 · F 9')
  })
  it('shows the portion after the name only when one was recorded', () => {
    expect(portionLabel(entry())).toBe('')
    expect(portionLabel(entry({ servings: 1.8, portion: { amount: 180, unit: 'g' } }))).toBe('180 g')
    expect(portionLabel(entry({ servings: 1.5 }))).toBe('1.5 serves')
    expect(portionLabel(entry({ servings: 0.5 }))).toBe('0.5 serve')
  })
})
