import { describe, expect, it } from 'vitest'
import { dayKeyOffset, formatDayLabel, formatTime, isValidDayKey, localDayKey, msUntilNextLocalMidnight, parseDayKey } from './day'

describe('day keys', () => {
  it('builds a local key', () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localDayKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })

  it('parses back to local midnight', () => {
    const d = parseDayKey('2026-10-13')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(9)
    expect(d.getDate()).toBe(13)
    expect(d.getHours()).toBe(0)
  })

  it('offsets across month boundaries', () => {
    expect(dayKeyOffset('2026-11-01', -1)).toBe('2026-10-31')
    expect(dayKeyOffset('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('validates keys', () => {
    expect(isValidDayKey('2026-10-13')).toBe(true)
    expect(isValidDayKey('2026-13-45')).toBe(false)
    expect(isValidDayKey('2026-02-30')).toBe(false)
    expect(isValidDayKey('nope')).toBe(false)
  })

  it('labels days', () => {
    expect(formatDayLabel('2026-10-13', '2026-10-13')).toBe('Today')
    expect(formatDayLabel('2026-10-12', '2026-10-13')).toBe('Yesterday')
    expect(formatDayLabel('2026-10-05', '2026-10-13')).toBe('Mon 5 Oct')
  })

  it('formats times', () => {
    expect(formatTime(new Date(2026, 9, 13, 7, 5).getTime())).toBe('7:05 am')
    expect(formatTime(new Date(2026, 9, 13, 0, 0).getTime())).toBe('12:00 am')
    expect(formatTime(new Date(2026, 9, 13, 12, 30).getTime())).toBe('12:30 pm')
  })

  it('computes time to next midnight', () => {
    const ms = msUntilNextLocalMidnight(new Date(2026, 9, 13, 23, 0, 0))
    expect(ms).toBe(60 * 60 * 1000)
  })
})
