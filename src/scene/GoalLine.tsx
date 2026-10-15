/**
 * The gold goal line (docs/polish-spec.md section 5.3), all on the tpFx program: one 6.0 x 0.10
 * plane at Y 2.0 whose shader draws a Gaussian core and glow with a travelling glint (following the
 * tilt when it is live, else the 9 s gold sweep) and, high tier only, a sparkle; a collar ring at the
 * column; a glow billboard in front. The opening draws the line from the left with a hot tip
 * (`mon.goalX`) while collar and glow fade in (`mon.goalFade`); a crossing flashes everything to
 * #FFF7DA (`mon.flash`), decaying to rest. Reduced motion freezes the glint at the centre.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Mesh, PlaneGeometry, RingGeometry } from 'three'
import { useBus } from './bus'
import { createFxMaterial } from './fxMaterial'
import { isReducedMotion } from '../lib/motion'
import type { TierSettings } from './tier'
import { COL, GOAL_Y } from './tokens'

/** the line plane spans 6 units; at rest the frustum shows about uv 0.23 to 0.77 of it */
const DRAW_FROM = 0.2
const DRAW_SPAN = 0.6

export function GoalLine({ settings }: { settings: TierSettings }) {
  const bus = useBus()
  const glow = useRef<Mesh>(null)
  const collar = useRef<Mesh>(null)
  const lineMat = useMemo(() => createFxMaterial({ mode: 1 }), [])
  const collarMat = useMemo(() => createFxMaterial({ mode: 1, ring: true, ringR: [0.5075, 0.006] }), [])
  const glowMat = useMemo(() => createFxMaterial({ mode: 2, billboard: true, billScale: [2.4, 0.22], color: COL.goalGlow, alpha: 0 }), [])
  const ringGeo = useMemo(() => {
    // built flat (XZ) so the shader's object-space xz is the ring plane
    const g = new RingGeometry(0.47, 0.545, 96)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])
  const lineGeo = useMemo(() => new PlaneGeometry(6.0, 0.1), [])
  useEffect(
    () => () => {
      lineMat.dispose()
      collarMat.dispose()
      glowMat.dispose()
      ringGeo.dispose()
      lineGeo.dispose()
    },
    [lineMat, collarMat, glowMat, ringGeo, lineGeo],
  )

  useFrame(() => {
    const mon = bus.monument.mon
    const x = Math.max(0, Math.min(1, mon.goalX))
    const fade = Math.max(0, Math.min(1, mon.goalFade))
    const flash = Math.max(0, Math.min(1, mon.flash))
    const reduced = isReducedMotion()
    const t = reduced ? 0 : performance.now() / 1000
    // mon.tiltX is the live tilt, or the 9 s gold sweep relayed by tilt.ts while tilt is not live;
    // a removal runs one shimmer right to left (mon.shimmerX) after the sink
    const sweep = reduced ? 0 : (mon.shimmerX ?? 2.4 * mon.tiltX)

    const lu = lineMat.uniforms
    lu.uDraw.value = x >= 0.999 ? 1 : DRAW_FROM + DRAW_SPAN * x
    lu.uFlash.value = flash
    lu.uSweepX.value = sweep
    lu.uTime.value = t
    lu.uSparkle.value = settings.sparkle
    lu.uAlpha.value = x > 0.001 ? 1 : 0

    const cu = collarMat.uniforms
    cu.uFlash.value = flash
    cu.uAlpha.value = fade
    if (collar.current) collar.current.visible = fade > 0.001

    glowMat.uniforms.uAlpha.value = (0.36 + 0.5 * flash) * fade
    if (glow.current) glow.current.visible = fade > 0.001
  })

  return (
    <group>
      <mesh geometry={lineGeo} material={lineMat} position={[0, GOAL_Y, 0]} renderOrder={1} frustumCulled={false} />
      <mesh ref={collar} geometry={ringGeo} material={collarMat} position={[0, GOAL_Y, 0]} renderOrder={1} visible={false} />
      <mesh ref={glow} material={glowMat} position={[0, GOAL_Y, 0.5]} renderOrder={2} visible={false} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  )
}
