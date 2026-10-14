import { describe, expect, it } from 'vitest'
import { dayKeyOffset, formatDayLabel, formatDayLong, isValidDayKey, localDayKey, msUntilNextLocalMidnight, parseDayKey, yesterdayKey } from './day'

describe('formatDayLong', () => {
  it('writes the full month name and year', () => {
    expect(formatDayLong('2026-10-12')).toBe('12 October 2026')
    expect(formatDayLong('2026-01-01')).toBe('1 January 2026')
    expect(formatDayLong('2027-12-31')).toBe('31 December 2027')
  })

  it('never pads the day of month', () => {
    expect(formatDayLong('2026-03-05')).toBe('5 March 2026')
  })
})

describe('dayKeyOffset across year boundaries', () => {
  it('steps backwards into the previous year', () => {
    expect(dayKeyOffset('2027-01-01', -1)).toBe('2026-12-31')
    expect(dayKeyOffset('2027-01-03', -5)).toBe('2026-12-29')
  })

  it('hops a whole year', () => {
    expect(dayKeyOffset('2027-03-01', -365)).toBe('2026-03-01')
    // 2028 is a leap year so 366 days separates 1 Jan 2028 from 1 Jan 2029
    expect(dayKeyOffset('2029-01-01', -366)).toBe('2028-01-01')
    expect(dayKeyOffset('2029-01-01', -365)).toBe('2028-01-02')
  })

  it('zero offset is the identity', () => {
    expect(dayKeyOffset('2026-10-13', 0)).toBe('2026-10-13')
  })

  it('yesterdayKey is a one day backward offset', () => {
    expect(yesterdayKey('2027-01-01')).toBe('2026-12-31')
    expect(yesterdayKey('2026-03-01')).toBe('2026-02-28')
  })
})

describe('isValidDayKey and leap days', () => {
  it('accepts 29 February on a leap year', () => {
    expect(isValidDayKey('2028-02-29')).toBe(true)
  })

  it('rejects 29 February on a common year', () => {
    expect(isValidDayKey('2027-02-29')).toBe(false)
  })

  it('rejects the wrong shape even when the date exists', () => {
    expect(isValidDayKey('2026-1-5')).toBe(false)
    expect(isValidDayKey('2026/10/13')).toBe(false)
    expect(isValidDayKey(' 2026-10-13')).toBe(false)
    expect(isValidDayKey('')).toBe(false)
  })

  it('rejects zero month and zero day', () => {
    expect(isValidDayKey('2026-00-10')).toBe(false)
    expect(isValidDayKey('2026-10-00')).toBe(false)
  })

  it('round trips a leap day through parse and format', () => {
    const d = parseDayKey('2028-02-29')
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(29)
    expect(localDayKey(d)).toBe('2028-02-29')
    expect(formatDayLong('2028-02-29')).toBe('29 February 2028')
    expect(formatDayLabel('2028-02-29', '2028-03-10')).toBe('Tue 29 Feb')
  })
})

describe('msUntilNextLocalMidnight', () => {
  it('returns a full day at midnight itself', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 13, 0, 0, 0, 0))).toBe(24 * 60 * 60 * 1000)
  })

  it('never returns less than one second right before midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 13, 23, 59, 59, 900))).toBe(1000)
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 13, 23, 59, 59, 999))).toBe(1000)
  })

  it('returns the exact remainder when more than one second is left', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 13, 23, 59, 58, 500))).toBe(1500)
  })

  it('crosses a year end', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 11, 31, 23, 30, 0, 0))).toBe(30 * 60 * 1000)
  })
})
