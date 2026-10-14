/**
 * The one place that imports `Canvas` from @react-three/fiber (docs/design-spec.md sections 7 and
 * 15; enforced by canvas-lint.test.ts).
 *
 * The WebGL decision is made before <Canvas> mounts (`canUseWebGL`: a webgl2 context without a
 * major performance caveat and not a software renderer), so three never throws on context
 * creation. A class error boundary wraps the canvas; its fallback is the SVG monument. On
 * `webglcontextlost` the canvas is remounted by key once; a second loss within 30 s hands the
 * session to the SVG monument through `onFallback`.
 */
import { Component, type ReactNode, useCallback, useRef, useState } from 'react'
import { Canvas, type RootState } from '@react-three/fiber'
import { NeutralToneMapping } from 'three'
import { canUseWebGL } from './webgl'
import { CAMERA_REST, T } from './tokens'
import type { TierSettings } from './tier'
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

export function SafeCanvas({ children, settings, onFallback, onRemount, onCreated, className }: SafeCanvasProps) {
  const [key, setKey] = useState(0)
  const losses = useRef<number[]>([])
  const canvasOk = useRef<boolean | null>(null)
  if (canvasOk.current === null) canvasOk.current = canUseWebGL()

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
        className={className}
        style={{ touchAction: 'pan-y', position: 'absolute', inset: 0 }}
        dpr={[1, settings.dprMax]}
        // offsetWidth/Height ignore the layer's short-phone CSS scale; getBoundingClientRect would not
        resize={{ offsetSize: true }}
        gl={{
          antialias: settings.antialias,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          failIfMajorPerformanceCaveat: true,
          preserveDrawingBuffer: false,
        }}
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
