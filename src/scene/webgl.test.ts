// @vitest-environment jsdom
/**
 * The boot guard's gl=0 (any safe level): no WebGL context may ever be created, not even the probe's
 * throwaway one. The tier is `none` and the layer takes the SVG monument path.
 */
import { createElement } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { MonumentLayer } from './MonumentLayer'
import { getTier, probeTier, resetTierForTests } from './tier'
import { canUseWebGL, probeWebGL, resetWebGLProbe } from './webgl'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let getContext: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  resetWebGLProbe()
  resetTierForTests()
  localStorage.clear()
  getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
})

afterEach(() => {
  getContext.mockRestore()
  delete document.documentElement.dataset.gl
  document.body.innerHTML = ''
})

const webglCalls = () => getContext.mock.calls.filter(([kind]) => String(kind).startsWith('webgl')).length

describe('webgl probe and gl=0', () => {
  it('normally asks for a webgl2 context once (jsdom has none, so the answer is no)', () => {
    expect(probeWebGL().ok).toBe(false)
    expect(webglCalls()).toBe(1)
  })

  it('with data-gl="0" never calls getContext, never even creates the probe canvas', () => {
    document.documentElement.dataset.gl = '0'
    const create = vi.spyOn(document, 'createElement')
    expect(probeWebGL()).toEqual({ ok: false, renderer: '', software: false })
    expect(canUseWebGL()).toBe(false)
    expect(probeTier()).toBe(false)
    expect(getTier()).toBe('none')
    expect(document.documentElement.dataset.tier).toBe('none')
    expect(create.mock.calls.some(([tag]) => String(tag).toLowerCase() === 'canvas')).toBe(false)
    expect(getContext).not.toHaveBeenCalled()
    create.mockRestore()
  })

  it('with data-gl="0" the monument layer mounts the SVG monument and no webgl context', async () => {
    document.documentElement.dataset.gl = '0'
    useUI.setState({ tab: 'today', introDone: false, logOpen: false })
    useStore.getState().resetAll()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    act(() => {
      root.render(createElement(MonumentLayer, { visible: true }))
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(host.querySelector('[data-testid="tp-monument"]')?.getAttribute('data-mode')).toBe('svg')
    expect(host.querySelector('[data-testid="tp-column"]')).not.toBeNull()
    expect(webglCalls()).toBe(0)
    act(() => root.unmount())
  })
})
