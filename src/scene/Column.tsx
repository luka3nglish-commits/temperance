/**
 * The column (docs/polish-spec.md section 5.3). A fluted shaft of radius 0.36 on an Attic base,
 * crowned by the capital, inside a faint glass ghost that rises to the gold line.
 *
 * The drawn height R = renderH(mon.h) eases to a 0.30 unit crown above the line however far over the
 * day is. The capital takes the top 0.12 of R, so the shaft ends at shaftTop(R). One cylinder
 * geometry with its base at the origin is shared by two meshes and one obsidian material: `base`
 * scales to min(top, 2), `overflow` sits in the `break` group at Y min(top, 2) and scales to the
 * rest. The break group carries the 2.5 degree tilt and 0.03 shift as uCrack reaches 1, and the
 * capital rides its top. The outer group turns in idle; `uTurn` removes that turn in the shader so
 * the crack field stays on the stone. The ember glow is a tpFx billboard just above the line.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, CylinderGeometry, type Group, LatheGeometry, type Mesh, TorusGeometry, Vector2 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useBus } from './bus'
import { createGoldMaterial, createObsidianMaterial, createObsidianUniforms } from './obsidianMaterial'
import { createFxMaterial } from './fxMaterial'
import { getTier, tierSettings, type TierSettings } from './tier'
import { Capital } from './Capital'
import { Ghost } from './Ghost'
import { Shockwave } from './Shockwave'
import { COL, COL_R, GOAL_Y, renderH, shaftTop } from './tokens'

const TILT = 0.0436 // 2.5 degrees
const EPS = 0.0005
const REFLECT = 1.6
const GLINT_GOLD = new Color('#F6E3A1')
const GLINT_EMBER = new Color('#FF6A2B')

/** the Attic base profile [r, y]: lower torus, scotia, upper torus, apophyge into the shaft */
const BASE_PROFILE: [number, number][] = [
  [0, 0],
  [0.5, 0],
  [0.512, 0.018],
  [0.515, 0.045],
  [0.505, 0.072],
  [0.48, 0.088],
  [0.44, 0.094],
  [0.41, 0.105],
  [0.398, 0.125],
  [0.41, 0.145],
  [0.44, 0.15],
  [0.452, 0.162],
  [0.458, 0.18],
  [0.448, 0.198],
  [0.42, 0.208],
  [0.38, 0.212],
  [0.366, 0.222],
  [0.36, 0.24],
]

function filletGeometry() {
  const lower = new TorusGeometry(0.513, 0.01, 8, 96)
  lower.rotateX(Math.PI / 2)
  lower.translate(0, 0.045, 0)
  const upper = new TorusGeometry(0.456, 0.009, 8, 96)
  upper.rotateX(Math.PI / 2)
  upper.translate(0, 0.18, 0)
  const merged = mergeGeometries([lower, upper], false) ?? lower
  if (merged !== lower) lower.dispose()
  upper.dispose()
  return merged
}

export function Column({ settings }: { settings: TierSettings }) {
  const bus = useBus()
  const turn = useRef<Group>(null)
  const base = useRef<Mesh>(null)
  const brk = useRef<Group>(null)
  const over = useRef<Mesh>(null)
  const glow = useRef<Mesh>(null)

  const geometry = useMemo(() => {
    const g = new CylinderGeometry(COL_R, COL_R, 1, settings.segments, 1)
    g.translate(0, 0.5, 0)
    return g
  }, [settings.segments])
  const uniforms = useMemo(() => createObsidianUniforms(settings.uDepth, settings.uFlute), [settings.uDepth, settings.uFlute])
  const material = useMemo(
    () => createObsidianMaterial({ color: COL.column, roughness: 0.22, fluteOn: 1, f0: 0.3, reflect: REFLECT, rim: 0.28, uniforms }),
    [uniforms],
  )
  const baseGeo = useMemo(() => new LatheGeometry(BASE_PROFILE.map(([r, y]) => new Vector2(r, y)), settings.lathe), [settings.lathe])
  const baseMat = useMemo(() => createObsidianMaterial({ color: COL.column, roughness: 0.22, fluteOn: 0, f0: 0.3, reflect: REFLECT, rim: 0.18 }), [])
  const fillets = useMemo(() => filletGeometry(), [])
  const gold = useMemo(() => createGoldMaterial(), [])
  const glowMat = useMemo(() => createFxMaterial({ mode: 2, billboard: true, billScale: [1.0, 0.5], color: COL.ember, alpha: 0 }), [])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => baseGeo.dispose(), [baseGeo])
  useEffect(() => () => material.dispose(), [material])
  useEffect(
    () => () => {
      baseMat.dispose()
      fillets.dispose()
      gold.dispose()
      glowMat.dispose()
    },
    [baseMat, fillets, gold, glowMat],
  )

  useFrame(() => {
    const mon = bus.monument.mon
    const top = Math.max(0, shaftTop(renderH(Math.max(0, mon.h))))
    const lower = Math.min(top, GOAL_Y)
    const upper = Math.max(0, top - GOAL_Y)
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
    // the charge glint rides just under the capital while the stone rises; the impact flares the stone
    uniforms.uGlintOn.value = mon.glintOn
    uniforms.uGlintY.value = top - 0.04
    uniforms.uGlintCol.value.copy(mon.glintEmber > 0.5 ? GLINT_EMBER : GLINT_GOLD)
    if (material.tp.reflect) material.tp.reflect.uReflect.value = REFLECT * mon.reflectK
    if (baseMat.tp.reflect) baseMat.tp.reflect.uReflect.value = REFLECT * mon.reflectK
    // a mid-session downgrade drops to the 9-tap voronoi at once (a uniform, no recompile)
    uniforms.uDepth.value = Math.min(settings.uDepth, tierSettings(getTier() === 'none' ? 'low' : getTier()).uDepth)

    const g = glow.current
    if (g) {
      g.visible = c > 0.001
      const pulse = 1 + 0.05 * Math.sin(mon.emberPulse * Math.PI)
      glowMat.uniforms.uBillScale.value.set(1.0 * pulse, 0.5 * pulse)
      glowMat.uniforms.uAlpha.value = 0.65 * c
    }
  })

  return (
    <>
      <group ref={turn}>
        <mesh geometry={baseGeo} material={baseMat} />
        <mesh geometry={fillets} material={gold} />
        <mesh ref={base} geometry={geometry} material={material} />
        <group ref={brk}>
          <mesh ref={over} geometry={geometry} material={material} />
          <Capital uniforms={uniforms} lathe={settings.lathe} />
        </group>
        <Ghost />
      </group>
      <Shockwave />
      <mesh ref={glow} position={[0, 2.08, 0.3]} material={glowMat} visible={false} renderOrder={2} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  )
}
