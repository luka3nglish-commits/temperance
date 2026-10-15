/**
 * SETTINGS: the import summary, TARGET WEIGHT (helpers, then the row in the DOM) and the photos line
 * in the footer. The photos library is mocked because jsdom has no IndexedDB.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { listPhotos, photoStorageBytes, photosSupported, type PhotoMeta } from '../lib/photos'
import { useStore } from '../store/useStore'
import { importedText } from './SettingsData'
import { parseTargetWeight, SettingsScreen, weightDraftFor } from './SettingsScreen'
import { formatBytes, photoCountLine, PHOTOS_NOTE, SettingsFooter } from './SettingsFooter'
import { canInstall, INSTALL_TEXT, IOS_INSTALL_TEXT, isSnoozed } from './SettingsInstall'

vi.mock('../lib/photos', () => ({
  photosSupported: vi.fn(() => true),
  listPhotos: vi.fn(async () => []),
  photoStorageBytes: vi.fn(async () => 0),
  clearPhotos: vi.fn(async () => {}),
}))

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
// Vite defines these at build time; the footer prints them
Object.assign(globalThis, { __APP_VERSION__: '0.0.0', __BUILD_HASH__: 'test' })

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

describe('target weight helpers', () => {
  it('the field shows the stored target to one decimal, empty when there is none', () => {
    expect(weightDraftFor(undefined)).toBe('')
    expect(weightDraftFor(82.5)).toBe('82.5')
    expect(weightDraftFor(80)).toBe('80.0')
  })

  it('empty clears, a weight sets it to one decimal, anything the store would refuse keeps the old target', () => {
    expect(parseTargetWeight('')).toEqual({ kind: 'clear' })
    expect(parseTargetWeight('   ')).toEqual({ kind: 'clear' })
    expect(parseTargetWeight('82.5')).toEqual({ kind: 'set', kg: 82.5 })
    expect(parseTargetWeight('82,5')).toEqual({ kind: 'set', kg: 82.5 })
    expect(parseTargetWeight('80.04')).toEqual({ kind: 'set', kg: 80 })
    expect(parseTargetWeight('0')).toEqual({ kind: 'keep' })
    expect(parseTargetWeight('800')).toEqual({ kind: 'keep' })
    // rounds to 500.0, which the store would drop (and so clear the target)
    expect(parseTargetWeight('499.96')).toEqual({ kind: 'keep' })
    expect(parseTargetWeight('-5')).toEqual({ kind: 'keep' })
    expect(parseTargetWeight('abc')).toEqual({ kind: 'keep' })
  })
})

describe('photos line helpers', () => {
  it('sizes read the way a phone counts storage', () => {
    expect(formatBytes(0)).toBe('0 KB')
    expect(formatBytes(200)).toBe('1 KB')
    expect(formatBytes(340_000)).toBe('340 KB')
    expect(formatBytes(999_999)).toBe('1.0 MB')
    expect(formatBytes(8_400_000)).toBe('8.4 MB')
    expect(formatBytes(240_400_000)).toBe('240 MB')
    expect(formatBytes(1_230_000_000)).toBe('1.2 GB')
  })

  it('counts photos with a middle dot, singular for one, nothing for none', () => {
    expect(photoCountLine(12, 8_400_000)).toBe('12 photos · 8.4 MB')
    expect(photoCountLine(1, 340_000)).toBe('1 photo · 340 KB')
    expect(photoCountLine(0, 0)).toBeNull()
  })

  it('the note is one plain sentence', () => {
    expect(PHOTOS_NOTE).toBe('Photos stay on this device and are not in the backup.')
    expect(PHOTOS_NOTE).not.toMatch(/[–—!]/)
  })
})

describe('install', () => {
  it('installable with a captured prompt or on iOS, never once installed', () => {
    const ev = {} as never
    expect(canInstall({ deferred: null, installed: false, ios: false })).toBe(false)
    expect(canInstall({ deferred: ev, installed: false, ios: false })).toBe(true)
    expect(canInstall({ deferred: null, installed: false, ios: true })).toBe(true)
    expect(canInstall({ deferred: ev, installed: true, ios: true })).toBe(false)
  })

  it('the snooze lasts 14 days from when the prompt was shown', () => {
    const at = 1_800_000_000_000
    localStorage.setItem('temperance.install.snoozed', String(at))
    expect(isSnoozed(at + 13 * 86_400_000)).toBe(true)
    expect(isSnoozed(at + 15 * 86_400_000)).toBe(false)
    localStorage.removeItem('temperance.install.snoozed')
    expect(isSnoozed(at)).toBe(false)
  })

  it('the toast copy is one plain sentence, no dashes', () => {
    expect(INSTALL_TEXT).toBe('Keep it on the home screen.')
    expect(`${INSTALL_TEXT}${IOS_INSTALL_TEXT}`).not.toMatch(/[–—!]/)
  })
})

describe('settings in the DOM', () => {
  let container: HTMLDivElement
  let root: Root

  const $ = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  /** a macrotask, so the mocked photo reads resolve and their state lands */
  const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 0)))
  const type = (el: HTMLInputElement, value: string) => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setValue.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  const blur = (el: HTMLElement) =>
    act(() => {
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
  const photo = (id: string, bytes: number): PhotoMeta => ({ id, day: '2026-10-14', at: 0, w: 1200, h: 1600, bytes, type: 'image/webp' })

  beforeEach(() => {
    useStore.getState().resetAll()
    vi.mocked(photosSupported).mockReturnValue(true)
    vi.mocked(listPhotos).mockResolvedValue([])
    vi.mocked(photoStorageBytes).mockResolvedValue(0)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('TARGET WEIGHT sits under MACRO TARGETS and sets, keeps and clears the target', async () => {
    act(() => root.render(createElement(SettingsScreen)))
    await flush()
    const input = $('tp-settings-target-weight') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.getAttribute('inputmode')).toBe('decimal')
    expect(input.value).toBe('')
    const order = [...container.querySelectorAll('input')].map((i) => i.dataset.testid)
    expect(order.indexOf('tp-settings-target-weight')).toBe(order.indexOf('tp-settings-target-fat') + 1)

    type(input, '82.5')
    blur(input)
    expect(useStore.getState().settings.targetWeightKg).toBe(82.5)
    expect(input.value).toBe('82.5')

    type(input, '80')
    blur(input)
    expect(useStore.getState().settings.targetWeightKg).toBe(80)
    expect(input.value).toBe('80.0')

    // a weight the store would refuse leaves the target as it was
    type(input, '800')
    blur(input)
    expect(useStore.getState().settings.targetWeightKg).toBe(80)
    expect(input.value).toBe('80.0')

    // Enter commits as well
    act(() => input.focus())
    type(input, '78.4')
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(useStore.getState().settings.targetWeightKg).toBe(78.4)

    // an empty field clears it
    type(input, '')
    blur(input)
    expect(useStore.getState().settings.targetWeightKg).toBeUndefined()
    expect(input.value).toBe('')
  })

  it('three titled tablets in order, each row inside its group', async () => {
    act(() => root.render(createElement(SettingsScreen)))
    await flush()
    const groups = ['goals', 'display', 'data'].map((g) => $(`tp-settings-group-${g}`))
    expect(groups.every(Boolean)).toBe(true)
    expect(groups.map((g) => g?.querySelector('h2')?.textContent)).toEqual(['I · Goals', 'II · Display', 'III · Data'])
    expect(groups[0]?.querySelector('[data-testid="tp-settings-target-fat"]')).not.toBeNull()
    expect(groups[1]?.querySelector('[data-testid="tp-settings-opening"]')).not.toBeNull()
    expect(groups[2]?.querySelector('[data-testid="tp-settings-erase"]')).not.toBeNull()
    // the DAYS row moved to the footer
    expect([...container.querySelectorAll('.label')].map((l) => l.textContent)).not.toContain('Days')
    expect($('tp-settings-footer')?.textContent).toContain('Days reset at local midnight.')
    // no install row where the app cannot be installed (jsdom has no prompt event)
    expect($('tp-settings-install')).toBeNull()
  })

  it('ERASE asks a second time before it erases', async () => {
    useStore.getState().setGoalKcal(2100)
    act(() => root.render(createElement(SettingsScreen)))
    await flush()
    act(() => $('tp-settings-erase')!.click())
    expect($('tp-settings-erase')).toBeNull()
    expect($('tp-settings-erase-confirm')?.textContent).toBe('Erase everything')
    expect(useStore.getState().settings.goalKcal).toBe(2100)
    act(() => $('tp-settings-erase-confirm')!.click())
    expect(useStore.getState().settings.goalKcal).not.toBe(2100)
    expect($('tp-settings-erase')).not.toBeNull()
  })

  it('the footer counts the photos and says they stay on the device', async () => {
    vi.mocked(listPhotos).mockResolvedValue(Array.from({ length: 12 }, (_, i) => photo(`p${i}`, 700_000)))
    vi.mocked(photoStorageBytes).mockResolvedValue(8_400_000)
    act(() => root.render(createElement(SettingsFooter)))
    await flush()
    const line = $('tp-settings-photos')
    expect(line?.textContent).toBe('12 photos · 8.4 MB. Photos stay on this device and are not in the backup.')
    expect(line?.dataset.count).toBe('12')
    expect(line?.dataset.bytes).toBe('8400000')
  })

  it('with no photos only the note shows', async () => {
    act(() => root.render(createElement(SettingsFooter)))
    await flush()
    expect($('tp-settings-photos')?.textContent).toBe(PHOTOS_NOTE)
    expect($('tp-settings-photos')?.dataset.count).toBe('0')
  })

  it('a refused read keeps the note without a count', async () => {
    vi.mocked(listPhotos).mockRejectedValue(new Error('IndexedDB is blocked by another tab'))
    act(() => root.render(createElement(SettingsFooter)))
    await flush()
    expect($('tp-settings-photos')?.textContent).toBe(PHOTOS_NOTE)
    expect($('tp-settings-photos')?.dataset.count).toBeUndefined()
  })

  it('says nothing about photos where photos are not possible', async () => {
    vi.mocked(photosSupported).mockReturnValue(false)
    act(() => root.render(createElement(SettingsFooter)))
    await flush()
    expect($('tp-settings-photos')).toBeNull()
    expect(container.textContent).toContain('Data lives on this device.')
  })
})
