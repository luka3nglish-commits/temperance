import { describe, expect, it } from 'vitest'
import { dayKeyOffset, formatDayLabel, formatDayLong, isValidDayKey, msUntilNextLocalMidnight, yesterdayKey } from './day'

describe('formatDayLong', () => {
  it('writes the full month name and year without padding', () => {
    expect(formatDayLong('2026-10-12')).toBe('12 October 2026')
    expect(formatDayLong('2026-01-05')).toBe('5 January 2026')
    expect(formatDayLong('2027-12-31')).toBe('31 December 2027')
  })
})

describe('dayKeyOffset', () => {
  it('steps backwards across a year boundary', () => {
    expect(dayKeyOffset('2027-01-01', -1)).toBe('2026-12-31')
    expect(dayKeyOffset('2027-01-03', -5)).toBe('2026-12-29')
    expect(yesterdayKey('2027-01-01')).toBe('2026-12-31')
  })

  it('steps across a leap day in both directions', () => {
    expect(dayKeyOffset('2028-02-28', 1)).toBe('2028-02-29')
    expect(dayKeyOffset('2028-03-01', -1)).toBe('2028-02-29')
    expect(dayKeyOffset('2027-03-01', -1)).toBe('2027-02-28')
    expect(dayKeyOffset('2026-10-13', 0)).toBe('2026-10-13')
  })
})

describe('isValidDayKey', () => {
  it('knows leap years', () => {
    expect(isValidDayKey('2028-02-29')).toBe(true)
    expect(isValidDayKey('2027-02-29')).toBe(false)
    expect(isValidDayKey('2100-02-29')).toBe(false)
    expect(isValidDayKey('2000-02-29')).toBe(true)
  })

  it('rejects unpadded, out of range and decorated keys', () => {
    expect(isValidDayKey('2026-1-5')).toBe(false)
    expect(isValidDayKey('2026-00-10')).toBe(false)
    expect(isValidDayKey('2026-04-31')).toBe(false)
    expect(isValidDayKey('2026-10-13T00:00')).toBe(false)
    expect(isValidDayKey(' 2026-10-13')).toBe(false)
    expect(isValidDayKey('2026-12-31')).toBe(true)
  })
})

describe('msUntilNextLocalMidnight', () => {
  it('never returns less than one second right before midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 13, 23, 59, 59, 900))).toBe(1000)
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 13, 23, 59, 59, 999))).toBe(1000)
  })

  it('returns a full day at exactly midnight and the right span otherwise', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 13, 0, 0, 0, 0))).toBe(24 * 60 * 60 * 1000)
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 13, 23, 59, 58, 0))).toBe(2000)
  })
})

describe('formatDayLabel on far days', () => {
  it('falls through to the short weekday format for the day before yesterday', () => {
    expect(formatDayLabel('2026-10-11', '2026-10-13')).toBe('Sun 11 Oct')
    expect(formatDayLabel('2026-12-31', '2027-01-01')).toBe('Yesterday')
  })
})
