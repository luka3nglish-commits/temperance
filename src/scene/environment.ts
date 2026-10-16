/**
 * Reflections without an environment map. A PMREM environment costs a full shader compile on the
 * main thread (about 1.2 s on a desktop driver, measured; hundreds of ms on phones) and so did
 * drei's Lightformer bake. Polished obsidian only needs a few soft highlights mirrored in the stone,
 * so those highlights are painted onto a 256 x 128 equirect canvas in a couple of milliseconds and
 * sampled directly in the fragment shader along the reflection vector (`injectReflection`). No
 * PMREM, no envmap defines, one texture read.
 *
 * The mapping (docs/polish-spec.md section 5.1): `u = atan(z, x) / 2pi + 0.5`, `v = asin(y) / pi
 * + 0.5`, canvas row `(1 - v) * H`. The camera sees the vertical shaft reflect rows 0.43H to 0.54H
 * only, and a shaft normal at angle phi (positive is screen right) reflects canvas x at
 * u = 0.75 - phi / pi. Every vertical strip below is placed with that rule.
 */
import { CanvasTexture, Color, LinearFilter, type Material, RepeatWrapping, SRGBColorSpace, type Texture, type MeshStandardMaterial, type IUniform } from 'three'

import { CPU_2D } from './textures'

const W = 256
const H = 128

/** soft rectangle of light: a horizontal gradient band with feathered ends */
function glow(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, color: string, alpha: number): void {
  const grad = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.18, color)
  grad.addColorStop(0.82, color)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.globalAlpha = alpha
  g.fillStyle = grad
  g.fillRect(cx - w / 2, cy - h / 2, w, h)
  const feather = g.createLinearGradient(0, cy - h / 2, 0, cy + h / 2)
  feather.addColorStop(0, 'rgba(5,5,7,0.9)')
  feather.addColorStop(0.3, 'rgba(5,5,7,0)')
  feather.addColorStop(0.7, 'rgba(5,5,7,0)')
  feather.addColorStop(1, 'rgba(5,5,7,0.9)')
  g.fillStyle = feather
  g.fillRect(cx - w / 2, cy - h / 2, w, h)
  g.globalAlpha = 1
}

/**
 * A vertical strip of light (a tall softbox seen in the stone): horizontal stops 0 transparent,
 * 0.3 colour, 0.7 colour, 1 transparent, times a vertical feather that fades the top and bottom
 * 20 percent. Drawn on an offscreen strip with `destination-in`, then onto the environment.
 */
function vstrip(g: CanvasRenderingContext2D, cx: number, w: number, y0: number, y1: number, color: string, alpha: number): void {
  const sw = Math.max(1, Math.ceil(w) + 2)
  const sh = Math.max(1, Math.ceil(y1 - y0))
  const off = document.createElement('canvas')
  off.width = sw
  off.height = sh
  const o = off.getContext('2d', CPU_2D)
  if (!o) return
  const left = (sw - w) / 2
  const hz = o.createLinearGradient(left, 0, left + w, 0)
  hz.addColorStop(0, 'rgba(0,0,0,0)')
  hz.addColorStop(0.3, color)
  hz.addColorStop(0.7, color)
  hz.addColorStop(1, 'rgba(0,0,0,0)')
  o.fillStyle = hz
  o.fillRect(0, 0, sw, sh)
  o.globalCompositeOperation = 'destination-in'
  const vt = o.createLinearGradient(0, 0, 0, sh)
  vt.addColorStop(0, 'rgba(0,0,0,0)')
  vt.addColorStop(0.2, 'rgba(0,0,0,1)')
  vt.addColorStop(0.8, 'rgba(0,0,0,1)')
  vt.addColorStop(1, 'rgba(0,0,0,0)')
  o.fillStyle = vt
  o.fillRect(0, 0, sw, sh)
  g.globalAlpha = alpha
  g.drawImage(off, Math.round(cx - sw / 2), Math.round(y0))
  g.globalAlpha = 1
}

export function paintEnvironment(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d', CPU_2D)
  if (!g) return c
  // 1. the void: near black, a shade warmer at the floor
  const base = g.createLinearGradient(0, 0, 0, H)
  base.addColorStop(0, '#0e0e13')
  base.addColorStop(0.5, '#0b0b10')
  base.addColorStop(1, '#0a0807')
  g.fillStyle = base
  g.fillRect(0, 0, W, H)
  // 2. the overhead key band: lights the capital and the plinth top
  glow(g, W * 0.5, H * 0.14, W * 0.62, H * 0.16, '#fff1cc', 0.95)
  // 5. S-CENTRE first, so the two streaks paint over it: keeps the face of the shaft from going dead
  vstrip(g, 192, 28, H * 0.3, H * 0.66, '#6c604f', 1.0)
  // 3. S-KEY: phi +25 degrees, the main cream streak right of centre
  vstrip(g, 156, 9, H * 0.3, H * 0.66, '#fff3dc', 1.0)
  // 4. S-FILL: phi -20 degrees, a softer streak left of centre
  vstrip(g, 220, 6, H * 0.32, H * 0.64, '#ffe6be', 0.6)
  // 6. S-RIM: u 0.172 to 0.328, warm rims on both silhouettes and the temple doorway the plinth top mirrors
  vstrip(g, 64, 40, H * 0.28, H * 0.7, '#d9bc80', 0.7)
  return c
}

let shared: CanvasTexture | null = null

/** The one painted environment texture, created on first use (tiny; never disposed). */
export function getEnvTexture(): Texture {
  if (shared) return shared
  const tex = new CanvasTexture(paintEnvironment())
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.generateMipmaps = false
  shared = tex
  return tex
}

export type ReflectionOptions = {
  /** overall strength of the mirrored highlights */
  strength: number
  /** 0 = white reflection (glass, obsidian), 1 = tinted by the surface colour (metal) */
  tint: number
  /** Schlick F0: the reflectance looking straight at the surface */
  f0: number
  /** warm fresnel rim, sRGB hex */
  rimColor?: string
  /** rim strength (0 = none) */
  rim?: number
  /** cache key suffix so programs differ from the untouched material */
  key: string
}

/** The reflection uniforms of one material; the scene writes `uReflect` for the strike flare. */
export type ReflectionUniforms = {
  uEnvTex: IUniform<Texture>
  uReflect: IUniform<number>
  uReflectTint: IUniform<number>
  uF0: IUniform<number>
  uRimColor: IUniform<Color>
  uRim: IUniform<number>
}

const PARS = /* glsl */ `
uniform sampler2D uEnvTex;
uniform float uReflect;
uniform float uReflectTint;
uniform float uF0;
uniform vec3 uRimColor;
uniform float uRim;
vec3 tpEnvSample(vec3 dirWorld) {
  vec2 uv = vec2(atan(dirWorld.z, dirWorld.x) / 6.28318530718 + 0.5, asin(clamp(dirWorld.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
  return texture2D(uEnvTex, uv).rgb;
}
`

const REFLECT = /* glsl */ `
{
  vec3 rView = reflect(-geometryViewDir, normal);
  vec3 rWorld = inverseTransformDirection(rView, viewMatrix);
  vec3 env = tpEnvSample(rWorld);
  float nv = clamp(dot(normal, geometryViewDir), 0.0, 1.0);
  float F = mix(uF0, 1.0, pow(1.0 - nv, 5.0));
  outgoingLight += mix(env, env * diffuseColor.rgb, uReflectTint) * uReflect * F * (1.0 - tpMatte);
  outgoingLight += uRimColor * pow(1.0 - nv, 3.0) * uRim * (1.0 - tpMatte);
}
`

/**
 * Adds mirrored highlights to a MeshStandardMaterial's outgoing light: the painted environment
 * sampled along the world-space reflection vector, weighted by a Schlick fresnel with an `f0`
 * floor, plus a warm fresnel rim. Composes with an earlier onBeforeCompile (the obsidian injection)
 * by chaining it. The uniforms belong to this material; materials with the same key share one
 * program. Returns the uniforms so the scene can drive `uReflect`.
 */
export function injectReflection(material: MeshStandardMaterial, opts: ReflectionOptions): ReflectionUniforms {
  const prev = material.onBeforeCompile
  const prevKey = material.customProgramCacheKey
  const uniforms: ReflectionUniforms = {
    uEnvTex: { value: getEnvTexture() },
    uReflect: { value: opts.strength },
    uReflectTint: { value: opts.tint },
    uF0: { value: opts.f0 },
    // linear, as three's Color stores it
    uRimColor: { value: new Color(opts.rimColor ?? '#000000') },
    uRim: { value: opts.rim ?? 0 },
  }
  material.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PARS)
      .replace('#include <opaque_fragment>', REFLECT + '#include <opaque_fragment>')
    // materials without the obsidian injection have no tpMatte; give them a zero
    if (!shader.fragmentShader.includes('float tpMatte')) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nfloat tpMatte = 0.0;')
    }
  }
  material.customProgramCacheKey = () => (prevKey ? prevKey.call(material) : '') + '|' + opts.key
  return uniforms
}

/** Type guard so callers can pass any material and only standard ones get the injection. */
export function isStandard(m: Material): m is MeshStandardMaterial {
  return (m as MeshStandardMaterial).isMeshStandardMaterial === true
}
