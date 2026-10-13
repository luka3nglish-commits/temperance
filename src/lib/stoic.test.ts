import { describe, expect, it } from 'vitest'
import { STOIC_LINES, stoicLineForDay } from './stoic'

describe('stoic lines', () => {
  it('has 30 lines, each with an author, under 100 characters, with no dashes or exclamation marks', () => {
    expect(STOIC_LINES).toHaveLength(30)
    for (const l of STOIC_LINES) {
      expect(l.author.length).toBeGreaterThan(0)
      expect(l.text.length).toBeLessThan(100)
      expect(l.text).not.toMatch(/[–—!]/)
      expect(l.text).not.toMatch(/ - /)
    }
  })

  it('picks the same line all day and a different one the next day', () => {
    const a = stoicLineForDay('2026-10-13')
    const b = stoicLineForDay('2026-10-14')
    expect(a).toBeDefined()
    expect(STOIC_LINES).toContain(a)
    expect(a).not.toBe(b)
  })
})
