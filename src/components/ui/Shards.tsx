import { useEffect, useRef } from 'react'
import { SHARDS, SHARD_VIEWBOX, type ShardPoly, type StripId } from './shards-data'

/**
 * THE FRACTURED EDGES (docs/design-spec.md section 8).
 *
 * Four strip SVGs (top, bottom, left, right) at z 40 over everything but the sheets, pointer-events
 * none, so the per-frame glint repaints four thin strips and never the whole screen. The polygons
 * come from scripts/shards.mjs (seeded, committed) so the stone is identical on every launch.
 *
 * Layers per strip (polish-spec 3.5, the fracture technique): facet gradient fills
 * (#1C1C22 / #0A0A0D / #2A2A31); under every glint a dark fracture stroke (black at 0.6, 1.5 wide)
 * so the edge reads as broken glass; the glint polylines along the broken inner edges that face the
 * light (top left), stroked with a userSpaceOnUse gradient whose x1/x2 (y1/y2 on the sides) follow
 * the tilt; facet lines inside the big shards at 0.18; a specular band (bone 0.16) clipped to the
 * shards and slid by `--tilt-x`. No runtime filters.
 *
 * Glint strength is `--shard-glint` on the shards root (default 0.4 at rest). The opening tweens it
 * 0 to 0.8 (120 to 420 ms) then to 0.4 (420 to 720 ms) and never holds at full.
 *
 * App renders this inside the 430 px frame, so the strips are absolute within it: on a phone the
 * frame is the viewport, on desktop they hug the slab.
 */

const FACET_ANGLES = [18, 72, 126, 180, 234, 288]
const STRIPS: StripId[] = ['top', 'bottom', 'left', 'right']

const isSide = (id: StripId) => id === 'left' || id === 'right'

const ASPECT: Record<StripId, string> = {
  top: 'xMidYMin slice',
  bottom: 'xMidYMax slice',
  left: 'xMinYMid slice',
  right: 'xMaxYMid slice',
}

/**
 * The strips sit flush with the frame's edges. The top strip starts at y 0 (spec section 6: the top
 * safe area is where it lives, dipping into the header band only at the corners) and the bottom
 * strip's 8 to 18 px shards sit in the bottom safe area under the bar's colour, never over the tab
 * labels. The frame already spans the safe areas (viewport-fit=cover), so no further offset.
 */
/*
 * Element sizes clip the strips so the stone never covers an inscription: the top strip is the top
 * safe area (at least 12 px), so on a notched phone the deep shards fill the status bar region and
 * elsewhere a thin rim runs along the top edge, its last 6 px fading out instead of a hard cut (the
 * header text starts at 14 px); the bottom strip only the bottom safe area; the side strips run
 * between the header band and the tab bar. With `slice` the viewBox stays 1:1, so a smaller element
 * simply crops.
 */
const PLACE: Record<StripId, string> = {
  top: 'left-0 right-0 top-0 h-[max(var(--safe-top),12px)] [mask-image:linear-gradient(180deg,#000_calc(100%-6px),transparent)]',
  bottom: 'left-0 right-0 bottom-0 h-[calc(var(--safe-bottom)+6px)]',
  left: 'left-0 top-[calc(var(--safe-top)+40px)] bottom-[calc(var(--safe-bottom)+56px)] w-16',
  right: 'right-0 top-[calc(var(--safe-top)+40px)] bottom-[calc(var(--safe-bottom)+56px)] w-16',
}

/** glint gradient endpoints for a tilt value: the bright seam crosses the strip as the light moves */
function glintSpan(id: StripId, tilt: number): [number, number] {
  const length = isSide(id) ? 844 : 390
  const a = length * (tilt * 1.2 - 0.6)
  return [a, a + length]
}

function Strip({ id, polys }: { id: StripId; polys: ShardPoly[] }) {
  const side = isSide(id)
  const glintRef = useRef<SVGLinearGradientElement>(null)

  useEffect(() => {
    const g = glintRef.current
    if (!g) return
    const apply = (tilt: number) => {
      const [a, b] = glintSpan(id, tilt)
      if (side) {
        g.setAttribute('y1', a.toFixed(1))
        g.setAttribute('y2', b.toFixed(1))
      } else {
        g.setAttribute('x1', a.toFixed(1))
        g.setAttribute('x2', b.toFixed(1))
      }
    }
    const onTilt = (e: Event) => {
      const x = (e as CustomEvent<number>).detail
      if (typeof x === 'number' && Number.isFinite(x)) apply(x)
    }
    apply(0)
    window.addEventListener('tilt', onTilt)
    return () => window.removeEventListener('tilt', onTilt)
  }, [id, side])

  const clipId = `tp-clip-${id}`
  const glintId = `tp-glint-${id}`
  const specId = `tp-spec-${id}`
  const [g0, g1] = glintSpan(id, 0)
  const specStyle = {
    transform: side ? 'translateY(calc(var(--tilt-x) * 120px))' : 'translateX(calc(var(--tilt-x) * 120px))',
    willChange: 'transform',
  } as const
  // the soft specular band, 140 units wide across the strip's long axis, centred at rest
  const band = side ? { x: 0, y: 844 / 2 - 70, width: 64, height: 140 } : { x: 390 / 2 - 70, y: 0, width: 140, height: 64 }

  // an <svg> is a replaced element: left/right or top/bottom offsets do not stretch it, so a wrapper
  // takes the placement and the svg fills it (otherwise the side strips run 844 px tall over the bar)
  return (
    <div className={`absolute overflow-hidden ${PLACE[id]}`}>
      <svg className="absolute inset-0 block h-full w-full" viewBox={SHARD_VIEWBOX[id]} preserveAspectRatio={ASPECT[id]} aria-hidden="true" focusable="false">
        <defs>
          {FACET_ANGLES.map((deg, i) => {
            const r = (deg * Math.PI) / 180
            const x1 = 50 - 50 * Math.cos(r)
            const y1 = 50 - 50 * Math.sin(r)
            return (
              <linearGradient key={i} id={`tp-f${i}-${id}`} x1={`${x1}%`} y1={`${y1}%`} x2={`${100 - x1}%`} y2={`${100 - y1}%`}>
                <stop offset="0%" stopColor="#1C1C22" />
                <stop offset="55%" stopColor="#0A0A0D" />
                <stop offset="100%" stopColor="#2A2A31" />
              </linearGradient>
            )
          })}
          <linearGradient
            ref={glintRef}
            id={glintId}
            gradientUnits="userSpaceOnUse"
            x1={side ? 0 : g0}
            y1={side ? g0 : 0}
            x2={side ? 0 : g1}
            y2={side ? g1 : 0}
          >
            <stop offset="0" stopColor="#F6E3A1" stopOpacity="0" />
            <stop offset="0.48" stopColor="#F6E3A1" />
            <stop offset="0.5" stopColor="#FFF7DA" />
            <stop offset="0.52" stopColor="#F6E3A1" />
            <stop offset="1" stopColor="#F6E3A1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={specId} x1="0" y1="0" x2={side ? '0' : '1'} y2={side ? '1' : '0'}>
            <stop offset="0" stopColor="#E7E1D2" stopOpacity="0" />
            <stop offset="0.5" stopColor="#E7E1D2" stopOpacity="0.16" />
            <stop offset="1" stopColor="#E7E1D2" stopOpacity="0" />
          </linearGradient>
          <clipPath id={clipId}>
            {polys.map((p, i) => (
              <polygon key={i} points={p.points} />
            ))}
          </clipPath>
        </defs>

        {/* 1: facet fills */}
        <g>
          {polys.map((p, i) => (
            <polygon key={i} points={p.points} fill={`url(#tp-f${p.facet}-${id})`} />
          ))}
        </g>

        {/* 2: the fracture under each lit edge, then the glint on it, then facet lines inside the big shards */}
        <g fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
          {polys.flatMap((p, i) => p.glint.map((g, j) => <polyline key={`${i}-${j}`} points={g} />))}
        </g>
        <g fill="none" stroke={`url(#${glintId})`} strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round">
          <g className="shard-glint" style={{ opacity: 'var(--shard-glint, 0.4)' }}>
            {polys.flatMap((p, i) => p.glint.map((g, j) => <polyline key={`${i}-${j}`} points={g} />))}
          </g>
          <g clipPath={`url(#${clipId})`} opacity="0.18">
            {polys.flatMap((p, i) => p.lines.map((l, j) => <polyline key={`${i}-${j}`} points={l} />))}
          </g>
        </g>

        {/* 3: specular band, clipped to the shards, slid by the tilt */}
        <g clipPath={`url(#${clipId})`}>
          <g className="spec" style={specStyle}>
            <rect x={band.x} y={band.y} width={band.width} height={band.height} fill={`url(#${specId})`} />
          </g>
        </g>
      </svg>
    </div>
  )
}

export function Shards() {
  return (
    <div data-intro="shards" aria-hidden="true" className="pointer-events-none absolute inset-0 z-[var(--z-shards)]">
      {STRIPS.map((id) => (
        <Strip key={id} id={id} polys={SHARDS[id]} />
      ))}
    </div>
  )
}
