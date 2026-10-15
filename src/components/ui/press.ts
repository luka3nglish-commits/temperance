import type { PointerEvent as ReactPointerEvent } from 'react'
import { isReducedMotion } from '../../lib/motion'

/**
 * The pointer light on gold (polish-spec 4.1 pressed state): a radial of rgba(255,247,218,0.55)
 * centred on the press point that fades 0.9 to 0 over 450 ms. The element needs the `press-light`
 * class and a `<span className="press-light-spot" aria-hidden />` child. Skipped under reduced motion.
 *
 *   <button className="press-light ..." onPointerDown={lightAtPointer}>
 *     <span className="press-light-spot" aria-hidden="true" />
 *     ...
 *   </button>
 */
export function lightAt(el: HTMLElement, clientX: number, clientY: number): void {
  if (isReducedMotion()) return
  const r = el.getBoundingClientRect()
  const px = r.width ? ((clientX - r.left) / r.width) * 100 : 50
  const py = r.height ? ((clientY - r.top) / r.height) * 100 : 50
  el.style.setProperty('--px', `${px.toFixed(1)}%`)
  el.style.setProperty('--py', `${py.toFixed(1)}%`)
  el.classList.remove('is-lit')
  // restart the animation on every press
  void el.offsetWidth
  el.classList.add('is-lit')
}

/** onPointerDown handler that lights the pressed element at the pointer. */
export function lightAtPointer(e: ReactPointerEvent<HTMLElement>): void {
  lightAt(e.currentTarget, e.clientX, e.clientY)
}
