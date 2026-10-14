/**
 * The capital (docs/design-spec.md section 7, Capital): a flat gold torus riding the top of the
 * column as a child of the break group, so it inherits the over-goal tilt. Its emissive pulses
 * 0 to 0.6 to 0 over 300 ms on each strike (`mon.capital`). Gold is a metal, so without an
 * environment map it would read black; the painted environment is mirrored into it, tinted gold.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Mesh, MeshStandardMaterial } from 'three'
import { useBus } from './bus'
import { DEBUG } from './debugFlags'
import { injectReflection } from './environment'
import { COL, GOAL_Y } from './tokens'

export function Capital() {
  const bus = useBus()
  const mesh = useRef<Mesh>(null)
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({
      color: new Color(COL.capital),
      metalness: 1,
      roughness: 0.22,
      emissive: new Color(COL.capitalEmissive),
      emissiveIntensity: 0,
    })
    if (!DEBUG.noenv) injectReflection(m, { strength: 1.4, tint: 1, key: 'gold' })
    return m
  }, [])
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const mon = bus.monument.mon
    const m = mesh.current
    if (m) {
      m.position.y = Math.max(0, mon.h - GOAL_Y)
      m.visible = mon.h > 0.001
    }
    material.emissiveIntensity = mon.capital
  })

  return (
    <mesh ref={mesh} rotation={[Math.PI / 2, 0, 0]} material={material}>
      <torusGeometry args={[0.47, 0.018, 12, 64]} />
    </mesh>
  )
}
