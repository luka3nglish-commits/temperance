/**
 * The column (docs/design-spec.md section 7, Column and Over goal). One cylinder geometry with its
 * base at the origin, shared by two meshes and one obsidian material: `base` scales to min(H, 2),
 * `overflow` sits in the `break` group at Y min(H, 2) and scales to max(0, H - 2). The break group
 * carries the 2.5 degree tilt and 0.03 shift as uCrack reaches 1, and the capital rides its top.
 * The outer group turns in idle; `uTurn` removes that turn in the shader so the crack field stays
 * on the stone. The ember glow sprite sits above the goal line, additive, opacity 0.5 * uCrack.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CylinderGeometry, type Group, type Mesh, type Sprite, type SpriteMaterial } from 'three'
import { useBus } from './bus'
import { createObsidianMaterial, createObsidianUniforms } from './obsidianMaterial'
import { getTier, tierSettings, type TierSettings } from './tier'
import { Capital } from './Capital'
import { COL, GOAL_Y } from './tokens'
import { radialTexture } from './textures'

const TILT = 0.0436 // 2.5 degrees
const EPS = 0.0005

export function Column({ settings }: { settings: TierSettings }) {
  const bus = useBus()
  const turn = useRef<Group>(null)
  const base = useRef<Mesh>(null)
  const brk = useRef<Group>(null)
  const over = useRef<Mesh>(null)
  const glow = useRef<Sprite>(null)
  const glowMat = useRef<SpriteMaterial>(null)

  const geometry = useMemo(() => {
    const g = new CylinderGeometry(0.46, 0.46, 1, settings.physical ? 48 : 24, 1)
    g.translate(0, 0.5, 0)
    return g
  }, [settings.physical])
  const uniforms = useMemo(() => createObsidianUniforms(settings.uDepth, settings.uFlute), [settings.uDepth, settings.uFlute])
  const material = useMemo(() => createObsidianMaterial(settings.physical, uniforms), [settings.physical, uniforms])
  const glowTex = useMemo(() => radialTexture('glow'), [])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const mon = bus.monument.mon
    const h = Math.max(0, mon.h)
    const lower = Math.min(h, GOAL_Y)
    const upper = Math.max(0, h - GOAL_Y)
    const c = mon.crack

    if (turn.current) turn.current.rotation.y = mon.rotY
    const b = base.current
    if (b) {
      b.visible = lower > EPS
      b.scale.y = Math.max(EPS, lower)
    }
    const k = brk.current
    if (k) {
      k.position.y = lower
      k.position.x = 0.03 * c
      k.rotation.z = -TILT * c
    }
    const o = over.current
    if (o) {
      o.visible = upper > EPS
      o.scale.y = Math.max(EPS, upper)
    }

    uniforms.uCrack.value = c
    uniforms.uTime.value = mon.crackTime
    uniforms.uTurn.value = mon.rotY
    // a mid-session downgrade drops to the 9-tap voronoi at once (a uniform, no recompile)
    uniforms.uDepth.value = Math.min(settings.uDepth, tierSettings(getTier() === 'none' ? 'low' : getTier()).uDepth)

    const g = glow.current
    if (g) {
      g.visible = c > 0.001
      const pulse = 1 + 0.05 * Math.sin(mon.emberPulse * Math.PI)
      g.scale.set(1.3 * pulse, 0.9 * pulse, 1)
    }
    if (glowMat.current) glowMat.current.opacity = 0.5 * c
  })

  return (
    <>
      <group ref={turn}>
        <mesh ref={base} geometry={geometry} material={material} />
        <group ref={brk}>
          <mesh ref={over} geometry={geometry} material={material} />
          <Capital />
        </group>
      </group>
      <sprite ref={glow} position={[0, 2.25, 0.35]} scale={[1.3, 0.9, 1]} visible={false} renderOrder={2}>
        <spriteMaterial ref={glowMat} map={glowTex} color={COL.ember} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </>
  )
}
