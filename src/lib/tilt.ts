import { useStore } from '../store/useStore'
import { getTier } from '../scene/tier'
import { featureOff } from './boot'

/**
 * THE ONE LIGHT (docs/design-spec.md section 8 "Light").
 *
 * `--tilt-x` (-1 to 1) and `--tilt-angle` on :root place the light on the gold; a `tilt`
 * CustomEvent (detail = the value) relays it to the shard glint gradients and the scene's sweep
 * light, which cannot read a CSS variable.
 *
 * AT REST NOTHING RUNS. The light sits at 0 (the :root rule), there is no animation, no
 * requestAnimationFrame loop, no computed-style read and no `tilt` event. (Until the iOS crash
 * hotfix a 9 s infinite goldSweep keyframe animated `--tilt-x` on :root, which restyled the whole
 * document every frame forever, and this loop polled it at 30 Hz to relay it to the glints.)
 *
 * The loop (30 Hz, 15 Hz on the low tier) runs only while a source is live:
 *  - phone: DeviceOrientation gamma / 30, clamped, lerped 0.12 per frame, listened to only while
 *    Settings GOLD FOLLOWS TILT is on (iOS asks inside the tap, see requestTiltPermission);
 *  - desktop: the mouse position across the 430 px slab (fine pointers only).
 * When samples stop for LIVE_TIMEOUT the light eases back to 0 and the loop ends by itself. It
 * pauses while the document is hidden. `data-sweep="0"` (boot guard) disables it entirely.
 *
 * The opening holds the relay (suspendTilt) while its own shard sweep drives the glint through
 * emitTilt; on release the glint eases back to the resting light in a short finite pass.
 */

const LERP = 0.12
const LIVE_TIMEOUT = 2500 // ms without a sample before the light returns to rest
const EPS = 0.0005
const HANDBACK = 0.18 // easing per frame when the relay takes the glint back from a timeline

type OrientationCtor = {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

function hasOrientation(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

const clamp1 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v)

let running = false
/** while > 0 the loop still writes :root but does not dispatch: a timeline owns the glint (section 5, S2) */
let suspended = 0
/** the last value the glint was told, by the loop or by a timeline through emitTilt */
let told = 0
/** true after a hold ends, until the glint has slid back to the light */
let handback = false
/** starts the loop for one finite pass (set by startTilt while it runs) */
let kick: (() => void) | null = null

/**
 * Hold the loop's `tilt` events so a timeline can drive the glint itself without the relay
 * fighting it. Returns the resume function (idempotent). Nested holds are counted. On the last
 * release the glint slides back to the light (0 at rest) and the loop stops again.
 */
export function suspendTilt(): () => void {
  suspended += 1
  let released = false
  return () => {
    if (released) return
    released = true
    suspended = Math.max(0, suspended - 1)
    if (suspended === 0) {
      if (kick) {
        handback = true
        kick()
      } else if (told !== 0) {
        // no loop (sweep switched off, or not started): put the glint straight back at rest
        emitTilt(0)
      }
    }
  }
}

/** Tell the glint where the light is (used by the opening's sweep while the loop is held). */
export function emitTilt(x: number): void {
  if (typeof window === 'undefined') return
  told = x
  window.dispatchEvent(new CustomEvent<number>('tilt', { detail: x }))
}

/** Test seam: true while the requestAnimationFrame loop is scheduled. */
let loopScheduled = false
export function isTiltLoopRunning(): boolean {
  return loopScheduled
}

export function startTilt(): () => void {
  if (typeof window === 'undefined' || running) return () => {}
  // the boot guard switched moving gold off: the light stays at rest, nothing is installed
  if (featureOff('sweep')) return () => {}
  running = true

  const root = document.documentElement
  let raf = 0
  let last = 0
  let target = 0
  let current = 0
  let live = false
  let lastSample = 0
  let written: number | null = null
  let orientationOn = false

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')

  // relay a value to the glint: held while a timeline owns it; eased back in after a hold
  const relay = (x: number) => {
    if (suspended > 0) return
    if (handback) {
      const next = told + (x - told) * HANDBACK
      if (Math.abs(x - next) >= 0.01) {
        emitTilt(next)
        return
      }
      handback = false
    }
    if (Math.abs(told - x) >= EPS) emitTilt(x)
  }

  const writeRoot = (x: number) => {
    if (written !== null && Math.abs(written - x) < EPS) return
    written = x
    root.style.setProperty('--tilt-x', x.toFixed(4))
    root.style.setProperty('--tilt-angle', `${(x * 18).toFixed(2)}deg`)
  }

  // back at rest: no inline value, so the :root rule's 0 applies
  const clearRoot = () => {
    if (written === null) return
    written = null
    root.style.removeProperty('--tilt-x')
    root.style.removeProperty('--tilt-angle')
  }

  const stopLoop = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    loopScheduled = false
  }

  const frame = (ts: number) => {
    raf = 0
    loopScheduled = false
    if (document.visibilityState === 'hidden') return
    const interval = getTier() === 'low' ? 1000 / 15 : 1000 / 30
    if (last && ts - last < interval) {
      schedule()
      return
    }
    last = ts

    if (live && performance.now() - lastSample > LIVE_TIMEOUT) {
      // the samples stopped: the light returns to rest and the loop ends once it is there
      live = false
      target = 0
    }
    current += (target - current) * LERP
    if (Math.abs(target - current) < EPS) current = target
    if (current === 0 && !live) clearRoot()
    else writeRoot(current)
    relay(current)

    if (live || current !== target || handback) schedule()
    else last = 0
  }

  function schedule() {
    if (raf || document.visibilityState === 'hidden') return
    raf = requestAnimationFrame(frame)
    loopScheduled = true
  }

  const goLive = () => {
    live = true
    schedule()
  }

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' && !finePointer.matches) return
    const w = Math.min(window.innerWidth, 430)
    const left = (window.innerWidth - w) / 2
    target = clamp1(((e.clientX - left) / w) * 2 - 1)
    lastSample = performance.now()
    goLive()
  }

  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.gamma === undefined) return
    target = clamp1(e.gamma / 30)
    lastSample = performance.now()
    goLive()
  }

  // orientation only while GOLD FOLLOWS TILT is on (on iOS that also means permission was granted)
  const syncOrientation = () => {
    const want = hasOrientation() && useStore.getState().settings.tilt
    if (want === orientationOn) return
    orientationOn = want
    if (want) window.addEventListener('deviceorientation', onOrientation)
    else {
      window.removeEventListener('deviceorientation', onOrientation)
      live = false
      target = 0
      schedule()
    }
  }

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') stopLoop()
    else if (live || current !== target || handback) schedule()
  }

  const unsub = useStore.subscribe((s, prev) => {
    if (s.settings.tilt !== prev.settings.tilt) syncOrientation()
  })

  kick = schedule
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  syncOrientation()

  return () => {
    running = false
    if (kick === schedule) kick = null
    stopLoop()
    unsub()
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('deviceorientation', onOrientation)
    document.removeEventListener('visibilitychange', onVisibility)
    clearRoot()
  }
}

/** Ask iOS for orientation permission inside a user gesture. Resolves true when granted. */
export async function requestTiltPermission(): Promise<boolean> {
  const D = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent
  if (D && typeof D.requestPermission === 'function') {
    try {
      return (await D.requestPermission()) === 'granted'
    } catch {
      return false
    }
  }
  return true
}

/** Test seam: forget module state between tests. */
export function resetTiltForTests(): void {
  running = false
  suspended = 0
  told = 0
  handback = false
  kick = null
  loopScheduled = false
}
