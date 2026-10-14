/**
 * GPU tier (docs/design-spec.md section 15).
 *
 * none: no webgl2, software renderer, or two context losses in 30 s. SVG monument.
 * low:  frame-time median over 20 ms during the opening, hardwareConcurrency <= 4,
 *       deviceMemory <= 4, or dpr * canvas area over 1.2 Mpx.
 * high: everything else.
 *
 * The low / high result is cached in localStorage `temperance.tier` as { tier, at } for 30 days.
 * `none` is never cached: the webgl probe runs every boot anyway and a browser update may fix it.
 *
 * Settings that only apply at canvas creation (antialias, material class, env resolution) are
 * read from the tier at mount. A mid-session downgrade from the frame probe applies the cheap
 * settings now (dprMax, dust count, ticker rate, uDepth, no-grain class) and the rest on the
 * next launch through the cache.
 */
import { useSyncExternalStore } from 'react'
import { probeWebGL } from './webgl'

export type Tier = 'none' | 'low' | 'high'

export const TIER_KEY = 'temperance.tier'
const TIER_TTL = 30 * 24 * 60 * 60 * 1000

export type TierSettings = {
  dprMax: number
  dust: number
  /** MeshPhysicalMaterial with clearcoat (high) or MeshStandardMaterial (low) */
  physical: boolean
  envRes: number
  uDepth: 0 | 1
  uFlute: number
  antialias: boolean
  tickerFps: number
  tiltHz: number
}

// physical (clearcoat) is off on both tiers: its program compiles about twice as slowly and the
// polish now comes from the painted reflection, which looks the same on either material
const HIGH: TierSettings = { dprMax: 1.5, dust: 220, physical: false, envRes: 64, uDepth: 1, uFlute: 0.012, antialias: true, tickerFps: 24, tiltHz: 30 }
const LOW: TierSettings = { dprMax: 1.0, dust: 90, physical: false, envRes: 32, uDepth: 0, uFlute: 0.012, antialias: false, tickerFps: 12, tiltHz: 15 }

export function tierSettings(t: Tier): TierSettings {
  return t === 'high' ? HIGH : LOW
}

let tier: Tier = 'high'
let probed = false
/** true while the 30-frame median is still wanted */
let frameProbePending = false
const listeners = new Set<() => void>()

export function getTier(): Tier {
  return tier
}

/** Mirror the tier on <html>: the `no-grain` class (CSS reads it) and `data-tier` (tests read it). */
function applyTierToDocument(t: Tier): void {
  if (typeof document === 'undefined') return
  try {
    document.documentElement.classList.toggle('no-grain', t !== 'high')
    document.documentElement.dataset.tier = t
  } catch {
    /* no DOM */
  }
}

export function setTier(t: Tier): void {
  applyTierToDocument(t)
  if (t === tier) return
  tier = t
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

function readCache(now: number): Tier | null {
  try {
    const raw = localStorage.getItem(TIER_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { tier?: unknown; at?: unknown }
    if ((v.tier === 'low' || v.tier === 'high') && typeof v.at === 'number' && now - v.at < TIER_TTL) return v.tier
  } catch {
    /* no storage */
  }
  return null
}

function writeCache(t: Tier, now: number): void {
  if (t === 'none') return
  try {
    localStorage.setItem(TIER_KEY, JSON.stringify({ tier: t, at: now }))
  } catch {
    /* quota or private mode: the probe simply runs again next launch */
  }
}

/** The synchronous half of the heuristics. */
function heuristicTier(): Tier {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : undefined
  const cores = nav?.hardwareConcurrency ?? 8
  const mem = nav?.deviceMemory ?? 8
  if (cores <= 4 || mem <= 4) return 'low'
  if (typeof window !== 'undefined') {
    const dpr = window.devicePixelRatio || 1
    const w = Math.min(window.innerWidth || 390, 430)
    const area = dpr * dpr * w * 513
    if (area > 1.2e6) return 'low'
  }
  return 'high'
}

/**
 * Decide the tier for this launch. Idempotent. Returns true when the 30-frame median is still
 * wanted (no cache, heuristics said high) so the scene measures it during the opening.
 */
export function probeTier(now: number = Date.now()): boolean {
  if (probed) return frameProbePending
  probed = true
  if (!probeWebGL().ok) {
    setTier('none')
    frameProbePending = false
    return false
  }
  const cached = readCache(now)
  if (cached) {
    setTier(cached)
    frameProbePending = false
    return false
  }
  const h = heuristicTier()
  setTier(h)
  if (h === 'low') {
    writeCache('low', now)
    frameProbePending = false
    return false
  }
  frameProbePending = true
  return true
}

export function isFrameProbePending(): boolean {
  return frameProbePending
}

/**
 * The scene reports the first 30 rendered frame times (ms) measured while frameloop is always.
 * Median over 20 ms lowers the tier. The result is cached either way.
 */
export function reportFrameTimes(ms: readonly number[], now: number = Date.now()): Tier {
  frameProbePending = false
  if (tier === 'none') return tier
  const sorted = ms.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b)
  if (sorted.length === 0) return tier
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const next: Tier = median > 20 ? 'low' : tier
  writeCache(next, now)
  setTier(next)
  return next
}

/** Test seam. */
export function resetTierForTests(): void {
  tier = 'high'
  probed = false
  frameProbePending = false
}
