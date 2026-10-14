/**
 * The capital (docs/design-spec.md section 7, Capital): a flat gold torus riding the top of the
 * column as a child of the break group, so it inherits the over-goal tilt. Its emissive pulses
 * 0 to 0.6 to 0 over 300 ms on each strike (`mon.capital`).
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial } from 'three'
import { useBus } from './bus'
import { COL, GOAL_Y } from './tokens'

export function Capital() {
  const bus = useBus()
  const mesh = useRef<Mesh>(null)
  const mat = useRef<MeshStandardMaterial>(null)

  useFrame(() => {
    const mon = bus.monument.mon
    const m = mesh.current
    if (m) {
      m.position.y = Math.max(0, mon.h - GOAL_Y)
      m.visible = mon.h > 0.001
    }
    if (mat.current) mat.current.emissiveIntensity = mon.capital
  })

  return (
    <mesh ref={mesh} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.47, 0.018, 12, 64]} />
      <meshStandardMaterial ref={mat} color={COL.capital} metalness={1} roughness={0.22} emissive={COL.capitalEmissive} emissiveIntensity={0} />
    </mesh>
  )
}
