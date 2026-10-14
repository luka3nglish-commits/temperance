/**
 * THE SVG MONUMENT (docs/design-spec.md section 15). Same geometry and screen positions as the 3D
 * column on a 390 x 513 stage: plinth top at stage y 460 (screen 507 under a 47 px safe area),
 * 122 px per unit, goal line at y 216. It is visible from frame 0 at scale 0, plays the opening
 * rise and every strike when the canvas is late, absent or lost, and covers context-loss remounts.
 *
 * It reads the same `mon` object the 3D scene reads (strike.ts) and writes the DOM directly from
 * `bus.svgRender`, so there is no React state per frame. Column height is `scaleY` on a group with
 * its origin on the plinth; the overflow above the goal line is its own group that rotates 2.5
 * degrees as the crack value reaches 1; seven jagged crack paths draw on by dash offset; twelve
 * dust spans rise and fade on each burst (not under reduced motion); a highlight band crosses the
 * column on the 14 s loop. Registers nothing itself: MonumentLayer owns the handle.
 */
import { useContext, useEffect, useMemo, useRef } from 'react'
import { useStore } from '../store/useStore'
import { isReducedMotion } from '../lib/motion'
import { localDayKey } from '../lib/day'
import { totalsForDay } from '../store/selectors'
import { BusContext } from './bus'
import { createMon, MS, type Mon } from './strike'
import { COL, GOAL_Y, PX_PER_UNIT, STAGE_H, STAGE_PLINTH_Y, crackFor, heightFor } from './tokens'

export const SVG_GOAL_Y = STAGE_PLINTH_Y - GOAL_Y * PX_PER_UNIT // 216
const COL_W = 112
const HALF_W = COL_W / 2
const OVER_MAX = 0.86 * PX_PER_UNIT // the overflow rect at the 2.86 clamp
const DUST_N = 12
const CRACKS = 7

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
  0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0.4); opacity: 0; }
}
@keyframes tpBandSweep {
  0% { transform: translateX(-${COL_W + 40}px); }
  100% { transform: translateX(${COL_W + 40}px); }
}
.tp-svg-dust { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: ${COL.dust}; opacity: 0; pointer-events: none; will-change: transform, opacity; }
.tp-svg-dust.on { animation: tpDustRise 800ms var(--ease-stone) forwards; }
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
    }
    return m
  }, [bus, entries, goal])

  const root = useRef<HTMLDivElement>(null)
  const column = useRef<SVGGElement>(null)
  const cap = useRef<SVGRectElement>(null)
  const capital = useRef<SVGEllipseElement>(null)
  const overflow = useRef<SVGGElement>(null)
  const crackClip = useRef<SVGRectElement>(null)
  const bandClip = useRef<SVGRectElement>(null)
  const cracks = useRef<(SVGPathElement | null)[]>([])
  const ember = useRef<SVGEllipseElement>(null)
  const goalLine = useRef<SVGGElement>(null)
  const ring = useRef<SVGEllipseElement>(null)
  const dust = useRef<(HTMLSpanElement | null)[]>([])
  const last = useRef({ h: -1, crack: -1, burstAt: -100, trauma: 0, goalX: -1, goalFade: -1, flash: -1, hStr: '' })

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
      const h = Math.max(0, mon.h)
      const lower = Math.min(h, GOAL_Y)
      const upper = Math.max(0, h - GOAL_Y)
      const top = STAGE_PLINTH_Y - h * PX_PER_UNIT
      if (h !== L.h) {
        L.h = h
        if (column.current) {
          column.current.style.transform = `scaleY(${Math.max(0.0001, lower / GOAL_Y)})`
          const hs = h.toFixed(3)
          if (hs !== L.hStr) {
            L.hStr = hs
            column.current.setAttribute('data-h', hs)
          }
        }
        if (cap.current) {
          cap.current.setAttribute('y', String(top))
          cap.current.style.opacity = h > 0.01 ? '1' : '0'
        }
        if (capital.current) {
          capital.current.setAttribute('cy', String(top))
          capital.current.style.opacity = h > 0.01 ? '1' : '0'
        }
        if (crackClip.current) {
          crackClip.current.setAttribute('y', String(top))
          crackClip.current.setAttribute('height', String(Math.max(0, SVG_GOAL_Y - top)))
        }
        if (bandClip.current) {
          bandClip.current.setAttribute('y', String(top))
          bandClip.current.setAttribute('height', String(Math.max(0, STAGE_PLINTH_Y - top)))
        }
      }
      const c = Math.max(0, Math.min(1, mon.crack))
      if (overflow.current) {
        const s = Math.max(0.0001, upper / 0.86)
        overflow.current.style.transform = `rotate(${(-2.5 * c).toFixed(3)}deg) translate(${(3.6 * c).toFixed(2)}px, 0) scaleY(${s.toFixed(5)})`
        overflow.current.style.opacity = upper > 0.001 ? '1' : '0'
      }
      if (c !== L.crack) {
        L.crack = c
        const n = c <= 0 ? 0 : Math.max(1, Math.min(CRACKS, Math.ceil(c * CRACKS)))
        cracks.current.forEach((p, i) => p?.classList.toggle('on', i < n))
        if (ember.current) ember.current.style.opacity = (0.5 * c).toFixed(3)
      }
      if (mon.goalX !== L.goalX) {
        L.goalX = mon.goalX
        if (goalLine.current) goalLine.current.style.transform = `scaleX(${Math.max(0, Math.min(1, mon.goalX)).toFixed(4)})`
      }
      if (mon.goalFade !== L.goalFade || mon.flash !== L.flash) {
        L.goalFade = mon.goalFade
        L.flash = mon.flash
        if (ring.current) ring.current.style.opacity = Math.max(0, Math.min(1, mon.goalFade)).toFixed(3)
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
        const r = 70 + (i % 3) * 18
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
            <stop offset="0" stopColor="#050507" />
            <stop offset="0.5" stopColor="#1A1A21" />
            <stop offset="1" stopColor="#050507" />
          </linearGradient>
          <linearGradient id="tpPlinthUp" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#17171D" />
            <stop offset="1" stopColor="#0D0D12" />
          </linearGradient>
          <linearGradient id="tpPlinthLow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#121217" />
            <stop offset="1" stopColor="#09090C" />
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
            <stop offset="0" stopColor="#000" stopOpacity="0.6" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* the gold goal line across the stage */}
        <g ref={goalLine} style={{ transformOrigin: '0px 0px', transform: 'scaleX(0)' }}>
          <rect x="0" y={SVG_GOAL_Y - 0.5} width="100%" height="1" fill={COL.goalLine} style={{ filter: 'drop-shadow(0 0 6px rgba(246,227,161,0.35))' }} />
        </g>

        <svg x="50%" y="0" overflow="visible">
          {/* contact shadow */}
          <ellipse cx="0" cy={STAGE_PLINTH_Y + 46} rx="190" ry="26" fill="url(#tpShadow)" />

          {/* plinth: lower step then upper step, facet gradients */}
          <polygon points={`-150,${STAGE_PLINTH_Y + 32} 150,${STAGE_PLINTH_Y + 32} 158,${STAGE_PLINTH_Y + 51} -158,${STAGE_PLINTH_Y + 51}`} fill="url(#tpPlinthLow)" />
          <polygon points={`-116,${STAGE_PLINTH_Y} 116,${STAGE_PLINTH_Y} 122,${STAGE_PLINTH_Y + 32} -122,${STAGE_PLINTH_Y + 32}`} fill="url(#tpPlinthUp)" />
          <rect x="-116" y={STAGE_PLINTH_Y} width="232" height="1" fill={COL.capital} opacity="0.5" />

          {/* the column: base to the goal line, scaled from the plinth */}
          <g
            ref={column}
            data-testid="tp-column"
            data-h="0.000"
            style={{ transformOrigin: `0px ${STAGE_PLINTH_Y}px`, transform: 'scaleY(0.0001)', willChange: 'transform' }}
          >
            <rect x={-HALF_W} y={SVG_GOAL_Y} width={COL_W} height={STAGE_PLINTH_Y - SVG_GOAL_Y} fill="url(#tpColGrad)" />
            {Array.from({ length: 16 }, (_, i) => (
              <line
                key={i}
                x1={-HALF_W + (i + 0.5) * (COL_W / 16)}
                x2={-HALF_W + (i + 0.5) * (COL_W / 16)}
                y1={SVG_GOAL_Y}
                y2={STAGE_PLINTH_Y}
                stroke="#000"
                strokeWidth="1"
                opacity={i % 2 === 0 ? 0.25 : 0.08}
              />
            ))}
          </g>

          {/* the overflow above the seam: tilts 2.5 degrees as the crack value reaches 1 */}
          <g ref={overflow} style={{ transformOrigin: `0px ${SVG_GOAL_Y}px`, transform: 'scaleY(0.0001)', opacity: 0 }}>
            <rect x={-HALF_W} y={SVG_GOAL_Y - OVER_MAX} width={COL_W} height={OVER_MAX} fill="url(#tpColGrad)" />
            {Array.from({ length: 16 }, (_, i) => (
              <line
                key={i}
                x1={-HALF_W + (i + 0.5) * (COL_W / 16)}
                x2={-HALF_W + (i + 0.5) * (COL_W / 16)}
                y1={SVG_GOAL_Y - OVER_MAX}
                y2={SVG_GOAL_Y}
                stroke="#000"
                strokeWidth="1"
                opacity={i % 2 === 0 ? 0.25 : 0.08}
              />
            ))}
          </g>

          {/* ember glow at the seam and the seven cracks, clipped to the stone above the line */}
          <ellipse ref={ember} cx="0" cy={SVG_GOAL_Y - 10} rx="80" ry="40" fill="url(#tpEmber)" style={{ opacity: 0, mixBlendMode: 'screen' }} />
          <clipPath id="tpCrackClip">
            <rect ref={crackClip} x={-HALF_W - 4} y={SVG_GOAL_Y} width={COL_W + 8} height="0" />
          </clipPath>
          <g
            clipPath="url(#tpCrackClip)"
            fill="none"
            stroke={COL.ember}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={high ? { filter: 'drop-shadow(0 0 6px var(--ember-glow))' } : undefined}
            transform={`translate(0 ${SVG_GOAL_Y})`}
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

          {/* light sweep: a highlight band crossing the column, clipped to its height */}
          <clipPath id="tpBandClip">
            <rect ref={bandClip} x={-HALF_W} y={STAGE_PLINTH_Y} width={COL_W} height="0" />
          </clipPath>
          <g clipPath="url(#tpBandClip)">
            <rect className="tp-svg-band" x="-20" y="0" width="40" height={STAGE_H} fill="url(#tpBand)" />
          </g>

          {/* cap slab (one px lighter) and the gold capital riding the top */}
          <rect ref={cap} x={-HALF_W} y={STAGE_PLINTH_Y} width={COL_W} height="2" fill="#26262E" style={{ opacity: 0 }} />
          <ellipse ref={capital} cx="0" cy={STAGE_PLINTH_Y} rx={HALF_W} ry="3" fill={COL.capital} style={{ opacity: 0 }} />

          {/* the goal ring */}
          <ellipse ref={ring} cx="0" cy={SVG_GOAL_Y} rx="61" ry="9" fill="none" stroke={COL.goalLine} strokeWidth="1" style={{ opacity: 0 }} />
        </svg>
      </svg>

      {/* twelve dust spans at the foot of the column */}
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
