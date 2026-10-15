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
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
const type = (el: HTMLElement | null, value: string) => {
  expect(el).not.toBeNull()
  act(() => {
    setter.call(el as HTMLInputElement, value)
    el!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const enter = (el: HTMLElement | null) =>
  act(() => {
    el!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
const submit = (id: string) =>
  act(() => {
    ;($(id) as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
const openRow = (id: string) => click($(id)?.querySelector('button') ?? null)

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
    // meta lines carry whole grams; the energy sits in the value column; no dashes anywhere
    expect($(`tp-meal-row-${fav.id}`)?.textContent).toContain('P 32 · C 48 · F 12')
    expect($(`tp-meal-row-${fav.id}`)?.textContent).toContain('612')
    expect($(`tp-ingredient-row-${chicken.id}`)?.textContent).toContain('per 100 g · P 31 · C 0 · F 4')
    expect($(`tp-ingredient-row-${chicken.id}`)?.textContent).toContain('165')
    // the folder's meal rows log at once too, with their own ids
    expect($(`tp-fav-log-${fav.id}`)).not.toBeNull()
    expect($(`tp-fav-star-${fav.id}`)?.getAttribute('aria-pressed')).toBe('true')
    // counts are Arabic, and the sort lives in the MEALS heading
    expect($('tp-meals')?.textContent).toContain('3')
    expect($('tp-meals-sort')).not.toBeNull()
    expect(container.textContent).not.toMatch(/[\u2013\u2014]/)
  })

  it('an empty library is one tablet with NEW MEAL and NEW INGREDIENT; the folder is hidden', async () => {
    useStore.getState().resetAll()
    mount()
    expect($('tp-library-empty')?.textContent).toContain('Nothing saved yet.')
    expect($('tp-fav-folder')).toBeNull()
    expect($('tp-fav-empty')).toBeNull()
    expect($('tp-meals')).toBeNull()
    click($('tp-library-empty-meal'))
    await wait(50)
    expect($('tp-meal-editor')).not.toBeNull()
  })

  it('the folder is hidden with no favourites, and says so when a search matches none', () => {
    const { fav } = seed()
    useStore.getState().toggleFavouriteMeal(fav.id)
    mount()
    expect($('tp-fav-folder')).toBeNull()
    act(() => useStore.getState().toggleFavouriteMeal(fav.id))
    expect($('tp-fav-folder')).not.toBeNull()
    type($('tp-library-search'), 'zzz')
    expect($('tp-fav-empty')?.textContent).toBe('Nothing matches.')
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

  it('detail LOG logs the chosen portion: a quick pick', () => {
    const { plain } = seed()
    mount()
    openRow(`tp-meal-row-${plain.id}`)
    expect($('tp-meal-detail-portion')?.getAttribute('data-unit')).toBe('serve')
    click($('tp-meal-detail-portion-pick-1.5'))
    expect($('tp-meal-detail-meta')?.textContent).toBe('1.5 serves · 1 050 kcal')
    click($('tp-meal-detail-log'))
    const e = useStore.getState().entries
    expect(e).toHaveLength(1)
    expect(e[0].servings).toBe(1.5)
    expect(e[0].macros.kcal).toBe(1050)
    // formatInt groups thousands with a thin space (U+2009); the portion label rule names the amount
    expect(useToast.getState().current?.text).toBe('Logged · 1.5 serves · 1 050 kcal')
  })

  it('a typed amount commits on Enter and logs exactly that', () => {
    const { plain } = seed()
    mount()
    openRow(`tp-meal-row-${plain.id}`)
    const input = $('tp-meal-detail-portion-input')
    type(input, '2.25')
    enter(input)
    click($('tp-meal-detail-log'))
    expect(useStore.getState().entries[0].servings).toBe(2.25)
    // the explicit amount becomes the usual one
    expect(useStore.getState().meals[plain.id].usual).toBe(2.25)
  })

  it('a per 100 g meal says so on its row and logs grams from its usual amount', () => {
    seed()
    const yog = useStore.getState().addQuickMeal({ name: 'Greek yoghurt', macros: { kcal: 97, protein: 9, carbs: 3.6, fat: 5 }, per: { amount: 100, unit: 'g' }, usual: 170 }, T0)
    mount()
    expect($(`tp-meal-row-${yog.id}`)?.textContent).toContain('per 100 g · P 9 · C 4 · F 5')
    // one tap logs the usual 170 g
    click($(`tp-meal-log-${yog.id}`))
    expect(useStore.getState().entries[0].portion).toEqual({ amount: 170, unit: 'g' })
    expect(useToast.getState().current?.text).toBe('Logged · 170 g · 165 kcal')
    openRow(`tp-meal-row-${yog.id}`)
    const field = $('tp-meal-detail-portion')
    expect(field?.getAttribute('data-unit')).toBe('g')
    expect(field?.getAttribute('data-value')).toBe('170')
    expect($('tp-meal-detail-portion-basis')?.textContent).toBe('per 100 g · 97 kcal')
    // the usual pick carries its mark
    expect($('tp-meal-detail-portion-pick-170')?.getAttribute('aria-label')).toBe('Usual, 170 grams')
    click($('tp-meal-detail-portion-pick-200'))
    click($('tp-meal-detail-log'))
    const e = useStore.getState().entries
    expect(e).toHaveLength(2)
    expect(e[1].portion).toEqual({ amount: 200, unit: 'g' })
    expect(e[1].servings).toBe(2)
    expect(e[1].macros.kcal).toBe(194)
    expect(useToast.getState().current?.text).toBe('Logged · 200 g · 194 kcal')
  })

  it('an ingredient logs by its own basis and the entry records the amount', () => {
    const { chicken } = seed()
    mount()
    act(() => useUI.getState().setLibraryFocus({ kind: 'ingredient', id: chicken.id }))
    expect($('tp-ingredient-detail-portion')?.getAttribute('data-value')).toBe('100')
    click($('tp-ingredient-detail-portion-pick-150'))
    click($('tp-ingredient-detail-log'))
    const e = useStore.getState().entries
    expect(e).toHaveLength(1)
    expect(e[0].name).toBe('Chicken breast')
    expect(e[0].portion).toEqual({ amount: 150, unit: 'g' })
    expect(e[0].macros.protein).toBe(46.5)
    expect(useToast.getState().current?.text).toBe('Logged · 150 g · 248 kcal')
  })

  it('the meal editor sets the basis and the usual amount', async () => {
    const { plain } = seed()
    mount()
    openRow(`tp-meal-row-${plain.id}`)
    click($('tp-meal-detail-edit'))
    await wait(260)
    expect($('tp-meal-edit-basis')).not.toBeNull()
    click($('tp-meal-edit-basis-g'))
    expect($('tp-meal-edit-basis-tag')?.textContent).toBe('per 100 g')
    expect($('tp-meal-edit-usual')?.getAttribute('data-unit')).toBe('g')
    expect($('tp-meal-edit-usual')?.getAttribute('data-value')).toBe('100')
    type($('tp-meal-edit-usual-input'), '180')
    enter($('tp-meal-edit-usual-input'))
    submit('tp-meal-editor')
    const m = useStore.getState().meals[plain.id]
    expect(m.per).toEqual({ amount: 100, unit: 'g' })
    expect(m.usual).toBe(180)
  })

  it('a new meal per 100 ml saves its basis and a usual 250 ml', async () => {
    useStore.getState().resetAll()
    mount()
    click($('tp-library-empty-meal'))
    await wait(50)
    type($('tp-meal-edit-name'), 'Milk')
    type($('tp-meal-edit-kcal'), '64')
    click($('tp-meal-edit-basis-ml'))
    submit('tp-meal-editor')
    const m = Object.values(useStore.getState().meals)[0]
    expect(m.name).toBe('Milk')
    expect(m.per).toEqual({ amount: 100, unit: 'ml' })
    expect(m.usual).toBe(250)
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
    type($('tp-meal-edit-kcal'), '800')
    expect($('tp-meal-edit-save')?.hasAttribute('disabled')).toBe(false)
    submit('tp-meal-editor')
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
    type($('tp-library-search'), 'chick')
    expect($(`tp-meal-row-${plain.id}`)).not.toBeNull()
    expect($(`tp-meal-row-${fav.id}`)).toBeNull()
    expect($(`tp-fav-row-${fav.id}`)).toBeNull()
    expect($(`tp-ingredient-row-${chicken.id}`)).not.toBeNull()
  })
})
