/**
 * THE SVG MONUMENT (docs/design-spec.md section 15, docs/polish-spec.md sections 5.2 and 5.3). The
 * same monument as the 3D scene on a 390 x 513 stage: plinth top at stage y 460, 122 px per unit,
 * goal line at y 216; the plinth, the Attic base and the capital are projected through the rest
 * camera so the late crossfade to the canvas never jumps. It carries the whole first-launch opening
 * (the canvas compiles behind it), plays every strike when the canvas is absent or lost, and covers
 * context-loss remounts. It stands inside the same DOM temple (Temple.tsx) as the canvas.
 *
 * It reads the same `mon` object the 3D scene reads (strike.ts) and writes the DOM directly from
 * `bus.svgRender`, so there is no React state per frame. The drawn height is R = renderH(mon.h):
 * the capital takes the top 0.12 of it, the shaft scales from the plinth to the line, and the crown
 * above the line is its own group that rotates 2.5 degrees as the crack value reaches 1; seven
 * jagged crack paths draw on by dash offset; the glass ghost (two edges and four arris lines) stands
 * from the capital to the line, revealed upward by `mon.ghost`; twelve dust spans rise and fade on
 * each burst (not under reduced motion); a highlight band crosses the shaft on the 14 s loop.
 * Registers nothing itself: MonumentLayer owns the handle.
 */
import { useContext, useEffect, useMemo, useRef } from 'react'
import { useStore } from '../store/useStore'
import { isReducedMotion } from '../lib/motion'
import { localDayKey } from '../lib/day'
import { totalsForDay } from '../store/selectors'
import { BusContext } from './bus'
import { createMon, MS, type Mon } from './strike'
import { CAMERA_REST, CAP_H, COL, COL_R, GOAL_Y, H_MIN, OVER_MAX, PX_PER_UNIT, STAGE_H, STAGE_PLINTH_Y, crackFor, heightFor, renderH } from './tokens'

export const SVG_GOAL_Y = STAGE_PLINTH_Y - GOAL_Y * PX_PER_UNIT // 216
/** horizontal px per world unit at the column's depth */
const PXH = 123
const COL_W = Math.round(2 * COL_R * PXH) // 88
const HALF_W = COL_W / 2
/** the crown above the line at the renderH asymptote, under the capital */
const CROWN_U = OVER_MAX - CAP_H
const CROWN = CROWN_U * PX_PER_UNIT
const DUST_N = 12
const CRACKS = 7
const yOf = (u: number) => STAGE_PLINTH_Y - u * PX_PER_UNIT

/**
 * The rest camera as plain math (no three): stage px for a world point, x relative to the centre.
 * Shifted so the world origin lands on STAGE_PLINTH_Y, the line the linear column mapping uses.
 */
const PITCH = Math.atan2(CAMERA_REST.lookY - CAMERA_REST.pos[1], CAMERA_REST.pos[2])
const TAN = Math.tan(((CAMERA_REST.fov / 2) * Math.PI) / 180)
function rawProject(x: number, y: number, z: number): [number, number] {
  const ry = y - CAMERA_REST.pos[1]
  const rz = z - CAMERA_REST.pos[2]
  const depth = ry * Math.sin(PITCH) - rz * Math.cos(PITCH)
  const yc = ry * Math.cos(PITCH) + rz * Math.sin(PITCH)
  return [(x / depth) * (STAGE_H / (2 * TAN)), ((1 - yc / depth / TAN) / 2) * STAGE_H]
}
const SHIFT = rawProject(0, 0, 0)[1] - STAGE_PLINTH_Y
function project(x: number, y: number, z: number): [number, number] {
  const [px, py] = rawProject(x, y, z)
  return [Math.round(px * 10) / 10, Math.round((py - SHIFT) * 10) / 10]
}
const pts = (list: [number, number][]) => list.map(([x, y]) => `${x},${y}`).join(' ')

/** the stepped plinth: the die (1.30, top at 0, 0.24 tall) then two broader steps */
const D = 0.65
const DIE_B = -0.24
const S2 = 0.83
const S2_B = -0.33
const S3 = 1.01
const S3_B = -0.41
const DIE_TOP = [project(-D, 0, -D), project(D, 0, -D), project(D, 0, D), project(-D, 0, D)] as [number, number][]
const DIE_FRONT = [project(-D, 0, D), project(D, 0, D), project(D, DIE_B, D), project(-D, DIE_B, D)] as [number, number][]
const S2_TOP = [project(-S2, DIE_B, D), project(S2, DIE_B, D), project(S2, DIE_B, S2), project(-S2, DIE_B, S2)] as [number, number][]
const S2_FRONT = [project(-S2, DIE_B, S2), project(S2, DIE_B, S2), project(S2, S2_B, S2), project(-S2, S2_B, S2)] as [number, number][]
const S3_TOP = [project(-S3, S2_B, S2), project(S3, S2_B, S2), project(S3, S2_B, S3), project(-S3, S2_B, S3)] as [number, number][]
const S3_FRONT = [project(-S3, S2_B, S3), project(S3, S2_B, S3), project(S3, S3_B, S3), project(-S3, S3_B, S3)] as [number, number][]
const WORD_Y = project(0, -0.125, D)[1]
/** the column's front foot on the plinth top (its silhouette ends there, not at the centre line) */
const FOOT_Y = project(0, 0, COL_R)[1]

/** the Attic base silhouette, from the same profile as the 3D lathe */
const BASE_PROFILE: [number, number][] = [
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
const BASE_PATH = (() => {
  // up the left side from the foot, across the top, down the right side
  const left = BASE_PROFILE.map(([r, y]) => `${(-r * PXH).toFixed(1)},${yOf(y).toFixed(1)}`)
  const right = BASE_PROFILE.slice()
    .reverse()
    .map(([r, y]) => `${(r * PXH).toFixed(1)},${yOf(y).toFixed(1)}`)
  const rx = (0.5 * PXH).toFixed(1)
  // then back along the bottom front edge, an ellipse seen from just above
  return `M ${left.join(' L ')} L ${right.join(' L ')} A ${rx} 6 0 0 1 -${rx} ${STAGE_PLINTH_Y} Z`
})()
const fillet = (r: number, y: number, ry: number) => `M ${(-r * PXH).toFixed(1)} ${yOf(y)} A ${(r * PXH).toFixed(1)} ${ry} 0 0 0 ${(r * PXH).toFixed(1)} ${yOf(y)}`

/** the capital, drawn at 0 = the shaft top, up (negative y) to the drawn height */
const ECH_H = 0.075 * PX_PER_UNIT
const ABACUS_H = 0.045 * PX_PER_UNIT
const ECH_PATH = `M ${-COL_R * PXH} 0 L ${COL_R * PXH} 0 L ${0.43 * PXH} ${-0.05 * PX_PER_UNIT} L ${0.455 * PXH} ${-ECH_H} L ${-0.455 * PXH} ${-ECH_H} L ${-0.43 * PXH} ${-0.05 * PX_PER_UNIT} Z`

/** Seven hand-drawn jagged fissures above the seam, in column space (x from -56 to 56, y up from 0). */
const CRACK_PATHS = [
  'M -6 0 l 3 -9 l -5 -8 l 6 -10 l -2 -12 l 5 -9',
  'M 18 0 l -4 -7 l 5 -6 l -3 -11 l 4 -8',
  'M -28 0 l 2 -8 l -6 -6 l 3 -12',
  'M 34 0 l 3 -6 l -2 -9 l 6 -7 l -1 -10',
  'M -44 0 l 4 -5 l -3 -9 l 5 -7',
  'M 6 -14 l 7 -4 l 4 -9 l 8 -5',
  'M -16 -11 l -8 -5 l -3 -8 l -7 -6',
]

const STYLE = `
@keyframes tpDustRise {
  0% { transform: translate(0, 0) scale(1); opacity: 0.6; visibility: visible; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.4); opacity: 0; visibility: visible; }
}
@keyframes tpBandSweep {
  0% { transform: translateX(-${COL_W + 40}px); }
  100% { transform: translateX(${COL_W + 40}px); }
}
.tp-svg-dust { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: ${COL.dust}; opacity: 0; visibility: hidden; pointer-events: none; }
.tp-svg-dust.on { animation: tpDustRise 800ms var(--ease-stone) forwards; will-change: transform, opacity; }
.tp-svg-band { animation: tpBandSweep var(--t-light-sweep) linear infinite; }
.tp-svg-crack { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset var(--t-crack) var(--ease-stone); }
.tp-svg-crack.on { stroke-dashoffset: 0; }
.tp-svg-paused .tp-svg-band { animation-play-state: paused; }
`

type Props = {
  /** the webgl canvas has joined: fade out over 200 ms (or at once) and stop rendering */
  hidden?: boolean
  /** crossfade the hide (late join) rather than cutting (early join) */
  crossfade?: boolean
  /** rendered by the SafeCanvas error boundary: a still of the store state when no layer bus exists */
  standalone?: boolean
}

/** the lit shaft: dark sides, a cream streak right of centre (the S-KEY highlight), warm rims, 20 flutes */
function ShaftFill({ y, height }: { y: number; height: number }) {
  return (
    <>
      <rect x={-HALF_W} y={y} width={COL_W} height={height} fill="url(#tpColGrad)" />
      {Array.from({ length: 10 }, (_, i) => {
        // the visible half of 20 flutes: arrises bunch toward the silhouettes
        const a = ((i + 0.5) / 10) * Math.PI
        const x = -Math.cos(a) * HALF_W
        return <rect key={i} x={x - 0.5} y={y} width="1" height={height} fill={i % 2 ? '#000' : '#FFF3DC'} opacity={i % 2 ? 0.24 : 0.13} />
      })}
      <rect x={-HALF_W} y={y} width="1.5" height={height} fill="rgba(217,188,128,0.55)" />
      <rect x={HALF_W - 1.5} y={y} width="1.5" height={height} fill="rgba(217,188,128,0.55)" />
    </>
  )
}

export function FallbackMonument({ hidden = false, crossfade = true, standalone = false }: Props) {
  const bus = useContext(BusContext)
  const tier = typeof document !== 'undefined' ? document.documentElement.dataset.tier : undefined
  const entries = useStore((s) => s.entries)
  const goal = useStore((s) => s.settings.goalKcal)
  const staticMon = useMemo(() => {
    const m = createMon()
    if (!bus) {
      const eaten = totalsForDay(entries, localDayKey(new Date())).kcal
      m.h = heightFor(eaten, goal)
      m.crack = crackFor(eaten, goal)
      m.goalX = 1
      m.goalFade = 1
      m.ghost = 1
    }
    return m
  }, [bus, entries, goal])

  const root = useRef<HTMLDivElement>(null)
  const column = useRef<SVGGElement>(null)
  const capital = useRef<SVGGElement>(null)
  const overflow = useRef<SVGGElement>(null)
  const crackClip = useRef<SVGRectElement>(null)
  const bandClip = useRef<SVGRectElement>(null)
  const ghostClip = useRef<SVGRectElement>(null)
  const ghost = useRef<SVGGElement>(null)
  const cracks = useRef<(SVGPathElement | null)[]>([])
  const ember = useRef<SVGEllipseElement>(null)
  const goalLine = useRef<SVGGElement>(null)
  const ring = useRef<SVGEllipseElement>(null)
  const dust = useRef<(HTMLSpanElement | null)[]>([])
  const last = useRef({ h: -1, crack: -1, burstAt: -100, trauma: 0, goalX: -1, goalFade: -1, flash: -1, hStr: '', ghost: -1, ghostH: -1, cap: -1 })

  // test hook: while the 3D renderer is live it reports the rendered height here, so tp-column's
  // data-h stays current after this SVG stops rendering
  useEffect(() => {
    if (!bus) return
    const report = (h: number) => {
      const hs = Math.max(0, h).toFixed(3)
      if (hs === last.current.hStr || !column.current) return
      last.current.hStr = hs
      column.current.setAttribute('data-h', hs)
    }
    bus.reportH = report
    return () => {
      if (bus.reportH === report) bus.reportH = null
    }
  }, [bus])

  const render = useMemo(
    () => (mon: Mon) => {
      const L = last.current
      const raw = Math.max(0, mon.h)
      const h = renderH(raw)
      const top = Math.max(0, h - CAP_H)
      const lower = Math.min(top, GOAL_Y)
      const upper = Math.max(0, top - GOAL_Y)
      const topPx = yOf(top)
      const crownPx = yOf(h)
      if (h !== L.h || mon.capScale !== L.cap) {
        L.h = h
        L.cap = mon.capScale
        if (column.current) {
          column.current.style.transform = `scaleY(${Math.max(0.0001, lower / GOAL_Y)})`
          // data-h is the choreography height (raw), so it equals data-h-target at rest
          const hs = raw.toFixed(3)
          if (hs !== L.hStr) {
            L.hStr = hs
            column.current.setAttribute('data-h', hs)
          }
        }
        if (capital.current) {
          const s = Math.max(0.0001, Math.min(1, h / H_MIN) * mon.capScale)
          capital.current.style.transform = `translate(0px, ${topPx.toFixed(2)}px) scale(${s.toFixed(4)})`
          capital.current.style.opacity = h > 0.001 ? '1' : '0'
        }
        if (crackClip.current) {
          crackClip.current.setAttribute('y', String(crownPx))
          crackClip.current.setAttribute('height', String(Math.max(0, SVG_GOAL_Y - crownPx)))
        }
        if (bandClip.current) {
          bandClip.current.setAttribute('y', String(topPx))
          bandClip.current.setAttribute('height', String(Math.max(0, FOOT_Y - topPx)))
        }
      }
      if (h !== L.ghostH || mon.ghost !== L.ghost) {
        L.ghost = mon.ghost
        L.ghostH = h
        const g = Math.max(0, Math.min(1, mon.ghost))
        // revealed upward from the plinth, and only above the stone
        const from = yOf(GOAL_Y * g)
        if (ghostClip.current) {
          ghostClip.current.setAttribute('y', String(from))
          ghostClip.current.setAttribute('height', String(Math.max(0, crownPx - from)))
        }
        if (ghost.current) ghost.current.style.opacity = g > 0.001 && h < GOAL_Y - 0.03 ? '1' : '0'
      }
      const c = Math.max(0, Math.min(1, mon.crack))
      if (overflow.current) {
        const s = Math.max(0.0001, upper / CROWN_U)
        overflow.current.style.transform = `rotate(${(-2.5 * c).toFixed(3)}deg) translate(${(3.6 * c).toFixed(2)}px, 0) scaleY(${s.toFixed(5)})`
        overflow.current.style.opacity = upper > 0.001 ? '1' : '0'
      }
      if (c !== L.crack) {
        L.crack = c
        const n = c <= 0 ? 0 : Math.max(1, Math.min(CRACKS, Math.ceil(c * CRACKS)))
        cracks.current.forEach((p, i) => p?.classList.toggle('on', i < n))
        if (ember.current) ember.current.style.opacity = (0.65 * c).toFixed(3)
      }
      if (mon.goalX !== L.goalX) {
        L.goalX = mon.goalX
        if (goalLine.current) goalLine.current.style.transform = `scaleX(${Math.max(0, Math.min(1, mon.goalX)).toFixed(4)})`
      }
      if (mon.goalFade !== L.goalFade || mon.flash !== L.flash) {
        L.goalFade = mon.goalFade
        L.flash = mon.flash
        if (ring.current) ring.current.style.opacity = (0.7 * Math.max(0, Math.min(1, mon.goalFade))).toFixed(3)
        if (goalLine.current) goalLine.current.style.filter = mon.flash > 0.02 ? `drop-shadow(0 0 ${(6 + 8 * mon.flash).toFixed(1)}px rgba(246,227,161,${(0.35 + 0.5 * mon.flash).toFixed(2)}))` : ''
      }
      if (mon.burstAt !== L.burstAt) {
        L.burstAt = mon.burstAt
        if (!isReducedMotion()) {
          dust.current.forEach((el) => {
            if (!el) return
            el.classList.remove('on')
            void el.offsetWidth
            el.classList.add('on')
          })
        }
      }
      if (mon.trauma > L.trauma + 0.3 && root.current && !isReducedMotion()) {
        const el = root.current
        el.classList.remove('shake')
        void el.offsetWidth
        el.classList.add('shake')
        window.setTimeout(() => el.classList.remove('shake'), MS.shake + 40)
      }
      L.trauma = mon.trauma
    },
    [],
  )

  // live: register as the bus's SVG renderer while shown
  useEffect(() => {
    if (!bus || hidden) return
    bus.svgRender = () => render(bus.monument.mon)
    render(bus.monument.mon)
    return () => {
      if (bus.svgRender) bus.svgRender = null
    }
  }, [bus, hidden, render])

  // standalone (no layer bus): a still of the store
  useEffect(() => {
    if (bus) return
    render(staticMon)
  }, [bus, staticMon, render])

  const dustSeeds = useMemo(
    () =>
      Array.from({ length: DUST_N }, (_, i) => {
        const a = (i / DUST_N) * Math.PI * 2 + 0.3
        const r = 64 + (i % 3) * 16
        return { x: Math.cos(a) * r, dx: Math.cos(a) * (26 + (i % 4) * 8), dy: -(38 + (i % 5) * 12), delay: (i % 4) * 40 }
      }),
    [],
  )

  // the SafeCanvas boundary fallback: the layer's own instance is the live one
  if (standalone && bus) return null

  const high = tier !== 'low'
  const dim = hidden ? 'opacity-0' : 'opacity-100'

  return (
    <div
      ref={root}
      aria-hidden="true"
      data-svg-monument
      className={`absolute inset-0 ${dim} ${hidden ? 'tp-svg-paused' : ''}`}
      style={{
        transition: crossfade ? 'opacity 200ms var(--ease-stone)' : 'none',
        visibility: hidden ? 'hidden' : 'visible',
        transitionProperty: crossfade ? 'opacity, visibility' : 'none',
        transitionDelay: hidden && crossfade ? '0ms, 200ms' : '0ms',
        pointerEvents: 'none',
      }}
    >
      <style>{STYLE}</style>
      <svg width="100%" height={STAGE_H} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="tpColGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#0C0C10" />
            <stop offset="0.22" stopColor="#2A2A33" />
            <stop offset="0.45" stopColor="#121218" />
            <stop offset="0.64" stopColor="#8A8578" />
            <stop offset="0.72" stopColor="#1A1A21" />
            <stop offset="1" stopColor="#0C0C10" />
          </linearGradient>
          <linearGradient id="tpBaseGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#0C0C10" />
            <stop offset="0.25" stopColor="#24242C" />
            <stop offset="0.5" stopColor="#141419" />
            <stop offset="0.66" stopColor="#5C584F" />
            <stop offset="0.76" stopColor="#1A1A21" />
            <stop offset="1" stopColor="#0C0C10" />
          </linearGradient>
          <linearGradient id="tpGoldGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#7A5C22" />
            <stop offset="0.45" stopColor="#E9CF86" />
            <stop offset="0.6" stopColor="#F6E3A1" />
            <stop offset="1" stopColor="#8A6A2A" />
          </linearGradient>
          {/* the lit top: the 3D plinth mirrors the warm temple doorway here */}
          <linearGradient id="tpPlinthTop" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#4A3F2A" />
            <stop offset="1" stopColor="#6B5C3B" />
          </linearGradient>
          {/* the glass ghost: clear in the middle, gold at its edges, like the 3D fresnel sleeve */}
          <linearGradient id="tpGhostFill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#D8B45A" stopOpacity="0.16" />
            <stop offset="0.18" stopColor="#D8B45A" stopOpacity="0.03" />
            <stop offset="0.82" stopColor="#D8B45A" stopOpacity="0.03" />
            <stop offset="1" stopColor="#D8B45A" stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id="tpPlinthFront" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#121218" />
            <stop offset="1" stopColor="#0B0B0F" />
          </linearGradient>
          <linearGradient id="tpBand" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgba(255,244,214,0)" />
            <stop offset="0.5" stopColor="rgba(255,244,214,0.14)" />
            <stop offset="1" stopColor="rgba(255,244,214,0)" />
          </linearGradient>
          <radialGradient id="tpEmber" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={COL.ember} stopOpacity="0.55" />
            <stop offset="1" stopColor={COL.ember} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tpShadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#000" stopOpacity="0.8" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* the gold goal line across the stage */}
        <g ref={goalLine} style={{ transformOrigin: '0px 0px', transform: 'scaleX(0)' }}>
          <rect x="0" y={SVG_GOAL_Y - 0.75} width="100%" height="1.5" fill={COL.goalCore} style={{ filter: 'drop-shadow(0 0 6px rgba(246,227,161,0.45))' }} />
        </g>

        <svg x="50%" y="0" overflow="visible">
          {/* contact shadow */}
          <ellipse cx="0" cy={DIE_FRONT[2][1] + 18} rx="190" ry="30" fill="url(#tpShadow)" />

          {/* the stepped plinth: lowest step first, the die last, then the gilded arrises */}
          <polygon points={pts(S3_TOP)} fill="#211E19" />
          <polygon points={pts(S3_FRONT)} fill="url(#tpPlinthFront)" />
          <polygon points={pts(S2_TOP)} fill="#26221C" />
          <polygon points={pts(S2_FRONT)} fill="url(#tpPlinthFront)" />
          <polygon points={pts(DIE_TOP)} fill="url(#tpPlinthTop)" />
          <polygon points={pts(DIE_FRONT)} fill="url(#tpPlinthFront)" />
          <g stroke="#E6CB78" strokeOpacity="0.9" strokeWidth="1" fill="none">
            <polygon points={pts(DIE_TOP)} />
            <line x1={DIE_FRONT[3][0]} y1={DIE_FRONT[3][1]} x2={DIE_FRONT[2][0]} y2={DIE_FRONT[2][1]} />
          </g>
          <text
            x="0"
            y={WORD_Y + 4}
            textAnchor="middle"
            className="font-display"
            style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2px', fill: '#D8B45A' }}
          >
            TEMPERANTIA
          </text>

          {/* the shaft: from the plinth to the line, scaled from the plinth */}
          <g
            ref={column}
            data-testid="tp-column"
            data-h="0.000"
            style={{ transformOrigin: `0px ${STAGE_PLINTH_Y}px`, transform: 'scaleY(0.0001)', willChange: 'transform' }}
          >
            <ShaftFill y={SVG_GOAL_Y} height={FOOT_Y - SVG_GOAL_Y} />
          </g>

          {/* the Attic base over the shaft's foot, with its two gold fillets */}
          <path d={BASE_PATH} fill="url(#tpBaseGrad)" />
          <g fill="none" stroke="#D8B45A" strokeWidth="1.2" strokeOpacity="0.85">
            <path d={fillet(0.513, 0.045, 6)} />
            <path d={fillet(0.456, 0.18, 5)} />
          </g>

          {/* the crown above the seam: tilts 2.5 degrees as the crack value reaches 1 */}
          <g ref={overflow} style={{ transformOrigin: `0px ${SVG_GOAL_Y}px`, transform: 'scaleY(0.0001)', opacity: 0 }}>
            <ShaftFill y={SVG_GOAL_Y - CROWN} height={CROWN} />
          </g>

          {/* the glass ghost: two edges and four arris lines from the capital up to the line */}
          <clipPath id="tpGhostClip">
            <rect ref={ghostClip} x={-60} y={SVG_GOAL_Y} width={120} height="0" />
          </clipPath>
          <g ref={ghost} clipPath="url(#tpGhostClip)" style={{ opacity: 0 }}>
            <rect x={-46} y={SVG_GOAL_Y} width={92} height={STAGE_PLINTH_Y - SVG_GOAL_Y} fill="url(#tpGhostFill)" />
            <g stroke="#D8B45A" strokeWidth="1.25" opacity="0.5">
              <line x1={-46} x2={-46} y1={SVG_GOAL_Y} y2={STAGE_PLINTH_Y} />
              <line x1={46} x2={46} y1={SVG_GOAL_Y} y2={STAGE_PLINTH_Y} />
            </g>
            <g stroke="#D8B45A" strokeWidth="1" opacity="0.14">
              {[-0.81, -0.31, 0.31, 0.81].map((k) => (
                <line key={k} x1={k * 46} x2={k * 46} y1={SVG_GOAL_Y} y2={STAGE_PLINTH_Y} />
              ))}
            </g>
          </g>

          {/* light sweep: a highlight band crossing the shaft, clipped to its height */}
          <clipPath id="tpBandClip">
            <rect ref={bandClip} x={-HALF_W} y={STAGE_PLINTH_Y} width={COL_W} height="0" />
          </clipPath>
          <g clipPath="url(#tpBandClip)">
            <rect className="tp-svg-band" x="-20" y="0" width="40" height={STAGE_H} fill="url(#tpBand)" />
          </g>

          {/* the capital at the shaft top: gold astragal and echinus under the obsidian abacus */}
          <g ref={capital} style={{ transformOrigin: '0px 0px', transform: `translate(0px, ${STAGE_PLINTH_Y}px) scale(0.0001)`, opacity: 0 }}>
            <rect x={-0.386 * PXH} y={0.004 * PX_PER_UNIT} width={0.772 * PXH} height="2.4" rx="1.2" fill="url(#tpGoldGrad)" />
            <path d={ECH_PATH} fill="url(#tpGoldGrad)" />
            <rect x={-0.49 * PXH} y={-ECH_H - ABACUS_H} width={0.98 * PXH} height={ABACUS_H} fill="url(#tpBaseGrad)" />
            <rect x={-0.49 * PXH} y={-ECH_H - ABACUS_H} width={0.98 * PXH} height="1" fill="#E6CB78" opacity="0.5" />
          </g>

          {/* ember glow at the seam and the seven cracks, clipped to the crown above the line, over the capital */}
          <ellipse ref={ember} cx="0" cy={SVG_GOAL_Y - 10} rx="62" ry="30" fill="url(#tpEmber)" style={{ opacity: 0, mixBlendMode: 'screen' }} />
          <clipPath id="tpCrackClip">
            <rect ref={crackClip} x={-HALF_W - 20} y={SVG_GOAL_Y} width={COL_W + 40} height="0" />
          </clipPath>
          <g
            clipPath="url(#tpCrackClip)"
            fill="none"
            stroke={COL.ember}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={high ? { filter: 'drop-shadow(0 0 6px var(--ember-glow))' } : undefined}
            transform={`translate(0 ${SVG_GOAL_Y}) scale(${(COL_W / 112).toFixed(3)} 1)`}
          >
            {CRACK_PATHS.map((d, i) => (
              <path
                key={i}
                ref={(el) => {
                  cracks.current[i] = el
                }}
                d={d}
                pathLength={1}
                className="tp-svg-crack"
              />
            ))}
          </g>

          {/* the goal collar */}
          <ellipse ref={ring} cx="0" cy={SVG_GOAL_Y} rx={0.5 * PXH} ry="7" fill="none" stroke={COL.goalLine} strokeWidth="1" style={{ opacity: 0 }} />
        </svg>
      </svg>

      {/* twelve dust spans at the foot of the column, hidden until a landing */}
      {dustSeeds.map((d, i) => (
        <span
          key={i}
          ref={(el) => {
            dust.current[i] = el
          }}
          className="tp-svg-dust"
          style={
            {
              left: `calc(50% + ${d.x}px)`,
              top: STAGE_PLINTH_Y - 4,
              '--dx': `${d.dx}px`,
              '--dy': `${d.dy}px`,
              animationDelay: `${d.delay}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
