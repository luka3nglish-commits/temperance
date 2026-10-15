/**
 * tpFx (docs/polish-spec.md section 5.3): one unlit additive program for every light effect in the
 * scene, so the glass ghost, the goal line and its collar, the glow billboards and the shockwave
 * cost one shader compile between them. Every instance has identical source and cache key; the
 * `uMode` uniform picks the effect.
 *
 *   mode 0  the glass ghost (fresnel sleeve with lit arrises above the stone, revealed upward)
 *   mode 1  the goal line (`uRing` 0: a Gaussian core and glow with a travelling glint, sparkle and
 *           the draw-on hot tip) and the collar (`uRing` 1: the same core on a circle)
 *   mode 2  a radial glow (`uRing` 0: a soft disc, billboarded when `uBill` is 1) or a soft ring
 *           band (`uRing` 1: the strike shockwave)
 *
 * Blending is premultiplied additive (ONE, ONE). The canvas is transparent over the DOM temple, so
 * the fragment writes alpha = its brightest channel: a valid premultiplied pixel that composites as
 * light on the page rather than an opaque dark band (three's plain additive leaves alpha at 1).
 */
import { AdditiveBlending, Color, DoubleSide, type IUniform, ShaderMaterial, Vector2 } from 'three'

export const FX_KEY = 'tp-fx'

export type FxMode = 0 | 1 | 2

export type FxUniforms = {
  uMode: IUniform<number>
  uTime: IUniform<number>
  uGold: IUniform<Color>
  uFlashCol: IUniform<Color>
  uFlash: IUniform<number>
  uDraw: IUniform<number>
  uHot: IUniform<Color>
  uSweepX: IUniform<number>
  uSparkle: IUniform<number>
  uH: IUniform<number>
  uReveal: IUniform<number>
  uAlpha: IUniform<number>
  uColor: IUniform<Color>
  uRing: IUniform<number>
  uRingR: IUniform<Vector2>
  uBill: IUniform<number>
  uBillScale: IUniform<Vector2>
}

const VERT = /* glsl */ `
uniform int uMode;
uniform float uBill;
uniform vec2 uBillScale;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying vec3 vV;
varying vec2 vXZ;

void main() {
  vUv = uv;
  vec3 p = position;
  if (uMode == 0) {
    // the ghost follows the shaft's entasis
    float wy = (modelMatrix * vec4(p, 1.0)).y;
    p.xz *= 1.0 - 0.08 * smoothstep(0.5, 2.0, wy);
  }
  vXZ = p.xz;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vW = wp.xyz;
  vec4 mv;
  if (uBill > 0.5) {
    mv = viewMatrix * vec4(modelMatrix[3].xyz, 1.0);
    mv.xy += p.xy * uBillScale;
  } else {
    mv = viewMatrix * wp;
  }
  vN = normalize(normalMatrix * normal);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`

const FRAG = /* glsl */ `
uniform int uMode;
uniform float uTime;
uniform vec3 uGold;
uniform vec3 uFlashCol;
uniform float uFlash;
uniform float uDraw;
uniform vec3 uHot;
uniform float uSweepX;
uniform float uSparkle;
uniform float uH;
uniform float uReveal;
uniform float uAlpha;
uniform vec3 uColor;
uniform float uRing;
uniform vec2 uRingR;
varying vec2 vUv;
varying vec3 vW;
varying vec3 vN;
varying vec3 vV;
varying vec2 vXZ;

void main() {
  vec3 c = vec3(0.0);
  if (uMode == 0) {
    float above = smoothstep(uH + 0.004, uH + 0.05, vW.y);
    float rev = 1.0 - smoothstep(uReveal * 2.0 - 0.04, uReveal * 2.0, vW.y);
    // glass: bright thin silhouettes, faint lit arrises across the face, a nearly clear interior
    float nv = abs(dot(normalize(vN), normalize(vV)));
    float fres = pow(1.0 - nv, 2.2);
    float edge = pow(1.0 - nv, 5.0);
    float arris = pow(0.5 + 0.5 * cos(20.0 * atan(vXZ.y, vXZ.x)), 24.0);
    float top = 1.0 - 0.4 * smoothstep(1.75, 2.0, vW.y);
    c = uGold * (edge * 0.19 + fres * 0.015 + arris * (0.012 + 0.045 * fres)) * above * rev * top * uAlpha;
  } else if (uMode == 1) {
    float yy;
    float x;
    float edge = 1.0;
    if (uRing > 0.5) {
      // the collar: a circle of radius uRingR.x, half width uRingR.y
      yy = (length(vXZ) - uRingR.x) / uRingR.y;
      x = atan(vXZ.y, vXZ.x) * uRingR.x;
    } else {
      yy = (vUv.y - 0.5) * 0.10 / 0.006;
      x = (vUv.x - 0.5) * 6.0;
      edge = 1.0 - smoothstep(0.7, 1.0, abs(vUv.y - 0.5) * 2.0);
    }
    float core = exp(-yy * yy);
    // the collar is a fine ring, not a halo: a quarter of the line's glow
    float glow = exp(-abs(yy) * 0.22) * 0.18 * edge * (1.0 - 0.75 * uRing);
    float glint = pow(max(0.0, 1.0 - abs(x - uSweepX) / 0.45), 3.0) * (1.0 - uRing);
    float spark = uSparkle * step(0.985, fract(sin(floor(x * 90.0) * 12.9898 + floor(uTime * 6.0) * 78.233) * 43758.5453)) * 0.6;
    c = uGold * (core * (0.85 + 0.9 * glint + spark) + glow * (1.0 + 1.5 * glint));
    c = mix(c, uFlashCol * (core + glow) * 1.4, uFlash);
    c *= 1.0 - 0.35 * uRing;
    if (uRing < 0.5) {
      c *= step(vUv.x, uDraw);
      c += uHot * exp(-pow((vUv.x - uDraw) * 60.0, 2.0)) * (1.0 - step(0.999, uDraw)) * 2.0 * core;
    }
    c *= uAlpha;
  } else {
    float a;
    if (uRing > 0.5) {
      float r = length(vXZ);
      float mid = 0.5 * (uRingR.x + uRingR.y);
      float half_ = 0.5 * (uRingR.y - uRingR.x);
      float d = abs(r - mid) / max(half_, 1e-4);
      a = 1.0 - smoothstep(0.2, 1.0, d);
    } else {
      float r = length(vUv * 2.0 - 1.0);
      a = pow(max(0.0, 1.0 - r), 2.2);
    }
    c = uColor * a * uAlpha;
  }
  gl_FragColor = vec4(c, clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0));
  #include <colorspace_fragment>
}
`

export type FxOptions = {
  mode: FxMode
  /** mode 1 collar or mode 2 shockwave */
  ring?: boolean
  /** mode 1 ring: [radius, half width]; mode 2 ring: [inner, outer] */
  ringR?: [number, number]
  /** mode 2: face the camera, scaled by billScale (a unit plane) */
  billboard?: boolean
  billScale?: [number, number]
  /** mode 2 colour (hex) */
  color?: string
  alpha?: number
}

export type FxMaterial = ShaderMaterial & { uniforms: FxUniforms }

export function createFxMaterial(opts: FxOptions): FxMaterial {
  const uniforms: FxUniforms = {
    uMode: { value: opts.mode },
    uTime: { value: 0 },
    uGold: { value: new Color('#D8B45A') },
    uFlashCol: { value: new Color('#FFF7DA') },
    uFlash: { value: 0 },
    uDraw: { value: 1 },
    uHot: { value: new Color('#FFF7DA') },
    uSweepX: { value: 0 },
    uSparkle: { value: 0 },
    uH: { value: 0 },
    uReveal: { value: 1 },
    uAlpha: { value: opts.alpha ?? 1 },
    uColor: { value: new Color(opts.color ?? '#D8B45A') },
    uRing: { value: opts.ring ? 1 : 0 },
    uRingR: { value: new Vector2(...(opts.ringR ?? [0.5, 0.0075])) },
    uBill: { value: opts.billboard ? 1 : 0 },
    uBillScale: { value: new Vector2(...(opts.billScale ?? [1, 1])) },
  }
  const m = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    side: DoubleSide,
    fog: false,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
  })
  m.customProgramCacheKey = () => FX_KEY
  return m as FxMaterial
}
