/**
 * The column scene root, rendered inside SafeCanvas (docs/design-spec.md section 7).
 *
 * Owns the frameloop gate: `never` until `gl.compileAsync(scene, camera)` resolves (the dust mesh is
 * mounted invisible and the ember lights at 0 so every program compiles here), then `always` only
 * inside hold windows (the opening rise, 1200 ms after a strike) and `demand` otherwise, where the
 * layer's ticker invalidates. Integrates the choreography (`Monument.tick`) once per frame at
 * priority -1 so every child reads a settled `mon`, drives the camera (dolly, lookAt, trauma shake),
 * measures the 30-frame median for the tier probe, and writes --goal-y / --plinth-y from
 * `camera.project` at rest and on resize.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { type Material, type Object3D, PerspectiveCamera, Vector3 } from 'three'
import { isReducedMotion } from '../lib/motion'
import { DEBUG } from './debugFlags'
import { BusContext, type SceneBus } from './bus'
import { isFrameProbePending, reportFrameTimes, tierSettings, useTier, type TierSettings } from './tier'
import { CAMERA_REST, COL, GOAL_Y, T } from './tokens'
import { Lights } from './Lights'
import { Plinth } from './Plinth'
import { Column } from './Column'
import { GoalLine } from './GoalLine'
import { Dust } from './Dust'

export type ColumnSceneProps = {
  bus: SceneBus
  settings: TierSettings
  /** shaders compiled and one frame drawn */
  onReady(): void
}

const PROBE_FRAMES = 30

/** a short name for the program a material compiles to (materials sharing a key share a program) */
function programKey(m: Material): string {
  const custom = (m as { customProgramCacheKey?: () => string }).customProgramCacheKey
  const k = typeof custom === 'function' ? String(custom.call(m)) : ''
  if (k.includes('tp-obsidian')) return 'obsidian'
  if (k.includes('|gold')) return 'gold'
  if (k.includes('tp-fx')) return 'fx'
  if ((m as { isShaderMaterial?: boolean }).isShaderMaterial) return 'dust'
  if ((m as { map?: unknown }).map) return 'basic-map'
  return m.type
}

const RANK: Record<string, number> = { obsidian: 0, gold: 1, fx: 2, dust: 3, 'basic-map': 4 }
function programRank(key: string): number {
  return RANK[key] ?? 5
}

export function ColumnScene({ bus, settings, onReady }: ColumnSceneProps) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const advance = useThree((s) => s.advance)
  const setFrameloop = useThree((s) => s.setFrameloop)
  const setDpr = useThree((s) => s.setDpr)
  const size = useThree((s) => s.size)

  const ready = useRef(false)
  const loop = useRef<'never' | 'always' | 'demand'>('never')
  const holdUntil = useRef(0)
  const timer = useRef(0)
  const [monitorOn, setMonitorOn] = useState(false)

  const release = useCallback(() => {
    timer.current = 0
    const now = performance.now()
    if (now < holdUntil.current - 1) {
      timer.current = window.setTimeout(release, holdUntil.current - now + 16)
      return
    }
    if (loop.current === 'always') {
      loop.current = 'demand'
      setFrameloop('demand')
      setMonitorOn(false)
      invalidate()
    }
  }, [invalidate, setFrameloop])

  const hold = useCallback(
    (ms: number) => {
      if (isReducedMotion()) return
      const until = performance.now() + ms
      if (until <= holdUntil.current) return
      holdUntil.current = until
      if (ready.current && loop.current !== 'always') {
        loop.current = 'always'
        setFrameloop('always')
        setMonitorOn(true)
      }
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(release, ms + 16)
    },
    [release, setFrameloop],
  )

  // --goal-y / --plinth-y from the rest camera (the live one may be mid-dolly)
  const scratch = useRef<{ cam: PerspectiveCamera; v: Vector3 } | null>(null)
  const writeStageVars = useCallback(() => {
    if (!scratch.current) scratch.current = { cam: new PerspectiveCamera(), v: new Vector3() }
    const { cam, v } = scratch.current
    const w = Math.max(1, size.width)
    const h = Math.max(1, size.height)
    cam.fov = CAMERA_REST.fov
    cam.aspect = w / h
    cam.near = 0.1
    cam.far = 40
    cam.position.set(CAMERA_REST.pos[0], CAMERA_REST.pos[1], CAMERA_REST.pos[2])
    cam.lookAt(0, CAMERA_REST.lookY, 0)
    cam.updateMatrixWorld()
    cam.updateProjectionMatrix()
    const px = (worldY: number) => {
      v.set(0, worldY, 0).project(cam)
      return ((1 - v.y) / 2) * h
    }
    const top = bus.layerTop()
    const k = bus.layerScale
    bus.writeStageVars(top + px(GOAL_Y) * k, top + px(0) * k)
  }, [bus, size.width, size.height])

  useLayoutEffect(() => {
    bus.sceneStageVars = writeStageVars
    writeStageVars()
    return () => {
      if (bus.sceneStageVars === writeStageVars) bus.sceneStageVars = null
    }
  }, [bus, writeStageVars])

  // a mid-session tier change applies the cheap settings now: dpr cap and the dust count
  const tier = useTier()
  useEffect(() => {
    const live = tierSettings(tier === 'none' ? 'low' : tier)
    // always the clamped form: a bare number ignores the device ratio, so R3F's own `dpr` prop and
    // this effect disagreed and the drawing buffer was reallocated (a 300 ms GPU stall) on each flip
    setDpr([1, live.dprMax])
    bus.dustCount = Math.min(settings.dust, live.dust)
  }, [tier, bus, setDpr, settings.dust])

  // wire the bus and run the shader gate
  useEffect(() => {
    let cancelled = false
    bus.sceneInvalidate = () => invalidate()
    bus.sceneHold = hold
    bus.monument.setHooks({ onCameraRest: writeStageVars })
    const mark = (name: string) => {
      try {
        performance.mark(name)
      } catch {
        /* no performance API */
      }
    }
    // no environment map on purpose: PMREM alone costs a full shader compile on the main thread.
    // The mirrored highlights come from environment.ts inside the materials' own programs.
    mark('tp:gl-env-done')
    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
    const run = async () => {
      mark('tp:gl-compile-start')
      // one chunk per program (materials sharing a program cost a frame each for nothing once it is
      // linked), largest first, by a key rather than traverse order (polish-spec 5.3)
      const seen = new Set<string>()
      const chunks: { o: Object3D; rank: number; key: string }[] = []
      scene.traverse((o) => {
        const mat = (o as { material?: Material | Material[] }).material
        if (!mat) return
        const list = Array.isArray(mat) ? mat : [mat]
        const pk = programKey(list[0])
        if (seen.has(pk)) return
        seen.add(pk)
        chunks.push({ o, rank: programRank(pk), key: pk })
      })
      chunks.sort((a, b) => a.rank - b.rank)
      // one program per frame: a desktop driver blocks inside compile even with parallel compile, so
      // chunking keeps every task short and the opening timeline smooth
      for (const chunk of chunks) {
        if (cancelled) return
        try {
          await gl.compileAsync(chunk.o, camera, scene)
        } catch {
          /* a failed precompile only costs a later hitch; the scene still renders */
        }
        if (DEBUG.chunks) mark(`tp:gl-chunk-${chunk.key}`)
        await nextFrame()
      }
      // every other material: its program is linked already, so this only binds it
      if (cancelled) return
      try {
        await gl.compileAsync(scene, camera)
      } catch {
        /* as above */
      }
      if (cancelled) return
      mark('tp:gl-compile-done')
      // test and console hook: the live program count (12 linked before the polish, 5 after S2)
      const tp = (window as unknown as { __tp?: Record<string, unknown> }).__tp
      if (tp) tp.programs = gl.info.programs?.length ?? null
      if (cancelled) return
      try {
        // one frame while still `never`, so the first visible frame is already on the canvas
        advance(performance.now())
      } catch {
        /* ignore */
      }
      mark('tp:gl-first-frame')
      ready.current = true
      loop.current = holdUntil.current > performance.now() && !isReducedMotion() ? 'always' : 'demand'
      setFrameloop(loop.current)
      if (loop.current === 'always') {
        setMonitorOn(true)
        if (!timer.current) timer.current = window.setTimeout(release, Math.max(0, holdUntil.current - performance.now()) + 16)
      }
      onReady()
      invalidate()
    }
    void run()
    return () => {
      cancelled = true
      bus.sceneInvalidate = null
      bus.sceneHold = null
      bus.monument.setHooks({ onCameraRest: undefined })
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = 0
    }
    // mount only: the bus and the three objects are stable for the life of this canvas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the integrator: choreography, tier probe, camera
  const probe = useRef<number[]>([])
  const lastFrameAt = useRef(0)
  const lastFov = useRef(0)
  useFrame((state, delta) => {
    const dt = Math.min(0.1, Math.max(0, delta))
    const reduced = isReducedMotion()
    const mon = bus.monument.mon
    const moving = bus.monument.tick(dt, bus.idle && bus.visible, reduced, T.turn)
    bus.reportH?.(mon.h)

    if (isFrameProbePending()) {
      const now = performance.now()
      if (loop.current === 'always' && lastFrameAt.current > 0) {
        probe.current.push(now - lastFrameAt.current)
        if (probe.current.length >= PROBE_FRAMES) reportFrameTimes(probe.current)
      }
      lastFrameAt.current = loop.current === 'always' ? now : 0
    }

    const cam = state.camera
    const t = performance.now() / 1000
    const s = mon.trauma * mon.trauma
    cam.position.set(s * 0.033 * Math.sin(t * 97), mon.camY + s * 0.024 * Math.sin(t * 113 + 1.3), mon.camZ)
    cam.lookAt(0, mon.lookY, 0)
    if (s > 0) cam.rotation.z += s * 0.012 * Math.sin(t * 89)
    const fov = mon.fov + mon.fovPunch
    if ((cam as PerspectiveCamera).isPerspectiveCamera && lastFov.current !== fov) {
      lastFov.current = fov
      ;(cam as PerspectiveCamera).fov = fov
      ;(cam as PerspectiveCamera).updateProjectionMatrix()
    }
    if (moving && loop.current === 'demand') invalidate()
  }, -1)

  // drei PerformanceMonitor, mounted only inside `always` windows: never below 1.0, never above the tier cap
  const onDecline = useCallback(() => {
    const cap = tierSettings(tier === 'none' ? 'low' : tier).dprMax
    setDpr([1, Math.max(1, Math.min(1.25, cap))])
    bus.dustCount = Math.min(bus.dustCount, 90)
  }, [bus, tier, setDpr])
  const onIncline = useCallback(() => {
    const live = tierSettings(tier === 'none' ? 'low' : tier)
    setDpr([1, live.dprMax])
    bus.dustCount = Math.min(settings.dust, live.dust)
  }, [bus, tier, settings.dust, setDpr])

  return (
    <BusContext.Provider value={bus}>
      <fogExp2 attach="fog" args={[COL.fog, 0.03]} />
      <Lights />
      <Plinth inscription={settings.inscription} />
      <Column settings={settings} />
      <GoalLine settings={settings} />
      <Dust settings={settings} />
      {monitorOn ? <PerformanceMonitor ms={100} iterations={6} flipflops={3} onDecline={onDecline} onIncline={onIncline} /> : null}
    </BusContext.Provider>
  )
}
