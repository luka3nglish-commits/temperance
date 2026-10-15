// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { bezier, EASE, Monument, MS, type MonumentHooks } from './strike'
import { CAMERA_REST, GOAL_Y } from './tokens'

function hooks(reduced: boolean): MonumentHooks & { holds: number[]; invalidations: number } {
  const h = {
    holds: [] as number[],
    invalidations: 0,
    invalidate() {
      h.invalidations++
    },
    holdAlways(ms: number) {
      h.holds.push(ms)
    },
    reduced: () => reduced,
    now: () => performance.now() / 1000,
  }
  return h
}

describe('bezier eases', () => {
  it('pin the ends and run through the middle of the motion tokens', () => {
    for (const e of Object.values(EASE)) {
      expect(e(0)).toBe(0)
      expect(e(1)).toBe(1)
      expect(e(0.5)).toBeGreaterThan(0)
    }
    // --ease-settle overshoots past 1 before it lands
    const settle = bezier(0.34, 1.56, 0.64, 1)
    let max = 0
    for (let t = 0; t <= 1; t += 0.01) max = Math.max(max, settle(t))
    expect(max).toBeGreaterThan(1)
    // --ease-hit starts slow and arrives fast
    expect(EASE.hit(0.3)).toBeLessThan(0.3)
  })
})

describe('Monument choreography', () => {
  it('setInstant jumps to the targets with the camera at rest and no dust', () => {
    const h = hooks(false)
    const m = new Monument(h)
    m.setTargets(1.4, 0)
    m.setInstant()
    expect(m.mon.h).toBe(1.4)
    expect(m.mon.crack).toBe(0)
    expect(m.mon.camZ).toBe(CAMERA_REST.pos[2])
    expect(m.mon.goalX).toBe(1)
    expect(m.mon.dustVisible).toBe(false)
    expect(m.placed).toBe(true)
    expect(h.invalidations).toBeGreaterThan(0)
  })

  it('reduced motion: strikes and the opening snap, nothing holds the frameloop', () => {
    const h = hooks(true)
    const m = new Monument(h)
    m.setTargets(2.4, 0.8)
    m.playOpeningRise(680)
    expect(m.mon.h).toBe(2.4)
    expect(m.mon.crack).toBe(0.8)
    m.setTargets(1.0, 0)
    m.strikeRemove()
    expect(m.mon.h).toBe(1.0)
    expect(m.mon.crack).toBe(0)
    m.setTargets(2.2, 0.4)
    m.strikeLog()
    expect(m.mon.h).toBe(2.2)
    expect(m.mon.crack).toBe(0.4)
    m.shake(1)
    expect(m.mon.trauma).toBe(0)
    expect(h.holds).toEqual([])
  })

  it('a live strike holds the always window for the dust life and tweens towards 1.015 x H', () => {
    const h = hooks(false)
    const m = new Monument(h)
    m.setTargets(1.0, 0)
    m.setInstant()
    m.setTargets(1.5, 0)
    m.strikeLog()
    expect(h.holds).toContain(MS.always)
    expect(m.placed).toBe(true)
    m.killAll()
  })

  it('tick decays trauma, turns the column and orbits the sweep light in idle only', () => {
    const h = hooks(false)
    const m = new Monument(h)
    m.mon.trauma = 1
    const theta0 = m.mon.theta
    m.tick(0.25, false, false)
    expect(m.mon.trauma).toBeCloseTo(1 - 0.25 * 2.4, 5)
    m.tick(0.5, false, false)
    // trauma never goes negative (spec section 7: max(0, trauma - dt * 2.4))
    expect(m.mon.trauma).toBe(0)
    expect(m.mon.rotY).toBe(0)
    expect(m.mon.theta).toBe(theta0)
    m.tick(1, true, false)
    expect(m.mon.rotY).toBeCloseTo(0.035, 5)
    expect(m.mon.theta).toBeCloseTo(theta0 + (Math.PI * 2) / 14, 5)
    // reduced: the sweep rests at 0.6 and nothing turns
    m.tick(1, true, true)
    expect(m.mon.theta).toBe(0.6)
    expect(m.mon.rotY).toBeCloseTo(0.035, 5)
  })

  it('the ghost waits for the opening: hidden at mount, revealed by setInstant or playGhostReveal', () => {
    const live = new Monument(hooks(false))
    expect(live.mon.ghost).toBe(0)
    live.playGhostReveal(440)
    expect(live.mon.ghost).toBe(0)
    live.killAll()
    live.setInstant()
    expect(live.mon.ghost).toBe(1)
    const reduced = new Monument(hooks(true))
    reduced.playGhostReveal(440)
    expect(reduced.mon.ghost).toBe(1)
  })

  it('polish-spec 5.4: the strike window is 1600 ms; a live strike charges the glint, reduced motion never does', () => {
    expect(MS.always).toBe(1600)
    const h = hooks(false)
    const m = new Monument(h)
    m.setTargets(1.0, 0)
    m.setInstant()
    m.setTargets(2.2, 0.4)
    m.strikeLog()
    // the strike crosses the line: an ember glint rides the rising stone
    expect(m.mon.glintOn).toBe(1)
    expect(m.mon.glintEmber).toBe(1)
    m.killAll()
    m.setInstant()
    expect(m.mon.glintOn).toBe(0)
    expect(m.mon.reflectK).toBe(1)
    expect(m.mon.fovPunch).toBe(0)
    expect(m.mon.shock).toBe(-1)

    const r = new Monument(hooks(true))
    r.setTargets(1.0, 0)
    r.setInstant()
    r.setTargets(1.6, 0)
    r.strikeLog()
    expect(r.mon.glintOn).toBe(0)
    expect(r.mon.reflectK).toBe(1)
    expect(r.mon.shock).toBe(-1)
    r.setTargets(1.0, 0)
    r.strikeRemove()
    expect(r.mon.shimmerX).toBeNull()
  })

  it('a live removal sinks, then holds the frameloop through the shimmer', () => {
    const h = hooks(false)
    const m = new Monument(h)
    m.setTargets(1.6, 0)
    m.setInstant()
    m.setTargets(1.0, 0)
    m.strikeRemove()
    expect(h.holds).toContain(MS.sink + MS.shimmer + 100)
    m.killAll()
    expect(m.mon.shimmerX).toBeNull()
  })

  it('the crack clock only runs while cracked', () => {
    const h = hooks(false)
    const m = new Monument(h)
    m.tick(1, true, false)
    expect(m.mon.crackTime).toBe(0)
    m.mon.crack = 0.5
    m.tick(1, true, false)
    expect(m.mon.crackTime).toBe(1)
    expect(GOAL_Y).toBe(2)
  })
})
