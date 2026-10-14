/**
 * Dust (docs/design-spec.md section 7, Dust; LOCKED: one InstancedMesh). 220 billboarded quads
 * (90 on low tier) whose whole life is computed in the vertex shader from per-instance seeds and
 * three burst uniforms, so a burst costs two uniform writes (`uBurst`, `uTopY`) plus `uEmber`.
 * Kind 0 (foot, 160): rises from the plinth rim and falls under gravity. Kind 1 (top spark, 60):
 * only when the burst crossed the goal, ember coloured, not tone mapped. Mounted invisible so its
 * program compiles in the shader gate; visible for 1.6 s after each burst.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedBufferAttribute, type InstancedMesh, NormalBlending, PlaneGeometry, ShaderMaterial } from 'three'
import { useBus } from './bus'
import type { TierSettings } from './tier'
import { COL } from './tokens'
import { radialTexture } from './textures'

const FOOT_SHARE = 160 / 220
const LIFE_MAX = 1.6

const VERT = /* glsl */ `
uniform float uTime;
uniform float uBurst;
uniform float uTopY;
uniform float uEmber;
attribute vec4 aSeed;
attribute float aKind;
varying float vAlpha;
varying float vKind;
varying vec2 vUv;

void main() {
  float angle = aSeed.x;
  float sp = aSeed.y;
  float off = aSeed.z;
  float sz = aSeed.w;
  float t = uTime - uBurst - off;
  vec3 origin;
  vec3 vel;
  float grav;
  float life;
  float size;
  float out2 = fract(sp * 7.31 + sz);
  float sz2 = fract(sz * 5.17 + sp);
  if (aKind < 0.5) {
    float r = mix(0.55, 0.9, sz);
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
  float alive = step(0.0, t) * step(t, life);
  size *= alive;
  vec3 centre = origin + vel * t + vec3(0.0, 0.5 * grav * t * t, 0.0);
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
varying float vAlpha;
varying float vKind;
varying vec2 vUv;

void main() {
  float a = texture2D(uMap, vUv).a * clamp(vAlpha, 0.0, 1.0);
  if (a < 0.004) discard;
  vec3 col = mix(uColorDust, uColorSpark, step(0.5, vKind));
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`

function seeds(count: number): { seed: Float32Array; kind: Float32Array } {
  const seed = new Float32Array(count * 4)
  const kind = new Float32Array(count)
  const foot = Math.round(count * FOOT_SHARE)
  let s = 1234567
  const rnd = () => {
    // deterministic LCG so a remount never reshuffles the burst
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = 0; i < count; i++) {
    seed[i * 4] = rnd() * Math.PI * 2
    seed[i * 4 + 1] = rnd()
    seed[i * 4 + 2] = rnd() * 0.12
    seed[i * 4 + 3] = rnd()
    kind[i] = i < foot ? 0 : 1
  }
  return { seed, kind }
}

export function Dust({ settings }: { settings: TierSettings }) {
  const bus = useBus()
  const mesh = useRef<InstancedMesh>(null)
  const max = settings.dust

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(0.05, 0.05)
    const { seed, kind } = seeds(max)
    g.setAttribute('aSeed', new InstancedBufferAttribute(seed, 4))
    g.setAttribute('aKind', new InstancedBufferAttribute(kind, 1))
    return g
  }, [max])

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
          uColorDust: { value: new Color(COL.dust) },
          uColorSpark: { value: new Color(COL.spark) },
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

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const mon = bus.monument.mon
    const now = performance.now() / 1000
    const age = now - mon.burstAt
    const live = mon.dustVisible && age >= 0 && age < LIFE_MAX
    if (!live && mon.dustVisible && age >= LIFE_MAX) mon.dustVisible = false
    m.visible = live
    if (!live) return
    m.count = Math.max(1, Math.min(max, Math.round(bus.dustCount)))
    const u = material.uniforms
    u.uTime.value = now
    u.uBurst.value = mon.burstAt
    u.uTopY.value = mon.burstTop
    u.uEmber.value = mon.burstEmber
  })

  return <instancedMesh ref={mesh} args={[geometry, material, max]} frustumCulled={false} visible={false} renderOrder={3} />
}
