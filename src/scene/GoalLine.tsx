/**
 * The gold goal line (docs/design-spec.md section 7, Goal line): a slab wider than the frustum at
 * Y 2.0 (the column occludes it where it passes through), an additive glow slab, a flat ring and
 * a glow sprite. The opening draws the slab from the left edge (`mon.goalX`) while ring and sprite
 * fade in (`mon.goalFade`); a crossing flashes slab and ring to #FFF7DA and the sprite to 0.9
 * (`mon.flash`), decaying to rest.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, type Mesh, type MeshBasicMaterial, type Sprite, type SpriteMaterial } from 'three'
import { useBus } from './bus'
import { COL, GOAL_Y } from './tokens'
import { radialTexture } from './textures'

const HALF = 3.0

export function GoalLine() {
  const bus = useBus()
  const slab = useRef<Mesh>(null)
  const glow = useRef<Mesh>(null)
  const slabMat = useRef<MeshBasicMaterial>(null)
  const ringMat = useRef<MeshBasicMaterial>(null)
  const glowMat = useRef<MeshBasicMaterial>(null)
  const sprite = useRef<Sprite>(null)
  const spriteMat = useRef<SpriteMaterial>(null)
  const tex = useMemo(() => radialTexture('glow'), [])
  const colours = useMemo(() => ({ line: new Color(COL.goalLine), flash: new Color(COL.goalFlash), tmp: new Color() }), [])

  useFrame(() => {
    const mon = bus.monument.mon
    const x = Math.max(0, Math.min(1, mon.goalX))
    const fade = Math.max(0, Math.min(1, mon.goalFade))
    const flash = Math.max(0, Math.min(1, mon.flash))
    for (const m of [slab.current, glow.current]) {
      if (!m) continue
      m.visible = x > 0.001
      m.scale.x = Math.max(0.0001, x)
      m.position.x = -HALF + HALF * x
    }
    colours.tmp.copy(colours.line).lerp(colours.flash, flash)
    if (slabMat.current) slabMat.current.color.copy(colours.tmp)
    if (ringMat.current) {
      ringMat.current.color.copy(colours.tmp)
      ringMat.current.opacity = fade
    }
    if (glowMat.current) glowMat.current.opacity = 0.16 + 0.14 * flash
    if (sprite.current) sprite.current.visible = fade > 0.001
    if (spriteMat.current) spriteMat.current.opacity = (0.35 + 0.55 * flash) * fade
  })

  return (
    <group>
      <mesh ref={slab} position={[0, GOAL_Y, 0]} renderOrder={1}>
        <boxGeometry args={[6.0, 0.012, 0.012]} />
        <meshBasicMaterial ref={slabMat} color={COL.goalLine} toneMapped={false} />
      </mesh>
      <mesh ref={glow} position={[0, GOAL_Y, 0]} renderOrder={1}>
        <boxGeometry args={[6.0, 0.06, 0.06]} />
        <meshBasicMaterial ref={glowMat} color={COL.goalGlow} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, GOAL_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <ringGeometry args={[0.56, 0.575, 96]} />
        <meshBasicMaterial ref={ringMat} color={COL.goalLine} side={DoubleSide} transparent opacity={0} toneMapped={false} />
      </mesh>
      <sprite ref={sprite} position={[0, GOAL_Y, 0.5]} scale={[1.6, 0.28, 1]} visible={false} renderOrder={2}>
        <spriteMaterial ref={spriteMat} map={tex} color={COL.goalGlow} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  )
}
