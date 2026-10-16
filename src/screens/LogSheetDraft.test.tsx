/**
 * A reload in the middle of a log (iPhone Safari pull to refresh, or iOS reclaiming the page while
 * he reads a label in another app) must not lose the meal: the LOG sheet comes back with what was
 * typed once the opening is done. A logged or closed sheet never comes back, so nothing logs twice.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useToast } from '../components/ui'
import { LOG_DRAFT_KEY, resetLogDraftBootForTests } from '../components/MealFormDraft'
import { LogSheet } from './LogSheet'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement | null = null
let root: Root | null = null

const $ = <E extends HTMLElement = HTMLElement>(id: string) => document.querySelector<E>(`[data-testid="${id}"]`)
const value = (id: string) => $<HTMLInputElement>(id)?.value

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

function submit() {
  act(() => {
    document.getElementById('log-form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(<LogSheet />)
  })
}

function unmount() {
  if (root) act(() => root!.unmount())
  container?.remove()
  root = null
  container = null
  document.body.innerHTML = ''
}

/** The page goes away with the sheet still open: no close, no effects, only what is in storage survives. */
function reload({ introDone = true }: { introDone?: boolean } = {}) {
  unmount()
  resetLogDraftBootForTests()
  useUI.setState({ logOpen: false, logPrefill: null, introDone })
  mount()
}

/** Let the sheet's close timer run and unmount it. */
async function settle(ms = 400) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

beforeEach(() => {
  localStorage.clear()
  resetLogDraftBootForTests()
  useStore.getState().resetAll()
  useToast.getState().dismiss()
  useUI.setState({ logOpen: false, logPrefill: null, introDone: true })
})

afterEach(() => {
  unmount()
  useUI.setState({ logOpen: false, logPrefill: null, introDone: false })
  useToast.getState().dismiss()
  localStorage.clear()
})

describe('a reload in the middle of a log', () => {
  it('brings the LOG sheet back with the half-typed meal, and LOG then logs it', () => {
    mount()
    act(() => useUI.getState().openLog())
    type('tp-log-name', 'Chicken wrap')
    type('tp-log-kcal', '612')
    type('tp-log-protein', '38')

    reload()

    expect(useUI.getState().logOpen).toBe(true)
    expect(value('tp-log-name')).toBe('Chicken wrap')
    expect(value('tp-log-kcal')).toBe('612')
    expect(value('tp-log-protein')).toBe('38')

    submit()
    const list = useStore.getState().entries
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Chicken wrap')
    expect(list[0].macros.kcal).toBe(612)
  })

  it('waits for the opening before the sheet rises again', () => {
    mount()
    act(() => useUI.getState().openLog())
    type('tp-log-kcal', '450')

    reload({ introDone: false })
    expect(useUI.getState().logOpen).toBe(false)

    act(() => useUI.getState().setIntroDone(true))
    expect(useUI.getState().logOpen).toBe(true)
    expect(value('tp-log-kcal')).toBe('450')
  })

  it('the keystone during the opening shows the kept meal straight away', () => {
    mount()
    act(() => useUI.getState().openLog())
    type('tp-log-kcal', '450')

    reload({ introDone: false })
    act(() => useUI.getState().openLog())
    expect(value('tp-log-kcal')).toBe('450')
  })

  it('a logged meal is forgotten at once, so a reload right after LOG never logs it twice', () => {
    mount()
    act(() => useUI.getState().openLog())
    type('tp-log-kcal', '300')
    submit()
    expect(useStore.getState().entries).toHaveLength(1)
    // the reload lands before the sheet has even finished closing
    expect(localStorage.getItem(LOG_DRAFT_KEY)).toBeNull()

    reload()
    expect(useUI.getState().logOpen).toBe(false)
    expect(useStore.getState().entries).toHaveLength(1)
  })

  it('closing the sheet on purpose forgets the draft', async () => {
    mount()
    act(() => useUI.getState().openLog())
    type('tp-log-kcal', '300')
    act(() => useUI.getState().closeLog())
    await settle()
    expect(localStorage.getItem(LOG_DRAFT_KEY)).toBeNull()

    reload()
    expect(useUI.getState().logOpen).toBe(false)
  })

  it('an empty sheet left open does not come back', () => {
    mount()
    act(() => useUI.getState().openLog())
    reload()
    expect(useUI.getState().logOpen).toBe(false)
  })

  it('a portion still being typed (not yet committed on blur) comes back after a reload', () => {
    mount()
    act(() => useUI.getState().openLog())
    type('tp-log-kcal', '250')
    type('tp-log-portion-input', '2.5')
    reload()
    expect($('tp-log-portion')?.dataset.value).toBe('2.5')
    submit()
    const e = useStore.getState().entries[0]
    expect(e.servings).toBe(2.5)
    expect(e.macros.kcal).toBe(625)
  })

  it('the tap that ends the opening never closes the sheet it reopens (its click lands on the scrim)', () => {
    mount()
    act(() => useUI.getState().openLog())
    type('tp-log-kcal', '612')
    reload({ introDone: false })
    // the finger goes down somewhere else: the opening skips and the kept sheet rises under it
    act(() => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      useUI.getState().setIntroDone(true)
    })
    const scrim = $('tp-log-sheet')?.previousElementSibling as HTMLElement | null
    expect(scrim).not.toBeNull()
    act(() => {
      scrim!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    expect(useUI.getState().logOpen).toBe(true)
    expect(localStorage.getItem(LOG_DRAFT_KEY)).not.toBeNull()
    expect(value('tp-log-kcal')).toBe('612')
    // a real tap on the scrim still closes it
    act(() => {
      scrim!.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      scrim!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    expect(useUI.getState().logOpen).toBe(false)
  })

  it('a meal kept across one reload survives a second reload too', () => {
    mount()
    act(() => useUI.getState().openLog())
    type('tp-log-name', 'Rice')
    type('tp-log-kcal', '220')
    reload()
    reload()
    expect(useUI.getState().logOpen).toBe(true)
    expect(value('tp-log-name')).toBe('Rice')
    expect(value('tp-log-kcal')).toBe('220')
  })
})
