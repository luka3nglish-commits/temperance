/**
 * Lights (docs/design-spec.md section 7, Lights). Ambient, the key spot, the rim directional, the
 * one moving sweep point light (idle orbit on the 14 s period, the opening pass, follows the tilt
 * by `T.follow` rad) and the ember point light under the cracks, mounted at intensity 0 so its
 * program compiles in the gate. The drei Environment bakes three Lightformers once (frames 1).
 */
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import type { DirectionalLight, PointLight, SpotLight } from 'three'
import { useBus } from './bus'
import type { TierSettings } from './tier'
import { COL, T } from './tokens'

export function Lights({ settings }: { settings: TierSettings }) {
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
      <spotLight ref={key} color={COL.keyLight} intensity={T.key} decay={2} angle={0.5} penumbra={0.7} position={[2.4, 4.2, 2.6]} />
      <directionalLight ref={rim} color={COL.rimLight} intensity={T.rim} position={[-3, 2.5, -2.5]} />
      <pointLight ref={sweep} color={COL.sweepLight} intensity={T.sweep} distance={7} decay={2} position={[3.2 * Math.sin(0.6), 3.4, 3.2 * Math.cos(0.6)]} />
      <pointLight ref={ember} color={COL.emberLight} intensity={0} distance={2.2} decay={2} position={[0, 2.05, 0.6]} />
      <Environment resolution={settings.envRes} frames={1} environmentIntensity={T.envIntensity}>
        <Lightformer form="rect" color={COL.envWarm} intensity={3} position={[0, 5, -2]} scale={[6, 1, 1]} />
        <Lightformer form="rect" color={COL.envSide} intensity={1.2} position={[-4, 1, 3]} rotation-y={Math.PI / 3} scale={[1, 4, 1]} />
        <Lightformer form="rect" color={COL.envEmber} intensity={0.6} position={[0, -1, 4]} scale={[4, 0.5, 1]} />
      </Environment>
    </>
  )
}
