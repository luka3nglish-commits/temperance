import { useState } from 'react'
import { useReducedMotion } from '../../lib/motion'

/**
 * The list stagger runs once per container mount (polish-spec 7.2 item 5): every time a sheet opens,
 * but only on the FIRST visit to a tab this session (sessionStorage `temperance.staggered.<tab>`).
 * Returns the class to put on the list (`'tp-stagger'`) or `''`. Never under reduced motion.
 *
 *   const stagger = useStaggerOnce('library')
 *   <ul className={stagger}>...</ul>            (children animate in, 35 ms apart, capped at 8)
 *
 * Inside a Sheet, call `useStaggerOnce()` with no key: it staggers on every mount.
 */
export function useStaggerOnce(tab?: string): string {
  const reduced = useReducedMotion()
  const [first] = useState(() => {
    if (!tab) return true
    const key = `temperance.staggered.${tab}`
    try {
      if (sessionStorage.getItem(key)) return false
      sessionStorage.setItem(key, '1')
    } catch {
      /* storage blocked: stagger anyway */
    }
    return true
  })
  return first && !reduced ? 'tp-stagger' : ''
}
