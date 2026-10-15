/**
 * The custom portion in a live LOG sheet: per serve takes any typed amount (1.3 serves), per 100 g
 * labels the numbers per 100 g and takes the grams eaten (183 g), a library meal keeps its basis and
 * usual amount, and the live result shows what will be logged.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Macros } from '../lib/types'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useToast } from '../components/ui'
import { LogSheet } from './LogSheet'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const T = ' '
const YOG: Macros = { kcal: 97, protein: 9, carbs: 4, fat: 5 }

let container: HTMLDivElement
let root: Root

const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.querySelector<E>(`[data-testid="${id}"]`)

function click(el: HTMLElement | null) {
  expect(el).not.toBeNull()
  act(() => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

/** type into a React-controlled input the way a keyboard would */
function type(id: string, text: string) {
  const el = $<HTMLInputElement>(id)
  expect(el).not.toBeNull()
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    el!.focus()
    set.call(el, text)
    el!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function blur(id: string) {
  act(() => {
    $<HTMLInputElement>(id)?.blur()
  })
}

function submit() {
  act(() => {
    document.getElementById('log-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

const last = () => {
  const list = useStore.getState().entries
  return list[list.length - 1]
}

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

describe('custom portion in the LOG sheet', () => {
  it('per serve logs any typed amount: 1.3 serves', () => {
    mount()
    type('tp-log-name', 'Toast')
    type('tp-log-kcal', '200')
    type('tp-log-protein', '10')
    type('tp-log-portion-input', '1.3')
    // the result follows the typing before it commits
    expect($('tp-log-result')?.dataset.kcal).toBe('260')
    blur('tp-log-portion-input')
    expect($('tp-log-portion')?.dataset.value).toBe('1.3')
    submit()
    const e = last()
    expect(e.name).toBe('Toast')
    expect(e.servings).toBe(1.3)
    expect(e.macros.kcal).toBe(260)
    expect(useToast.getState().current?.text).toBe(`Logged · 1.3 serves · 260${T}kcal`)
  })

  it('per 100 g labels the numbers per 100 g and logs the grams eaten: 183 g', () => {
    mount()
    type('tp-log-name', 'Skyr')
    type('tp-log-kcal', '97')
    click($('tp-log-basis-g'))
    expect($('tp-log-basis-tag')?.textContent).toBe('Per 100 g')
    // switching basis resets the amount to 100 g and never converts the label numbers
    expect($('tp-log-portion')?.dataset.value).toBe('100')
    expect($<HTMLInputElement>('tp-log-kcal')?.value).toBe('97')
    expect($('tp-log-result')?.dataset.kcal).toBe('97')
    type('tp-log-portion-input', '183')
    blur('tp-log-portion-input')
    expect($('tp-log-result')?.dataset.kcal).toBe('178')
    submit()
    const e = last()
    expect(e.portion).toEqual({ amount: 183, unit: 'g' })
    expect(e.servings).toBeCloseTo(1.83, 4)
    expect(e.macros.kcal).toBeCloseTo(177.5, 1)
    expect(useToast.getState().current?.text).toBe(`Logged · 183 g · 178${T}kcal`)
    // saved to the library on its label basis, with the grams as the usual amount
    const meal = Object.values(useStore.getState().meals).find((m) => m.name === 'Skyr')
    expect(meal?.per).toEqual({ amount: 100, unit: 'g' })
    expect(meal?.usual).toBe(183)
  })

  it('a quick pick sets the amount; the hint speaks only when the macros disagree', () => {
    mount()
    type('tp-log-kcal', '410')
    type('tp-log-protein', '30')
    type('tp-log-carbs', '50')
    type('tp-log-fat', '10')
    expect($('tp-log-hint')?.textContent).toBe('')
    type('tp-log-kcal', '600')
    expect($('tp-log-hint')?.textContent).toBe(`Macros add to 410${T}kcal.`)
    click($('tp-log-portion-pick-1.5'))
    expect($('tp-log-portion')?.dataset.value).toBe('1.5')
    expect($('tp-log-portion-pick-1.5')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('a library meal keeps its basis and usual amount, and logs the meal itself', () => {
    const meal = useStore.getState().addQuickMeal({ name: 'Greek yoghurt', macros: YOG, per: { amount: 100, unit: 'g' }, usual: 170 })
    mount()
    act(() => useUI.getState().openLog({ mealId: meal.id }))
    expect($('tp-log-portion')?.dataset.unit).toBe('g')
    expect($('tp-log-portion')?.dataset.value).toBe('170')
    expect($('tp-log-basis-g')?.getAttribute('aria-checked')).toBe('true')
    expect($('tp-log-portion-pick-170')?.getAttribute('aria-label')).toBe('Usual, 170 grams')
    submit()
    const e = last()
    expect(e.mealId).toBe(meal.id)
    expect(e.portion).toEqual({ amount: 170, unit: 'g' })
  })
})
