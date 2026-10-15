import gsap from 'gsap'
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { featureOff } from '../lib/boot'
import { isReducedMotion } from '../lib/motion'
import { emitTilt, suspendTilt } from '../lib/tilt'
import type { Settings } from '../lib/types'
import { getMonumentHandle } from '../scene/handle'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { clearTargetStyles, hiddenVars, queryArcs, queryStage, queryTargets, TARGET_NAMES, type Targets } from './targets'
import { buildFade, buildFull, buildShort, type BuildInput } from './timeline'

/**
 * THE OPENING (docs/design-spec.md section 5). This hook decides the variant for this launch,
 * hides the home screen's targets before the first paint, runs the chosen timeline inside one
 * gsap.context and hands the screen back as pure CSS when it ends or is skipped.
 *
 * Variants: full (first launch or Settings OPENING = FULL DAILY), short (every later launch),
 * fade (OPENING = OFF, or reduced motion: one 240 ms crossfade) and none (returning within ten
 * minutes, per `sessionStorage` `temperance.seen`, or switched off by the boot guard's `data-intro="0"`).
 * The variant is decided once per launch.
 */

export const SEEN_KEY = 'temperance.seen'
export const SEEN_TTL_MS = 10 * 60 * 1000

export type OpeningVariant = 'full' | 'short' | 'fade' | 'none'
export type OpeningState = 'playing' | 'done'

/**
 * Pure decision. A first launch (or REPLAY OPENING, which zeroes `introCount`) always plays, even
 * inside the ten minute window, so a replay never silently does nothing. Reduced motion wins over
 * everything that moves.
 */
export function decideVariant(
  settings: Pick<Settings, 'introCount' | 'opening'>,
  reduced: boolean,
  seenAt: number | null,
  now: number,
): OpeningVariant {
  const first = settings.introCount === 0
  if (!first && seenAt !== null && now - seenAt < SEEN_TTL_MS && now >= seenAt) return 'none'
  if (reduced) return 'fade'
  if (first || settings.opening === 'full') return 'full'
  if (settings.opening === 'off') return 'fade'
  return 'short'
}

export function readSeen(storage: Pick<Storage, 'getItem'> | null = safeSession()): number | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(SEEN_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function writeSeen(now: number = Date.now(), storage: Pick<Storage, 'setItem'> | null = safeSession()): void {
  if (!storage) return
  try {
    storage.setItem(SEEN_KEY, String(now))
  } catch {
    /* private mode or quota: the opening simply plays again next time */
  }
}

function safeSession(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null
  }
}

/** true once an opening finished this launch; a StrictMode remount before that replays cleanly */
let playedThisLaunch = false
let seenRefreshInstalled = false

/** keep `temperance.seen` fresh while the app runs, so a relaunch from the background is quiet */
function installSeenRefresh(): void {
  if (seenRefreshInstalled || typeof window === 'undefined') return
  seenRefreshInstalled = true
  const touch = () => writeSeen()
  window.addEventListener('pagehide', touch)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') touch()
  })
}

function markDone(): void {
  try {
    performance.mark('tp:opening-done')
  } catch {
    /* no performance API */
  }
  if (typeof document !== 'undefined') document.documentElement.dataset.introDone = 'true'
}

export type OpeningControls = {
  variant: OpeningVariant
  state: OpeningState
  /** end the opening now: the final frame, the monument at rest, live idle */
  skip(): void
}

/** Test seam. */
export function resetOpeningForTests(): void {
  playedThisLaunch = false
}

export function useOpening(wordmarkRef: RefObject<HTMLDivElement | null>): OpeningControls {
  const setIntroDone = useUI((s) => s.setIntroDone)
  const [variant] = useState<OpeningVariant>(() => {
    if (playedThisLaunch) return 'none'
    // the boot guard's intro=0 (any safe level): no timeline at all, the final frame at once
    if (featureOff('intro')) return 'none'
    if (useUI.getState().tab !== 'today') return 'none'
    return decideVariant(useStore.getState().settings, isReducedMotion(), readSeen(), Date.now())
  })
  const [state, setState] = useState<OpeningState>(variant === 'none' ? 'done' : 'playing')
  const skipRef = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    if (variant === 'none') {
      // nothing to hide, nothing to play: the home screen is already the final frame
      playedThisLaunch = true
      const h = getMonumentHandle()
      h.setInstant()
      h.startIdle()
      installSeenRefresh()
      markDone()
      setIntroDone(true)
      return
    }

    const mode = variant === 'fade' ? 'fade' : 'cut'
    const ctx = gsap.context(() => {})
    let targets: Targets = {}
    let stage: HTMLElement | null = null
    let tl: gsap.core.Timeline | null = null
    let raf = 0
    let live = true
    let finished = false
    let resumeTilt: (() => void) | null = null

    const hide = (t: Targets, already: Targets) => {
      ctx.add(() => {
        for (const name of TARGET_NAMES) {
          const el = t[name]
          if (!el || already[name] === el) continue
          gsap.set(el, hiddenVars(name, mode))
        }
      })
    }

    // before the first paint: no flash of the final frame
    targets = queryTargets()
    hide(targets, {})

    const onTilt = (x: number) => emitTilt(x)
    const releaseTilt = () => {
      resumeTilt?.()
      resumeTilt = null
    }

    const teardown = () => {
      live = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      window.removeEventListener('pointerdown', onSkipEvent)
      window.removeEventListener('keydown', onSkipEvent)
      releaseTilt()
      ctx.revert()
      clearTargetStyles(targets, queryArcs(targets.ring))
      stage?.classList.remove('shake')
    }

    const finish = (skipped: boolean) => {
      if (finished) return
      finished = true
      teardown()
      const h = getMonumentHandle()
      if (skipped) h.setInstant()
      h.startIdle()
      if (variant === 'full') useStore.getState().markIntroPlayed()
      playedThisLaunch = true
      writeSeen()
      installSeenRefresh()
      markDone()
      setIntroDone(true)
      setState('done')
    }

    const skip = () => {
      if (finished) return
      // jump to the end without firing the cues (no rise, no dust, no shake on a skip)
      tl?.progress(1, true)
      finish(true)
    }
    skipRef.current = skip

    const onSkipEvent = () => skip()

    raf = requestAnimationFrame(() => {
      raf = 0
      if (!live) return
      // targets that mounted after the layout effect (none expected, but never a flash)
      const fresh = queryTargets()
      hide(fresh, targets)
      targets = { ...targets, ...fresh }
      stage = queryStage()

      const wordmark = wordmarkRef.current
      const input: BuildInput = {
        targets,
        overlay: {
          wordmark,
          letters: wordmark ? Array.from(wordmark.querySelectorAll<HTMLElement>('[data-letter]')) : [],
        },
        stage,
        ctx,
        fontsReady: typeof document !== 'undefined' && document.fonts ? document.fonts.ready : Promise.resolve(),
        isLive: () => live,
        onTilt,
        releaseTilt,
        onComplete: () => finish(false),
      }

      ctx.add(() => {
        tl = variant === 'full' ? buildFull(input) : variant === 'short' ? buildShort(input) : buildFade(input)
      })
      if (!tl) {
        finish(false)
        return
      }

      // the sweep variants own the glint until their shard sweep ends; the crossfade never touches it
      if (variant !== 'fade') resumeTilt = suspendTilt()
      window.addEventListener('pointerdown', onSkipEvent)
      window.addEventListener('keydown', onSkipEvent)
      try {
        performance.mark('tp:opening-start')
      } catch {
        /* no performance API */
      }
      void getMonumentHandle().ready()
      tl.play(0)
    })

    return () => {
      // unmount or a StrictMode re-run before the opening finished: leave the DOM as we found it
      if (!finished) teardown()
      skipRef.current = () => {}
    }
  }, [variant, wordmarkRef, setIntroDone])

  return { variant, state, skip: () => skipRef.current() }
}
