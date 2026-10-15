import { describe, expect, it } from 'vitest'
import { COL, crackFor, heightFor, H_MAX, H_MIN, GOAL_Y, OVER_MAX, OVER_MAX_PX, renderH } from './tokens'

describe('scene units (spec section 7)', () => {
  it('H = 0.36 + 1.64 * eaten / goal (polish-spec 5.3), 2.0 at goal, clamped at 2.86', () => {
    expect(H_MIN).toBe(0.36)
    expect(heightFor(0, 2500)).toBe(H_MIN)
    expect(heightFor(2500, 2500)).toBeCloseTo(GOAL_Y, 10)
    expect(heightFor(1250, 2500)).toBeCloseTo(1.18, 10)
    expect(heightFor(10000, 2500)).toBe(H_MAX)
    expect(heightFor(-50, 2500)).toBe(H_MIN)
    // a zero goal never divides by zero
    expect(Number.isFinite(heightFor(500, 0))).toBe(true)
  })

  it('uCrack is 0 at goal and 1 at 25 percent over', () => {
    expect(crackFor(2500, 2500)).toBe(0)
    expect(crackFor(2000, 2500)).toBe(0)
    expect(crackFor(2625, 2500)).toBeCloseTo(0.2, 10)
    expect(crackFor(3125, 2500)).toBe(1)
    expect(crackFor(9000, 2500)).toBe(1)
  })

  it('three.js colours are the spec hexes', () => {
    expect(COL.column).toBe('#121218')
    expect(COL.plinth).toBe('#121217')
    expect(COL.ambient).toBe('#3A3428')
    expect(COL.goalLine).toBe('#F6E3A1')
    expect(COL.goalFlash).toBe('#FFF7DA')
    expect(COL.ember).toBe('#FF5A1F')
    expect(COL.dust).toBe('#9A8E7A')
    expect(COL.spark).toBe('#FF8C42')
    expect(COL.fog).toBe('#050507')
    for (const v of Object.values(COL)) expect(v).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('renderH is the identity up to the goal, then eases to a 0.30 unit crown (polish-spec 5.2)', () => {
    expect(renderH(0)).toBe(0)
    expect(renderH(1.2)).toBe(1.2)
    expect(renderH(2)).toBe(2)
    expect(renderH(10)).toBeLessThan(2.3001)
    expect(renderH(H_MAX)).toBeLessThan(GOAL_Y + OVER_MAX)
    let prev = -1
    for (let h = 0; h <= 4; h += 0.01) {
      const r = renderH(h)
      expect(r).toBeGreaterThanOrEqual(prev)
      prev = r
    }
    expect(OVER_MAX_PX).toBe(37)
  })
})
