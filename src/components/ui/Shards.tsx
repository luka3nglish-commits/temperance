import { useEffect, useRef } from 'react'
import { SHARDS, SHARD_VIEWBOX, type ShardPoly, type StripId } from './shards-data'

/**
 * THE FRACTURED EDGES (docs/design-spec.md section 8).
 *
 * Four strip SVGs (top, bottom, left, right) at z 40 over everything but the sheets, pointer-events
 * none, so the per-frame glint repaints four thin strips and never the whole screen. The polygons
 * come from scripts/shards.mjs (seeded, committed) so the stone is identical on every launch.
 *
 * Three layers per strip: facet gradient fills, the glint polyline along each broken inner edge
 * with a userSpaceOnUse gradient whose x1/x2 (y1/y2 on the sides) follow the tilt, and a specular
 * band clipped to the shards and slid by `--tilt-x`. No runtime filters.
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

const PLACE: Record<StripId, string> = {
  top: 'left-0 right-0 top-[var(--safe-top)] h-16',
  bottom: 'left-0 right-0 bottom-[var(--safe-bottom)] h-16',
  left: 'left-[var(--safe-left)] top-0 bottom-0 w-16',
  right: 'right-[var(--safe-right)] top-0 bottom-0 w-16',
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
  const band = side
    ? { x: 0, y: 844 / 2 - 70, width: 64, height: 140 }
    : { x: 390 / 2 - 70, y: 0, width: 140, height: 64 }

  return (
    <svg
      className={`absolute ${PLACE[id]}`}
      viewBox={SHARD_VIEWBOX[id]}
      preserveAspectRatio={ASPECT[id]}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {FACET_ANGLES.map((deg, i) => {
          const r = (deg * Math.PI) / 180
          const x1 = 50 - 50 * Math.cos(r)
          const y1 = 50 - 50 * Math.sin(r)
          return (
            <linearGradient
              key={i}
              id={`tp-f${i}-${id}`}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${100 - x1}%`}
              y2={`${100 - y1}%`}
            >
              <stop offset="0%" stopColor="#1A1A20" />
              <stop offset="55%" stopColor="#0A0A0D" />
              <stop offset="100%" stopColor="#26262E" />
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
          <stop offset="0.5" stopColor="#E7E1D2" stopOpacity="0.22" />
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

      {/* 2: glint along the broken inner edges, facet lines inside the big shards */}
      <g fill="none" stroke={`url(#${glintId})`} strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round">
        {polys.map((p, i) => (
          <polyline key={i} points={p.glint} opacity="0.55" />
        ))}
        <g clipPath={`url(#${clipId})`} opacity="0.25">
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
