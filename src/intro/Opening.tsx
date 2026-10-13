/**
 * PLACEHOLDER owned by the intro agent (src/intro/**). See docs/design-spec.md section 5.
 * The real Opening renders the z-70 overlay, runs the GSAP master timeline (1900 ms full, 700 ms
 * short, 240 ms reduced), drives the monument through getMonumentHandle(), animates DOM targets
 * by [data-intro] selectors, skips on pointerdown/keydown, and calls setIntroDone(true).
 */
import { useEffect } from 'react'
import { useUI } from '../store/useUI'

export function Opening() {
  const setIntroDone = useUI((s) => s.setIntroDone)
  useEffect(() => {
    setIntroDone(true)
  }, [setIntroDone])
  return null
}
