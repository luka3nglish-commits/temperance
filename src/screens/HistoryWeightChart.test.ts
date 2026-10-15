/**
 * HISTORY · BODY. The pure chart geometry and the weight and photo copy helpers first, then the rendered
 * pieces in jsdom: the LEDGER | BODY switch, logging and deleting a weigh-in, and the photo grid with the
 * viewer and COMPARE. jsdom has no IndexedDB, so src/lib/photos.ts is replaced by an in-memory list.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PhotoMeta } from '../lib/photos'
import { deletePhoto, updatePhotoNote } from '../lib/photos'
import type { WeightEntry } from '../lib/types'
import { dayKeyOffset, localDayKey } from '../lib/day'
import { useStore } from '../store/useStore'
import { useToast } from '../components/ui'
import { CHART_HEIGHT, CHART_PAD, areaPath, buildWeightChart, daysBetween, formatKg, gridTicks, linePath, scaleLinear, xDays, yDomain } from './HistoryWeightChart'
import { changeText, kgChange, loggedText, recentWeighIns, trendText } from './HistoryWeight'
import { addedText, photoErrorText } from './HistoryPhotos'
import { chronological, photoRatio } from './HistoryPhotoCompare'
import { photoFileName } from './HistoryPhotoViewer'
import { HISTORY_MODE_KEY, HistoryScreen, readHistoryMode } from './HistoryScreen'
import { HistoryBody } from './HistoryBody'

const photoDb = vi.hoisted(() => ({ list: [] as PhotoMeta[] }))

vi.mock('../lib/photos', async () => {
  const { localDayKey: dayKey } = await import('../lib/day')
  return {
    MAX_EDGE: 1600,
    THUMB_EDGE: 360,
    photosSupported: () => true,
    listPhotos: vi.fn(async () => photoDb.list.slice().sort((a, b) => b.at - a.at)),
    addPhoto: vi.fn(async () => {
      const at = Date.now() + photoDb.list.length
      const meta: PhotoMeta = { id: `added-${photoDb.list.length + 1}`, day: dayKey(new Date(at)), at, w: 900, h: 1200, bytes: 1000, type: 'image/webp' }
      photoDb.list.push(meta)
      return meta
    }),
    getPhotoBlob: vi.fn(async () => new Blob(['x'], { type: 'image/webp' })),
    photoObjectURL: vi.fn(async (id: string, kind: 'full' | 'thumb' = 'thumb') => `blob:${kind}-${id}`),
    updatePhotoNote: vi.fn(async (id: string, note: string) => {
      const p = photoDb.list.find((x) => x.id === id)
      if (p) p.note = note.trim() || undefined
    }),
    deletePhoto: vi.fn(async (id: string) => {
      photoDb.list = photoDb.list.filter((x) => x.id !== id)
    }),
    photoStorageBytes: vi.fn(async () => 0),
  }
})

const TODAY = '2026-10-14'
const w = (day: string, kg: number, id = `w-${day}`): WeightEntry => ({ id, day, at: new Date(`${day}T07:00:00`).getTime(), kg })

// ---------- pure geometry ----------

describe('chart helpers', () => {
  it('formats kilograms to one decimal', () => {
    expect(formatKg(84.26)).toBe('84.3')
    expect(formatKg(80)).toBe('80.0')
    expect(formatKg(Number.NaN)).toBe('0.0')
  })

  it('counts whole local days, across months and daylight saving changes', () => {
    expect(daysBetween('2026-10-01', '2026-10-14')).toBe(13)
    expect(daysBetween('2026-10-14', '2026-10-01')).toBe(-13)
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
    expect(daysBetween('2026-10-03', '2026-10-05')).toBe(2) // Sydney springs forward on 4 Oct 2026
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2) // Europe springs forward on 29 Mar 2026
  })

  it('scales linearly, inverted ranges included, and maps a zero width domain to the middle', () => {
    expect(scaleLinear(0, 10, 0, 100)(5)).toBe(50)
    const y = scaleLinear(83, 87, 118, 10)
    expect(y(87)).toBe(10)
    expect(y(83)).toBe(118)
    expect(scaleLinear(5, 5, 10, 20)(123)).toBe(15)
  })

  it('pads the data range by 1 kg, keeps at least 4 kg, and rounds out to whole kilograms', () => {
    expect(yDomain([84, 86])).toEqual({ min: 83, max: 87 })
    expect(yDomain([84.3])).toEqual({ min: 82, max: 87 })
    expect(yDomain([80, 90])).toEqual({ min: 79, max: 91 })
    expect(yDomain([85.9, 86.1])).toEqual({ min: 84, max: 88 })
    expect(yDomain([Number.NaN, 0, 84, 86])).toEqual({ min: 83, max: 87 })
    expect(yDomain([])).toEqual({ min: 0, max: 4 })
  })

  it('runs the x axis from the earliest weigh-in, at least six days back, to today', () => {
    expect(xDays([], TODAY)).toEqual({ start: '2026-10-08', end: TODAY })
    expect(xDays(['2026-10-12'], TODAY)).toEqual({ start: '2026-10-08', end: TODAY })
    expect(xDays(['2026-10-12', '2026-09-01'], TODAY)).toEqual({ start: '2026-09-01', end: TODAY })
  })

  it('builds the line and the closed fill path with two decimals', () => {
    expect(linePath([])).toBe('')
    expect(linePath([{ x: 1.234, y: 2 }])).toBe('M 1.23 2')
    const pts = [
      { x: 26, y: 37 },
      { x: 201.538, y: 64 },
    ]
    expect(linePath(pts)).toBe('M 26 37 L 201.54 64')
    expect(areaPath(pts, 118)).toBe('M 26 37 L 201.54 64 L 201.54 118 L 26 118 Z')
    expect(areaPath([], 118)).toBe('')
  })
})

describe('buildWeightChart', () => {
  const three = [w('2026-10-14', 84), w('2026-10-01', 86), w('2026-10-08', 85)]

  it('places weigh-ins by calendar day across the plot and by kg up the y range', () => {
    const c = buildWeightChart(three, { today: TODAY, width: 358 })
    expect(c.plot).toEqual({ left: CHART_PAD.left, right: 358 - CHART_PAD.right, top: CHART_PAD.top, bottom: CHART_HEIGHT - CHART_PAD.bottom })
    expect(c.domain).toEqual({ min: 83, max: 87 })
    expect(c.startDay).toBe('2026-10-01')
    expect(c.dayLabels).toEqual({ start: 'Thu 1 Oct', end: 'Today' })
    // oldest first; the first day sits on the left edge, today on the right
    expect(c.points.map((p) => p.day)).toEqual(['2026-10-01', '2026-10-08', '2026-10-14'])
    expect(c.points[0].x).toBe(c.plot.left)
    expect(c.points[2].x).toBe(c.plot.right)
    expect(c.points[1].x).toBeCloseTo(30 + (7 / 13) * 322, 6)
    // heavier is higher (smaller y)
    expect(c.points[0].y).toBe(42.5)
    expect(c.points[1].y).toBe(73)
    expect(c.points[2].y).toBe(103.5)
    expect(c.line).toBe('M 30 42.5 L 203.38 73 L 352 103.5')
    expect(c.area).toBe('M 30 42.5 L 203.38 73 L 352 103.5 L 352 134 L 30 134 Z')
    expect(c.target).toBeNull()
  })

  it('follows the measured width', () => {
    const c = buildWeightChart(three, { today: TODAY, width: 390 })
    expect(c.width).toBe(390)
    expect(c.points[2].x).toBe(390 - CHART_PAD.right)
  })

  it('draws dots only under two weigh-ins, and nothing at all without one', () => {
    const one = buildWeightChart([w(TODAY, 84.3)], { today: TODAY, targetKg: 80 })
    expect(one.points).toHaveLength(1)
    expect(one.points[0].x).toBe(one.plot.right)
    expect(one.line).toBeNull()
    expect(one.area).toBeNull()
    expect(one.domain).toEqual({ min: 82, max: 87 })
    expect(one.dayLabels).toEqual({ start: 'Thu 8 Oct', end: 'Today' })

    const none = buildWeightChart([], { today: TODAY, targetKg: 80 })
    expect(none.points).toHaveLength(0)
    expect(none.line).toBeNull()
    expect(none.target).toBeNull()
  })

  it('ignores weigh-ins after today', () => {
    const c = buildWeightChart([...three, w('2026-10-20', 70)], { today: TODAY })
    expect(c.points).toHaveLength(3)
    expect(c.domain).toEqual({ min: 83, max: 87 })
  })

  it('keeps the y range to the data and shows a far target as an edge label', () => {
    const below = buildWeightChart(three, { today: TODAY, targetKg: 75 })
    expect(below.domain).toEqual({ min: 83, max: 87 })
    expect(below.target).toEqual({ kg: 75, position: 'below', labelY: below.plot.bottom - 6 })
    const above = buildWeightChart(three, { today: TODAY, targetKg: 95 })
    expect(above.target).toEqual({ kg: 95, position: 'above', labelY: above.plot.top + 15 })
  })

  it('draws a target inside the range, labelled on the side away from the latest weigh-in', () => {
    // latest 84 kg sits under an 85 kg line, so the label goes above it
    const c = buildWeightChart(three, { today: TODAY, targetKg: 85 })
    expect(c.target).toEqual({ kg: 85, position: 'inside', y: 73, labelY: 67 })
    // a lighter target with the latest weigh-in above it: the label goes under the line
    const d = buildWeightChart([w('2026-10-01', 84), w('2026-10-14', 86)], { today: TODAY, targetKg: 85 })
    expect(d.target?.position).toBe('inside')
    if (d.target?.position === 'inside') expect(d.target.labelY).toBe(d.target.y + 15)
  })
})

describe('gridTicks', () => {
  it('draws a line and a label at every kilogram when they sit far enough apart', () => {
    expect(gridTicks({ min: 83, max: 87 }, 122)).toEqual({ lines: [83, 84, 85, 86, 87], labels: [83, 84, 85, 86, 87] })
  })
  it('thins the labels so 12 px numbers never touch, and the lines when a kilogram is tiny', () => {
    const t = gridTicks({ min: 70, max: 95 }, 122) // 4.9 px per kg
    expect(t.lines).toHaveLength(26)
    expect(t.labels).toEqual([70, 75, 80, 85, 90, 95])
    const wide = gridTicks({ min: 40, max: 140 }, 122) // 1.2 px per kg
    expect(wide.lines[1] - wide.lines[0]).toBe(5)
    for (let i = 1; i < wide.labels.length; i++) expect(((wide.labels[i] - wide.labels[i - 1]) * 122) / 100).toBeGreaterThanOrEqual(18)
  })
  it('draws nothing for an empty range', () => {
    expect(gridTicks({ min: 80, max: 80 }, 122)).toEqual({ lines: [], labels: [] })
  })
})

// ---------- copy ----------

describe('weight copy', () => {
  it('reads a change as a direction and a magnitude, never a minus sign', () => {
    expect(kgChange(-0.8)).toEqual({ dir: 'down', kg: 0.8 })
    expect(kgChange(0.4)).toEqual({ dir: 'up', kg: 0.4 })
    expect(kgChange(0.04)).toEqual({ dir: 'level', kg: 0 })
    expect(kgChange(null)).toBeNull()
    expect(trendText(-0.8)).toBe('down 0.8 kg')
    expect(trendText(0.4)).toBe('up 0.4 kg')
    expect(trendText(0)).toBe('level')
    expect(trendText(null)).toBeNull()
    expect(changeText(-0.4)).toBe('0.4 down')
    expect(changeText(0.2)).toBe('0.2 up')
    expect(changeText(0)).toBe('level')
    expect(changeText(null)).toBe('')
  })

  it('writes the toasts with a middle dot', () => {
    expect(loggedText(84.3, false)).toBe('Logged · 84.3 kg')
    expect(loggedText(80, true)).toBe('Updated · 80.0 kg')
    expect(addedText(1)).toBe('Added · 1 photo')
    expect(addedText(2)).toBe('Added · 2 photos')
  })

  it('lists the last ten weigh-ins newest first, each against the one before it', () => {
    const ws: WeightEntry[] = []
    for (let i = 0; i < 12; i++) ws.push(w(dayKeyOffset(TODAY, -i * 2), 90 - i * 0.5))
    const recent = recentWeighIns(ws.slice().reverse())
    expect(recent).toHaveLength(10)
    expect(recent[0].entry.day).toBe(TODAY)
    expect(recent[0].change).toBe(0.5) // 90 today against 89.5 two days back
    expect(recent[9].entry.day).toBe(dayKeyOffset(TODAY, -18))
    expect(recent[9].change).toBe(0.5) // its predecessor is outside the ten
    expect(recentWeighIns([w(TODAY, 84)])).toEqual([{ entry: w(TODAY, 84), change: null }])
  })
})

describe('photo helpers', () => {
  it('states storage failures as facts', () => {
    expect(photoErrorText(new Error('That file is not an image.'))).toBe('That file is not an image.')
    expect(photoErrorText(new DOMException('quota', 'QuotaExceededError'))).toBe('Storage is full. The photo was not saved.')
    expect(photoErrorText(new DOMException('db', 'UnknownError'))).toBe('That photo could not be saved.')
    expect(photoErrorText('odd')).toBe('That photo could not be saved.')
  })

  it('orders a pair in time, reads ratios and names files', () => {
    const a: PhotoMeta = { id: 'a', day: '2026-10-01', at: 1, w: 900, h: 1200, bytes: 1, type: 'image/webp' }
    const b: PhotoMeta = { ...a, id: 'b', day: '2026-10-12', at: 2, w: 1200, h: 900 }
    expect(chronological([b, a]).map((p) => p.id)).toEqual(['a', 'b'])
    expect(photoRatio(a)).toBe(0.75)
    expect(photoRatio({ w: 0, h: 0 })).toBe(0.75)
    expect(photoFileName('2026-10-12', 'image/webp')).toBe('temperance-2026-10-12.webp')
    expect(photoFileName('2026-10-12', 'image/jpeg')).toBe('temperance-2026-10-12.jpg')
  })
})

// ---------- rendered ----------

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

function mount(el: ReactElement) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(el)
  })
}

function unmount() {
  act(() => {
    root?.unmount()
  })
  container?.remove()
  root = null
  container = null
}

const $ = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const click = (el: Element | null) => {
  expect(el).not.toBeNull()
  act(() => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}
const settle = (ms = 0) => act(() => new Promise<void>((r) => setTimeout(r, ms)))
function typeInto(el: HTMLElement | null, value: string) {
  expect(el).not.toBeNull()
  const input = el as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const photo = (id: string, day: string, at: number): PhotoMeta => ({ id, day, at, w: 900, h: 1200, bytes: 1000, type: 'image/webp' })

beforeAll(() => {
  // jsdom has no object URLs; the mocked photo URLs are plain strings, so these only need to exist
  if (typeof URL.createObjectURL !== 'function') URL.createObjectURL = () => 'blob:test'
  if (typeof URL.revokeObjectURL !== 'function') URL.revokeObjectURL = () => {}
})

beforeEach(() => {
  useStore.getState().resetAll()
  useToast.getState().dismiss()
  localStorage.removeItem(HISTORY_MODE_KEY)
  photoDb.list = []
  vi.clearAllMocks()
})

afterEach(() => {
  unmount()
})

describe('HISTORY · LEDGER | BODY', () => {
  it('opens on LEDGER, switches to BODY and remembers it', async () => {
    mount(createElement(HistoryScreen))
    expect($('tp-history')?.dataset.mode).toBe('ledger')
    expect($('tp-body')).toBeNull()
    const radios = document.querySelectorAll<HTMLElement>('[data-testid="tp-history-mode"] [role="radio"]')
    expect([...radios].map((r) => r.textContent)).toEqual(['Ledger', 'Body'])
    expect(radios[0].getAttribute('aria-checked')).toBe('true')

    click(radios[1])
    await settle()
    expect($('tp-body')).not.toBeNull()
    expect($('tp-history')?.dataset.mode).toBe('body')
    expect(localStorage.getItem(HISTORY_MODE_KEY)).toBe('body')

    unmount()
    mount(createElement(HistoryScreen))
    await settle()
    expect($('tp-body')).not.toBeNull()
  })

  it('reads anything unknown as LEDGER', () => {
    localStorage.setItem(HISTORY_MODE_KEY, 'colonnade')
    expect(readHistoryMode()).toBe('ledger')
    localStorage.setItem(HISTORY_MODE_KEY, 'body')
    expect(readHistoryMode()).toBe('body')
  })
})

describe('BODY · WEIGHT', () => {
  const today = localDayKey()

  it('reads quietly before the first weigh-in', async () => {
    mount(createElement(HistoryBody, { today }))
    await settle()
    // one empty-state tablet, then the input row; no stones and no chart until there is a weigh-in
    expect($('tp-weight-latest')?.textContent).toBe('No weigh-ins yet.')
    expect($('tp-weight-trend')).toBeNull()
    expect($('tp-weight-target')).toBeNull()
    expect($('tp-weight-chart')).toBeNull()
    expect(($('tp-weight-input') as HTMLInputElement).placeholder).toBe('80.0')
  })

  it('reads quietly after the first weigh-in', async () => {
    useStore.getState().addWeight(84.3, today)
    mount(createElement(HistoryBody, { today }))
    await settle()
    expect($('tp-weight-trend')?.textContent).toContain('No trend yet.')
    expect($('tp-weight-target')?.textContent).toContain('Set a target in Settings.')
    expect($('tp-weight-chart')?.dataset.points).toBe('1')
    expect($('tp-weight-chart')?.textContent).toContain('Two weigh-ins draw the line.')
  })

  it('logs a weigh-in for today, then updates it, and ignores nonsense', async () => {
    mount(createElement(HistoryBody, { today }))
    await settle()
    const input = $('tp-weight-input') as HTMLInputElement
    typeInto(input, '84,3')
    click($('tp-weight-log'))
    expect(useStore.getState().weights).toEqual([expect.objectContaining({ day: today, kg: 84.3 })])
    expect(useToast.getState().current?.text).toBe('Logged · 84.3 kg')
    expect(useToast.getState().current?.action).toBeUndefined()
    expect(input.value).toBe('')
    // the gold foil draws its digits in three layers, so read the data and the spoken label
    expect($('tp-weight-latest')?.dataset.kg).toBe('84.3')
    expect($('tp-weight-latest')?.getAttribute('aria-label')).toBe('84.3 kg')
    expect($('tp-weight-latest')?.textContent).toContain('kg')
    expect(input.placeholder).toBe('84.3')
    const id = useStore.getState().weights[0].id
    expect($(`tp-weight-row-${id}`)).not.toBeNull()

    typeInto(input, '84.1')
    click($('tp-weight-log'))
    expect(useStore.getState().weights).toHaveLength(1)
    expect(useStore.getState().weights[0]).toMatchObject({ id, kg: 84.1 })
    expect(useToast.getState().current?.text).toBe('Updated · 84.1 kg')

    typeInto(input, 'heavy')
    click($('tp-weight-log'))
    expect(useStore.getState().weights[0].kg).toBe(84.1)
    expect(document.activeElement).toBe(input)
  })

  it('shows the trend, the distance to target and the target on the chart', async () => {
    const s = useStore.getState()
    for (let i = 13; i >= 7; i--) s.addWeight(86, dayKeyOffset(today, -i))
    for (let i = 6; i >= 0; i--) s.addWeight(85, dayKeyOffset(today, -i))
    s.setTargetWeight(80)
    mount(createElement(HistoryBody, { today }))
    await settle()
    const trend = $('tp-weight-trend')!
    expect(trend.dataset.dir).toBe('down')
    expect(trend.textContent).toContain('down 1.0')
    expect(trend.textContent).toContain('7 day trend')
    const target = $('tp-weight-target')!
    expect(target.dataset.kg).toBe('5')
    expect(target.textContent).toContain('5.0')
    expect(target.textContent).toContain('Above target')
    const chart = $('tp-weight-chart')!
    expect(chart.dataset.points).toBe('14')
    expect(chart.querySelector('[data-target="below"]')?.textContent).toBe('TARGET 80.0')
    // ten rows, newest first, each with its change
    const rows = document.querySelectorAll('[data-testid^="tp-weight-row-"]')
    expect(rows).toHaveLength(10)
    expect((rows[0] as HTMLElement).dataset.day).toBe(today)
    expect(rows[0].textContent).toContain('level')
    expect(rows[6].textContent).toContain('1.0 down') // six days back, against 86 the day before
    // every chart label is 12 px or more, tracked no wider than 0.06em
    for (const t of chart.querySelectorAll('text')) expect(Number(t.getAttribute('font-size'))).toBeGreaterThanOrEqual(12)
    expect(chart.querySelectorAll('[data-axis="y"] text').length).toBeGreaterThanOrEqual(2)
  })

  it('deletes a weigh-in with UNDO putting it back', async () => {
    const entry = useStore.getState().addWeight(84.3, today)!
    mount(createElement(HistoryBody, { today }))
    await settle()
    click($(`tp-weight-delete-${entry.id}`))
    expect(useStore.getState().weights).toHaveLength(0)
    const toast = useToast.getState().current
    expect(toast?.text).toBe('Removed · 84.3 kg')
    expect(toast?.action?.label).toBe('Undo')
    act(() => toast!.action!.onClick())
    expect(useStore.getState().weights).toEqual([expect.objectContaining({ day: today, kg: 84.3, at: entry.at })])
  })
})

describe('BODY · PROGRESS PHOTOS', () => {
  const today = localDayKey()

  it('starts empty with the device note and keeps the file input in the DOM', async () => {
    mount(createElement(HistoryBody, { today }))
    await settle()
    const section = $('tp-photos')!
    expect(section.textContent).toContain('No photos yet.')
    expect($('tp-photo-add-button')).not.toBeNull()
    expect(section.textContent).toContain('Photos stay on this device and are not in the backup.')
    expect($('tp-photo-compare')).toBeNull()
    const input = $('tp-photo-add') as HTMLInputElement
    expect(input.type).toBe('file')
    expect(input.accept).toBe('image/*')
    expect(input.multiple).toBe(true)
    // no capture attribute: the phone offers the camera or the photo library
    expect(input.getAttribute('capture')).toBeNull()
  })

  it('adds the picked photos and lists them newest first', async () => {
    mount(createElement(HistoryBody, { today }))
    await settle()
    const input = $('tp-photo-add') as HTMLInputElement
    const files = [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })]
    Object.defineProperty(input, 'files', { configurable: true, value: files })
    act(() => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle(10)
    expect(useToast.getState().current?.text).toBe('Added · 2 photos')
    const tiles = document.querySelectorAll<HTMLElement>('[data-testid="tp-photo-grid"] button')
    expect([...tiles].map((t) => t.dataset.testid)).toEqual(['tp-photo-added-2', 'tp-photo-added-1'])
    expect(tiles[0].querySelector('img')?.getAttribute('src')).toBe('blob:thumb-added-2')
  })

  it('opens the viewer, saves a note on blur and deletes in two taps', async () => {
    photoDb.list = [photo('p1', dayKeyOffset(today, -9), 1), photo('p2', today, 2)]
    mount(createElement(HistoryBody, { today }))
    await settle()
    click($('tp-photo-p2'))
    await settle()
    const viewer = $('tp-photo-viewer')!
    expect(viewer.getAttribute('role')).toBe('dialog')
    expect(viewer.querySelector('img')?.getAttribute('src')).toBe('blob:full-p2')

    const note = $('tp-photo-note') as HTMLInputElement
    act(() => note.focus())
    typeInto(note, 'Week one')
    act(() => note.blur())
    await settle()
    expect(vi.mocked(updatePhotoNote)).toHaveBeenCalledWith('p2', 'Week one')

    click($('tp-photo-delete'))
    expect($('tp-photo-delete-confirm')?.textContent).toBe('Delete?')
    expect(vi.mocked(deletePhoto)).not.toHaveBeenCalled()
    click($('tp-photo-delete-confirm'))
    await settle()
    expect(vi.mocked(deletePhoto)).toHaveBeenCalledWith('p2')
    expect(useToast.getState().current?.text).toBe('Removed · 1 photo')
    expect($('tp-photo-p2')).toBeNull()
  })

  it('compares two photos side by side, older first, with the weigh-in of the day', async () => {
    const older = dayKeyOffset(today, -30)
    useStore.getState().addWeight(88.4, older)
    photoDb.list = [photo('p1', older, 1), photo('p2', dayKeyOffset(today, -10), 2), photo('p3', today, 3)]
    mount(createElement(HistoryBody, { today }))
    await settle()
    click($('tp-photo-compare'))
    expect($('tp-photo-compare')?.textContent).toBe('Cancel')
    click($('tp-photo-p3'))
    expect($('tp-photo-p3')?.dataset.selected).toBe('1')
    expect($('tp-photo-compare-view')).toBeNull()
    click($('tp-photo-p1'))
    await settle()
    const view = $('tp-photo-compare-view')!
    const figures = view.querySelectorAll('figure')
    expect([...figures].map((f) => f.getAttribute('data-testid'))).toEqual(['tp-photo-compare-p1', 'tp-photo-compare-p3'])
    expect(figures[0].textContent).toContain('88.4')
    expect(figures[1].querySelector('[data-kg]')).toBeNull()
  })
})
