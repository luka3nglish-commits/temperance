import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'

type Props = {
  open: boolean
  onClose(): void
  /** fires after the close transition finished (or at once under reduced motion) */
  onClosed?(): void
  title?: ReactNode
  /** right side of the header (a Segmented switch, an action) */
  headerRight?: ReactNode
  children: ReactNode
  /** sticky footer inside the sheet; stays above the keyboard */
  footer?: ReactNode
  /** 'tall' = min(92svh, --vv-h); 'auto' = content height up to the same cap */
  height?: 'tall' | 'auto'
  /** label for the close button */
  closeLabel?: string
  className?: string
  /** id for the scrolling content column (so a form can scroll it to the top) */
  contentId?: string
}

/** The visual viewport is shorter than this when a keyboard is up (spec section 10). */
const KEYBOARD_UP_PX = 620

let vvInstalled = false
let keyboardUp = false
const kbListeners = new Set<() => void>()

/**
 * Write --vv-h and --vv-top on :root from visualViewport so sheets can sit above the keyboard,
 * and toggle `keyboard-up` on <html> when the visual viewport is under 620 px. Installed once.
 */
function installVisualViewport() {
  if (vvInstalled || typeof window === 'undefined') return
  vvInstalled = true
  const vv = window.visualViewport
  const write = () => {
    const h = vv ? vv.height : window.innerHeight
    const top = vv ? vv.offsetTop : 0
    const root = document.documentElement
    root.style.setProperty('--vv-h', `${Math.round(h)}px`)
    root.style.setProperty('--vv-top', `${Math.round(top)}px`)
    const up = h < KEYBOARD_UP_PX
    root.classList.toggle('keyboard-up', up)
    if (up !== keyboardUp) {
      keyboardUp = up
      kbListeners.forEach((l) => l())
    }
  }
  write()
  vv?.addEventListener('resize', write)
  vv?.addEventListener('scroll', write)
  window.addEventListener('resize', write)
}

const subscribeKb = (l: () => void) => {
  installVisualViewport()
  kbListeners.add(l)
  return () => {
    kbListeners.delete(l)
  }
}
const getKb = () => keyboardUp
const getKbServer = () => false

/** True while the visual viewport is under 620 px (a keyboard is up). Chips collapse, the sheet pins to the viewport. */
export function useKeyboardUp(): boolean {
  return useSyncExternalStore(subscribeKb, getKb, getKbServer)
}

/**
 * Bottom sheet: obsidian-900, 1 px strong gold top edge, 16 px top corners, 36 x 3 px grab bar.
 * Rises 320 ms (--ease-sheet), dismisses 200 ms. Height binds to the visual viewport so the
 * footer (LOG) is always above the keyboard; under 620 px it pins to the visual viewport itself.
 * Escape and scrim tap close it. Side gutters are 20 px because the shard strips run the full height.
 */
export function Sheet({ open, onClose, onClosed, title, headerRight, children, footer, height = 'tall', closeLabel = 'Close', className = '', contentId }: Props) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closedCb = useRef(onClosed)
  closedCb.current = onClosed
  const kbUp = useKeyboardUp()

  useEffect(() => {
    installVisualViewport()
  }, [])

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    if (!mounted) return
    const reduced = document.documentElement.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ms = reduced ? 0 : 200
    const t = window.setTimeout(() => {
      setMounted(false)
      closedCb.current?.()
    }, ms)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!mounted) return null

  const pinned = kbUp && open
  const cap = 'min(92svh, var(--vv-h))'

  return (
    <div className="fixed inset-0 z-[var(--z-sheet)]" role="presentation">
      <div
        className={`absolute inset-0 bg-[rgba(5,5,7,0.6)] transition-opacity ${shown ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: shown ? 'var(--t-sheet-in)' : 'var(--t-sheet-out)' }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 flex flex-col bg-obsidian-900 shadow-[0_-1px_0_var(--gold-line-strong)] transition-transform will-change-transform ${
          pinned ? 'rounded-none' : 'bottom-0 rounded-t-[16px]'
        } ${className}`}
        style={{
          top: pinned ? 'var(--vv-top, 0px)' : undefined,
          maxHeight: pinned ? 'var(--vv-h)' : cap,
          height: pinned ? 'var(--vv-h)' : height === 'tall' ? cap : undefined,
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transitionDuration: shown ? 'var(--t-sheet-in)' : 'var(--t-sheet-out)',
          transitionTimingFunction: 'var(--ease-sheet)',
          paddingBottom: pinned ? 0 : 'var(--safe-bottom)',
        }}
      >
        <div className="flex shrink-0 justify-center pt-2.5 pb-1">
          <div aria-hidden="true" className="h-[3px] w-9 rounded-[2px] bg-gold-400" />
        </div>
        {(title || headerRight) && (
          <div className="flex h-14 shrink-0 items-center justify-between pl-5 pr-3">
            <h2 className="font-display inscribed text-[14px] tracking-[0.35em] text-bone">{title}</h2>
            <div className="flex items-center gap-2">
              {headerRight}
              <IconButton label={closeLabel} onClick={onClose}>
                <X size={20} strokeWidth={1.5} />
              </IconButton>
            </div>
          </div>
        )}
        <div id={contentId} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 scrollbar-none">
          {children}
        </div>
        {footer ? <div className="shrink-0 border-t border-[var(--gold-line)] bg-obsidian-900 px-5 pt-3 pb-3">{footer}</div> : null}
      </div>
    </div>
  )
}
