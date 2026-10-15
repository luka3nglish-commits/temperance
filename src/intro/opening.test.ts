import { describe, expect, it } from 'vitest'
import { decideVariant, readSeen, SEEN_KEY, SEEN_TTL_MS, writeSeen } from './useOpening'
import { FADE_MS, FULL_MS, GHOST_AT_MS, GHOST_MS, RISE_AT_MS, RISE_MS, SHORT_MS } from './timeline'
import { CLIP_TARGETS, hiddenVars, OPACITY_TARGETS, TARGET_NAMES } from './targets'

const NOW = 1_700_000_000_000

describe('decideVariant', () => {
  it('first launch plays the full opening whatever the setting', () => {
    expect(decideVariant({ introCount: 0, opening: 'short' }, false, null, NOW)).toBe('full')
    expect(decideVariant({ introCount: 0, opening: 'off' }, false, null, NOW)).toBe('full')
    // a replay (introCount zeroed) beats the ten minute window
    expect(decideVariant({ introCount: 0, opening: 'short' }, false, NOW - 1000, NOW)).toBe('full')
  })

  it('later launches play short by default, full daily on request, a crossfade when off', () => {
    expect(decideVariant({ introCount: 3, opening: 'short' }, false, null, NOW)).toBe('short')
    expect(decideVariant({ introCount: 3, opening: 'full' }, false, null, NOW)).toBe('full')
    expect(decideVariant({ introCount: 3, opening: 'off' }, false, null, NOW)).toBe('fade')
  })

  it('reduced motion is always the 240 ms crossfade', () => {
    expect(decideVariant({ introCount: 0, opening: 'short' }, true, null, NOW)).toBe('fade')
    expect(decideVariant({ introCount: 2, opening: 'full' }, true, null, NOW)).toBe('fade')
  })

  it('returning within ten minutes plays nothing, after ten minutes it plays again', () => {
    expect(decideVariant({ introCount: 2, opening: 'short' }, false, NOW - SEEN_TTL_MS + 1, NOW)).toBe('none')
    expect(decideVariant({ introCount: 2, opening: 'short' }, true, NOW - 5000, NOW)).toBe('none')
    expect(decideVariant({ introCount: 2, opening: 'short' }, false, NOW - SEEN_TTL_MS, NOW)).toBe('short')
    // a clock that went backwards never counts as "seen"
    expect(decideVariant({ introCount: 2, opening: 'short' }, false, NOW + 60_000, NOW)).toBe('short')
  })
})

describe('temperance.seen', () => {
  it('round trips through storage and tolerates garbage or no storage', () => {
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
    expect(readSeen(storage)).toBeNull()
    writeSeen(NOW, storage)
    expect(store.get(SEEN_KEY)).toBe(String(NOW))
    expect(readSeen(storage)).toBe(NOW)
    store.set(SEEN_KEY, 'soon')
    expect(readSeen(storage)).toBeNull()
    expect(readSeen(null)).toBeNull()
    expect(() => writeSeen(NOW, null)).not.toThrow()
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readSeen(throwing)).toBeNull()
    expect(() => writeSeen(NOW, throwing)).not.toThrow()
  })
})

describe('timeline budget', () => {
  it('keeps the spec windows', () => {
    expect(FULL_MS).toBe(1900)
    expect(SHORT_MS).toBe(700)
    expect(FADE_MS).toBe(240)
    // the column lands at 1000 inside the 680 ms dolly that starts at 420
    expect(RISE_AT_MS + RISE_MS).toBe(1100)
    // polish-spec 5.5: the glass ghost rises 420 to 860
    expect(GHOST_AT_MS).toBe(420)
    expect(GHOST_AT_MS + GHOST_MS).toBe(860)
  })

  it('the temple and the streak take part (polish-spec 5.5), all faded, never clipped', () => {
    for (const name of ['colonnade', 'shaft', 'streak'] as const) {
      expect(TARGET_NAMES).toContain(name)
      expect(OPACITY_TARGETS).toContain(name)
      expect(hiddenVars(name, 'cut')).toEqual({ opacity: 0 })
    }
  })

  it('hides every target before the first frame, the number by clip in the cut variants', () => {
    for (const name of TARGET_NAMES) {
      expect(OPACITY_TARGETS.includes(name) || CLIP_TARGETS.includes(name)).toBe(true)
      expect(hiddenVars(name, 'fade')).toEqual({ opacity: 0 })
    }
    expect(hiddenVars('number', 'cut')).toEqual({ clipPath: 'inset(100% 0 0 0)' })
    expect(hiddenVars('stoic', 'cut')).toEqual({ opacity: 0 })
  })
})
