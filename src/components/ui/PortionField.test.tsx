// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AmountUnit } from '../../lib/types'
import { PortionField } from './PortionField'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Host({ start, unit, calls }: { start: number; unit: AmountUnit; calls: number[] }) {
  const [v, setV] = useState(start)
  return (
    <PortionField
      testId="pf"
      unit={unit}
      value={v}
      onChange={(n) => {
        calls.push(n)
        setV(n)
      }}
    />
  )
}

let container: HTMLDivElement
let root: Root

function mount(start: number, unit: AmountUnit, calls: number[]) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<Host start={start} unit={unit} calls={calls} />))
  return {
    input: container.querySelector('[data-testid="pf-input"]') as HTMLInputElement,
    more: container.querySelector('[data-testid="pf-more"]') as HTMLButtonElement,
    group: container.querySelector('[data-testid="pf"]') as HTMLElement,
  }
}

/** a keystroke as the browser delivers it: the new value, then an input event (React's onChange) */
function type(el: HTMLInputElement, text: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    set.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function focus(el: HTMLInputElement) {
  act(() => el.focus())
  expect(document.activeElement).toBe(el)
}

function key(el: HTMLElement, k: string) {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
  })
}

function press(btn: HTMLElement) {
  act(() => {
    btn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 }))
  })
  act(() => {
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
  })
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe('PortionField: typing right after focus (the deferred select race)', () => {
  let frames: FrameRequestCallback[]
  const flush = () =>
    act(() => {
      const q = frames
      frames = []
      q.forEach((cb) => cb(performance.now()))
    })

  beforeEach(() => {
    frames = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      frames.push(cb)
      return frames.length
    })
  })

  it('a key that lands before the frame is not selected away: 183 g stays 183 g', () => {
    const calls: number[] = []
    const { input } = mount(100, 'g', calls)
    focus(input)
    // focus selects synchronously, so the first key replaces the whole value
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length)
    type(input, '1')
    input.setSelectionRange(1, 1)
    flush()
    // the frame-time re-select must not run once something is typed
    expect(input.selectionStart).toBe(input.selectionEnd)
    type(input, '18')
    type(input, '183')
    act(() => input.blur())
    expect(calls.at(-1)).toBe(183)
  })

  it('1.5 serves typed over 1 stays 1.5', () => {
    const calls: number[] = []
    const { input } = mount(1, 'serve', calls)
    focus(input)
    type(input, '1')
    input.setSelectionRange(1, 1)
    flush()
    expect(input.selectionStart).toBe(input.selectionEnd)
    type(input, '1.5')
    act(() => input.blur())
    expect(calls.at(-1)).toBe(1.5)
  })

  it('with nothing typed, the frame re-selects the whole value', () => {
    const { input } = mount(100, 'g', [])
    focus(input)
    input.setSelectionRange(3, 3)
    flush()
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(3)
  })
})

describe('PortionField: a typed amount then a nudge', () => {
  it('183 then plus is 190, 183 then ArrowUp is 190, ArrowUp again is 200', () => {
    const calls: number[] = []
    const { input, more, group } = mount(100, 'g', calls)
    focus(input)
    type(input, '183')
    press(more)
    expect(calls.at(-1)).toBe(190)
    expect(group.getAttribute('data-value')).toBe('190')

    type(input, '183')
    key(input, 'ArrowUp')
    expect(calls.at(-1)).toBe(190)
    expect(group.getAttribute('data-value')).toBe('190')

    key(input, 'ArrowUp')
    expect(calls.at(-1)).toBe(200)
    expect(group.getAttribute('data-value')).toBe('200')
  })

  it('a plain ArrowDown with no typing steps once and commits nothing else', () => {
    const calls: number[] = []
    const { input } = mount(100, 'g', calls)
    focus(input)
    key(input, 'ArrowDown')
    expect(calls).toEqual([90])
  })
})

describe('PortionField: Escape and the accessible name', () => {
  it('Escape cancels the typing without reaching a window listener (the sheet stays open)', () => {
    const calls: number[] = []
    const { input } = mount(100, 'g', calls)
    const onWindowKey = vi.fn()
    window.addEventListener('keydown', onWindowKey)
    focus(input)
    type(input, '250')
    key(input, 'Escape')
    window.removeEventListener('keydown', onWindowKey)
    expect(onWindowKey).not.toHaveBeenCalled()
    expect(calls).toEqual([])
  })

  it('the amount is named with its unit', () => {
    mount(100, 'g', [])
    expect(container.querySelector('label .sr-only')?.textContent).toBe('Portion amount in grams')
  })

  it('hold-to-repeat leaves no window listener behind', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const calls: number[] = []
    const { more } = mount(100, 'g', calls)
    press(more)
    press(more)
    const signals = add.mock.calls
      .filter(([type]) => type === 'pointerup' || type === 'pointercancel')
      .map(([, , opts]) => (opts as AddEventListenerOptions | undefined)?.signal)
    expect(signals.length).toBe(4)
    expect(signals.every((s) => s?.aborted)).toBe(true)
  })
})
