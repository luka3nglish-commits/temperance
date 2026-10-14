/**
 * MonumentLayer (docs/design-spec.md sections 5, 6, 7, 15). Mounted once at the app root, absolute
 * at the top safe area, 513 px tall, under the TODAY inscriptions and above the backdrop. Kept
 * alive across tabs: off TODAY it is `visibility: hidden` (never display none) with the ticker
 * stopped; back on TODAY it invalidates once and the ticker resumes.
 *
 * Owns: the tier probe and the WebGL / SVG decision (SafeCanvas), the one `Monument` choreography
 * that both renderers read (bus.ts), the store subscription that turns `pulse` into strikes, the
 * demand ticker, the three shader join windows (section 5) and the `MonumentHandle` registration.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStore, type Pulse } from '../store/useStore'
import { useUI } from '../store/useUI'
import { localDayKey } from '../lib/day'
import { useToday } from '../lib/useToday'
import { isReducedMotion, useReducedMotion } from '../lib/motion'
import { totalsForDay } from '../store/selectors'
import { BusContext, createBus } from './bus'
import { type MonumentHandle, type MonumentMode, setMonumentHandle } from './handle'
import { getTier, probeTier, setTier, tierSettings, useTier } from './tier'
import { createTicker, type Ticker } from './ticker'
import { crackFor, heightFor, GOAL_Y, PX_PER_UNIT, STAGE_H, STAGE_PLINTH_Y } from './tokens'
import { SafeCanvas } from './SafeCanvas'
import { ColumnScene } from './ColumnScene'
import { FallbackMonument } from './FallbackMonument'

/** shaders ready inside this many ms of mount: the 3D column takes the rise and the SVG cuts away */
const EARLY_JOIN_MS = 600
/** if nothing has placed the column by then (no opening ran), it is placed at once */
const PLACE_FALLBACK_MS = 2600
/** the slam waits for the LOG sheet to close, at most this long */
const SHEET_WAIT_MS = 220
const SETTLE_MS = 600

type Deferred = { promise: Promise<void>; resolve: () => void }
function deferred(): Deferred {
  let resolve: () => void = () => {}
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

export function MonumentLayer({ visible }: { visible: boolean }) {
  const [bus] = useState(createBus)
  const [mode, setMode] = useState<MonumentMode>(() => {
    probeTier()
    return getTier() === 'none' ? 'svg' : 'webgl'
  })
  // settings that only apply at canvas creation are fixed at mount (section 15)
  const [mountSettings] = useState(() => tierSettings(getTier() === 'none' ? 'low' : getTier()))
  const tier = useTier()
  const reduced = useReducedMotion()
  const introDone = useUI((s) => s.introDone)
  const today = useToday()

  const root = useRef<HTMLDivElement>(null)
  const readyRef = useRef(false)
  const readyDeferred = useRef<Deferred>(deferred())
  const mountedAt = useRef(typeof performance !== 'undefined' ? performance.now() : 0)
  const [ready, setReady] = useState(false)
  const [joined, setJoined] = useState(false)
  const [lateJoin, setLateJoin] = useState(false)

  // the demand ticker: created in an effect (it owns window listeners), never during render
  const tickerRef = useRef<Ticker | null>(null)
  const idleRef = useRef(false)
  const modeRef = useRef(mode)
  modeRef.current = mode
  const applyIdle = useCallback(() => {
    bus.idle = idleRef.current
    tickerRef.current?.setEnabled(idleRef.current && modeRef.current === 'webgl' && !isReducedMotion())
  }, [bus])

  useEffect(() => {
    const t = createTicker(() => bus.sceneInvalidate?.(), mountSettings.tickerFps)
    tickerRef.current = t
    t.observe(root.current)
    t.setVisible(bus.visible)
    applyIdle()
    return () => {
      t.dispose()
      if (tickerRef.current === t) tickerRef.current = null
    }
  }, [bus, mountSettings.tickerFps, applyIdle])

  useEffect(() => {
    bus.layerTop = () => root.current?.offsetTop ?? 0
    // test and console hook: the live choreography state
    const w = window as unknown as { __tp?: Record<string, unknown> }
    if (w.__tp) {
      w.__tp.mon = bus.monument.mon
      w.__tp.monument = bus.monument
    }
  }, [bus])

  // short phones: the stage gives (TodayScreen shrinks it to a 280 px floor), so the monument scales
  // with it. k = available stage height / 460, applied as a transform from the top centre; the
  // projected --goal-y / --plinth-y are multiplied by the same k (bus.layerScale).
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const measure = () => {
      const frame = root.current?.parentElement
      // no layout yet (or a test DOM): keep the natural size
      if (!frame || frame.clientHeight === 0) return
      const cs = getComputedStyle(document.documentElement)
      const safeTop = parseFloat(cs.getPropertyValue('--safe-top')) || 0
      const safeBottom = parseFloat(cs.getPropertyValue('--safe-bottom')) || 0
      // header 40, ring row 124, stoic 64, air 19, bar 56
      const available = frame.clientHeight - safeTop - safeBottom - 40 - 124 - 64 - 19 - 56
      const k = Math.max(0.55, Math.min(1, available / 460))
      const rounded = Math.round(k * 1000) / 1000
      bus.layerScale = rounded
      setScale((prev) => (prev === rounded ? prev : rounded))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [bus])

  // ---- store targets and strikes ----
  const targetsFor = useCallback(
    (eaten: number, goal: number) => {
      const h = heightFor(eaten, goal)
      bus.monument.setTargets(h, crackFor(eaten, goal))
      // test hook: the target height on the layer root (tp-column carries the rendered height)
      root.current?.setAttribute('data-h-target', h.toFixed(3))
    },
    [bus],
  )

  const strike = useCallback(
    (pulse: Pulse) => {
      const m = bus.monument
      if (!m.placed) return // the opening will raise it to the new target
      if (!bus.visible) {
        m.settleSilently()
        return
      }
      if (pulse.kind === 'log') m.strikeLog()
      else m.strikeRemove()
    },
    [bus],
  )

  useEffect(() => {
    const s0 = useStore.getState()
    targetsFor(totalsForDay(s0.entries, localDayKey()).kcal, s0.settings.goalKcal)
    let lastPulse = s0.pulse?.id ?? null
    let waiting: (() => void) | null = null
    const unsub = useStore.subscribe((s, prev) => {
      if (s.entries === prev.entries && s.settings === prev.settings && s.pulse === prev.pulse) return
      const goal = s.settings.goalKcal
      const pulse = s.pulse
      if (pulse && pulse.id !== lastPulse) {
        lastPulse = pulse.id
        targetsFor(pulse.totalKcal, goal)
        waiting?.()
        if (useUI.getState().logOpen) {
          // the slam waits for the sheet to close, or 220 ms, whichever comes first
          let done = false
          const go = () => {
            if (done) return
            done = true
            off()
            window.clearTimeout(t)
            waiting = null
            strike(pulse)
          }
          const off = useUI.subscribe((ui) => {
            if (!ui.logOpen) go()
          })
          const t = window.setTimeout(go, SHEET_WAIT_MS)
          waiting = go
        } else strike(pulse)
        return
      }
      // a non-pulse change: a new goal, an import, an edit of another day
      targetsFor(totalsForDay(s.entries, localDayKey()).kcal, goal)
      const m = bus.monument
      if (!m.placed) return
      if (bus.visible && !isReducedMotion()) m.settleSmooth(SETTLE_MS)
      else m.settleSilently()
    })
    return () => {
      unsub()
      waiting?.()
    }
  }, [bus, strike, targetsFor])

  // day rollover: the column is tomorrow's (empty) at midnight
  useEffect(() => {
    const s = useStore.getState()
    targetsFor(totalsForDay(s.entries, today).kcal, s.settings.goalKcal)
    const m = bus.monument
    if (!m.placed) return
    if (bus.visible && !isReducedMotion()) m.settleSmooth(SETTLE_MS)
    else m.settleSilently()
  }, [today, bus, targetsFor])

  // ---- visibility and the ticker ----
  useEffect(() => {
    bus.visible = visible
    tickerRef.current?.setVisible(visible)
    if (visible) {
      bus.sceneInvalidate?.()
      bus.svgRender?.()
    }
  }, [visible, bus])

  useEffect(() => {
    tickerRef.current?.setFps(tierSettings(tier === 'none' ? 'low' : tier).tickerFps)
  }, [tier])

  useEffect(() => {
    applyIdle()
    if (reduced) {
      bus.monument.mon.theta = 0.6
      bus.sceneInvalidate?.()
    }
  }, [reduced, applyIdle, bus])

  // ---- the join windows ----
  const joinNow = useCallback(
    (late: boolean) => {
      setLateJoin(late)
      setJoined(true)
      bus.sceneInvalidate?.()
    },
    [bus],
  )

  const onSceneReady = useCallback(() => {
    readyRef.current = true
    setReady(true)
    readyDeferred.current.resolve()
    const elapsed = performance.now() - mountedAt.current
    if (elapsed <= EARLY_JOIN_MS) joinNow(false)
    else if (useUI.getState().introDone) joinNow(true)
    // else: the SVG plays the rise; the canvas crossfades in at the first idle frame (introDone)
  }, [joinNow])

  useEffect(() => {
    if (mode === 'webgl' && readyRef.current && !joined && introDone) joinNow(true)
  }, [introDone, mode, joined, joinNow])

  // nothing placed the column (no opening ran, or it never reached the scene): place it now
  useEffect(() => {
    const place = () => {
      if (!bus.monument.placed) bus.monument.setInstant()
    }
    if (introDone) {
      place()
      return
    }
    const t = window.setTimeout(place, PLACE_FALLBACK_MS)
    return () => window.clearTimeout(t)
  }, [introDone, bus])

  // ---- mode changes ----
  const onFallback = useCallback(
    (reason: 'no-webgl' | 'error' | 'context-loss') => {
      if (reason !== 'no-webgl') setTier('none')
      readyRef.current = true
      setReady(true)
      readyDeferred.current.resolve()
      setJoined(false)
      setMode('svg')
      bus.sceneInvalidate = null
      bus.sceneHold = null
      bus.sceneStageVars = null
      bus.monument.setHooks({ onCameraRest: undefined })
      bus.svgRender?.()
    },
    [bus],
  )

  const onRemount = useCallback(() => {
    // first context loss: SafeCanvas remounts its canvas by key; the SVG covers while it compiles
    readyRef.current = false
    setReady(false)
    setJoined(false)
  }, [])

  useEffect(() => {
    if (mode === 'svg') {
      readyRef.current = true
      setReady(true)
      readyDeferred.current.resolve()
      bus.svgRender?.()
    }
    applyIdle()
  }, [mode, bus, applyIdle])

  // ---- --goal-y / --plinth-y ----
  const writeVars = useCallback(() => {
    if (bus.sceneStageVars) {
      bus.sceneStageVars()
      return
    }
    const top = bus.layerTop()
    const k = bus.layerScale
    bus.writeStageVars(top + (STAGE_PLINTH_Y - GOAL_Y * PX_PER_UNIT) * k, top + STAGE_PLINTH_Y * k)
  }, [bus])
  useLayoutEffect(() => {
    writeVars()
  }, [writeVars, mode, scale])
  useEffect(() => {
    const onResize = () => writeVars()
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [writeVars])

  // ---- the handle ----
  useEffect(() => {
    const m = bus.monument
    // The opening calls these from callbacks of its own gsap.context timeline. GSAP records any
    // animation created synchronously inside such a callback into that context, and the opening's
    // final ctx.revert() would then rewind the camera dolly and the rise to their start values.
    // A microtask breaks the synchronous chain, so the monument's tweens stay its own.
    const detached = (fn: () => void) => () => queueMicrotask(fn)
    const handle: MonumentHandle = {
      mode,
      ready: () => readyDeferred.current.promise,
      isReady: () => readyRef.current,
      setInstant: () => m.setInstant(),
      playOpeningRise: (ms) => detached(() => m.playOpeningRise(ms))(),
      playGoalLine: (ms) => detached(() => m.playGoalLine(ms))(),
      sweepOnce: (ms) => detached(() => m.sweepOnce(ms))(),
      shake: (trauma) => detached(() => m.shake(trauma))(),
      startIdle: () => {
        idleRef.current = true
        applyIdle()
        if (mode === 'webgl' && readyRef.current && useUI.getState().introDone) joinNow(true)
      },
      stopIdle: () => {
        idleRef.current = false
        applyIdle()
      },
    }
    setMonumentHandle(handle)
    return () => setMonumentHandle(null)
  }, [mode, bus, applyIdle, joinNow])

  const showCanvas = mode === 'webgl'
  return (
    <BusContext.Provider value={bus}>
      <div
        ref={root}
        data-testid="tp-monument"
        data-mode={mode}
        data-ready={ready ? 'true' : 'false'}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 w-full z-[var(--z-canvas)]"
        style={{
          top: 'var(--safe-top)',
          height: STAGE_H,
          visibility: visible ? 'visible' : 'hidden',
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: '50% 0',
        }}
      >
        {showCanvas ? (
          <div
            className="absolute inset-0"
            style={{ opacity: joined ? 1 : 0, transition: lateJoin ? 'opacity 200ms var(--ease-stone)' : 'none' }}
          >
            <SafeCanvas settings={mountSettings} onFallback={onFallback} onRemount={onRemount}>
              <ColumnScene bus={bus} settings={mountSettings} onReady={onSceneReady} />
            </SafeCanvas>
          </div>
        ) : null}
        <FallbackMonument hidden={showCanvas && joined} crossfade={lateJoin} />
      </div>
    </BusContext.Provider>
  )
}
