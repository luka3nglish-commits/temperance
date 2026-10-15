/**
 * The capital (docs/polish-spec.md section 5.3): a gold echinus lathe and astragal ring (one merged
 * mesh on the gold program) under an obsidian abacus. It rides the shaft top as a child of the break
 * group, so it inherits the over-goal tilt, and its top is exactly the drawn height: at the goal it
 * kisses the line. The abacus shares the shaft's crack uniforms, so the whole crown fractures on an
 * over day. Strike: emissive 0 to 0.8 to 0 over 300 ms (`mon.capital`) and scale 1 to 1.06 to 1
 * over 220 ms (`mon.capScale`). While the column is shorter than an empty day (the opening rise)
 * the capital scales down into the base.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, type Group, LatheGeometry, TorusGeometry, Vector2 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useBus } from './bus'
import { createGoldMaterial, createObsidianMaterial, type ObsidianUniforms } from './obsidianMaterial'
import { CAP_H, COL, GOAL_Y, H_MIN, renderH, shaftTop } from './tokens'

const ECHINUS: [number, number][] = [
  [0.36, 0],
  [0.375, 0.012],
  [0.4, 0.03],
  [0.43, 0.05],
  [0.45, 0.065],
  [0.455, 0.075],
]
const ABACUS_H = 0.045

export function Capital({ uniforms, lathe }: { uniforms: ObsidianUniforms; lathe: number }) {
  const bus = useBus()
  const group = useRef<Group>(null)
  const goldGeo = useMemo(() => {
    const echinus = new LatheGeometry(ECHINUS.map(([r, y]) => new Vector2(r, y)), Math.max(24, Math.round(lathe * 0.75)))
    const astragal = new TorusGeometry(0.37, 0.016, 10, 96)
    astragal.rotateX(Math.PI / 2)
    astragal.translate(0, -0.01, 0)
    const merged = mergeGeometries([echinus, astragal], false) ?? echinus
    if (merged !== echinus) echinus.dispose()
    astragal.dispose()
    return merged
  }, [lathe])
  const abacusGeo = useMemo(() => {
    const g = new BoxGeometry(0.98, ABACUS_H, 0.98)
    g.translate(0, CAP_H - ABACUS_H / 2, 0)
    return g
  }, [])
  const gold = useMemo(() => createGoldMaterial(), [])
  const stone = useMemo(() => createObsidianMaterial({ color: COL.column, roughness: 0.22, fluteOn: 0, f0: 0.3, reflect: 1.6, rim: 0.18, uniforms }), [uniforms])
  useEffect(() => () => goldGeo.dispose(), [goldGeo])
  useEffect(
    () => () => {
      abacusGeo.dispose()
      gold.dispose()
    },
    [abacusGeo, gold],
  )
  useEffect(() => () => stone.dispose(), [stone])

  useFrame(() => {
    const mon = bus.monument.mon
    const g = group.current
    const rh = renderH(Math.max(0, mon.h))
    if (g) {
      const top = Math.max(0, shaftTop(rh))
      g.position.y = Math.max(0, top - GOAL_Y)
      const s = Math.min(1, rh / H_MIN) * mon.capScale
      g.scale.setScalar(Math.max(0.0001, s))
      g.visible = rh > 0.001
    }
    gold.emissiveIntensity = mon.capital
  })

  return (
    <group ref={group}>
      <mesh geometry={goldGeo} material={gold} />
      <mesh geometry={abacusGeo} material={stone} />
    </group>
  )
}
