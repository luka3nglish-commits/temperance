/**
 * BODY · the weight chart: an SVG line over the last 90 days of weigh-ins. The geometry is pure
 * (`buildWeightChart` and the helpers above it, covered by HistoryWeightChart.test.ts). The component
 * measures its own width so the viewBox maps 1:1 to CSS pixels and the 12 px Cinzel labels render at 12 px.
 */
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { WeightEntry } from '../lib/types'
import { dayKeyOffset, formatDayLabel, parseDayKey } from '../lib/day'

/** Chart height in px. */
export const CHART_HEIGHT = 160
/** Width used until the container is measured: a 390 px phone less two 16 px gutters. */
export const CHART_FALLBACK_WIDTH = 358
/** The x axis reaches at least this many days back from today, so a first weigh-in sits on a week. */
export const MIN_SPAN_DAYS = 6
/** Plot insets inside the chart box: the y labels sit in the left inset, the day labels in the bottom one. */
export const CHART_PAD = { left: 30, right: 6, top: 12, bottom: 26 } as const
/** Every SVG label: Cinzel 700 at 12 px (the viewBox maps 1:1 to CSS px, so 12 units render at 12 px). */
export const CHART_FONT_PX = 12
/** Labelled gridlines sit at least this far apart, so 12 px labels never touch. */
export const MIN_LABEL_GAP = 18

const GOLD_400 = '#D8B45A'
const GOLD_300 = '#E6CB78'
const GOLD_200 = '#F6E3A1'
const BONE_DIM = '#D3CDC2'
const GOLD_LINE = 'rgba(216, 180, 90, 0.42)'
const GRID = 'rgba(231, 225, 210, 0.06)'
const DAY_MS = 86_400_000

/**
 * Whole-kg gridlines for the y range, and which of them carry a label. Lines every kilogram (every 2, 5
 * or 10 when a kilogram is under 4 px); labels on the smallest step of 1, 2, 5, 10 or 20 kg that keeps
 * them `MIN_LABEL_GAP` px apart, always including the bottom of the range.
 */
export function gridTicks(domain: { min: number; max: number }, plotHeight: number): { lines: number[]; labels: number[] } {
  const span = domain.max - domain.min
  if (!(span > 0) || !(plotHeight > 0)) return { lines: [], labels: [] }
  const pxPerKg = plotHeight / span
  const steps = [1, 2, 5, 10, 20, 50]
  const lineStep = steps.find((s) => s * pxPerKg >= 4) ?? 50
  const labelStep = steps.find((s) => s * pxPerKg >= MIN_LABEL_GAP) ?? 50
  const lines: number[] = []
  const labels: number[] = []
  const first = Math.ceil(domain.min)
  for (let kg = first; kg <= domain.max; kg++) {
    if ((kg - first) % lineStep === 0) lines.push(kg)
    if ((kg - first) % labelStep === 0) labels.push(kg)
  }
  return { lines, labels }
}

/** Kilograms to one decimal: `84.3`, `80.0`. */
export function formatKg(kg: number): string {
  if (!Number.isFinite(kg)) return '0.0'
  return (Math.round(kg * 10) / 10).toFixed(1)
}

/** Whole local days from `a` to `b`, negative when `b` is earlier. Safe across daylight saving changes. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDayKey(b).getTime() - parseDayKey(a).getTime()) / DAY_MS)
}

/** Linear map from the domain [d0, d1] onto the range [r0, r1]. A zero width domain maps to the middle. */
export function scaleLinear(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const span = d1 - d0
  if (!Number.isFinite(span) || span === 0) {
    const mid = (r0 + r1) / 2
    return () => mid
  }
  const k = (r1 - r0) / span
  return (v) => r0 + (v - d0) * k
}

/**
 * The kg range of the y axis: the data range padded by `pad` kg each side, widened about its middle to at
 * least `minSpan` kg, then rounded out to whole kilograms so the two axis labels read clean.
 * Data only: a target outside it becomes an edge label and never flattens the line.
 */
export function yDomain(kgs: readonly number[], pad = 1, minSpan = 4): { min: number; max: number } {
  const vals = kgs.filter((v) => Number.isFinite(v) && v > 0)
  if (!vals.length) return { min: 0, max: minSpan }
  let lo = Math.min(...vals) - pad
  let hi = Math.max(...vals) + pad
  if (hi - lo < minSpan) {
    const mid = (lo + hi) / 2
    lo = mid - minSpan / 2
    hi = mid + minSpan / 2
  }
  // one decimal first, so float dust (86.0000001) never rounds out a whole extra kilogram
  lo = Math.round(lo * 10) / 10
  hi = Math.round(hi * 10) / 10
  return { min: Math.max(0, Math.floor(lo)), max: Math.ceil(hi) }
}

/** First and last day of the x axis: the earliest weigh-in (at least `minSpan` days back) to today. */
export function xDays(days: readonly string[], today: string, minSpan = MIN_SPAN_DAYS): { start: string; end: string } {
  let start = dayKeyOffset(today, -minSpan)
  for (const d of days) if (d < start) start = d
  return { start, end: today }
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** `M x y L x y ...` through the points, two decimals. */
export function linePath(points: readonly { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${round2(p.x)} ${round2(p.y)}`).join(' ')
}

/** The line closed straight down to `baseY` and back along it, for the fill under the line. Empty without points. */
export function areaPath(points: readonly { x: number; y: number }[], baseY: number): string {
  if (!points.length) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${linePath(points)} L ${round2(last.x)} ${round2(baseY)} L ${round2(first.x)} ${round2(baseY)} Z`
}

export type ChartPoint = { day: string; kg: number; x: number; y: number }

/** The target line inside the y range, or an edge label when the target lies above or below it. */
export type ChartTarget =
  | { kg: number; position: 'inside'; y: number; labelY: number }
  | { kg: number; position: 'above' | 'below'; labelY: number }

export type WeightChart = {
  width: number
  height: number
  plot: { left: number; right: number; top: number; bottom: number }
  domain: { min: number; max: number }
  startDay: string
  endDay: string
  /** formatDayLabel of the first and last day on the x axis */
  dayLabels: { start: string; end: string }
  /** weigh-ins oldest first, in px */
  points: ChartPoint[]
  /** the line through the points; null under two points (dots only) */
  line: string | null
  /** the line closed to the baseline, for the gradient fill; null under two points */
  area: string | null
  target: ChartTarget | null
}

export type WeightChartOptions = {
  today: string
  width?: number
  height?: number
  targetKg?: number | null
}

/**
 * Everything the chart draws, in px for a `width` x `height` box. x runs by calendar day over `xDays`
 * (gaps between weigh-ins stay gaps), y by kg over `yDomain`. Weigh-ins after today are ignored.
 */
export function buildWeightChart(
  weights: readonly WeightEntry[],
  { today, width = CHART_FALLBACK_WIDTH, height = CHART_HEIGHT, targetKg = null }: WeightChartOptions,
): WeightChart {
  const w = Math.max(120, Math.round(width))
  const plot = { left: CHART_PAD.left, right: w - CHART_PAD.right, top: CHART_PAD.top, bottom: height - CHART_PAD.bottom }
  const list = weights
    .filter((e) => Number.isFinite(e.kg) && e.kg > 0 && e.day <= today)
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
  const domain = yDomain(list.map((e) => e.kg))
  const { start, end } = xDays(
    list.map((e) => e.day),
    today,
  )
  const x = scaleLinear(0, Math.max(1, daysBetween(start, end)), plot.left, plot.right)
  const y = scaleLinear(domain.min, domain.max, plot.bottom, plot.top)
  const points = list.map((e) => ({ day: e.day, kg: e.kg, x: x(daysBetween(start, e.day)), y: y(e.kg) }))
  const two = points.length >= 2

  let target: ChartTarget | null = null
  if (points.length && typeof targetKg === 'number' && Number.isFinite(targetKg) && targetKg > 0) {
    // baselines for 12 px Cinzel: 6 px clear of a line above the text, 15 px below a line under it
    if (targetKg < domain.min) target = { kg: targetKg, position: 'below', labelY: plot.bottom - 6 }
    else if (targetKg > domain.max) target = { kg: targetKg, position: 'above', labelY: plot.top + 15 }
    else {
      const ty = y(targetKg)
      // the label sits on the side of the line away from the latest weigh-in, and inside the plot
      const latestY = points[points.length - 1].y
      let labelY = latestY <= ty ? ty + 15 : ty - 6
      if (labelY > plot.bottom - 2) labelY = ty - 6
      if (labelY < CHART_FONT_PX) labelY = ty + 15
      target = { kg: targetKg, position: 'inside', y: ty, labelY }
    }
  }

  return {
    width: w,
    height,
    plot,
    domain,
    startDay: start,
    endDay: end,
    dayLabels: { start: formatDayLabel(start, today), end: formatDayLabel(end, today) },
    points,
    line: two ? linePath(points) : null,
    area: two ? areaPath(points, plot.bottom) : null,
    target,
  }
}

// ---------- the component ----------

type Props = {
  /** weigh-ins in the window (weightsInWindow), any order */
  weights: readonly WeightEntry[]
  today: string
  targetKg?: number | null
}

/** Cinzel 700 12 px; letter-spacing stays at or under 0.06em (nothing under 13 px tracks past 0.2em). */
const LABEL = { fontSize: CHART_FONT_PX, fontWeight: 700, fill: BONE_DIM } as const

/**
 * 160 px tall, full width (polish-spec 6.5). Faint gridlines at each whole kilogram with their values at
 * the left, a gold-400 line (1.5 px) over a gold fill fading down, 3 px dots on weigh-in days and the
 * latest as a gold-200 dot in a soft halo, a dashed gold-400 target line labelled `TARGET 80.0` in
 * gold-300, and the first and last day underneath. Every label is Cinzel 700 at 12 px.
 * Under two weigh-ins: the dots and one quiet line.
 */
export function HistoryWeightChart({ weights, today, targetKg = null }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(CHART_FALLBACK_WIDTH)
  const gradId = `tp-weight-fill-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`

  // measure before paint, then follow the container (rotation, the desktop slab)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width)
      if (w > 0) setWidth(w)
    }
    measure()
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const chart = useMemo(() => buildWeightChart(weights, { today, width, targetKg }), [weights, today, width, targetKg])
  const { plot, points, target } = chart
  const n = points.length
  const latest = n ? points[n - 1] : null
  const ticks = useMemo(() => gridTicks(chart.domain, plot.bottom - plot.top), [chart.domain, plot.bottom, plot.top])

  const aria =
    n === 0
      ? 'Weight chart, no weigh-ins in the last 90 days'
      : `Weight chart, ${n} ${n === 1 ? 'weigh-in' : 'weigh-ins'}, ${formatKg(points[0].kg)} to ${formatKg(points[n - 1].kg)} kg`

  // the one-line note sits clear of a lone dot
  const noteTop = n === 1 && latest ? (latest.y < chart.height / 2 ? plot.bottom - 30 : plot.top + 8) : (chart.height - 20) / 2

  return (
    <div
      ref={box}
      data-testid="tp-weight-chart"
      data-points={n}
      data-min={n ? chart.domain.min : undefined}
      data-max={n ? chart.domain.max : undefined}
      className="relative w-full"
      style={{ height: CHART_HEIGHT }}
    >
      <svg width="100%" height={chart.height} viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={aria} className="block overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(216, 180, 90)" stopOpacity="0.16" />
            <stop offset="1" stopColor="rgb(216, 180, 90)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* whole-kg gridlines, then the base rule */}
        {n
          ? ticks.lines.map((kg) => {
              const gy = round2(plot.bottom - ((kg - chart.domain.min) / (chart.domain.max - chart.domain.min)) * (plot.bottom - plot.top))
              return <line key={kg} x1={plot.left} x2={plot.right} y1={gy} y2={gy} stroke={GRID} strokeWidth={0.5} />
            })
          : null}
        <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} stroke={GOLD_LINE} strokeWidth={1} />

        {n ? (
          <g data-axis="y" className="font-display" style={{ letterSpacing: '0.04em' }}>
            {ticks.labels.map((kg) => {
              const gy = plot.bottom - ((kg - chart.domain.min) / (chart.domain.max - chart.domain.min)) * (plot.bottom - plot.top)
              return (
                <text key={kg} x={plot.left - 6} y={gy} textAnchor="end" dominantBaseline="central" {...LABEL}>
                  {kg}
                </text>
              )
            })}
          </g>
        ) : null}

        {chart.area ? <path d={chart.area} fill={`url(#${gradId})`} /> : null}

        {target && target.position === 'inside' ? (
          <g data-target="inside">
            <line x1={plot.left} x2={plot.right} y1={target.y} y2={target.y} stroke={GOLD_400} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="4 4" />
            <text x={plot.right} y={target.labelY} textAnchor="end" className="font-display" style={{ letterSpacing: '0.06em', paintOrder: 'stroke' }} stroke="#050507" strokeWidth={3} strokeOpacity={0.85} fontSize={CHART_FONT_PX} fontWeight={700} fill={GOLD_300}>
              {`TARGET ${formatKg(target.kg)}`}
            </text>
          </g>
        ) : null}
        {target && target.position !== 'inside' ? (
          <g data-target={target.position}>
            <path
              d={
                target.position === 'below'
                  ? `M ${plot.left + 2} ${target.labelY - 6} L ${plot.left + 6} ${target.labelY - 2} L ${plot.left + 10} ${target.labelY - 6}`
                  : `M ${plot.left + 2} ${target.labelY - 4} L ${plot.left + 6} ${target.labelY - 8} L ${plot.left + 10} ${target.labelY - 4}`
              }
              fill="none"
              stroke={GOLD_300}
              strokeWidth={1.5}
            />
            <text x={plot.left + 16} y={target.labelY} className="font-display" style={{ letterSpacing: '0.06em', paintOrder: 'stroke' }} stroke="#050507" strokeWidth={3} strokeOpacity={0.85} fontSize={CHART_FONT_PX} fontWeight={700} fill={GOLD_300}>
              {`TARGET ${formatKg(target.kg)}`}
            </text>
          </g>
        ) : null}

        {chart.line ? <path d={chart.line} fill="none" stroke={GOLD_400} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
        {points.map((p, i) =>
          i === n - 1 ? (
            <g key={p.day} data-latest="">
              <circle cx={p.x} cy={p.y} r={4} fill="rgba(216, 180, 90, 0.25)" />
              <circle cx={p.x} cy={p.y} r={2} fill={GOLD_200} />
            </g>
          ) : (
            <circle key={p.day} cx={p.x} cy={p.y} r={1.5} fill={GOLD_300} />
          ),
        )}

        {n ? (
          <g data-axis="x" className="font-display" style={{ letterSpacing: '0.06em' }}>
            <text x={plot.left} y={chart.height - 6} {...LABEL}>
              {chart.dayLabels.start.toUpperCase()}
            </text>
            <text x={plot.right} y={chart.height - 6} textAnchor="end" {...LABEL}>
              {chart.dayLabels.end.toUpperCase()}
            </text>
          </g>
        ) : null}
      </svg>
      {n < 2 ? (
        <p className="empty-line pointer-events-none absolute inset-x-0 text-center leading-5" style={{ top: noteTop }}>
          Two weigh-ins draw the line.
        </p>
      ) : null}
    </div>
  )
}
