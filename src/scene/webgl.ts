/**
 * WebGL capability detection (docs/design-spec.md section 15). Decided once at boot, before any
 * <Canvas> mounts, so three never throws on context creation. The throwaway context is released
 * with WEBGL_lose_context.
 *
 * The crash-loop guard (index.html, src/lib/boot.ts) can switch WebGL off with `data-gl="0"` on
 * <html> (any safe level, or `?gl=0`). Then the probe creates no context at all, not even this
 * throwaway one, and every caller (the tier probe, SafeCanvas) takes the SVG monument path.
 */
import { featureOff } from '../lib/boot'

export type WebGLProbe = {
  /** a webgl2 context without a major performance caveat */
  ok: boolean
  /** UNMASKED_RENDERER_WEBGL when readable, else '' */
  renderer: string
  software: boolean
}

const SOFTWARE_RE = /swiftshader|llvmpipe|software|basic render/i

let cached: WebGLProbe | null = null

export function isSoftwareRenderer(renderer: string): boolean {
  return SOFTWARE_RE.test(renderer)
}

/** Probe once. Safe to call anywhere; returns ok=false in jsdom or when anything throws. */
export function probeWebGL(): WebGLProbe {
  if (cached) return cached
  let result: WebGLProbe = { ok: false, renderer: '', software: false }
  // the earliest decision point: switched off by the boot guard, never touch getContext
  if (featureOff('gl')) return (cached = result)
  try {
    if (typeof document === 'undefined') return (cached = result)
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true, powerPreference: 'high-performance' }) as
      | WebGL2RenderingContext
      | null
    if (gl) {
      let renderer = ''
      try {
        const info = gl.getExtension('WEBGL_debug_renderer_info')
        if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? '')
        if (!renderer) renderer = String(gl.getParameter(gl.RENDERER) ?? '')
      } catch {
        /* renderer string stays empty */
      }
      const software = isSoftwareRenderer(renderer)
      result = { ok: !software, renderer, software }
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      } catch {
        /* ignore */
      }
    }
  } catch {
    result = { ok: false, renderer: '', software: false }
  }
  cached = result
  return result
}

/** True when the 3D path may mount. */
export function canUseWebGL(): boolean {
  return probeWebGL().ok
}

/** Test seam: forget the cached probe. */
export function resetWebGLProbe(): void {
  cached = null
}
