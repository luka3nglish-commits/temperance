// Seeded shard generator for the fractured obsidian edges (docs/design-spec.md section 8).
// Writes src/components/ui/shards-data.ts. Deterministic: the same seed gives the same stone
// on every run, so the committed output is the source of truth and this script is only re-run
// on purpose.
//
//   node scripts/shards.mjs
//
// Strips (viewBox units): top 390 x 64 (5 shards), bottom 390 x 64 (3 at each corner, shallow),
// left 64 x 844 (9 shards), right 64 x 844 (11 shards). Every polygon: two points flush on the
// screen edge plus two to four jagged inner points (4 to 6 total). Depth 18 to 64 px, deepest at
// the top right and the bottom left; the bottom strip stays 8 to 18 px (left corner 11 to 18, right
// corner 8 to 15 so the deepest bottom shard is at the left) and never eats the bar.
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SEED = 0x7e4d1a5c
const FACETS = 6

// mulberry32
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(SEED)
const between = (lo, hi) => lo + (hi - lo) * rand()
const pick = (lo, hi) => Math.floor(between(lo, hi + 1))
const smooth = (t) => t * t * (3 - 2 * t)
const r1 = (n) => Math.round(n * 10) / 10

/** Jittered contiguous segments of [0, length]. */
function segments(length, count, jitter = 0.3) {
  const bounds = [0]
  for (let i = 1; i < count; i++) {
    const ideal = (length * i) / count
    const w = length / count
    bounds.push(ideal + between(-jitter, jitter) * w)
  }
  bounds.push(length)
  return bounds
}

let lastFacet = -1
function nextFacet() {
  let f = pick(0, FACETS - 1)
  if (f === lastFacet) f = (f + 1 + pick(0, FACETS - 3)) % FACETS
  lastFacet = f
  return f
}

/**
 * One shard along an edge. `a` to `b` is the run along the edge (shared, slanted boundaries),
 * `depth(u)` gives the inner depth at 0..1 along the run. `place(along, depth)` maps to x,y.
 */
function shard(a, b, slantA, slantB, depthAt, place, opts = {}) {
  const run = b - a
  const lo = opts.lo
  // 2 outer points on the screen edge + 2 corner points + 0 to 2 mid points = 4 to 6
  const midCount = pick(0, 2)
  const outerA = place(a, 0)
  const outerB = place(b, 0)
  const jag = (base) => lo + (base - lo) * between(opts.jagLo ?? 0.4, 1)
  const inner = []
  for (let i = 0; i < midCount; i++) {
    // spread mid points across the run, jittered, never on the boundary itself
    const u = (i + 0.5 + between(-0.25, 0.25)) / midCount
    const along = a + slantA + (run + slantB - slantA) * u
    inner.push([along, jag(depthAt(u))])
  }
  // the two corner points sit shallower so the inner edge reads as broken, not ruled
  inner.push([b + slantB, lo + (depthAt(1) - lo) * between(0.1, 0.5)])
  inner.push([a + slantA, lo + (depthAt(0) - lo) * between(0.1, 0.5)])
  // inner edge from B back to A so the polygon winds consistently
  inner.sort((p, q) => q[0] - p[0])
  const innerPts = inner.map(([s, d]) => place(s, d))
  const pts = [outerA, outerB, ...innerPts]
  const glint = [outerB, ...innerPts, outerA]
  const maxDepth = Math.max(...inner.map(([, d]) => d))
  const lines = []
  if (maxDepth > 34) {
    const n = pick(3, 4)
    for (let i = 0; i < n; i++) {
      const along = a + slantA + 8 + (run - 16) * ((i + between(0.2, 0.8)) / n)
      const d0 = maxDepth * between(0.1, 0.3)
      const d1 = maxDepth * between(0.5, 0.8)
      lines.push([place(along + between(-5, 5), d0), place(along, d1)])
    }
  }
  return {
    points: pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' '),
    facet: nextFacet(),
    depth: Math.round(maxDepth),
    glint: glint.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' '),
    lines: lines.map((l) => l.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')),
  }
}

function strip({ length, count, depthRange, deepAt, place, from = 0, to = length, jagLo }) {
  const bounds = segments(to - from, count).map((b) => b + from)
  const slants = bounds.map((_, i) => (i === 0 || i === bounds.length - 1 ? 0 : between(-9, 9)))
  const [lo, hi] = depthRange
  const out = []
  for (let i = 0; i < count; i++) {
    const a = bounds[i]
    const b = bounds[i + 1]
    const depthAt = (u) => {
      const pos = (a + (b - a) * u) / length
      const t = deepAt === 'end' ? smooth(pos) : deepAt === 'start' ? smooth(1 - pos) : 0.5
      return lo + (hi - lo) * (0.2 + 0.8 * t) * between(0.9, 1)
    }
    out.push(shard(a, b, slants[i], slants[i + 1], depthAt, place, { jagLo, lo }))
  }
  return out
}

const top = strip({
  length: 390,
  count: 5,
  depthRange: [18, 64],
  deepAt: 'end',
  place: (s, d) => [s, d],
})
const left = strip({
  length: 844,
  count: 9,
  depthRange: [18, 64],
  deepAt: 'end',
  place: (s, d) => [d, s],
})
const right = strip({
  length: 844,
  count: 11,
  depthRange: [18, 64],
  deepAt: 'start',
  place: (s, d) => [64 - d, s],
})
const bottomLeft = strip({
  length: 390,
  count: 3,
  from: 0,
  to: 128,
  depthRange: [11, 18],
  deepAt: 'start',
  place: (s, d) => [s, 64 - d],
  jagLo: 0.7,
})
const bottomRight = strip({
  length: 390,
  count: 3,
  from: 262,
  to: 390,
  depthRange: [8, 15],
  deepAt: 'end',
  place: (s, d) => [s, 64 - d],
  jagLo: 0.7,
})

const data = { top, bottom: [...bottomLeft, ...bottomRight], left, right }

const file = `// GENERATED by scripts/shards.mjs (seed ${SEED.toString(16)}). Do not edit by hand; re-run the script.
// Four strips of fractured obsidian for src/components/ui/Shards.tsx (docs/design-spec.md section 8).

export type ShardPoly = {
  /** SVG polygon points in the strip's viewBox */
  points: string
  /** which of the six facet gradients fills this shard */
  facet: number
  /** deepest inner point, px */
  depth: number
  /** polyline along the broken inner edge (never the screen-side edge) */
  glint: string
  /** short facet lines inside the bigger shards */
  lines: string[]
}

export type StripId = 'top' | 'bottom' | 'left' | 'right'

export const SHARD_VIEWBOX: Record<StripId, string> = {
  top: '0 0 390 64',
  bottom: '0 0 390 64',
  left: '0 0 64 844',
  right: '0 0 64 844',
}

export const SHARDS: Record<StripId, ShardPoly[]> = ${JSON.stringify(data, null, 2)}
`

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'src', 'components', 'ui', 'shards-data.ts')
writeFileSync(out, file)
console.log(
  `wrote ${out}: top ${top.length}, bottom ${data.bottom.length}, left ${left.length}, right ${right.length}`,
)
