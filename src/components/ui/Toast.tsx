import { create } from 'zustand'
import { Undo2 } from 'lucide-react'

export type ToastAction = { label: string; onClick(): void; icon?: 'undo' }

export type ToastItem = {
  id: number
  text: string
  action?: ToastAction
  /** ms, default 4000 */
  duration: number
  tone?: 'default' | 'warn'
}

type ToastStore = {
  current: ToastItem | null
  show(input: { text: string; action?: ToastAction; duration?: number; tone?: ToastItem['tone'] }): void
  dismiss(): void
}

let seq = 0
let timer = 0

/** One toast at a time. `show` replaces the current one and restarts the timer. */
export const useToast = create<ToastStore>()((set) => ({
  current: null,
  show({ text, action, duration = 4000, tone = 'default' }) {
    window.clearTimeout(timer)
    const item: ToastItem = { id: ++seq, text, action, duration, tone }
    set({ current: item })
    timer = window.setTimeout(() => set((s) => (s.current?.id === item.id ? { current: null } : {})), duration)
  },
  dismiss() {
    window.clearTimeout(timer)
    set({ current: null })
  },
}))

/** Renders the toast slab above the tab bar. Mount once at the app root. */
export function Toaster() {
  const current = useToast((s) => s.current)
  const dismiss = useToast((s) => s.dismiss)
  return (
    <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-0 z-[var(--z-toast)] flex justify-center px-4" style={{ bottom: 'calc(var(--safe-bottom) + 72px)' }}>
      {current ? (
        <div
          key={current.id}
          data-testid="tp-toast"
          className={`pointer-events-auto flex max-w-[358px] items-center gap-4 rounded-[4px] border bg-obsidian-800 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] rise-in ${
            current.tone === 'warn' ? 'border-[rgba(255,90,31,0.45)]' : 'border-[var(--gold-line-strong)]'
          }`}
        >
          <p className="num font-body text-[15px] text-bone">{current.text}</p>
          {current.action ? (
            <button
              type="button"
              data-testid={current.action.icon === 'undo' ? 'tp-toast-undo' : 'tp-toast-action'}
              className="font-display inline-flex h-9 shrink-0 items-center gap-1.5 text-[10px] tracking-[0.3em] text-gold-300 cursor-pointer"
              onClick={() => {
                current.action?.onClick()
                dismiss()
              }}
            >
              {current.action.icon === 'undo' ? <Undo2 size={14} strokeWidth={1.5} /> : null}
              {current.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
