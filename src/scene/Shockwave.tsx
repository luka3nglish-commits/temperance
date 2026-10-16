/**
 * The strike shockwave (docs/polish-spec.md section 5.4 item 3): a ring of light that runs out
 * across the die from the column's foot, scale 0.55 to 1.9 over 480 ms (power3.out), alpha
 * 0.55 * (1 - p)^2, gold or ember. tpFx mode 2 ring band, so no program of its own; one draw call
 * and only while it runs (`mon.shock` is -1 at rest). Never under reduced motion.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Mesh, RingGeometry } from 'three'
import { useBus } from './bus'
import { createFxMaterial } from './fxMaterial'

const GOLD = new Color('#D8B45A')
const EMBER = new Color('#FF6A2B')

export function Shockwave() {
  const bus = useBus()
  const mesh = useRef<Mesh>(null)
  const geometry = useMemo(() => {
    // built flat (XZ) so the shader's object-space xz is the ring plane
    const g = new RingGeometry(0.9, 1.0, 96)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const material = useMemo(() => createFxMaterial({ mode: 2, ring: true, ringR: [0.9, 1.0], alpha: 0 }), [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const p = bus.monument.mon.shock
    m.visible = p >= 0 && p < 1
    if (!m.visible) return
    const s = 0.55 + (1.9 - 0.55) * p
    m.scale.set(s, 1, s)
    const u = material.uniforms
    u.uAlpha.value = 0.55 * (1 - p) * (1 - p)
    u.uColor.value.copy(bus.monument.mon.shockEmber > 0.5 ? EMBER : GOLD)
  })

  return <mesh ref={mesh} geometry={geometry} material={material} position={[0, 0.004, 0]} visible={false} renderOrder={2} frustumCulled={false} />
}
