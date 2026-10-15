import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { formatHeaderDate, streakLabel, TodayHeader } from './TodayHeader'
import { gapAboveLine, goalPercent, heroLabel, sublineText } from './TodayNumber'
import { entryAria, macroLine } from './TodaySheet'
import { buildEntryPatch, entryPortion, TodayEntryEdit } from './TodayEntryEdit'
import { odometerCells, rollPlan } from './TodayOdometer'
import { OVER_MAX_PX } from '../scene/tokens'
import { useUI } from '../store/useUI'
import type { LogEntry } from '../lib/types'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const entry: LogEntry = {
  id: 'e1',
  day: '2026-10-13',
  at: 0,
  name: 'Oats',
  servings: 1,
  macros: { kcal: 612, protein: 32.4, carbs: 47.6, fat: 12 },
}

const yoghurt: LogEntry = {
  id: 'e2',
  day: '2026-10-13',
  at: 0,
  name: 'Greek yoghurt',
  servings: 1.8,
  portion: { amount: 180, unit: 'g' },
  macros: { kcal: 175, protein: 16, carbs: 7, fat: 9 },
}

describe('today copy helpers', () => {
  it('header date reads like MON 13 OCT (uppercased by CSS), from a local day key', () => {
    expect(formatHeaderDate('2026-10-13')).toBe('Tue 13 Oct')
    expect(formatHeaderDate('2026-01-01')).toBe('Thu 1 Jan')
  })

  it('hero label: over the line always wins, then the chosen figure', () => {
    expect(heroLabel(true, 'remaining')).toBe('Over the line')
    expect(heroLabel(true, 'eaten')).toBe('Over the line')
    expect(heroLabel(false, 'remaining')).toBe('Remaining')
    expect(heroLabel(false, 'eaten')).toBe('Eaten')
  })

  it('the sub-line is the percent of the goal eaten, the same whichever figure the hero shows', () => {
    expect(sublineText(1328, 2600)).toBe('51% of goal')
    expect(sublineText(3016, 2600)).toBe('116% of goal')
    expect(sublineText(0, 2600)).toBe('0% of goal')
    expect(goalPercent(500, 0)).toBe(0)
    expect(sublineText(1328, 2600)).not.toMatch(/[–—-]/)
  })

  it('over the line the hero keeps the crown asymptote (OVER_MAX_PX) plus 7 px of air above the line', () => {
    expect(gapAboveLine(false)).toBe(16)
    expect(gapAboveLine(true)).toBe(OVER_MAX_PX + 7)
    expect(gapAboveLine(true)).toBe(44)
  })

  it('macro line uses middle dots and whole grams', () => {
    const line = macroLine(entry)
    expect(line).toBe('P 32 · C 48 · F 12')
    expect(line).not.toMatch(/[–—]/)
  })

  it('a row reads its portion aloud: name, amount, energy', () => {
    expect(entryAria(yoghurt, 'kcal')).toBe('Greek yoghurt, 180 grams, 175 kcal')
    expect(entryAria(entry, 'kcal')).toBe('Oats, 612 kcal')
  })

  it('streak label is singular at one', () => {
    expect(streakLabel(12)).toBe('Streak 12 days')
    expect(streakLabel(1)).toBe('Streak 1 day')
  })
})

describe('entry edit patch', () => {
  it('returns null without calories and parses grams with 0 defaults', () => {
    expect(buildEntryPatch({ name: 'Oats', amount: 1, kcal: '', protein: '1', carbs: '', fat: '' }, 'kcal')).toBeNull()
    const p = buildEntryPatch({ name: 'Oats', amount: 1.5, kcal: '612', protein: '32', carbs: '', fat: '12.5' }, 'kcal')
    expect(p).toEqual({ name: 'Oats', servings: 1.5, macros: { kcal: 612, protein: 32, carbs: 0, fat: 12.5 } })
  })

  it('an entry with a recorded portion saves the portion in its unit, not servings', () => {
    const p = buildEntryPatch({ name: 'Greek yoghurt', amount: 200, portionUnit: 'g', kcal: '194', protein: '18', carbs: '8', fat: '10' }, 'kcal')
    expect(p).toEqual({ name: 'Greek yoghurt', portion: { amount: 200, unit: 'g' }, macros: { kcal: 194, protein: 18, carbs: 8, fat: 10 } })
    expect(p && 'servings' in p).toBe(false)
  })

  it('typed kJ is stored as kcal (symmetric with the display conversion)', () => {
    const p = buildEntryPatch({ name: 'Oats', amount: 1, kcal: '2560', protein: '0', carbs: '0', fat: '0' }, 'kJ')
    expect(p?.macros.kcal).toBe(612)
  })

  it('the portion control edits the recorded portion, else servings', () => {
    expect(entryPortion(yoghurt)).toEqual({ amount: 180, unit: 'g', recorded: true })
    expect(entryPortion(entry)).toEqual({ amount: 1, unit: 'serve', recorded: false })
  })
})

describe('odometer', () => {
  it('lays digits in 0.62em cells and the thin space in 0.28em, keyed from the right', () => {
    const { cells, width } = odometerCells('1 272')
    expect(cells.map((c) => c.kind)).toEqual(['digit', 'sep', 'digit', 'digit', 'digit'])
    expect(cells.map((c) => c.key)).toEqual(['d4', 's3', 'd2', 'd1', 'd0'])
    expect(cells.map((c) => c.i)).toEqual([3, 0, 2, 1, 0])
    expect(width).toBeCloseTo(0.62 * 4 + 0.28, 6)
    expect(cells[2].x).toBeCloseTo(0.9, 6)
    // the units digit keeps its key when a leading digit goes away
    expect(odometerCells('428').cells.at(-1)?.key).toBe('d0')
  })

  it('a falling number rolls every digit down (index decreasing), wrapping through the second strip', () => {
    expect(rollPlan(7, 3, true)).toEqual({ snap: null, to: 3 })
    // 2 to 8 while falling: jump to 12 (the same glyph) and roll down to 8
    expect(rollPlan(2, 8, true)).toEqual({ snap: 12, to: 8 })
    expect(rollPlan(15, 1, true)).toEqual({ snap: null, to: 11 })
  })

  it('a rising number rolls up (index increasing) and lands in the second strip when it wraps', () => {
    expect(rollPlan(3, 7, false)).toEqual({ snap: null, to: 7 })
    expect(rollPlan(8, 2, false)).toEqual({ snap: null, to: 12 })
    expect(rollPlan(18, 2, false)).toEqual({ snap: 8, to: 12 })
    expect(rollPlan(4, 4, false)).toEqual({ snap: null, to: 4 })
  })
})

describe('TODAY in the DOM', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('the header has no settings gear; the streak slot opens HISTORY', () => {
    act(() => root.render(<TodayHeader today="2026-10-15" streak={12} />))
    expect(container.querySelector('[aria-label="Settings"]')).toBeNull()
    const streak = container.querySelector<HTMLButtonElement>('[data-testid="tp-streak"]')
    expect(streak?.getAttribute('aria-label')).toBe('Streak 12 days')
    expect(streak?.dataset.intro).toBe('streak')
    expect(streak?.textContent).toBe('12')
    expect(container.querySelector('[data-intro="wordmark"]')?.textContent).toBe('Temperance')
    expect(container.querySelector('[data-intro="date"]')?.textContent).toBe('Thu 15 Oct')
    act(() => streak!.click())
    expect(useUI.getState().tab).toBe('history')
    act(() => useUI.getState().setTab('today'))
  })

  it('nothing is drawn in the streak slot at a zero streak', () => {
    act(() => root.render(<TodayHeader today="2026-10-15" streak={0} />))
    expect(container.querySelector('[data-testid="tp-streak"]')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })

  it('the entry editor edits a gram portion in grams and saves { portion }', () => {
    const onSave = vi.fn()
    act(() => root.render(<TodayEntryEdit entry={yoghurt} unit="kcal" formId="f" onSave={onSave} onBack={() => {}} />))
    const field = container.querySelector<HTMLElement>('[data-testid="tp-today-edit-portion"]')
    expect(field?.dataset.unit).toBe('g')
    expect(field?.dataset.value).toBe('180')
    // the 250 g pick rescales the untouched numbers by 250 / 180
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="tp-today-edit-portion-pick-250"]')!.click())
    expect(container.querySelector<HTMLInputElement>('[data-testid="tp-today-edit-kcal"]')?.value).toBe('243')
    expect(container.querySelector<HTMLInputElement>('[data-testid="tp-today-edit-protein"]')?.value).toBe('22.2')
    expect(container.querySelector('[data-testid="tp-today-edit-was"]')?.textContent).toBe('was 180 g')
    act(() => container.querySelector<HTMLFormElement>('form')!.requestSubmit())
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({ name: 'Greek yoghurt', portion: { amount: 250, unit: 'g' } })
    expect(onSave.mock.calls[0][0].servings).toBeUndefined()
  })

  it('an entry without a portion edits servings with any amount', () => {
    const onSave = vi.fn()
    act(() => root.render(<TodayEntryEdit entry={entry} unit="kcal" formId="f" onSave={onSave} onBack={() => {}} />))
    expect(container.querySelector<HTMLElement>('[data-testid="tp-today-edit-portion"]')?.dataset.unit).toBe('serve')
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="tp-today-edit-portion-pick-1.5"]')!.click())
    act(() => container.querySelector<HTMLFormElement>('form')!.requestSubmit())
    expect(onSave.mock.calls[0][0]).toMatchObject({ servings: 1.5, macros: { kcal: 918 } })
  })
})
