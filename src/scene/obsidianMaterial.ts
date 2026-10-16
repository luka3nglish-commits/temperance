/**
 * The obsidian material (docs/polish-spec.md sections 5.2 and 5.3): one MeshStandardMaterial
 * program shared by every obsidian surface in the scene (the shaft, the plinth, the base and the
 * abacus). `createObsidianMaterial` always builds the same class with the same onBeforeCompile
 * source and the same `customProgramCacheKey`, so three compiles one program however many
 * materials exist; the uniforms belong to each material (never `Material.clone()`, which drops
 * onBeforeCompile).
 *
 * Injection: 20 flutes (gated by `uFluteOn`, so a box or a lathe passes through untouched): the
 * vertex carves the silhouette scallop and the entasis, the fragment tilts the normal across each
 * flute so every flute carries two thin light lines from the painted strips; a voronoi crack field above the goal line in the fragment stage with ember emissive
 * in the fissures (skipped entirely while `uCrack` is 0 or the pixel is below the line), then the
 * painted-environment reflection with a Schlick fresnel and a warm rim (environment.ts). Loop
 * bounds come from the `uDepth` uniform (GLSL ES 3.00, so WebGL2 only).
 */
import { Color, type IUniform, MeshStandardMaterial, Vector3 } from 'three'
import { DEBUG } from './debugFlags'
import { injectReflection, type ReflectionUniforms } from './environment'
import { COL, EMBER_EMISSIVE, GOAL_Y } from './tokens'

/** The crack and turn state. One set is shared by the column shaft and its crown so they crack together. */
export type ObsidianUniforms = {
  uCrack: IUniform<number>
  uGoalY: IUniform<number>
  uTime: IUniform<number>
  uDepth: IUniform<number>
  uScale: IUniform<number>
  uFlute: IUniform<number>
  /** per-pixel flute wall tilt (0.55: up to 29 degrees) */
  uFluteDepth: IUniform<number>
  uEmber: IUniform<Vector3>
  /** the idle turn, removed from the world position so the crack pattern stays on the stone */
  uTurn: IUniform<number>
  /** the charge glint (polish-spec 5.4): a band of light at world Y uGlintY while uGlintOn > 0 */
  uGlintY: IUniform<number>
  uGlintOn: IUniform<number>
  uGlintCol: IUniform<Color>
}

export function createObsidianUniforms(depth: 0 | 1, flute: number): ObsidianUniforms {
  return {
    uCrack: { value: 0 },
    uGoalY: { value: GOAL_Y },
    uTime: { value: 0 },
    uDepth: { value: depth },
    uScale: { value: 6.0 },
    uFlute: { value: flute },
    uFluteDepth: { value: 0.55 },
    uEmber: { value: new Vector3(...EMBER_EMISSIVE) },
    uTurn: { value: 0 },
    uGlintY: { value: 0 },
    uGlintOn: { value: 0 },
    uGlintCol: { value: new Color('#F6E3A1') },
  }
}

const VERT_PARS = /* glsl */ `
uniform float uFlute;
uniform float uFluteOn;
uniform float uTurn;
varying vec3 vWorldPos;
varying vec2 vFluteXZ;
varying float vSide;
varying vec3 vTanV;
`

// 20 flutes. The vertex only carves the silhouette scallop (deepest at the flute centre, a =
// (k + 0.5) * 2pi / 20, where the fragment's w is 0) and tapers the shaft 8 percent toward the top;
// the light lines come from the per-pixel normal in the fragment stage.
const VERT_BODY = /* glsl */ `
{
  vSide = 0.0;
  vFluteXZ = transformed.xz;
  vTanV = vec3(0.0, 0.0, 1.0);
  if (uFluteOn > 0.5) {
    float wy = (modelMatrix * vec4(transformed, 1.0)).y;
    float a = atan(transformed.z, transformed.x);
    float f = 0.5 - 0.5 * cos(20.0 * a);
    vec3 radial = normalize(vec3(transformed.x, 0.0, transformed.z) + vec3(1e-6, 0.0, 0.0));
    transformed -= radial * uFlute * f;
    transformed.xz *= 1.0 - 0.08 * smoothstep(0.5, 2.0, wy);
    vFluteXZ = transformed.xz;
    vSide = 1.0 - step(0.5, abs(objectNormal.y));
    vTanV = normalize(normalMatrix * vec3(-sin(a), 0.0, cos(a)));
  }
  vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
  float cu = cos(-uTurn);
  float su = sin(-uTurn);
  vWorldPos = vec3(cu * wp.x + su * wp.z, wp.y, -su * wp.x + cu * wp.z);
}
`

const FRAG_PARS = /* glsl */ `
uniform float uCrack;
uniform float uGoalY;
uniform float uTime;
uniform int uDepth;
uniform float uScale;
uniform vec3 uEmber;
uniform float uGlintY;
uniform float uGlintOn;
uniform vec3 uGlintCol;
uniform float uFluteOn;
uniform float uFluteDepth;
varying vec3 vWorldPos;
varying vec2 vFluteXZ;
varying float vSide;
varying vec3 vTanV;

vec3 tpHash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}

void tpVoro(vec3 p3, vec2 p2, int depth, out float f1, out float f2) {
  vec3 p = depth > 0 ? p3 : vec3(p2, 0.0);
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  f1 = 8.0;
  f2 = 8.0;
  for (int z = -depth; z <= depth; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 o = tpHash3(ip + g);
        if (depth == 0) o.z = 0.0;
        vec3 r = g + o - fp;
        float d = dot(r, r);
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
  }
  f1 = sqrt(f1);
  f2 = sqrt(f2);
}
`

// the crack field only exists above the line on an over day: everything else skips the 27 hash taps
const FRAG_COLOR = /* glsl */ `
float tpF1 = 0.0;
float tpF2 = 0.0;
float tpC = 0.0;
if (uCrack > 0.001 && vWorldPos.y > uGoalY - 0.05) {
  float above = smoothstep(uGoalY - 0.02, uGoalY + 0.06, vWorldPos.y);
  vec3 p3 = vWorldPos * uScale;
  vec2 p2 = vec2(atan(vWorldPos.z, vWorldPos.x) * 0.36, vWorldPos.y) * uScale;
  tpVoro(p3, p2, uDepth, tpF1, tpF2);
  float edge = 1.0 - smoothstep(0.0, 0.06 + 0.04 * uCrack, tpF2 - tpF1);
  float climb = smoothstep(0.0, 1.0, uCrack * 1.6 - (vWorldPos.y - uGoalY) * 0.6);
  tpC = above * uCrack * edge * climb;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), tpC);
}
float tpMatte = tpC;
`

const FRAG_ROUGH = /* glsl */ `
roughnessFactor = mix(roughnessFactor, 1.0, tpC);
`

// geometryViewDir is declared later (lights_fragment_begin): the view direction here is vViewPosition
const FRAG_NORMAL = /* glsl */ `
normal = normalize(normal + 0.6 * tpC * vec3(dFdx(tpF1), dFdy(tpF1), 0.0));
if (uFluteOn > 0.5 && vSide > 0.5) {
  float fa = atan(vFluteXZ.y, vFluteXZ.x);
  float w = fract(fa * 20.0 / 6.28318530718) - 0.5;
  float fillet = smoothstep(0.40, 0.46, abs(w));
  float facing = clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0);
  float slope = -2.0 * w * uFluteDepth * (1.0 - fillet) * smoothstep(0.08, 0.35, facing);
  normal = normalize(normal + normalize(vTanV) * slope);
}
`

const FRAG_EMISSIVE = /* glsl */ `
totalEmissiveRadiance += tpC * uEmber * (0.8 + 0.2 * sin(uTime * 3.0 + tpF1 * 20.0));
if (uGlintOn > 0.001) {
  float gy = (vWorldPos.y - uGlintY) / 0.06;
  totalEmissiveRadiance += uGlintCol * 0.35 * exp(-gy * gy) * uGlintOn;
}
`

/** the one cache key every obsidian material reports */
export const OBSIDIAN_KEY = 'tp-obsidian'

function inject(material: MeshStandardMaterial, uniforms: ObsidianUniforms, fluteOn: IUniform<number>): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { uFluteOn: fluteOn })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_BODY)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + FRAG_ROUGH)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + FRAG_NORMAL)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + FRAG_EMISSIVE)
  }
  material.customProgramCacheKey = () => OBSIDIAN_KEY
}

export type ObsidianOptions = {
  color?: string
  roughness: number
  /** 1 on the fluted shaft, 0 on the plinth, base and abacus */
  fluteOn: 0 | 1
  /** Schlick F0 floor */
  f0: number
  /** reflection strength (`uReflect`) */
  reflect: number
  /** warm rim strength (`uRim`) */
  rim: number
  /** shared crack and turn state; a fresh, uncracked set when absent */
  uniforms?: ObsidianUniforms
}

export type ObsidianMaterial = MeshStandardMaterial & {
  tp: { uniforms: ObsidianUniforms; reflect: ReflectionUniforms | null; fluteOn: IUniform<number> }
}

export function createObsidianMaterial(opts: ObsidianOptions): ObsidianMaterial {
  const m = new MeshStandardMaterial({
    color: new Color(opts.color ?? COL.column),
    roughness: opts.roughness,
    metalness: 0,
    // the Neutral tone map's toe subtracts the darkest channel from every dark tone: it crushed the
    // stone to black and turned its warm reflections olive. Obsidian renders untoned (still one program).
    toneMapped: false,
  })
  const uniforms = opts.uniforms ?? createObsidianUniforms(0, 0)
  const fluteOn: IUniform<number> = { value: opts.fluteOn }
  if (!DEBUG.nocrack) inject(m, uniforms, fluteOn)
  const reflect = DEBUG.noenv ? null : injectReflection(m, { strength: opts.reflect, tint: 0, f0: opts.f0, rimColor: COL.rimEdge, rim: opts.rim, key: 'refl' })
  return Object.assign(m, { tp: { uniforms, reflect, fluteOn } })
}

/**
 * The gold material (capital, gilded arrises, fillets): metal tinted reflection, no rim. Every gold
 * material shares one program; each keeps its own emissive (only the capital pulses).
 */
export function createGoldMaterial(): MeshStandardMaterial & { tp: { reflect: ReflectionUniforms | null } } {
  const m = new MeshStandardMaterial({
    color: new Color(COL.capital),
    metalness: 1,
    roughness: 0.22,
    emissive: new Color(COL.capitalEmissive),
    emissiveIntensity: 0,
  })
  const reflect = DEBUG.noenv ? null : injectReflection(m, { strength: 1.4, tint: 1, f0: 1.0, rim: 0, key: 'gold' })
  return Object.assign(m, { tp: { reflect } })
}
