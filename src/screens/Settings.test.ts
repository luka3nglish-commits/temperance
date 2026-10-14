import { describe, expect, it } from 'vitest'
import { importedText } from './SettingsData'

describe('importedText', () => {
  it('reads meals and entries with a middle dot', () => {
    expect(importedText({ meals: 12, ingredients: 0, entries: 48 })).toBe('Imported · 12 meals · 48 entries')
  })
  it('uses singular forms', () => {
    expect(importedText({ meals: 1, ingredients: 0, entries: 1 })).toBe('Imported · 1 meal · 1 entry')
  })
  it('names ingredients only when some came in', () => {
    expect(importedText({ meals: 2, ingredients: 3, entries: 0 })).toBe('Imported · 2 meals · 3 ingredients · 0 entries')
  })
})
