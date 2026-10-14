/**
 * The plinth (docs/design-spec.md section 7, Plinth): an upper RoundedBox 1.9 x 0.32 x 1.9 whose
 * top is Y 0, a lower step 2.5 x 0.10 x 2.5, the gold inlay as drei Edges on the upper step (built
 * from a plain box so only the twelve true edges draw, not the bevel rings), and a radial contact
 * shadow plane under both. Four draw calls, nothing animates.
 */
import { useEffect, useMemo } from 'react'
import { RoundedBox, Edges } from '@react-three/drei'
import { BoxGeometry, DoubleSide } from 'three'
import { COL } from './tokens'
import { radialTexture } from './textures'

export function Plinth() {
  const inlay = useMemo(() => new BoxGeometry(1.9, 0.32, 1.9), [])
  useEffect(() => () => inlay.dispose(), [inlay])
  const shadow = useMemo(() => radialTexture('shadow'), [])

  return (
    <group>
      <RoundedBox args={[1.9, 0.32, 1.9]} radius={0.02} smoothness={3} bevelSegments={2} position={[0, -0.16, 0]}>
        <meshStandardMaterial color={COL.plinth} roughness={0.5} metalness={0.05} envMapIntensity={0.8} />
        <Edges geometry={inlay} color={COL.capital} transparent opacity={0.5} lineWidth={1} />
      </RoundedBox>
      <RoundedBox args={[2.5, 0.1, 2.5]} radius={0.02} smoothness={3} bevelSegments={2} position={[0, -0.37, 0]}>
        <meshStandardMaterial color={COL.plinth} roughness={0.5} metalness={0.05} envMapIntensity={0.8} />
      </RoundedBox>
      <mesh position={[0, -0.425, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[3.2, 3.2]} />
        <meshBasicMaterial color="#000000" map={shadow} transparent opacity={0.6} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  )
}
