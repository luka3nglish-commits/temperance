/**
 * Lights (docs/polish-spec.md section 5.2). Warm ambient, the key spot moved low and right, the
 * warm rim directional behind left, the one moving sweep point light (idle orbit on the 14 s
 * period, the opening pass, follows the tilt by `T.follow` rad) and the ember point light under the
 * cracks, mounted at intensity 0 so its program compiles in the gate. No environment map.
 */
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { DirectionalLight, PointLight, SpotLight } from 'three'
import { useBus } from './bus'
import { COL, T } from './tokens'

/** The environment map is built once by ColumnScene (environment.ts); no live bake here. */
export function Lights() {
  const bus = useBus()
  const key = useRef<SpotLight>(null)
  const rim = useRef<DirectionalLight>(null)
  const sweep = useRef<PointLight>(null)
  const ember = useRef<PointLight>(null)

  // the sweep follows the one light of the page: --tilt-x via the `tilt` event (no per-frame style reads)
  useEffect(() => {
    const onTilt = (e: Event) => {
      const x = (e as CustomEvent<number>).detail
      if (typeof x === 'number' && Number.isFinite(x)) bus.monument.mon.tiltX = x
    }
    window.addEventListener('tilt', onTilt)
    return () => window.removeEventListener('tilt', onTilt)
  }, [bus])

  useEffect(() => {
    const k = key.current
    if (!k) return
    k.target.position.set(0, 1.2, 0)
    k.target.updateMatrixWorld()
  }, [])

  useFrame(() => {
    const mon = bus.monument.mon
    const s = sweep.current
    if (s) {
      const theta = mon.theta + T.follow * mon.tiltX
      s.position.set(3.2 * Math.sin(theta), 3.4, 3.2 * Math.cos(theta))
      s.intensity = T.sweep
    }
    const e = ember.current
    if (e) e.intensity = T.ember * mon.crack
    if (key.current) key.current.intensity = T.key
    if (rim.current) rim.current.intensity = T.rim
  })

  return (
    <>
      <ambientLight color={COL.ambient} intensity={T.ambient} />
      {/* key low enough that the GGX lobe reaches the near-horizontal normals of the shaft */}
      <spotLight ref={key} color={COL.keyLight} intensity={T.key} decay={2} angle={0.5} penumbra={0.8} position={[2.2, 2.6, 3.2]} />
      {/* rim at about camera height, behind left: a warm edge on the left silhouette */}
      <directionalLight ref={rim} color={COL.rimLight} intensity={T.rim} position={[-2.6, 1.3, -2.2]} />
      <pointLight ref={sweep} color={COL.sweepLight} intensity={T.sweep} distance={7} decay={2} position={[3.2 * Math.sin(0.6), 3.4, 3.2 * Math.cos(0.6)]} />
      <pointLight ref={ember} color={COL.emberLight} intensity={0} distance={2.2} decay={2} position={[0, 2.05, 0.6]} />
    </>
  )
}
