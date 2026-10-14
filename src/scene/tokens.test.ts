import { describe, expect, it } from 'vitest'
import { COL, crackFor, heightFor, H_MAX, H_MIN, GOAL_Y } from './tokens'

describe('scene units (spec section 7)', () => {
  it('H = 0.18 + 1.82 * eaten / goal, 2.0 at goal, clamped at 2.86', () => {
    expect(heightFor(0, 2500)).toBe(H_MIN)
    expect(heightFor(2500, 2500)).toBeCloseTo(GOAL_Y, 10)
    expect(heightFor(1250, 2500)).toBeCloseTo(1.09, 10)
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
    expect(COL.column).toBe('#0B0B0F')
    expect(COL.goalLine).toBe('#F6E3A1')
    expect(COL.goalFlash).toBe('#FFF7DA')
    expect(COL.ember).toBe('#FF5A1F')
    expect(COL.dust).toBe('#9A8E7A')
    expect(COL.spark).toBe('#FF8C42')
    expect(COL.fog).toBe('#050507')
    for (const v of Object.values(COL)) expect(v).toMatch(/^#[0-9A-F]{6}$/)
  })
})
