// @vitest-environment jsdom
/**
 * THE ONE LIGHT after the iOS crash hotfix: at rest nothing runs (no infinite :root animation, no
 * requestAnimationFrame loop, no computed-style polling, no `tilt` events). The loop runs only
 * while a tilt source is live and ends by itself once the samples stop.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../store/useStore'
import { emitTilt, isTiltLoopRunning, resetTiltForTests, startTilt, suspendTilt } from './tilt'

const CSS = readFileSync(resolve(__dirname, '../index.css'), 'utf8')
const root = document.documentElement

let stop: (() => void) | null = null
let events: number[]
let raf: ReturnType<typeof vi.spyOn>
const onTilt = (e: Event) => events.push((e as CustomEvent<number>).detail)

const orientation = (gamma: number) => window.dispatchEvent(Object.assign(new Event('deviceorientation'), { gamma }))

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'],
  })
  resetTiltForTests()
  events = []
  window.addEventListener('tilt', onTilt)
  ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = class {}
  useStore.setState((s) => ({ settings: { ...s.settings, tilt: false } }))
  raf = vi.spyOn(window, 'requestAnimationFrame')
})

afterEach(() => {
  stop?.()
  stop = null
  raf.mockRestore()
  window.removeEventListener('tilt', onTilt)
  delete (window as unknown as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent
  delete root.dataset.sweep
  root.style.removeProperty('--tilt-x')
  root.style.removeProperty('--tilt-angle')
  vi.useRealTimers()
})

describe('no infinite root animation', () => {
  it('index.css has no gold sweep keyframe, no animated :root and no will-change on the gold face', () => {
    expect(CSS).not.toMatch(/@keyframes\s+goldSweep/)
    expect(CSS).not.toMatch(/\.auto-sweep\s*\{/)
    expect(CSS).not.toMatch(/animation[^;{}]*\binfinite\b/)
    const face = CSS.match(/\.gold-num \.gold-face \{[^}]*\}/)?.[0] ?? ''
    expect(face).toContain('background-clip: text')
    expect(face).not.toContain('will-change')
  })

  it('startTilt at rest: no class, no inline light, no loop, no style polling, no events', () => {
    const gcs = vi.spyOn(window, 'getComputedStyle')
    stop = startTilt()
    expect(root.classList.contains('auto-sweep')).toBe(false)
    expect(root.style.getPropertyValue('--tilt-x')).toBe('')
    vi.advanceTimersByTime(3000)
    expect(raf).not.toHaveBeenCalled()
    expect(isTiltLoopRunning()).toBe(false)
    expect(gcs).not.toHaveBeenCalled()
    expect(events).toEqual([])
    gcs.mockRestore()
  })
})

describe('live tilt', () => {
  it('ignores the device unless GOLD FOLLOWS TILT is on', () => {
    stop = startTilt()
    orientation(20)
    vi.advanceTimersByTime(500)
    expect(raf).not.toHaveBeenCalled()
    expect(events).toEqual([])
  })

  it('runs while samples arrive, then eases back to 0 and stops by itself', () => {
    stop = startTilt()
    useStore.getState().setTilt(true)
    orientation(15) // gamma / 30 = 0.5
    expect(isTiltLoopRunning()).toBe(true)
    vi.advanceTimersByTime(1000)
    const x = parseFloat(root.style.getPropertyValue('--tilt-x'))
    expect(x).toBeGreaterThan(0.4)
    expect(x).toBeLessThanOrEqual(0.5)
    expect(root.style.getPropertyValue('--tilt-angle')).toMatch(/deg$/)
    expect(events.length).toBeGreaterThan(0)
    expect(events[events.length - 1]).toBeGreaterThan(0.4)

    // the samples stop: after LIVE_TIMEOUT the light returns to rest and the loop ends
    vi.advanceTimersByTime(5000)
    expect(isTiltLoopRunning()).toBe(false)
    expect(root.style.getPropertyValue('--tilt-x')).toBe('')
    expect(events[events.length - 1]).toBe(0)

    const calls = raf.mock.calls.length
    const sent = events.length
    vi.advanceTimersByTime(3000)
    expect(raf.mock.calls.length).toBe(calls)
    expect(events.length).toBe(sent)
  })

  it('turning GOLD FOLLOWS TILT off returns the light to rest and stops listening', () => {
    stop = startTilt()
    useStore.getState().setTilt(true)
    orientation(30)
    vi.advanceTimersByTime(600)
    useStore.getState().setTilt(false)
    // the ease back to rest takes about 59 frames: 2 s at 30 Hz, 4 s on the low tier's 15 Hz
    vi.advanceTimersByTime(5000)
    expect(isTiltLoopRunning()).toBe(false)
    expect(root.style.getPropertyValue('--tilt-x')).toBe('')
    const calls = raf.mock.calls.length
    orientation(30)
    vi.advanceTimersByTime(500)
    expect(raf.mock.calls.length).toBe(calls)
  })

  it('pauses while the document is hidden', () => {
    stop = startTilt()
    useStore.getState().setTilt(true)
    orientation(15)
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(isTiltLoopRunning()).toBe(false)
    const calls = raf.mock.calls.length
    vi.advanceTimersByTime(1000)
    expect(raf.mock.calls.length).toBe(calls)
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(isTiltLoopRunning()).toBe(true)
  })
})

describe('the opening hold', () => {
  it('after the opening sweep the glint slides back to rest in one finite pass', () => {
    stop = startTilt()
    const resume = suspendTilt()
    emitTilt(1) // the sweep ends at +1
    expect(raf).not.toHaveBeenCalled()
    resume()
    expect(isTiltLoopRunning()).toBe(true)
    vi.advanceTimersByTime(2000)
    expect(isTiltLoopRunning()).toBe(false)
    expect(events[events.length - 1]).toBe(0)
    // it slid, it did not jump
    expect(events.filter((x) => x > 0 && x < 1).length).toBeGreaterThan(3)
    // the root light never moved
    expect(root.style.getPropertyValue('--tilt-x')).toBe('')
    const sent = events.length
    vi.advanceTimersByTime(3000)
    expect(events.length).toBe(sent)
  })
})

describe('sweep=0', () => {
  it('installs nothing: no listeners, no loop, the light stays at rest even with tilt on', () => {
    root.dataset.sweep = '0'
    const add = vi.spyOn(window, 'addEventListener')
    useStore.setState((s) => ({ settings: { ...s.settings, tilt: true } }))
    stop = startTilt()
    expect(add.mock.calls.some(([type]) => type === 'deviceorientation' || type === 'pointermove')).toBe(false)
    orientation(20)
    vi.advanceTimersByTime(1000)
    expect(raf).not.toHaveBeenCalled()
    // an opening hold released without a loop puts the glint straight back
    const resume = suspendTilt()
    emitTilt(1)
    resume()
    expect(events[events.length - 1]).toBe(0)
    add.mockRestore()
  })
})
