import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import { useSheets } from './useSheets'
import { useReducedMotion } from '../../lib/motion'

export { useSheets } from './useSheets'

type Props = {
  open: boolean
  onClose(): void
  /** fires after the close transition finished (or after the 160 ms fade under reduced motion) */
  onClosed?(): void
  title?: ReactNode
  /** right side of the header (a Segmented switch, an action) */
  headerRight?: ReactNode
  children: ReactNode
  /** sticky footer inside the sheet; stays above the keyboard; rows dissolve under it */
  footer?: ReactNode
  /** 'tall' = min(92svh, --vv-h minus the toast lane); 'auto' = content height up to the same cap */
  height?: 'tall' | 'auto'
  /** label for the close button */
  closeLabel?: string
  className?: string
  /** id for the scrolling content column (so a form can scroll it to the top) */
  contentId?: string
  /** data-testid for the dialog panel */
  testId?: string
  /** the 72 px meander under the title (default on when there is a title) */
  ornament?: boolean
}

/** The visual viewport is shorter than this when a keyboard is up. */
const KEYBOARD_UP_PX = 620
const SHEET_OUT_MS = 200
const REDUCED_FADE_MS = 160
/** release closes when the drag is over 30 percent of the sheet or faster than 0.5 px/ms (over the last 80 ms) */
const DISMISS_FRACTION = 0.3
const DISMISS_VELOCITY = 0.5
const VELOCITY_WINDOW_MS = 80
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
 * Bottom sheet, polish-spec 4.12 and 7.2 item 3.
 * - Panel: a lit top (#15151B fading to #0B0B0F over 160 px), a light lip, a gold top edge
 *   (rgba(216,180,90,0.55)) and a deep shadow; 16 px top corners; 20 px side gutters.
 * - Grab bar 40 x 3 in the gold text gradient. Header row 56 px: the title (Cinzel 700 16 px 0.2em
 *   bone) with a 72 px meander 8 px under it, actions on the right, the close X (22 px) in a 44 px target.
 * - Rises 420 ms on --ease-spring with an underfill below the panel so the overshoot never shows a
 *   gap; closes 200 ms ease-in; reduced motion fades 160 ms. Scrim rgba(5,5,7,0.74), no blur.
 * - Drag the grab bar or header down: release closes past 30 percent of the height or faster than
 *   0.5 px/ms over the last 80 ms, otherwise it springs back.
 * - Footer: no rule; rows dissolve under a 20 px fade into the sheet colour.
 * - Height binds to the visual viewport so the footer is always above the keyboard; under 620 px it
 *   pins to the visual viewport. Escape, the scrim and the close button close it.
 * - Registers in `useSheets` while open (the Toaster docks at the top). Content may use `.tp-stagger`:
 *   `--stagger-delay` is 120 ms inside a sheet so lists start after the rise.
 */
export function Sheet({
  open,
  onClose,
  onClosed,
  title,
  headerRight,
  children,
  footer,
  height = 'tall',
  closeLabel = 'Close',
  className = '',
  contentId,
  testId,
  ornament = true,
}: Props) {
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

  // the open count the Toaster reads (App makes the frame behind a sheet inert on it). The opener is
  // taken first: once the frame goes inert, a focused control inside it loses focus.
  useEffect(() => {
    if (!open) return
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    useSheets.getState().add()
    return () => useSheets.getState().remove()
  }, [open])

  // open: mount, then slide (or fade) in on the next frame. close: slide (or fade) out, then unmount.
  useEffect(() => {
    if (open) {
      setMounted(true)
      let inner = 0
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
      }
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

  // focus moves into the dialog and returns to the opener on close (the opener is taken when it opens,
  // above; this cleanup runs after the sheet has left useSheets, so the frame is no longer inert)
  useEffect(() => {
    if (!mounted || !open) return
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

  // ---------- drag the grab bar or header down to dismiss ----------
  type Drag = { id: number; y0: number; dy: number; live: boolean; samples: Array<{ t: number; dy: number }> }
  const drag = useRef<Drag | null>(null)

  const onHandleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedRef.current || !shown) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // a tap on a header control is a tap, not a drag
    if ((e.target as Element).closest('button, a, input, [role=radio], [role=switch]')) return
    drag.current = { id: e.pointerId, y0: e.clientY, dy: 0, live: false, samples: [{ t: performance.now(), dy: 0 }] }
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
    d.dy = dy
    d.samples.push({ t: now, dy })
    while (d.samples.length > 2 && now - d.samples[0].t > VELOCITY_WINDOW_MS) d.samples.shift()
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
    const first = d.samples[0]
    const last = d.samples[d.samples.length - 1]
    const v = last && first && last.t > first.t ? (last.dy - first.dy) / (last.t - first.t) : 0
    const h = Math.max(1, panel.offsetHeight)
    // a system gesture interrupting the drag snaps back; only a finished drag or flick dismisses
    const dismiss = e.type !== 'pointercancel' && (d.dy >= h * DISMISS_FRACTION || v >= DISMISS_VELOCITY)
    panel.style.transitionDuration = dismiss ? 'var(--t-sheet-out)' : 'var(--t-sheet-in)'
    panel.style.transitionTimingFunction = dismiss ? 'cubic-bezier(0.4, 0, 1, 1)' : 'var(--ease-spring)'
    if (scrimRef.current) {
      scrimRef.current.style.transitionDuration = 'var(--t-sheet-out)'
      scrimRef.current.style.opacity = ''
    }
    if (dismiss) {
      onClose()
    } else {
      panel.style.transform = 'translateY(0)'
    }
  }

  if (!mounted) return null

  const pinned = kbUp && open
  // clear the top-docked toast lane: its 12 px offset, the 56 px toast and a 12 px gap
  const cap = 'min(92svh, calc(var(--vv-h) - var(--safe-top) - 80px))'
  const transform = reduced ? 'none' : shown ? 'translateY(0)' : 'translateY(100%)'
  const showOrnament = ornament && !!title

  // portal to <body>: <main> is a z 10 stacking context, so a sheet rendered inside it would paint
  // under the tab bar (z 30) and the shards (z 40) and let the bar be tapped through
  return createPortal(
    <div className="fixed inset-0 z-[var(--z-sheet)]" role="presentation">
      <div
        ref={scrimRef}
        className={`absolute inset-0 transition-opacity ${shown ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'var(--scrim)', transitionDuration: shown ? '320ms' : 'var(--t-sheet-out)', transitionTimingFunction: 'linear' }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        data-testid={testId}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`sheet-panel absolute inset-x-0 mx-auto flex w-full max-w-[430px] flex-col outline-none transition-transform will-change-transform ${
          pinned ? 'is-pinned rounded-none' : 'bottom-0 rounded-t-[16px]'
        } ${className}`}
        style={{
          top: pinned ? 'var(--vv-top, 0px)' : undefined,
          maxHeight: pinned ? 'var(--vv-h)' : cap,
          height: pinned ? 'var(--vv-h)' : height === 'tall' ? cap : undefined,
          transform,
          transitionDuration: shown ? 'var(--t-sheet-in)' : 'var(--t-sheet-out)',
          transitionTimingFunction: shown ? 'var(--ease-spring)' : 'cubic-bezier(0.4, 0, 1, 1)',
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
            <div aria-hidden="true" className="sheet-grab" />
          </div>
          {(title || headerRight) && (
            <div className="flex h-14 items-center justify-between gap-3 pl-5 pr-3">
              <div className="flex min-w-0 flex-col items-start gap-2">
                {title ? (
                  <h2 id={titleId} className="title-sheet inscribed min-w-0 truncate">
                    {title}
                  </h2>
                ) : null}
                {showOrnament ? <span aria-hidden="true" className="meander" style={{ width: 72 }} /> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {headerRight}
                <IconButton label={closeLabel} onClick={onClose}>
                  <X size={22} strokeWidth={1.5} />
                </IconButton>
              </div>
            </div>
          )}
        </div>
        <div
          id={contentId}
          className="sheet-content min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 scrollbar-none"
          style={{ '--stagger-delay': '120ms' } as CSSProperties}
          onScroll={(e) => {
            const el = e.currentTarget
            const v = el.scrollTop > 0 ? '1' : ''
            if ((el.dataset.scrolled ?? '') !== v) el.dataset.scrolled = v
          }}
        >
          {children}
        </div>
        {footer ? <div className="sheet-footer shrink-0 px-5 pb-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
