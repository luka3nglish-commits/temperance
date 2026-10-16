import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { create } from 'zustand'
import { Undo2 } from 'lucide-react'
import { useSheets } from './useSheets'
import { useUI } from '../../store/useUI'

/**
 * Toasts, polish-spec 4.13 and 7.2 item 6. One slab at a time: `show` replaces the current toast
 * and restarts its timer. A raised tablet with a 1 px strong gold edge, min(358 px, 100% - 32 px)
 * wide, min 56 px tall; text Cormorant 600 17 px bone; the action Cinzel 700 12 px 0.12em gold-300
 * in a 44 px target behind a 1 px gold rule (UNDO carries the undo-2 icon).
 *
 * Placement: above the tab bar (bottom = safe bottom + 76 px); while any sheet is open (useSheets) or
 * the LOG or TODAY sheet is open, it docks at the top (safe top + 12 px) so it never covers a sheet's
 * action row. In: 320 ms on the spring from 12 px below (above when docked at the top); out 200 ms.
 *
 *   useToast.getState().show({ text: 'Logged · 612 kcal', action: { label: 'Undo', icon: 'undo', onClick: undo } })
 *   useToast.getState().show({ id: 'install', text: 'Keep it on the home screen.', action: { label: 'Install', onClick: install }, duration: 8000 })
 *   useToast.getState().dismiss('install')   // only if the install toast is the one showing
 *
 * `id` names a toast so it can be dismissed by name; `idle()` says whether the lane is free (no
 * toast showing and no sheet open), for prompts that must never interrupt.
 */

export type ToastAction = { label: string; onClick(): void; icon?: 'undo' }

export type ToastItem = {
  id: number
  /** the name given to `show({ id })`, if any */
  key?: string
  text: string
  action?: ToastAction
  /** ms, default 4000 */
  duration: number
  tone?: 'default' | 'warn'
}

type ShowInput = { id?: string; text: string; action?: ToastAction; duration?: number; tone?: ToastItem['tone'] }

type ToastStore = {
  current: ToastItem | null
  show(input: ShowInput): void
  /** dismiss the current toast, or only the toast with this id */
  dismiss(id?: string): void
  /** true when no toast is showing and no sheet is open */
  idle(): boolean
}

let seq = 0
let timer = 0

export const useToast = create<ToastStore>()((set, get) => ({
  current: null,
  show({ id, text, action, duration = 4000, tone = 'default' }) {
    window.clearTimeout(timer)
    const item: ToastItem = { id: ++seq, key: id, text, action, duration, tone }
    set({ current: item })
    timer = window.setTimeout(() => set((s) => (s.current?.id === item.id ? { current: null } : {})), duration)
  },
  dismiss(id) {
    const cur = get().current
    if (id !== undefined && cur?.key !== id) return
    window.clearTimeout(timer)
    set({ current: null })
  },
  idle() {
    const ui = useUI.getState()
    return !get().current && useSheets.getState().open === 0 && !ui.logOpen && !ui.todayOpen
  },
}))

const OUT_MS = 200

/** Renders the toast slab above the tab bar, or docked at the top while a sheet is open. Mount once at the app root. */
export function Toaster() {
  const current = useToast((s) => s.current)
  const dismiss = useToast((s) => s.dismiss)
  const sheetOpen = useSheets((s) => s.open > 0)
  const uiSheet = useUI((s) => s.logOpen || s.todayOpen)
  const top = sheetOpen || uiSheet

  // keep the last toast for its 200 ms exit
  const [leaving, setLeaving] = useState<ToastItem | null>(null)
  const last = useRef<ToastItem | null>(null)
  useEffect(() => {
    if (current) {
      last.current = current
      setLeaving(null)
      return
    }
    const gone = last.current
    if (!gone) return
    last.current = null
    setLeaving(gone)
    const t = window.setTimeout(() => setLeaving(null), OUT_MS)
    return () => window.clearTimeout(t)
  }, [current])

  const item = current ?? leaving
  const exiting = !current && !!leaving
  const lane: CSSProperties = top ? { top: 'calc(var(--safe-top) + 12px)' } : { bottom: 'calc(var(--safe-bottom) + 76px)' }
  const from = top ? '-12px' : '12px'

  return (
    <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-0 z-[var(--z-toast)] flex justify-center px-4" style={lane}>
      {item ? (
        <div
          key={item.id}
          data-testid={exiting ? undefined : 'tp-toast'}
          data-key={item.key}
          className={`tablet pointer-events-auto flex min-h-14 w-full max-w-[358px] items-stretch py-0 pr-1.5 pl-4 ${
            item.tone === 'warn' ? 'border-[var(--ember-edge)]' : 'border-[var(--gold-line-strong)]'
          }`}
          style={
            {
              '--toast-from': from,
              animation: exiting ? `tpToastOut ${OUT_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards` : 'tpToastIn var(--t-toast-in) var(--ease-spring) both',
              pointerEvents: exiting ? 'none' : undefined,
            } as CSSProperties
          }
        >
          <p className="num flex min-w-0 flex-1 items-center py-3 font-body text-[17px] font-semibold leading-[1.3] text-bone">{item.text}</p>
          {item.action ? (
            <>
              <span aria-hidden="true" className="my-3 ml-3 w-px shrink-0 bg-[var(--gold-line)]" />
              <button
                type="button"
                data-testid={item.action.icon === 'undo' ? 'tp-toast-undo' : 'tp-toast-action'}
                className="label press inline-flex h-11 min-w-[72px] shrink-0 cursor-pointer items-center justify-center gap-1.5 self-center rounded-[4px] px-2 text-gold-300 active:bg-[rgba(216,180,90,0.12)]"
                onClick={() => {
                  if (exiting) return
                  item.action?.onClick()
                  dismiss()
                }}
              >
                {item.action.icon === 'undo' ? <Undo2 size={16} strokeWidth={1.5} /> : null}
                {item.action.label}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
