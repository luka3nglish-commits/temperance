// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { Opening } from './Opening'
import { resetOpeningForTests, SEEN_KEY } from './useOpening'
import { TARGET_NAMES } from './targets'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root | null = null

function mountTargets(): Record<string, HTMLElement> {
  const screen = document.createElement('div')
  screen.setAttribute('data-stage', '')
  const out: Record<string, HTMLElement> = {}
  for (const name of TARGET_NAMES) {
    const el = document.createElement('div')
    el.setAttribute('data-intro', name)
    el.textContent = name
    screen.appendChild(el)
    out[name] = el
  }
  document.body.appendChild(screen)
  return out
}

const flushFrames = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 40))
  })
}

beforeEach(() => {
  resetOpeningForTests()
  sessionStorage.clear()
  delete document.documentElement.dataset.introDone
  useUI.setState({ tab: 'today', introDone: false })
  useStore.setState((s) => ({ settings: { ...s.settings, introCount: 0, opening: 'short', motion: 'off' } }))
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  document.body.innerHTML = ''
})

describe('Opening', () => {
  it('hides the targets before the first frame, then a skip hands the home screen back as pure CSS', async () => {
    const targets = mountTargets()
    root = createRoot(host)
    act(() => {
      root!.render(<Opening />)
    })
    const overlay = host.querySelector('[data-testid="tp-opening"]')!
    expect(overlay.getAttribute('data-state')).toBe('playing')
    // Tailwind is not compiled here: check the class that makes the overlay untouchable
    expect(overlay.className).toContain('pointer-events-none')
    // hidden in the layout effect: opacity for most, a clip for the number
    expect(targets.label.style.opacity).toBe('0')
    expect(targets.number.style.clipPath).toContain('inset(100%')
    expect(useUI.getState().introDone).toBe(false)

    await flushFrames()
    expect(performance.getEntriesByName('tp:opening-start').length).toBeGreaterThan(0)
    const skip = host.querySelector<HTMLButtonElement>('button[aria-label="Skip"]')!
    expect(skip).not.toBeNull()
    expect(skip.textContent).toBe('Skip')

    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })
    expect(overlay.getAttribute('data-state')).toBe('done')
    expect(useUI.getState().introDone).toBe(true)
    expect(document.documentElement.dataset.introDone).toBe('true')
    expect(performance.getEntriesByName('tp:opening-done').length).toBeGreaterThan(0)
    // the full opening was skipped: it counts as played
    expect(useStore.getState().settings.introCount).toBe(1)
    expect(Number(sessionStorage.getItem(SEEN_KEY))).toBeGreaterThan(0)
    for (const name of TARGET_NAMES) {
      const el = targets[name]
      expect(el.style.opacity, name).toBe('')
      expect(el.style.clipPath, name).toBe('')
      expect(el.style.transform, name).toBe('')
    }
    // the skip control is gone and nothing in the overlay can take a touch
    expect(host.querySelector('button')).toBeNull()
  })

  it('plays nothing within ten minutes of the last launch', () => {
    mountTargets()
    useStore.setState((s) => ({ settings: { ...s.settings, introCount: 2 } }))
    sessionStorage.setItem(SEEN_KEY, String(Date.now() - 1000))
    root = createRoot(host)
    act(() => {
      root!.render(<Opening />)
    })
    const overlay = host.querySelector('[data-testid="tp-opening"]')!
    expect(overlay.getAttribute('data-state')).toBe('done')
    expect(useUI.getState().introDone).toBe(true)
    expect(host.querySelector('button')).toBeNull()
    expect(useStore.getState().settings.introCount).toBe(2)
  })

  it('reduced motion crossfades and completes on its own without counting as a full play', async () => {
    const targets = mountTargets()
    useStore.setState((s) => ({ settings: { ...s.settings, introCount: 2, motion: 'on' } }))
    root = createRoot(host)
    act(() => {
      root!.render(<Opening />)
    })
    const overlay = host.querySelector('[data-testid="tp-opening"]')!
    expect(overlay.getAttribute('data-state')).toBe('playing')
    expect(targets.number.style.opacity).toBe('0')
    expect(targets.number.style.clipPath).toBe('')
    await flushFrames()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })
    expect(overlay.getAttribute('data-state')).toBe('done')
    expect(targets.number.style.opacity).toBe('')
    expect(useStore.getState().settings.introCount).toBe(2)
    expect(useUI.getState().introDone).toBe(true)
  })
})
