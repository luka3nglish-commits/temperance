import { useStore } from '../store/useStore'
import { getTier } from '../scene/tier'
import { isReducedMotion } from './motion'

/**
 * THE ONE LIGHT (docs/design-spec.md section 8 "Light").
 *
 * One rAF-throttled loop at 30 Hz (15 Hz on the low tier) writes `--tilt-x` (-1 to 1) and
 * `--tilt-angle` on :root and dispatches a `tilt` CustomEvent (detail = the value) so the shard
 * glint gradients, which are SVG attributes and cannot read a CSS variable, follow the same light.
 *
 * Sources. Desktop: the mouse position normalised across the 430 px slab. Phone: DeviceOrientation
 * gamma / 30, clamped, lerped 0.12 per frame; listened to only when the platform needs no permission
 * or Settings GOLD FOLLOWS TILT is on (iOS asks inside a gesture, see requestTiltPermission).
 *
 * Until a source is live, :root carries `auto-sweep` and the 9 s goldSweep keyframe drives
 * `--tilt-x` (CSS animations beat inline styles, so the loop only reads the computed value then).
 * The sweep pauses while the document is hidden. Reduced motion: no auto sweep, `--tilt-x` rests
 * at 0, user-driven tilt still allowed.
 */

const LERP = 0.12
const LIVE_TIMEOUT = 2500 // ms without an orientation sample before the sweep takes over again
const EPS = 0.0005

type OrientationCtor = {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

function needsPermission(): boolean {
  const D = (window as unknown as { DeviceOrientationEvent?: OrientationCtor }).DeviceOrientationEvent
  return !!D && typeof D.requestPermission === 'function'
}

function hasOrientation(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

const clamp1 = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v)

let running = false

export function startTilt(): () => void {
  if (typeof window === 'undefined' || running) return () => {}
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
  let reduced = isReducedMotion()

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)')

  const dispatch = (x: number) => {
    window.dispatchEvent(new CustomEvent<number>('tilt', { detail: x }))
  }

  const write = (x: number) => {
    if (written !== null && Math.abs(written - x) < EPS) return
    written = x
    root.style.setProperty('--tilt-x', x.toFixed(4))
    root.style.setProperty('--tilt-angle', `${(x * 18).toFixed(2)}deg`)
    dispatch(x)
  }

  const clearWrite = () => {
    written = null
    root.style.removeProperty('--tilt-x')
    root.style.removeProperty('--tilt-angle')
  }

  const setAuto = (on: boolean) => {
    root.classList.toggle('auto-sweep', on)
  }

  const syncMode = () => {
    const wantAuto = !live && !reduced
    if (wantAuto !== root.classList.contains('auto-sweep')) {
      setAuto(wantAuto)
      // hand the variable back to the keyframe (an inline value would hold once the animation ends)
      if (wantAuto) clearWrite()
    }
    if (!live && reduced) write(0)
  }

  const frame = (ts: number) => {
    raf = requestAnimationFrame(frame)
    const interval = getTier() === 'low' ? 1000 / 15 : 1000 / 30
    if (ts - last < interval) return
    last = ts

    if (live && lastSample && ts - lastSample > LIVE_TIMEOUT && !finePointer.matches) {
      live = false
      target = 0
      syncMode()
    }

    if (live) {
      current += (target - current) * LERP
      if (Math.abs(target - current) < EPS) current = target
      write(current)
    } else if (!reduced) {
      // the goldSweep keyframe owns --tilt-x; relay its computed value to the SVG gradients
      const v = parseFloat(getComputedStyle(root).getPropertyValue('--tilt-x'))
      if (Number.isFinite(v)) {
        current = v
        dispatch(v)
      }
    }
  }

  const goLive = () => {
    if (!live) {
      live = true
      syncMode()
    }
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

  const syncOrientation = () => {
    const want = hasOrientation() && (!needsPermission() || useStore.getState().settings.tilt)
    if (want === orientationOn) return
    orientationOn = want
    if (want) window.addEventListener('deviceorientation', onOrientation)
    else {
      window.removeEventListener('deviceorientation', onOrientation)
      if (!finePointer.matches) {
        live = false
        target = 0
        syncMode()
      }
    }
  }

  const onReduce = () => {
    reduced = isReducedMotion()
    syncMode()
  }

  const onVisibility = () => {
    const hidden = document.visibilityState === 'hidden'
    root.classList.toggle('sweep-paused', hidden)
    if (hidden) {
      cancelAnimationFrame(raf)
      raf = 0
    } else if (!raf) {
      raf = requestAnimationFrame(frame)
    }
  }

  const unsub = useStore.subscribe((s, prev) => {
    if (s.settings.tilt !== prev.settings.tilt) syncOrientation()
    if (s.settings.motion !== prev.settings.motion) onReduce()
  })

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  reduceMq.addEventListener('change', onReduce)
  document.addEventListener('visibilitychange', onVisibility)
  syncOrientation()
  syncMode()
  raf = requestAnimationFrame(frame)

  return () => {
    running = false
    cancelAnimationFrame(raf)
    unsub()
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('deviceorientation', onOrientation)
    reduceMq.removeEventListener('change', onReduce)
    document.removeEventListener('visibilitychange', onVisibility)
    root.classList.remove('auto-sweep', 'sweep-paused')
    clearWrite()
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
