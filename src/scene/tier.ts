/**
 * GPU tier. PLACEHOLDER owned by the scene agent (src/scene/**): replace with the real probe
 * from docs/design-spec.md section 15 (webgl2 check, software renderer check, frame-time median,
 * hardwareConcurrency / deviceMemory, cached in localStorage key `temperance.tier` for 30 days).
 * Keep these exports; other modules read them.
 */
import { useSyncExternalStore } from 'react'

export type Tier = 'none' | 'low' | 'high'

let tier: Tier = 'high'
const listeners = new Set<() => void>()

export function getTier(): Tier {
  return tier
}

export function setTier(t: Tier): void {
  if (t === tier) return
  tier = t
  document.documentElement.classList.toggle('no-grain', t !== 'high')
  listeners.forEach((l) => l())
}

export function useTier(): Tier {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getTier,
    getTier,
  )
}
