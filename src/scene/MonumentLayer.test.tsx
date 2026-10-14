// @vitest-environment jsdom
/**
 * The layer on the SVG path, the only one jsdom can run (no webgl2 context): mode, readiness,
 * the handle, the store-driven column height, strikes under reduced motion, hidden tabs and the
 * --goal-y / --plinth-y variables.
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { getMonumentHandle } from './handle'
import { resetTierForTests } from './tier'
import { resetWebGLProbe } from './webgl'
import { MonumentLayer } from './MonumentLayer'
import { heightFor, GOAL_Y, PX_PER_UNIT, STAGE_PLINTH_Y } from './tokens'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root | null = null

const flush = async (ms = 30) => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

const mount = (visible = true) => {
  root = createRoot(host)
  act(() => {
    root!.render(<MonumentLayer visible={visible} />)
  })
}

beforeEach(() => {
  resetTierForTests()
  resetWebGLProbe()
  localStorage.clear()
  useUI.setState({ tab: 'today', introDone: false, logOpen: false })
  useStore.getState().resetAll()
  useStore.setState((s) => ({ settings: { ...s.settings, motion: 'on', goalKcal: 2500 } }))
  host = document.createElement('div')
  host.style.position = 'relative'
  document.body.appendChild(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  document.body.innerHTML = ''
  document.documentElement.style.removeProperty('--goal-y')
  document.documentElement.style.removeProperty('--plinth-y')
})

describe('MonumentLayer (svg path)', () => {
  it('mounts the SVG monument, ready at once, and registers the svg handle', async () => {
    mount()
    const layer = host.querySelector('[data-testid="tp-monument"]')!
    expect(layer.getAttribute('data-mode')).toBe('svg')
    expect(layer.getAttribute('data-ready')).toBe('true')
    expect(document.documentElement.dataset.tier).toBe('none')
    expect(document.documentElement.classList.contains('no-grain')).toBe(true)
    const h = getMonumentHandle()
    expect(h.mode).toBe('svg')
    expect(h.isReady()).toBe(true)
    await expect(h.ready()).resolves.toBeUndefined()
    // the column starts at scale 0 (the opening raises it)
    const col = host.querySelector('[data-testid="tp-column"]')!
    expect(col.getAttribute('data-h')).toBe('0.000')
    // the stage variables are written relative to the frame
    expect(document.documentElement.style.getPropertyValue('--goal-y')).toBe(`${STAGE_PLINTH_Y - GOAL_Y * PX_PER_UNIT}px`)
    expect(document.documentElement.style.getPropertyValue('--plinth-y')).toBe(`${STAGE_PLINTH_Y}px`)
  })

  it('setInstant places the column at H for the store, and strikes follow the pulse', async () => {
    useStore.getState().logQuick({ name: 'Eggs', macros: { kcal: 1250, protein: 0, carbs: 0, fat: 0 } })
    mount()
    const col = host.querySelector('[data-testid="tp-column"]')!
    act(() => getMonumentHandle().setInstant())
    expect(col.getAttribute('data-h')).toBe(heightFor(1250, 2500).toFixed(3))
    // reduced motion (settings.motion = on): the strike snaps to the new height
    act(() => {
      useStore.getState().logQuick({ name: 'Rice', macros: { kcal: 1250, protein: 0, carbs: 0, fat: 0 } })
    })
    await flush()
    expect(col.getAttribute('data-h')).toBe('2.000')
    // over the line: the overflow and the capital ride above the seam, the cracks come on
    act(() => {
      useStore.getState().logQuick({ name: 'Cake', macros: { kcal: 625, protein: 0, carbs: 0, fat: 0 } })
    })
    await flush()
    expect(col.getAttribute('data-h')).toBe(heightFor(3125, 2500).toFixed(3))
    const cracksOn = host.querySelectorAll('.tp-svg-crack.on').length
    expect(cracksOn).toBe(7)
  })

  it('a strike while the LOG sheet is open waits for it to close (at most 220 ms)', async () => {
    mount()
    act(() => getMonumentHandle().setInstant())
    const col = host.querySelector('[data-testid="tp-column"]')!
    useUI.setState({ logOpen: true })
    act(() => {
      useStore.getState().logQuick({ name: 'Eggs', macros: { kcal: 1250, protein: 0, carbs: 0, fat: 0 } })
    })
    expect(col.getAttribute('data-h')).toBe('0.180')
    act(() => useUI.getState().closeLog())
    await flush()
    expect(col.getAttribute('data-h')).toBe(heightFor(1250, 2500).toFixed(3))
  })

  it('hidden off TODAY: visibility hidden, the store still updates the column silently', async () => {
    mount(false)
    const layer = host.querySelector<HTMLElement>('[data-testid="tp-monument"]')!
    expect(layer.style.visibility).toBe('hidden')
    act(() => getMonumentHandle().setInstant())
    act(() => {
      useStore.getState().logQuick({ name: 'Eggs', macros: { kcal: 500, protein: 0, carbs: 0, fat: 0 } })
    })
    await flush()
    expect(host.querySelector('[data-testid="tp-column"]')!.getAttribute('data-h')).toBe(heightFor(500, 2500).toFixed(3))
    act(() => {
      root!.render(<MonumentLayer visible />)
    })
    expect(layer.style.visibility).toBe('visible')
  })

  it('places the column once the opening is done even if nothing else did', async () => {
    useStore.getState().logQuick({ name: 'Eggs', macros: { kcal: 1000, protein: 0, carbs: 0, fat: 0 } })
    mount()
    const col = host.querySelector('[data-testid="tp-column"]')!
    expect(col.getAttribute('data-h')).toBe('0.000')
    act(() => useUI.getState().setIntroDone(true))
    await flush()
    expect(col.getAttribute('data-h')).toBe(heightFor(1000, 2500).toFixed(3))
  })
})
