/**
 * The glass ghost (docs/polish-spec.md section 5.3): an open cylinder a hair wider than the shaft,
 * from the plinth to the gold line, drawn only above the stone (tpFx mode 0): a fresnel sleeve with
 * faint lit arrises showing what remains of the day. Over the goal nothing remains and it vanishes.
 * It turns with the shaft (its arrises line up with the flutes) and follows the shaft's entasis.
 * `mon.ghost` is the opening reveal (0 to 1, rising from the plinth).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderGeometry, type Mesh } from 'three'
import { useBus } from './bus'
import { createFxMaterial } from './fxMaterial'
import { GOAL_Y, renderH, shaftTop } from './tokens'

export function Ghost() {
  const bus = useBus()
  const mesh = useRef<Mesh>(null)
  const geometry = useMemo(() => {
    const g = new CylinderGeometry(0.372, 0.372, GOAL_Y, 80, 1, true)
    g.translate(0, GOAL_Y / 2, 0)
    return g
  }, [])
  const material = useMemo(() => createFxMaterial({ mode: 0 }), [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(() => {
    const mon = bus.monument.mon
    const top = shaftTop(renderH(Math.max(0, mon.h)))
    const u = material.uniforms
    u.uH.value = top
    u.uReveal.value = Math.max(0, Math.min(1, mon.ghost))
    const m = mesh.current
    if (m) m.visible = mon.ghost > 0.001 && top < GOAL_Y - 0.03
  })

  return <mesh ref={mesh} geometry={geometry} material={material} renderOrder={1} frustumCulled={false} />
}
