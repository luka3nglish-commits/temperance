/**
 * The one place that imports `Canvas` from @react-three/fiber (docs/design-spec.md sections 7 and
 * 15; enforced by canvas-lint.test.ts).
 *
 * The WebGL decision is made before <Canvas> mounts (`canUseWebGL`: a webgl2 context without a
 * major performance caveat and not a software renderer), so three never throws on context
 * creation. A class error boundary wraps the canvas; its fallback is the SVG monument. On
 * `webglcontextlost` the canvas is remounted by key once; a second loss within 30 s hands the
 * session to the SVG monument through `onFallback`.
 *
 * The renderer is built early. R3F only creates its renderer after a passive-effect measure, by
 * which time the GPU process is busy rastering the opening's first frames, and every synchronous
 * call three makes while it initialises (extension strings, parameters, errors) waits behind that
 * raster: a 450 to 800 ms main-thread stall inside the opening, measured. So the WebGLRenderer is
 * built on R3F's own canvas in the first commit, before the first paint, while the GPU process is
 * idle, and handed to R3F through the `gl` factory (R3F still owns and disposes it).
 */
import { Component, type ReactNode, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
import { NeutralToneMapping, WebGLRenderer, type WebGLRendererParameters } from 'three'
import { canUseWebGL } from './webgl'
import { CAMERA_REST, T } from './tokens'
import { tierSettings, useTier, type TierSettings } from './tier'
import { FallbackMonument } from './FallbackMonument'

export type SafeCanvasProps = {
  children: ReactNode
  settings: TierSettings
  /** the canvas threw, or lost its context twice: the caller switches to the SVG monument */
  onFallback(reason: 'no-webgl' | 'error' | 'context-loss'): void
  /** the canvas is being remounted after a first context loss (shaders will compile again) */
  onRemount?(): void
  /** the renderer exists; the scene is not compiled yet */
  onCreated?(state: RootState): void
  className?: string
}

type BoundaryProps = { children: ReactNode; fallback: ReactNode; onError(error: unknown): void }
type BoundaryState = { failed: boolean }

class CanvasBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }
  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }
  componentDidCatch(error: unknown): void {
    this.props.onError(error)
  }
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const CONTEXT_LOSS_WINDOW = 30_000

/** extensions three enables lazily later (compileAsync): enabled with the renderer, while the GPU is idle */
const WARM_EXTENSIONS = ['KHR_parallel_shader_compile', 'EXT_texture_filter_anisotropic']

/**
 * Production renderers skip three's shader error checks: on each program's first use they make
 * several synchronous info-log queries, which wait behind the GPU raster queue during the opening.
 * The shaders are fixed and checked in development.
 */
function quiet(r: WebGLRenderer): WebGLRenderer {
  r.debug.checkShaderErrors = import.meta.env.DEV
  return r
}

function rendererParams(settings: TierSettings): WebGLRendererParameters {
  return {
    antialias: settings.antialias,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
    failIfMajorPerformanceCaveat: true,
    preserveDrawingBuffer: false,
  }
}

export function SafeCanvas({ children, settings, onFallback, onRemount, onCreated, className }: SafeCanvasProps) {
  const [key, setKey] = useState(0)
  const losses = useRef<number[]>([])
  const canvasOk = useRef<boolean | null>(null)
  if (canvasOk.current === null) canvasOk.current = canUseWebGL()
  const canvasEl = useRef<HTMLCanvasElement>(null)
  const early = useRef<WebGLRenderer | null>(null)
  // the live tier's cap (a mid-session downgrade lowers it); R3F re-applies this prop on every render
  const tier = useTier()
  const dprMax = tierSettings(tier === 'high' ? 'high' : 'low').dprMax

  // the frame of the first paint, before it: build the renderer on R3F's canvas (see the header).
  // A rAF from the first commit runs in that frame's rendering steps, ahead of the opening's own rAF,
  // in its own task (so the boot task does not grow) and before any raster has been issued.
  const factoryRan = useRef(false)
  useLayoutEffect(() => {
    const el = canvasEl.current
    if (!el || !canvasOk.current) return
    factoryRan.current = false
    const raf = requestAnimationFrame(() => buildEarly(el))
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const buildEarly = (el: HTMLCanvasElement) => {
    // R3F got there first (a measure before this frame): it built its own renderer, leave it be
    if (factoryRan.current || !el.isConnected) return
    if (early.current && early.current.domElement === el) return
    try {
      const r = new WebGLRenderer({ ...rendererParams(settings), canvas: el })
      quiet(r)
      for (const name of WARM_EXTENSIONS) r.extensions.get(name)
      // size it as R3F will (offset size of its container, dpr clamped to the tier) so the drawing
      // buffer is allocated now rather than reallocated inside the opening
      const box = el.parentElement
      if (box && box.offsetWidth > 0 && box.offsetHeight > 0) {
        // R3F's calculateDpr for [1, dprMax]
        r.setPixelRatio(Math.min(Math.max(1, window.devicePixelRatio || 2), settings.dprMax))
        r.setSize(box.offsetWidth, box.offsetHeight, false)
      }
      early.current = r
      performance.mark('tp:gl-context')
    } catch {
      early.current = null // R3F tries again itself; a failure there reaches the boundary
    }
  }

  const makeRenderer = useCallback(
    // typed loosely: R3F's OffscreenCanvas type and the DOM lib's are two unrelated declarations
    (defaults: { canvas?: unknown }) => {
      factoryRan.current = true
      const r = early.current
      early.current = null
      if (r && r.domElement === defaults.canvas) return r
      r?.dispose()
      return quiet(new WebGLRenderer({ ...(defaults as WebGLRendererParameters), ...rendererParams(settings) }))
    },
    [settings],
  )

  const handleCreated = useCallback(
    (state: RootState) => {
      const { gl } = state
      gl.toneMapping = NeutralToneMapping
      gl.toneMappingExposure = T.exposure
      gl.setClearColor(0x000000, 0)
      gl.shadowMap.enabled = false
      const el = gl.domElement
      const onLost = (e: Event) => {
        e.preventDefault()
        const now = performance.now()
        losses.current = losses.current.filter((t) => now - t < CONTEXT_LOSS_WINDOW)
        losses.current.push(now)
        if (losses.current.length >= 2) {
          onFallback('context-loss')
          return
        }
        onRemount?.()
        setKey((k) => k + 1)
      }
      el.addEventListener('webglcontextlost', onLost, false)
      onCreated?.(state)
    },
    [onCreated, onFallback, onRemount],
  )

  if (!canvasOk.current) {
    // decided before any <Canvas> mounts: the caller renders the SVG monument
    onFallbackOnce(onFallback, 'no-webgl')
    return null
  }

  return (
    <CanvasBoundary fallback={<FallbackMonument standalone />} onError={() => onFallback('error')}>
      <Canvas
        key={key}
        ref={canvasEl}
        className={className}
        style={{ touchAction: 'pan-y', position: 'absolute', inset: 0 }}
        dpr={[1, dprMax]}
        // offsetWidth/Height ignore the layer's short-phone CSS scale; getBoundingClientRect would not
        resize={{ offsetSize: true }}
        gl={makeRenderer}
        shadows={false}
        frameloop="never"
        flat={false}
        camera={{ fov: CAMERA_REST.fov, near: 0.1, far: 40, position: [...CAMERA_REST.pos] }}
        onCreated={handleCreated}
      >
        {children}
      </Canvas>
    </CanvasBoundary>
  )
}

/** Fires the fallback after render (never inside it) and only once per callback identity. */
const fired = new WeakSet<SafeCanvasProps['onFallback']>()
function onFallbackOnce(cb: SafeCanvasProps['onFallback'], reason: Parameters<SafeCanvasProps['onFallback']>[0]): void {
  if (fired.has(cb)) return
  fired.add(cb)
  queueMicrotask(() => cb(reason))
}
