/**
 * REPEAT YESTERDAY: the pure helpers, then the chip in a live LOG sheet with a seeded store. It leads
 * the chip row, one tap copies yesterday onto today, closes the sheet and toasts with UNDO.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { LogEntry, Macros } from '../lib/types'
import { localDayKey, parseDayKey, yesterdayKey } from '../lib/day'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useToast } from '../components/ui'
import { daySummary, repeatToastText } from './LogRepeat'
import { LogSheet } from './LogSheet'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/** thin space U+2009: the thousands separator and the gap before the unit */
const T = ' '

const OATS: Macros = { kcal: 612, protein: 32, carbs: 48, fat: 12 }
const RICE: Macros = { kcal: 700, protein: 55, carbs: 80, fat: 14 }

const entry = (id: string, day: string, kcal: number): LogEntry => ({ id, day, at: 0, name: id, servings: 1, macros: { kcal, protein: 0, carbs: 0, fat: 0 } })

describe('repeat yesterday helpers', () => {
  it('daySummary counts and sums only that day', () => {
    const list = [entry('a', '2026-10-13', 612), entry('b', '2026-10-13', 700), entry('c', '2026-10-14', 500)]
    expect(daySummary(list, '2026-10-13')).toEqual({ count: 2, kcal: 1312 })
    expect(daySummary(list, '2026-10-12')).toEqual({ count: 0, kcal: 0 })
  })

  it("the toast reads Logged · energy · yesterday's meals, in kcal or kJ, with no dashes", () => {
    expect(repeatToastText(2140, 'kcal')).toBe(`Logged · 2${T}140${T}kcal · yesterday's meals`)
    expect(repeatToastText(612, 'kJ')).toBe(`Logged · 2${T}561${T}kJ · yesterday's meals`)
    expect(repeatToastText(2140, 'kcal')).not.toMatch(/[-–—]/)
  })
})

describe('REPEAT YESTERDAY in the LOG sheet', () => {
  let container: HTMLDivElement
  let root: Root

  const $ = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  const click = (el: HTMLElement | null) => {
    expect(el).not.toBeNull()
    act(() => {
      el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
  }
  const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)))

  /** noon on the local day `back` days before today, so a seeded entry lands on that day key */
  const noonDaysAgo = (back: number) => {
    let key = localDayKey()
    for (let i = 0; i < back; i++) key = yesterdayKey(key)
    return parseDayKey(key).getTime() + 12 * 3600_000
  }
  const onDay = (day: string) => useStore.getState().entries.filter((e) => e.day === day)

  function mount() {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(<LogSheet />)
    })
  }

  beforeEach(() => {
    useStore.getState().resetAll()
    useToast.getState().dismiss()
    useUI.setState({ logOpen: true, logPrefill: null })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    useUI.setState({ logOpen: false, logPrefill: null })
    useToast.getState().dismiss()
  })

  it('leads the chip row and copies all of yesterday onto today in one tap, with UNDO', async () => {
    const s = useStore.getState()
    const fav = s.addQuickMeal({ name: 'Oats and whey', macros: OATS, favourite: true })
    s.logQuick({ name: 'Oats', macros: OATS }, noonDaysAgo(1))
    s.logQuick({ name: 'Chicken rice', macros: RICE }, noonDaysAgo(1) + 1000)
    mount()

    const chip = $('tp-repeat-yesterday')
    expect(chip).not.toBeNull()
    expect(chip?.dataset.count).toBe('2')
    expect(chip?.dataset.kcal).toBe('1312')
    // the chip reads REPEAT plus the energy (polish-spec 6.2); its spoken name says what it repeats
    expect(chip?.textContent).toContain('Repeat')
    expect(chip?.textContent).toContain(`1${T}312${T}kcal`)
    expect(chip?.getAttribute('aria-label')).toBe(`Repeat yesterday's meals, 1${T}312${T}kcal`)
    // the first chip of the row, ahead of the favourites
    expect($('tp-fav-chips')?.querySelector('button')).toBe(chip)
    expect($(`tp-fav-chip-${fav.id}`)).not.toBeNull()

    const today = localDayKey()
    const yesterday = yesterdayKey(today)
    click(chip)
    expect(onDay(today).map((e) => e.name)).toEqual(['Oats', 'Chicken rice'])
    expect(onDay(today).reduce((n, e) => n + e.macros.kcal, 0)).toBe(1312)
    expect(onDay(yesterday)).toHaveLength(2)
    expect(useUI.getState().logOpen).toBe(false)
    const toast = useToast.getState().current
    expect(toast?.text).toBe(`Logged · 1${T}312${T}kcal · yesterday's meals`)
    expect(toast?.action?.label).toBe('Undo')

    // a second tap while the sheet is on its way out never doubles the day
    click($('tp-repeat-yesterday'))
    expect(onDay(today)).toHaveLength(2)

    // UNDO takes every copy back off and leaves yesterday as it was
    act(() => toast!.action!.onClick())
    expect(onDay(today)).toHaveLength(0)
    expect(onDay(yesterday)).toHaveLength(2)
    await wait(260)
  })

  it('stays hidden when yesterday holds nothing (today and older days do not count)', () => {
    const s = useStore.getState()
    s.logQuick({ name: 'Oats', macros: OATS })
    s.logQuick({ name: 'Chicken rice', macros: RICE }, noonDaysAgo(2))
    mount()
    expect($('tp-repeat-yesterday')).toBeNull()
    // no favourites either, so there is no chip row at all; the LOG button still stands
    expect($('tp-fav-chips')).toBeNull()
    expect($('tp-log-submit')?.textContent).toBe('Log')
  })

  it('speaks the display unit: kJ on the chip and in the toast', () => {
    const s = useStore.getState()
    s.setUnit('kJ')
    s.logQuick({ name: 'Oats', macros: OATS }, noonDaysAgo(1))
    mount()
    expect($('tp-repeat-yesterday')?.textContent).toContain(`2${T}561${T}kJ`)
    click($('tp-repeat-yesterday'))
    expect(useToast.getState().current?.text).toBe(`Logged · 2${T}561${T}kJ · yesterday's meals`)
  })
})
