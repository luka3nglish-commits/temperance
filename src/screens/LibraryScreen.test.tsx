/**
 * Renders the LIBRARY screen in jsdom with a seeded store and checks the test hooks and the
 * interactions behind them: log one portion, star, detail sheet, two-step delete, libraryFocus.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useToast } from '../components/ui'
import { makeComponent } from '../lib/macros'
import { LibraryScreen } from './LibraryScreen'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// jsdom declares matchMedia without implementing it
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  })
}

const T0 = new Date(2026, 9, 13, 8, 0, 0).getTime()

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

function seed() {
  const s = useStore.getState()
  s.resetAll()
  const fav = s.addQuickMeal({ name: 'Oats and whey', macros: { kcal: 612, protein: 32, carbs: 48, fat: 12 }, favourite: true }, T0)
  const plain = s.addQuickMeal({ name: 'Chicken rice', macros: { kcal: 700, protein: 55, carbs: 80, fat: 14 } }, T0)
  const chicken = s.addIngredient({ name: 'Chicken breast', per: { amount: 100, unit: 'g' }, macros: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } }, T0)
  const built = s.addBuiltMeal({ name: 'Chicken bowl', components: [makeComponent(chicken, 200)] }, T0)
  return { fav, plain, chicken, built }
}

function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<LibraryScreen />)
  })
}

beforeEach(() => {
  useUI.setState({ libraryFocus: null, logOpen: false, logPrefill: null })
  useToast.getState().dismiss()
  localStorage.clear()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('library screen hooks', () => {
  it('renders the screen, search, folder, meals and ingredients with their rows', () => {
    const { fav, plain, chicken, built } = seed()
    mount()
    expect($('tp-library')).not.toBeNull()
    expect($('tp-library-search')?.tagName).toBe('INPUT')
    expect($('tp-fav-folder')).not.toBeNull()
    expect($(`tp-fav-row-${fav.id}`)).not.toBeNull()
    expect($(`tp-fav-row-${plain.id}`)).toBeNull()
    expect($('tp-fav-empty')).toBeNull()
    expect($('tp-meals')).not.toBeNull()
    for (const m of [fav, plain, built]) {
      expect($(`tp-meal-row-${m.id}`)).not.toBeNull()
      expect($(`tp-meal-log-${m.id}`)).not.toBeNull()
    }
    expect($(`tp-meal-fav-${fav.id}`)?.getAttribute('aria-pressed')).toBe('true')
    expect($(`tp-meal-fav-${plain.id}`)?.getAttribute('aria-pressed')).toBe('false')
    expect($('tp-ingredients')).not.toBeNull()
    expect($(`tp-ingredient-row-${chicken.id}`)).not.toBeNull()
    // sub-lines carry the spec copy, no dashes anywhere
    expect($(`tp-meal-row-${fav.id}`)?.textContent).toContain('612 kcal · P 32 C 48 F 12')
    expect($(`tp-ingredient-row-${chicken.id}`)?.textContent).toContain('per 100 g · 165 kcal · P 31 C 0 F 3.6')
    expect(container.textContent).not.toMatch(/[–—]/)
  })

  it('shows the one-line empty state in the folder', () => {
    useStore.getState().resetAll()
    mount()
    expect($('tp-fav-empty')?.textContent).toBe('Mark a meal to keep it here.')
  })

  it('the square-plus logs one portion at once and toasts with UNDO', () => {
    const { fav } = seed()
    mount()
    click($(`tp-meal-log-${fav.id}`))
    const entries = useStore.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0].mealId).toBe(fav.id)
    expect(entries[0].macros.kcal).toBe(612)
    const toast = useToast.getState().current
    expect(toast?.text).toBe('Logged · 612 kcal')
    expect(toast?.action?.label).toBe('Undo')
    act(() => toast!.action!.onClick())
    expect(useStore.getState().entries).toHaveLength(0)
  })

  it('the star toggles the favourite and the folder follows', () => {
    const { plain } = seed()
    mount()
    click($(`tp-meal-fav-${plain.id}`))
    expect(useStore.getState().meals[plain.id].favourite).toBe(true)
    expect($(`tp-meal-fav-${plain.id}`)?.getAttribute('aria-pressed')).toBe('true')
    expect($(`tp-fav-row-${plain.id}`)).not.toBeNull()
  })

  it('a row tap opens the detail sheet; delete is two-step', async () => {
    const { plain } = seed()
    mount()
    click($(`tp-meal-row-${plain.id}`)?.querySelector('button') ?? null)
    expect($('tp-meal-detail')).not.toBeNull()
    for (const id of ['tp-meal-detail-log', 'tp-meal-detail-edit', 'tp-meal-detail-fav', 'tp-meal-detail-delete']) expect($(id)).not.toBeNull()
    expect($('tp-meal-delete-confirm')).toBeNull()
    click($('tp-meal-detail-delete'))
    expect($('tp-meal-delete-confirm')?.textContent).toBe('Delete?')
    expect(useStore.getState().meals[plain.id]).toBeDefined()
    click($('tp-meal-delete-confirm'))
    expect(useStore.getState().meals[plain.id]).toBeUndefined()
    await wait(260)
    expect($('tp-meal-detail')).toBeNull()
    expect($(`tp-meal-row-${plain.id}`)).toBeNull()
  })

  it('detail LOG logs the chosen portion', () => {
    const { plain } = seed()
    mount()
    click($(`tp-meal-row-${plain.id}`)?.querySelector('button') ?? null)
    click(document.querySelector<HTMLElement>('[aria-label="More portion"]'))
    click($('tp-meal-detail-log'))
    const e = useStore.getState().entries
    expect(e).toHaveLength(1)
    expect(e[0].servings).toBe(1.5)
    expect(e[0].macros.kcal).toBe(1050)
    // formatInt groups thousands with a thin space (U+2009)
    expect(useToast.getState().current?.text).toBe('Logged · 1 050 kcal')
  })

  it('EDIT opens the editor with the hooks and saves future logs only', async () => {
    const { plain } = seed()
    useStore.getState().logMeal(plain.id, 1, T0)
    mount()
    click($(`tp-meal-row-${plain.id}`)?.querySelector('button') ?? null)
    click($('tp-meal-detail-edit'))
    await wait(260)
    expect($('tp-meal-editor')).not.toBeNull()
    for (const id of ['tp-meal-edit-name', 'tp-meal-edit-kcal', 'tp-meal-edit-protein', 'tp-meal-edit-carbs', 'tp-meal-edit-fat']) expect($(id)?.tagName).toBe('INPUT')
    const kcal = $('tp-meal-edit-kcal') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(kcal, '800')
      kcal.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect($('tp-meal-edit-save')?.hasAttribute('disabled')).toBe(false)
    act(() => {
      ;($('tp-meal-editor') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(useStore.getState().meals[plain.id].macros.kcal).toBe(800)
    expect(useStore.getState().entries[0].macros.kcal).toBe(700)
  })

  it('libraryFocus opens that item and clears itself', () => {
    const { chicken } = seed()
    mount()
    act(() => useUI.getState().setLibraryFocus({ kind: 'ingredient', id: chicken.id }))
    expect(useUI.getState().libraryFocus).toBeNull()
    expect($('tp-ingredient-detail')?.textContent).toContain('Chicken breast')
  })

  it('an assembled meal lists its components and can reopen in BUILD', async () => {
    const { built } = seed()
    mount()
    click($(`tp-meal-row-${built.id}`)?.querySelector('button') ?? null)
    expect($('tp-meal-detail')?.textContent).toContain('Chicken breast')
    expect($('tp-meal-detail')?.textContent).toContain('200 g')
    click($('tp-meal-detail-build'))
    await wait(260)
    expect(useUI.getState().logOpen).toBe(true)
    expect(useUI.getState().logPrefill).toEqual({ mealId: built.id, mode: 'build' })
  })

  it('search filters every list', () => {
    const { fav, plain, chicken } = seed()
    mount()
    const input = $('tp-library-search') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, 'chick')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect($(`tp-meal-row-${plain.id}`)).not.toBeNull()
    expect($(`tp-meal-row-${fav.id}`)).toBeNull()
    expect($(`tp-fav-row-${fav.id}`)).toBeNull()
    expect($(`tp-ingredient-row-${chicken.id}`)).not.toBeNull()
  })
})
