import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

const mq = () => (typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia('(prefers-reduced-motion: reduce)') : null)

/** Non-hook: should motion be reduced right now (system preference combined with Settings MOTION). */
export function isReducedMotion(): boolean {
  const pref = useStore.getState().settings.motion
  if (pref === 'on') return true
  if (pref === 'off') return false
  return mq()?.matches ?? false
}

/** Hook: re-renders when the system preference or the setting changes. */
export function useReducedMotion(): boolean {
  const pref = useStore((s) => s.settings.motion)
  const [system, setSystem] = useState(() => mq()?.matches ?? false)
  useEffect(() => {
    const m = mq()
    if (!m) return
    const onChange = () => setSystem(m.matches)
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [])
  if (pref === 'on') return true
  if (pref === 'off') return false
  return system
}

/**
 * Keeps the `reduce-motion` / `force-motion` classes on <html> in sync with Settings MOTION,
 * so the CSS in index.css applies the right rule. Mount once at the app root.
 */
export function useMotionClass(): void {
  const pref = useStore((s) => s.settings.motion)
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('reduce-motion', pref === 'on')
    root.classList.toggle('force-motion', pref === 'off')
  }, [pref])
}

/** Haptic tap where supported (Android). Never required for an interaction to feel complete. */
export function vibrate(ms: number): void {
  try {
    if (!isReducedMotion() && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms)
  } catch {
    /* ignore */
  }
}
