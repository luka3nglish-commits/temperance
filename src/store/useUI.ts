import { create } from 'zustand'
import type { Macros } from '../lib/types'

export type Tab = 'today' | 'library' | 'history' | 'settings'

/** Values the LOG sheet can be opened with (long press a recent, "edit first", library "log with portion"). */
export type LogPrefill = {
  name?: string
  macros?: Macros
  servings?: number
  mealId?: string
  mode?: 'quick' | 'build'
}

/** Transient UI state shared across screens. Never persisted. */
export interface UIState {
  tab: Tab
  setTab(tab: Tab): void

  /** the LOG bottom sheet */
  logOpen: boolean
  logPrefill: LogPrefill | null
  openLog(prefill?: LogPrefill): void
  closeLog(): void

  /** the TODAY sheet (today's entries) */
  todayOpen: boolean
  openToday(): void
  closeToday(): void

  /** true once the opening sequence has finished or been skipped this launch */
  introDone: boolean
  setIntroDone(done: boolean): void

  /** the LIBRARY screen can be asked to open a specific meal or ingredient */
  libraryFocus: { kind: 'meal' | 'ingredient'; id: string } | null
  setLibraryFocus(f: UIState['libraryFocus']): void
}

export const useUI = create<UIState>()((set) => ({
  tab: 'today',
  setTab: (tab) => set({ tab }),

  logOpen: false,
  logPrefill: null,
  openLog: (prefill) => set({ logOpen: true, logPrefill: prefill ?? null }),
  closeLog: () => set({ logOpen: false }),

  todayOpen: false,
  openToday: () => set({ todayOpen: true }),
  closeToday: () => set({ todayOpen: false }),

  introDone: false,
  setIntroDone: (done) => set({ introDone: done }),

  libraryFocus: null,
  setLibraryFocus: (f) => set({ libraryFocus: f }),
}))
