import { describe, expect, it } from 'vitest'
import { arcPath, EMPTY_SHARES, layoutArcs, progressArcs, RING_GAP, RING_START, ringShares } from './TodayRing'

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6

describe('ring geometry', () => {
  it('lays three equal arcs of 114 degrees with 6 degree gaps from -87', () => {
    const arcs = layoutArcs(EMPTY_SHARES)
    expect(arcs).toHaveLength(3)
    expect(arcs[0].start).toBe(RING_START)
    for (const a of arcs) expect(close(a.end - a.start, 114)).toBe(true)
    expect(close(arcs[1].start - arcs[0].end, RING_GAP)).toBe(true)
    expect(close(arcs[2].start - arcs[1].end, RING_GAP)).toBe(true)
    // closes the circle: last end + gap = start + 360
    expect(close(arcs[2].end + RING_GAP, RING_START + 360)).toBe(true)
  })

  it('a zero macro draws no arc but keeps its gap', () => {
    const arcs = layoutArcs([0.5, 0, 0.5])
    expect(close(arcs[0].end - arcs[0].start, 171)).toBe(true)
    expect(close(arcs[1].end - arcs[1].start, 0)).toBe(true)
    expect(close(arcs[2].start - arcs[0].end, RING_GAP * 2)).toBe(true)
    expect(close(arcs[2].end + RING_GAP, RING_START + 360)).toBe(true)
  })

  it('shares follow calorie contribution (4/4/9), empty day is equal thirds', () => {
    const r = ringShares({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
    expect(r.empty).toBe(true)
    expect(r.shares).toEqual(EMPTY_SHARES)
    const s = ringShares({ kcal: 170, protein: 10, carbs: 10, fat: 10 })
    expect(s.empty).toBe(false)
    expect(close(s.shares[0], 40 / 170)).toBe(true)
    expect(close(s.shares[2], 90 / 170)).toBe(true)
  })

  it('progress mode draws one arc of ratio over 342 and collapses the others', () => {
    const arcs = progressArcs(1, 0.5)
    expect(close(arcs[1].start, RING_START)).toBe(true)
    expect(close(arcs[1].end - arcs[1].start, 171)).toBe(true)
    expect(arcs[0].end - arcs[0].start).toBe(0)
    expect(arcs[2].end - arcs[2].start).toBe(0)
    const over = progressArcs(0, 1.4)
    expect(close(over[0].end - over[0].start, 342)).toBe(true)
  })

  it('arcPath is empty for nothing, one arc under 360, two arcs for a full circle', () => {
    expect(arcPath(60, 60, 50, 10, 10)).toBe('')
    const quarter = arcPath(60, 60, 50, -90, 0)
    expect(quarter.startsWith('M 60 10 A 50 50 0 0 1 110 60')).toBe(true)
    const big = arcPath(60, 60, 50, -90, 180)
    expect(big).toContain('A 50 50 0 1 1')
    const full = arcPath(60, 60, 50, 0, 360)
    expect(full.split(' A ').length).toBe(3)
  })
})
