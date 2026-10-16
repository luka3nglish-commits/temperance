import { create } from 'zustand'

/**
 * How many sheets are open right now (polish-spec 4.12). Every `Sheet` registers itself while open;
 * the Toaster reads `open` to dock at the top so a toast never covers a sheet's action row.
 *
 *   const sheetOpen = useSheets((s) => s.open > 0)
 */
type SheetsState = {
  open: number
  add(): void
  remove(): void
}

export const useSheets = create<SheetsState>()((set) => ({
  open: 0,
  add: () => set((s) => ({ open: s.open + 1 })),
  remove: () => set((s) => ({ open: Math.max(0, s.open - 1) })),
}))
