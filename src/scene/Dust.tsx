/**
 * Dust (docs/design-spec.md section 7, Dust; docs/polish-spec.md section 5.4; LOCKED: one
 * InstancedMesh). Billboarded quads whose whole life is computed in the vertex shader from
 * per-instance seeds and a few uniforms, so a burst costs a few uniform writes.
 *
 * The instance array, in order:
 *   kind 3, motes (40 high, 16 low): always drawn, drifting slowly down through the shaft of light,
 *          inside the same cone the DOM shaft paints; they drift only while frames render (the idle
 *          ticker or a strike window) and stand still under reduced motion.
 *   kind 2, smoke (12 high, 6 low): soft puffs rolling out from the foot on each burst.
 *   kind 0, foot grit: rises from the base rim and falls under gravity.
 *   kind 1, top sparks: only when the burst crossed the goal, ember coloured, not tone mapped.
 * Grit and smoke brighten inside the shaft of light. The burst kinds are drawn for 1.6 s after
 * each burst; the motes keep the mesh visible otherwise.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedBufferAttribute, type InstancedMesh, NormalBlending, PlaneGeometry, ShaderMaterial } from 'three'
import { isReducedMotion } from '../lib/motion'
import { useBus } from './bus'
import type { TierSettings } from './tier'
import { COL, renderH } from './tokens'
import { radialTexture } from './textures'

const FOOT_SHARE = 160 / 220
const LIFE_MAX = 1.6

const VERT = /* glsl */ `
uniform float uTime;
uniform float uBurst;
uniform float uTopY;
uniform float uEmber;
uniform float uMoteTime;
attribute vec4 aSeed;
attribute float aKind;
varying float vAlpha;
varying float vKind;
varying float vShaft;
varying vec2 vUv;

void main() {
  float angle = aSeed.x;
  float sp = aSeed.y;
  float off = aSeed.z;
  float sz = aSeed.w;
  float out2 = fract(sp * 7.31 + sz);
  float sz2 = fract(sz * 5.17 + sp);
  vec3 centre;
  float size;
  if (aKind > 2.5) {
    // a mote drifting down through the shaft of light, within the DOM cone's half width
    float y = mod(sp * 4.0 - uMoteTime * 0.045, 4.0) - 0.1;
    float hw = max(0.15, 1.094 - 0.2126 * y);
    centre = vec3((fract(angle * 0.15915) * 2.0 - 1.0) * hw, y, mix(-0.6, 1.4, out2));
    size = mix(0.010, 0.024, sz);
    vAlpha = 0.5 * (0.55 + 0.45 * sin(uMoteTime * 1.1 + sz2 * 7.0)) * smoothstep(-0.1, 0.4, y) * (1.0 - smoothstep(3.3, 3.9, y));
  } else {
    float t = uTime - uBurst - off;
    float life;
    if (aKind > 1.5) {
      // smoke: rolls out from the foot and slows
      float r = mix(0.45, 0.7, sz);
      vec3 origin = vec3(cos(angle) * r, 0.03, sin(angle) * r);
      vec3 vel = vec3(cos(angle) * mix(0.25, 0.45, sp), mix(0.10, 0.25, out2), sin(angle) * mix(0.25, 0.45, sp));
      centre = origin + vel * (1.0 - exp(-max(t, 0.0) * 2.2)) / 2.2;
      life = mix(1.3, 1.6, sz);
      size = mix(0.18, 0.55, sz2);
      vAlpha = pow(max(0.0, 1.0 - t / life), 1.5) * 0.16;
    } else {
      vec3 origin;
      vec3 vel;
      float grav;
      if (aKind < 0.5) {
        float r = mix(0.50, 0.75, sz);
        origin = vec3(cos(angle) * r, 0.02, sin(angle) * r);
        float outward = mix(0.8, 1.6, sp);
        float up = mix(0.6, 1.4, out2);
        vel = vec3(cos(angle) * outward, up, sin(angle) * outward);
        grav = -2.2;
        life = mix(0.7, 1.1, sz);
        size = mix(0.03, 0.09, sz2);
        vAlpha = (1.0 - t / life) * 0.55;
      } else {
        origin = vec3(cos(angle) * 0.2, uTopY, sin(angle) * 0.2);
        float outward = mix(0.3, 0.8, sp);
        float up = mix(1.2, 2.0, out2);
        vel = vec3(cos(angle) * outward, up, sin(angle) * outward);
        grav = -1.6;
        life = mix(1.0, 1.4, sz);
        size = mix(0.02, 0.05, sz2) * step(0.5, uEmber);
        vAlpha = 1.0 - t / life;
      }
      centre = origin + vel * t + vec3(0.0, 0.5 * grav * t * t, 0.0);
    }
    size *= step(0.0, t) * step(t, life);
  }
  vShaft = 1.0 + 1.2 * (1.0 - smoothstep(0.3, 1.1, abs(centre.x)));
  vec4 mv = modelViewMatrix * vec4(centre, 1.0);
  mv.xy += position.xy * (size / 0.05);
  gl_Position = projectionMatrix * mv;
  vKind = aKind;
  vUv = uv;
}
`

const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColorDust;
uniform vec3 uColorSpark;
uniform vec3 uColorSmoke;
uniform vec3 uColorMote;
varying float vAlpha;
varying float vKind;
varying float vShaft;
varying vec2 vUv;

void main() {
  float a = texture2D(uMap, vUv).a * clamp(vAlpha, 0.0, 1.0);
  if (a < 0.004) discard;
  vec3 col;
  if (vKind > 2.5) col = uColorMote;
  else if (vKind > 1.5) col = uColorSmoke * vShaft;
  else if (vKind > 0.5) col = uColorSpark;
  else col = uColorDust * vShaft;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`

type Layout = { motes: number; smoke: number; dust: number; total: number }

function seeds(l: Layout): { seed: Float32Array; kind: Float32Array } {
  const seed = new Float32Array(l.total * 4)
  const kind = new Float32Array(l.total)
  const foot = Math.round(l.dust * FOOT_SHARE)
  let s = 1234567
  const rnd = () => {
    // deterministic LCG so a remount never reshuffles the burst
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = 0; i < l.total; i++) {
    seed[i * 4] = rnd() * Math.PI * 2
    seed[i * 4 + 1] = rnd()
    seed[i * 4 + 2] = rnd() * 0.12
    seed[i * 4 + 3] = rnd()
    const j = i - l.motes - l.smoke
    kind[i] = i < l.motes ? 3 : i < l.motes + l.smoke ? 2 : j < foot ? 0 : 1
  }
  return { seed, kind }
}

export function Dust({ settings }: { settings: TierSettings }) {
  const bus = useBus()
  const mesh = useRef<InstancedMesh>(null)
  const moteTime = useRef(0)
  const layout = useMemo<Layout>(
    () => ({ motes: settings.motes, smoke: settings.smoke, dust: settings.dust, total: settings.motes + settings.smoke + settings.dust }),
    [settings.motes, settings.smoke, settings.dust],
  )

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(0.05, 0.05)
    const { seed, kind } = seeds(layout)
    g.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4))
    g.setAttribute('aKind', new InstancedBufferAttribute(kind, 1))
    return g
  }, [layout])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uBurst: { value: -100 },
          uTopY: { value: 0 },
          uEmber: { value: 0 },
          uMoteTime: { value: 0 },
          uColorDust: { value: new Color(COL.dust) },
          uColorSpark: { value: new Color(COL.spark) },
          uColorSmoke: { value: new Color(COL.smoke) },
          uColorMote: { value: new Color(COL.mote) },
          uMap: { value: radialTexture('soft') },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: NormalBlending,
      }),
    [],
  )

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    const mon = bus.monument.mon
    const now = performance.now() / 1000
    const age = now - mon.burstAt
    const live = mon.dustVisible && age >= 0 && age < LIFE_MAX
    if (!live && mon.dustVisible && age >= LIFE_MAX) mon.dustVisible = false
    // the motes drift only on frames that render, and never under reduced motion
    if (!isReducedMotion()) moteTime.current += Math.min(0.1, Math.max(0, delta))
    const burst = live ? layout.smoke + Math.max(0, Math.min(layout.dust, Math.round(bus.dustCount))) : 0
    m.count = layout.motes + burst
    m.visible = m.count > 0
    const u = material.uniforms
    u.uMoteTime.value = moteTime.current
    if (!live) return
    u.uTime.value = now
    u.uBurst.value = mon.burstAt
    u.uTopY.value = renderH(mon.burstTop)
    u.uEmber.value = mon.burstEmber
  })

  return <instancedMesh ref={mesh} args={[geometry, material, layout.total]} frustumCulled={false} renderOrder={3} />
}
