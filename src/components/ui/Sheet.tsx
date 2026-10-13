import { useEffect, useRef, useState, type ReactNode } from 'react'
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
}

let vvInstalled = false
/** Write --vv-h on :root from visualViewport so sheets can sit above the keyboard. Installed once. */
function installVisualViewport() {
  if (vvInstalled || typeof window === 'undefined') return
  vvInstalled = true
  const vv = window.visualViewport
  const write = () => {
    const h = vv ? vv.height : window.innerHeight
    document.documentElement.style.setProperty('--vv-h', `${Math.round(h)}px`)
    document.documentElement.classList.toggle('keyboard-up', h < 620)
  }
  write()
  vv?.addEventListener('resize', write)
  vv?.addEventListener('scroll', write)
  window.addEventListener('resize', write)
}

/**
 * Bottom sheet: obsidian-900, 1 px strong gold top edge, 16 px top corners, 36 x 3 px grab bar.
 * Rises 320 ms (--ease-sheet), dismisses 200 ms. Height binds to the visual viewport so the
 * footer (LOG) is always above the keyboard. Escape and scrim tap close it.
 */
export function Sheet({ open, onClose, onClosed, title, headerRight, children, footer, height = 'tall', closeLabel = 'Close', className = '' }: Props) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closedCb = useRef(onClosed)
  closedCb.current = onClosed

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
        className={`absolute inset-x-0 bottom-0 flex flex-col rounded-t-[16px] bg-obsidian-900 shadow-[0_-1px_0_var(--gold-line-strong)] transition-transform will-change-transform keyboard-up:top-0 keyboard-up:rounded-none ${className}`}
        style={{
          maxHeight: 'min(92svh, var(--vv-h))',
          height: height === 'tall' ? 'min(92svh, var(--vv-h))' : undefined,
          transform: shown ? 'translateY(0)' : 'translateY(100%)',
          transitionDuration: shown ? 'var(--t-sheet-in)' : 'var(--t-sheet-out)',
          transitionTimingFunction: 'var(--ease-sheet)',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div aria-hidden="true" className="h-[3px] w-9 rounded-[2px] bg-gold-400" />
        </div>
        {(title || headerRight) && (
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <h2 className="font-display inscribed text-[14px] tracking-[0.35em] text-bone">{title}</h2>
            <div className="flex items-center gap-2">
              {headerRight}
              <IconButton label={closeLabel} onClick={onClose}>
                <X size={20} strokeWidth={1.5} />
              </IconButton>
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 scrollbar-none">{children}</div>
        {footer ? <div className="shrink-0 border-t border-[var(--gold-line)] bg-obsidian-900 px-4 pt-3 pb-3">{footer}</div> : null}
      </div>
    </div>
  )
}
