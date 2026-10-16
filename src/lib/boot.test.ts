// @vitest-environment jsdom
/**
 * The crash-loop guard's app half: the readers of the <html> attributes, the stable mark (30 s, or
 * leaving the page) and TRY FULL MODE.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOOT_KEY, FLAGS_KEY, SAFE_KEY, STABLE_MS, featureOff, installStableMark, isBare, markBootStable, safeLevel, tryFullMode } from './boot'

const html = document.documentElement
const boot = () => JSON.parse(localStorage.getItem(BOOT_KEY) ?? 'null')

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem(BOOT_KEY, JSON.stringify({ at: 1000, stable: false, level: 1 }))
})

afterEach(() => {
  vi.useRealTimers()
  for (const k of ['safe', 'gl', 'fx', 'sweep', 'intro', 'bare']) delete html.dataset[k]
  setVisibility('visible')
})

describe('readers', () => {
  it('read the attributes the boot script set, live on every call', () => {
    expect(safeLevel()).toBe(0)
    expect(featureOff('gl')).toBe(false)
    expect(isBare()).toBe(false)
    html.dataset.safe = '2'
    html.dataset.gl = '0'
    html.dataset.bare = '1'
    expect(safeLevel()).toBe(2)
    expect(featureOff('gl')).toBe(true)
    expect(featureOff('fx')).toBe(false)
    expect(isBare()).toBe(true)
    html.dataset.safe = 'banana'
    expect(safeLevel()).toBe(0)
  })
})

describe('stable mark', () => {
  it('marks the boot stable after STABLE_MS, keeping its level and date', () => {
    vi.useFakeTimers()
    installStableMark()
    vi.advanceTimersByTime(STABLE_MS - 1)
    expect(boot().stable).toBe(false)
    vi.advanceTimersByTime(1)
    expect(boot()).toEqual({ at: 1000, stable: true, level: 1 })
  })

  it('marks at once on pagehide, then removes its timer and listeners', () => {
    vi.useFakeTimers()
    const removeWin = vi.spyOn(window, 'removeEventListener')
    const removeDoc = vi.spyOn(document, 'removeEventListener')
    installStableMark()
    window.dispatchEvent(new Event('pagehide'))
    expect(boot().stable).toBe(true)
    expect(removeWin).toHaveBeenCalledWith('pagehide', expect.any(Function))
    expect(removeDoc).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    expect(vi.getTimerCount()).toBe(0)

    // marked once: a later boot record is never touched again by this session
    localStorage.setItem(BOOT_KEY, JSON.stringify({ at: 2000, stable: false, level: 0 }))
    window.dispatchEvent(new Event('pagehide'))
    vi.advanceTimersByTime(STABLE_MS * 2)
    expect(boot().stable).toBe(false)
    removeWin.mockRestore()
    removeDoc.mockRestore()
  })

  it('marks when the page goes hidden (leaving is not a crash), not when it becomes visible', () => {
    vi.useFakeTimers()
    installStableMark()
    setVisibility('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(boot().stable).toBe(false)
    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(boot().stable).toBe(true)
  })

  it('the cancel function stops it', () => {
    vi.useFakeTimers()
    const cancel = installStableMark()
    cancel()
    vi.advanceTimersByTime(STABLE_MS * 2)
    window.dispatchEvent(new Event('pagehide'))
    expect(boot().stable).toBe(false)
  })

  it('never throws without storage, and writes a record when the guard could not', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => markBootStable()).not.toThrow()
    get.mockRestore()
    localStorage.clear()
    html.dataset.safe = '1'
    markBootStable()
    expect(boot()).toMatchObject({ stable: true, level: 1 })
  })
})

describe('tryFullMode', () => {
  it('forgets the sticky level, this boot and the session switches, then reloads on ?safe=0', () => {
    localStorage.setItem(SAFE_KEY, JSON.stringify({ level: 1, at: 1 }))
    sessionStorage.setItem(FLAGS_KEY, JSON.stringify({ gl: '0' }))
    localStorage.setItem('temperance.v1', '{"keep":true}')
    const replace = vi.fn()
    tryFullMode({ pathname: '/temperance/', replace })
    expect(localStorage.getItem(SAFE_KEY)).toBeNull()
    expect(localStorage.getItem(BOOT_KEY)).toBeNull()
    expect(sessionStorage.getItem(FLAGS_KEY)).toBeNull()
    // the person's data is untouched
    expect(localStorage.getItem('temperance.v1')).toBe('{"keep":true}')
    expect(replace).toHaveBeenCalledWith('/temperance/?safe=0')
  })
})
