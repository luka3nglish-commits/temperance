/**
 * Reflections without an environment map. A PMREM environment costs a full shader compile on the
 * main thread (about 1.2 s on a desktop driver, measured; hundreds of ms on phones) and so did
 * drei's Lightformer bake. Polished obsidian only needs a few soft highlights mirrored in the stone,
 * so those highlights are painted onto a 128 x 64 equirect canvas in a couple of milliseconds and
 * sampled directly in the fragment shader along the reflection vector (`injectReflection`). No
 * PMREM, no envmap defines, one texture read.
 */
import { CanvasTexture, LinearFilter, type Material, RepeatWrapping, SRGBColorSpace, type Texture, type MeshStandardMaterial } from 'three'

const W = 128
const H = 64

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

export function paintEnvironment(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) return c
  // the void: near black, a shade warmer at the floor
  const base = g.createLinearGradient(0, 0, 0, H)
  base.addColorStop(0, '#0e0e13')
  base.addColorStop(0.5, '#050507')
  base.addColorStop(1, '#0a0807')
  g.fillStyle = base
  g.fillRect(0, 0, W, H)
  // warm key band high up (the Lightformer at [0, 5, -2], 6 wide)
  glow(g, W * 0.5, H * 0.14, W * 0.62, H * 0.16, '#fff1cc', 0.95)
  // a dim mirror of it so the far side of the column is not dead
  glow(g, W * 0.05, H * 0.14, W * 0.3, H * 0.12, '#8c7a5a', 0.35)
  glow(g, W * 0.95, H * 0.14, W * 0.3, H * 0.12, '#8c7a5a', 0.35)
  // the tall side streak (the Lightformer at [-4, 1, 3])
  glow(g, W * 0.3, H * 0.5, W * 0.08, H * 0.7, '#8c7a5a', 0.6)
  // ember low and in front (the Lightformer at [0, -1, 4])
  glow(g, W * 0.5, H * 0.74, W * 0.5, H * 0.1, '#ff6a2b', 0.3)
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
  /** cache key suffix so programs differ from the untouched material */
  key: string
}

const PARS = /* glsl */ `
uniform sampler2D uEnvTex;
uniform float uReflect;
uniform float uReflectTint;
vec3 tpEnvSample(vec3 dirWorld) {
  vec2 uv = vec2(atan(dirWorld.z, dirWorld.x) / 6.28318530718 + 0.5, asin(clamp(dirWorld.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
  return texture2D(uEnvTex, uv).rgb;
}
`

/**
 * Adds mirrored highlights to a MeshStandardMaterial's outgoing light: the painted environment
 * sampled along the world-space reflection vector, weighted by a Schlick fresnel. Composes with an
 * earlier onBeforeCompile (the obsidian crack injection) by chaining it.
 */
export function injectReflection(material: MeshStandardMaterial, opts: ReflectionOptions): void {
  const prev = material.onBeforeCompile
  const prevKey = material.customProgramCacheKey
  const uniforms = {
    uEnvTex: { value: getEnvTexture() },
    uReflect: { value: opts.strength },
    uReflectTint: { value: opts.tint },
  }
  material.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PARS)
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
{
  vec3 rView = reflect(-geometryViewDir, normal);
  vec3 rWorld = inverseTransformDirection(rView, viewMatrix);
  vec3 env = tpEnvSample(rWorld);
  float fres = pow(1.0 - max(dot(normal, geometryViewDir), 0.0), 3.0);
  vec3 tinted = mix(env, env * diffuseColor.rgb, uReflectTint);
  outgoingLight += tinted * uReflect * mix(0.18, 1.0, fres) * (1.0 - tpMatte);
}
#include <opaque_fragment>`,
      )
    // materials without the crack injection have no tpMatte; give them a zero
    if (!shader.fragmentShader.includes('float tpMatte')) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nfloat tpMatte = 0.0;')
    }
  }
  material.customProgramCacheKey = () => (prevKey ? prevKey.call(material) : '') + '|' + opts.key
}

/** Type guard so callers can pass any material and only standard ones get the injection. */
export function isStandard(m: Material): m is MeshStandardMaterial {
  return (m as MeshStandardMaterial).isMeshStandardMaterial === true
}
