/**
 * The obsidian column material (docs/design-spec.md section 7, Obsidian material).
 * MeshPhysical with clearcoat on high tier, MeshStandard on low, one onBeforeCompile injection on
 * either: 16 flutes in the vertex stage, a voronoi crack field above the goal line in the fragment
 * stage with ember emissive in the fissures. Loop bounds come from the `uDepth` uniform (GLSL ES
 * 3.00, so WebGL2 only). Uniforms are assigned by reference so the scene writes them each frame.
 */
import { Color, type IUniform, MeshPhysicalMaterial, MeshStandardMaterial, Vector3 } from 'three'
import { DEBUG } from './debugFlags'
import { injectReflection } from './environment'
import { COL, EMBER_EMISSIVE, GOAL_Y } from './tokens'

export type ObsidianUniforms = {
  uCrack: IUniform<number>
  uGoalY: IUniform<number>
  uTime: IUniform<number>
  uDepth: IUniform<number>
  uScale: IUniform<number>
  uFlute: IUniform<number>
  uEmber: IUniform<Vector3>
  /** the idle turn, removed from the world position so the crack pattern stays on the stone */
  uTurn: IUniform<number>
}

export function createObsidianUniforms(depth: 0 | 1, flute: number): ObsidianUniforms {
  return {
    uCrack: { value: 0 },
    uGoalY: { value: GOAL_Y },
    uTime: { value: 0 },
    uDepth: { value: depth },
    uScale: { value: 6.0 },
    uFlute: { value: flute },
    uEmber: { value: new Vector3(...EMBER_EMISSIVE) },
    uTurn: { value: 0 },
  }
}

const VERT_PARS = /* glsl */ `
uniform float uFlute;
uniform float uTurn;
varying vec3 vWorldPos;
`

const VERT_BODY = /* glsl */ `
{
  float a = atan(transformed.z, transformed.x);
  float f = 0.5 + 0.5 * cos(16.0 * a);
  vec3 radial = normalize(vec3(transformed.x, 0.0, transformed.z));
  transformed -= radial * uFlute * f;
  vec3 tang = vec3(-sin(a), 0.0, cos(a));
  objectNormal = normalize(objectNormal + tang * (uFlute * 8.0 * sin(16.0 * a)) / 0.46);
  transformedNormal = normalMatrix * objectNormal;
  #ifdef FLIP_SIDED
    transformedNormal = -transformedNormal;
  #endif
  #ifndef FLAT_SHADED
    vNormal = normalize(transformedNormal);
  #endif
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
varying vec3 vWorldPos;

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

const FRAG_COLOR = /* glsl */ `
float tpF1 = 0.0;
float tpF2 = 0.0;
float tpC = 0.0;
{
  float above = smoothstep(uGoalY - 0.02, uGoalY + 0.15, vWorldPos.y);
  vec3 p3 = vWorldPos * uScale;
  vec2 p2 = vec2(atan(vWorldPos.z, vWorldPos.x) * 0.46, vWorldPos.y) * uScale;
  tpVoro(p3, p2, uDepth, tpF1, tpF2);
  float edge = 1.0 - smoothstep(0.0, 0.06 + 0.04 * uCrack, tpF2 - tpF1);
  float climb = smoothstep(0.0, 1.0, uCrack * 1.4 - (vWorldPos.y - uGoalY) * 0.6);
  tpC = above * uCrack * edge * climb;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), tpC);
}
float tpMatte = tpC;
`

const FRAG_ROUGH = /* glsl */ `
roughnessFactor = mix(roughnessFactor, 1.0, tpC);
`

const FRAG_NORMAL = /* glsl */ `
normal = normalize(normal + 0.6 * tpC * vec3(dFdx(tpF1), dFdy(tpF1), 0.0));
`

const FRAG_EMISSIVE = /* glsl */ `
totalEmissiveRadiance += tpC * uEmber * (0.8 + 0.2 * sin(uTime * 3.0 + tpF1 * 20.0));
`

function inject(material: MeshStandardMaterial, uniforms: ObsidianUniforms, key: string): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
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
  material.customProgramCacheKey = () => key
}

export function createObsidianMaterial(physical: boolean, uniforms: ObsidianUniforms): MeshStandardMaterial {
  if (physical && !DEBUG.std) {
    const m = new MeshPhysicalMaterial({
      color: new Color(COL.column),
      roughness: 0.16,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.6,
    })
    if (!DEBUG.nocrack) inject(m, uniforms, 'tp-obsidian-phys')
    if (!DEBUG.noenv) injectReflection(m, { strength: 0.9, tint: 0, key: 'refl' })
    return m
  }
  // polished obsidian: low roughness, the mirrored highlights come from injectReflection
  const m = new MeshStandardMaterial({
    color: new Color(COL.column),
    roughness: 0.18,
    metalness: 0.1,
  })
  if (!DEBUG.nocrack) inject(m, uniforms, 'tp-obsidian-std')
  if (!DEBUG.noenv) injectReflection(m, { strength: 0.9, tint: 0, key: 'refl' })
  return m
}
