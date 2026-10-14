import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { arcPath, EMPTY_SHARES, layoutArcs, progressArcs, readoutAside, RING_GAP, RING_START, ringShares, TodayRingRow } from './TodayRing'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

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

describe('readout right column (macro goals on TODAY)', () => {
  it('reads the goal when a target is set, logged or not', () => {
    expect(readoutAside({ active: false, target: 180, ratio: 79, share: 31, empty: false })).toBe('of 180 g')
    expect(readoutAside({ active: false, target: 180, ratio: 0, share: 0, empty: true })).toBe('of 180 g')
  })

  it('keeps the energy share when the target is 0, and 0% on an empty day', () => {
    expect(readoutAside({ active: false, target: 0, ratio: 0, share: 31, empty: false })).toBe('31%')
    expect(readoutAside({ active: false, target: 0, ratio: 0, share: 33, empty: true })).toBe('0%')
  })

  it('progress mode shows grams against the target as a percent', () => {
    expect(readoutAside({ active: true, target: 180, ratio: 79, share: 31, empty: false })).toBe('79%')
    expect(readoutAside({ active: true, target: 180, ratio: 124, share: 31, empty: false })).toBe('124%')
  })

  it('never carries a dash or a minus sign', () => {
    for (const active of [true, false])
      for (const target of [0, 80, 180])
        expect(readoutAside({ active, target, ratio: 50, share: 20, empty: false })).not.toMatch(/[-–—]/)
  })
})

describe('readout rows in the DOM', () => {
  let container: HTMLDivElement
  let root: Root
  const $ = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  const aside = (id: string) => $(id)?.querySelector<HTMLElement>('[data-aside]') ?? null
  const click = (el: HTMLElement | null) => {
    expect(el).not.toBeNull()
    act(() => {
      el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('shows `of 180 g` and data-target where a target is set, the energy share where it is 0', () => {
    // energy split: protein 568, carbs 400, fat 180 of 1148 kcal, so carbs is 35%
    const totals = { kcal: 1148, protein: 142, carbs: 100, fat: 20 }
    act(() => root.render(<TodayRingRow totals={totals} targets={{ protein: 180, carbs: 0, fat: 80 }} onOpen={() => {}} />))

    expect($('tp-readout-protein')?.dataset.target).toBe('180')
    expect($('tp-readout-carbs')?.dataset.target).toBe('0')
    expect($('tp-readout-fat')?.dataset.target).toBe('80')
    expect($('tp-readout-protein')?.dataset.grams).toBe('142')

    expect(aside('tp-readout-protein')?.textContent).toBe('of 180 g')
    expect(aside('tp-readout-protein')?.dataset.aside).toBe('target')
    expect(aside('tp-readout-fat')?.textContent).toBe('of 80 g')
    expect(aside('tp-readout-carbs')?.textContent).toBe('35%')
    expect(aside('tp-readout-carbs')?.dataset.aside).toBe('share')
    expect(container.textContent).not.toMatch(/[–—]/)
  })

  it('a tap still flips to progress mode: the row reads the percent, the centre reads OF 180', () => {
    const totals = { kcal: 1148, protein: 142, carbs: 100, fat: 20 }
    act(() => root.render(<TodayRingRow totals={totals} targets={{ protein: 180, carbs: 0, fat: 80 }} onOpen={() => {}} />))

    click($('tp-readout-protein'))
    expect($('tp-readout-protein')?.getAttribute('aria-pressed')).toBe('true')
    expect(aside('tp-readout-protein')?.textContent).toBe('79%')
    expect(aside('tp-readout-protein')?.dataset.aside).toBe('progress')
    expect($('tp-ring')?.dataset.focus).toBe('protein')
    expect(container.textContent).toContain('of 180')

    // tapped again it returns to the goal
    click($('tp-readout-protein'))
    expect($('tp-readout-protein')?.getAttribute('aria-pressed')).toBe('false')
    expect(aside('tp-readout-protein')?.textContent).toBe('of 180 g')

    // a macro without a target has no progress mode
    click($('tp-readout-carbs'))
    expect($('tp-readout-carbs')?.getAttribute('aria-pressed')).toBe('false')
    expect(aside('tp-readout-carbs')?.textContent).toBe('35%')
  })
})
