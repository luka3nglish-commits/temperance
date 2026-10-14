import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import { useReducedMotion } from '../../lib/motion'

type Props = {
  open: boolean
  onClose(): void
  /** fires after the close transition finished (or after the 160 ms fade under reduced motion) */
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
  /** data-testid for the dialog panel */
  testId?: string
}

/** The visual viewport is shorter than this when a keyboard is up (spec section 10). */
const KEYBOARD_UP_PX = 620
const SHEET_OUT_MS = 200
const REDUCED_FADE_MS = 160
/** drag the grab bar this far (or flick faster than DISMISS_VELOCITY px/ms) to dismiss */
const DISMISS_PX = 96
const DISMISS_VELOCITY = 0.6
const DRAG_START_PX = 8

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

const canAnimate = (el: Element | null): el is HTMLElement => !!el && typeof (el as HTMLElement).animate === 'function'

/**
 * Bottom sheet: obsidian-900, 1 px strong gold top edge, 16 px top corners, 36 x 3 px grab bar.
 * Rises 320 ms (--ease-sheet), dismisses 200 ms; reduced motion fades 160 ms instead. Height binds
 * to the visual viewport so the footer (LOG) is always above the keyboard; under 620 px it pins to
 * the visual viewport itself. Escape, the scrim, the close button and a drag down on the grab bar
 * close it. On desktop it hugs the 430 px slab. Side gutters are 20 px because the shard strips run the full height.
 */
export function Sheet({ open, onClose, onClosed, title, headerRight, children, footer, height = 'tall', closeLabel = 'Close', className = '', contentId, testId }: Props) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const closedCb = useRef(onClosed)
  closedCb.current = onClosed
  const kbUp = useKeyboardUp()
  const reduced = useReducedMotion()
  const reducedRef = useRef(reduced)
  reducedRef.current = reduced
  const titleId = useId()
  const restoreFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    installVisualViewport()
  }, [])

  // open: mount, then slide (or fade) in on the next frame. close: slide (or fade) out, then unmount.
  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    if (!mounted) return
    const fade = reducedRef.current
    if (fade) {
      const timing = { duration: REDUCED_FADE_MS, easing: 'linear', fill: 'forwards' as const }
      if (canAnimate(panelRef.current)) panelRef.current.animate([{ opacity: 1 }, { opacity: 0 }], timing)
      if (canAnimate(scrimRef.current)) scrimRef.current.animate([{ opacity: 1 }, { opacity: 0 }], timing)
    }
    const t = window.setTimeout(() => {
      setMounted(false)
      closedCb.current?.()
    }, fade ? REDUCED_FADE_MS : SHEET_OUT_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // reduced motion: a 160 ms fade in (CSS transitions are zeroed globally, so this runs on the animation API, before paint)
  useLayoutEffect(() => {
    if (!mounted || !open || !reducedRef.current) return
    const timing = { duration: REDUCED_FADE_MS, easing: 'linear' }
    if (canAnimate(panelRef.current)) panelRef.current.animate([{ opacity: 0 }, { opacity: 1 }], timing)
    if (canAnimate(scrimRef.current)) scrimRef.current.animate([{ opacity: 0 }, { opacity: 1 }], timing)
  }, [mounted, open])

  // focus moves into the dialog and returns to the opener on close
  useEffect(() => {
    if (!mounted || !open) return
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    const id = window.setTimeout(() => {
      if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true })
    }, 0)
    return () => {
      window.clearTimeout(id)
      const el = restoreFocus.current
      restoreFocus.current = null
      if (el && el.isConnected && !(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) el.focus({ preventScroll: true })
    }
  }, [mounted, open])

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

  // ---------- drag the grab bar down to dismiss ----------
  const drag = useRef<{ id: number; y0: number; dy: number; t: number; vy: number; live: boolean } | null>(null)

  const onHandleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedRef.current || !shown) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    drag.current = { id: e.pointerId, y0: e.clientY, dy: 0, t: performance.now(), vy: 0, live: false }
  }

  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const panel = panelRef.current
    if (!d || d.id !== e.pointerId || !panel) return
    const dy = Math.max(0, e.clientY - d.y0)
    if (!d.live) {
      if (dy < DRAG_START_PX) return
      d.live = true
      e.currentTarget.setPointerCapture(e.pointerId)
      panel.style.transitionDuration = '0ms'
      if (scrimRef.current) scrimRef.current.style.transitionDuration = '0ms'
    }
    const now = performance.now()
    d.vy = (dy - d.dy) / Math.max(1, now - d.t)
    d.dy = dy
    d.t = now
    panel.style.transform = `translateY(${dy}px)`
    if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0, 1 - dy / Math.max(1, panel.offsetHeight)))
  }

  const onHandleUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const panel = panelRef.current
    if (!d.live || !panel) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    panel.style.transitionDuration = 'var(--t-sheet-out)'
    if (scrimRef.current) {
      scrimRef.current.style.transitionDuration = 'var(--t-sheet-out)'
      scrimRef.current.style.opacity = ''
    }
    // a system gesture interrupting the drag snaps back; only a finished drag or flick dismisses
    if (e.type !== 'pointercancel' && (d.dy >= DISMISS_PX || d.vy >= DISMISS_VELOCITY)) {
      onClose()
    } else {
      panel.style.transform = 'translateY(0)'
    }
  }

  if (!mounted) return null

  const pinned = kbUp && open
  const cap = 'min(92svh, var(--vv-h))'
  const transform = reduced ? 'none' : shown ? 'translateY(0)' : 'translateY(100%)'

  return (
    <div className="fixed inset-0 z-[var(--z-sheet)]" role="presentation">
      <div
        ref={scrimRef}
        className={`absolute inset-0 bg-[rgba(5,5,7,0.6)] transition-opacity ${shown ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: shown ? 'var(--t-sheet-in)' : 'var(--t-sheet-out)' }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        data-testid={testId}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`absolute inset-x-0 mx-auto flex w-full max-w-[430px] flex-col bg-obsidian-900 shadow-[0_-1px_0_var(--gold-line-strong)] outline-none transition-transform will-change-transform ${
          pinned ? 'rounded-none' : 'bottom-0 rounded-t-[16px]'
        } ${className}`}
        style={{
          top: pinned ? 'var(--vv-top, 0px)' : undefined,
          maxHeight: pinned ? 'var(--vv-h)' : cap,
          height: pinned ? 'var(--vv-h)' : height === 'tall' ? cap : undefined,
          transform,
          transitionDuration: shown ? 'var(--t-sheet-in)' : 'var(--t-sheet-out)',
          transitionTimingFunction: 'var(--ease-sheet)',
          paddingBottom: pinned ? 0 : 'var(--safe-bottom)',
        }}
      >
        <div
          className="shrink-0"
          style={{ touchAction: 'none' }}
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <div aria-hidden="true" className="h-[3px] w-9 rounded-[2px] bg-gold-400" />
          </div>
          {(title || headerRight) && (
            <div className="flex h-14 items-center justify-between pl-5 pr-3">
              <h2 id={titleId} className="font-display inscribed text-[14px] tracking-[0.35em] text-bone">
                {title}
              </h2>
              <div className="flex items-center gap-2">
                {headerRight}
                <IconButton label={closeLabel} onClick={onClose}>
                  <X size={20} strokeWidth={1.5} />
                </IconButton>
              </div>
            </div>
          )}
        </div>
        <div id={contentId} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 scrollbar-none">
          {children}
        </div>
        {footer ? <div className="shrink-0 border-t border-[var(--gold-line)] bg-obsidian-900 px-5 pt-3 pb-3">{footer}</div> : null}
      </div>
    </div>
  )
}
