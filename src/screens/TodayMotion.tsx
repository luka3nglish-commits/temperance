/**
 * Motion helpers for the TODAY screen: a cubic-bezier solver that matches the CSS easing tokens,
 * a rAF tween hook for arrays of numbers (the counting number, the ring angles), a media query hook
 * and a store subscription for log pulses. No JSX; kept under Today* so the ownership map holds.
 */
import { useEffect, useRef, useState } from 'react'
import { useStore, type Pulse } from '../store/useStore'

/** CSS `cubic-bezier(x1, y1, x2, y2)` as a function of progress 0..1. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const ax = 1 - 3 * x2 + 3 * x1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1
  const ay = 1 - 3 * y2 + 3 * y1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  const solveX = (x: number) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x
      if (Math.abs(dx) < 1e-5) return t
      const d = slopeX(t)
      if (Math.abs(d) < 1e-6) break
      t -= dx / d
    }
    let lo = 0
    let hi = 1
    t = x
    for (let i = 0; i < 24 && hi - lo > 1e-5; i++) {
      t = (lo + hi) / 2
      if (sampleX(t) < x) lo = t
      else hi = t
    }
    return t
  }
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveX(x)))
}

/** --ease-count: number ticks. */
export const easeCount = cubicBezier(0.2, 0.9, 0.2, 1)
/** --ease-stone: settles, draws, fades. */
export const easeStone = cubicBezier(0.16, 1, 0.3, 1)
/** The same curves as CSS strings for the Web Animations API. */
export const EASE_STONE_CSS = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * Tween an array of numbers to `target` over `ms` with `ease` in requestAnimationFrame.
 * The first value is taken as is (no mount animation). `snap` jumps straight to the target.
 */
export function useTweened(target: readonly number[], ms: number, ease: (t: number) => number, snap: boolean): number[] {
  const [values, setValues] = useState<number[]>(() => target.slice())
  const current = useRef<number[]>(values)
  const latest = useRef<readonly number[]>(target)
  latest.current = target
  const raf = useRef(0)
  const key = target.map((v) => Math.round(v * 1000) / 1000).join(',')

  useEffect(() => {
    cancelAnimationFrame(raf.current)
    const from = current.current.slice()
    const to = latest.current.slice()
    const same = from.length === to.length && from.every((v, i) => Math.abs(v - to[i]) < 1e-6)
    if (same) return
    if (snap || ms <= 0 || from.length !== to.length || typeof requestAnimationFrame !== 'function') {
      current.current = to
      setValues(to)
      return
    }
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const e = ease(p)
      const next = to.map((v, i) => from[i] + (v - from[i]) * e)
      current.current = next
      setValues(next)
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms, snap, ease])

  return values
}

/** One number counted old to new. */
export function useCounted(target: number, ms: number, ease: (t: number) => number, snap: boolean): number {
  const v = useTweened([target], ms, ease, snap)
  return v[0]
}

/** True while the media query matches; evaluated once at mount and on change. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia(query).matches : false))
  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return
    const m = window.matchMedia(query)
    const onChange = () => setMatches(m.matches)
    onChange()
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/**
 * Calls `cb` once per new `log` pulse. Subscribes to the store directly so a scene that clears the
 * pulse synchronously inside its own subscriber cannot hide it from us.
 */
export function useLogPulse(cb: (p: Pulse) => void): void {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        const p = s.pulse
        if (p && p.kind === 'log' && p.id !== prev.pulse?.id) ref.current(p)
      }),
    [],
  )
}
