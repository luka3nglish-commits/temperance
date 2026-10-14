/**
 * BODY · the weight chart: an SVG line over the last 90 days of weigh-ins. The geometry is pure
 * (`buildWeightChart` and the helpers above it, covered by HistoryWeightChart.test.ts). The component
 * measures its own width so the viewBox maps 1:1 to CSS pixels and the 9 px Cinzel labels never stretch.
 */
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { WeightEntry } from '../lib/types'
import { dayKeyOffset, formatDayLabel, parseDayKey } from '../lib/day'

/** Chart height in px. */
export const CHART_HEIGHT = 140
/** Width used until the container is measured: a 390 px phone less two 16 px gutters. */
export const CHART_FALLBACK_WIDTH = 358
/** The x axis reaches at least this many days back from today, so a first weigh-in sits on a week. */
export const MIN_SPAN_DAYS = 6
/** Plot insets inside the chart box: the y labels sit in the left inset, the day labels in the bottom one. */
export const CHART_PAD = { left: 26, right: 6, top: 10, bottom: 22 } as const

const GOLD_400 = '#D8B45A'
const GOLD_300 = '#E6CB78'
const GOLD_200 = '#F6E3A1'
const BONE_DIM = '#9A948A'
const GOLD_LINE = 'rgba(216, 180, 90, 0.16)'
const DAY_MS = 86_400_000

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
    if (targetKg < domain.min) target = { kg: targetKg, position: 'below', labelY: plot.bottom - 5 }
    else if (targetKg > domain.max) target = { kg: targetKg, position: 'above', labelY: plot.top + 7 }
    else {
      const ty = y(targetKg)
      // the label sits on the side of the line away from the latest weigh-in, and inside the plot
      const latestY = points[points.length - 1].y
      let labelY = latestY <= ty ? ty + 11 : ty - 5
      if (labelY > plot.bottom - 2) labelY = ty - 5
      if (labelY < 9) labelY = ty + 11
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

const LABEL_FONT = { fontSize: 9, fill: BONE_DIM } as const

/**
 * 140 px tall, full width. A gold-400 line (1.5 px, butt caps) over a faint gold fill, 3 px dots on
 * weigh-in days (the latest one a little larger), a dashed gold-200 TARGET line, the y range at the
 * left edge and the first and last day underneath. Under two weigh-ins: the dots and one quiet line.
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
            <stop offset="0" stopColor="rgb(216, 180, 90)" stopOpacity="0.14" />
            <stop offset="1" stopColor="rgb(216, 180, 90)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} stroke={GOLD_LINE} strokeWidth={1} />

        {n ? (
          <g className="font-display" style={{ letterSpacing: '0.1em' }}>
            <text x={0} y={plot.top} dominantBaseline="central" {...LABEL_FONT}>
              {chart.domain.max}
            </text>
            <text x={0} y={plot.bottom} dominantBaseline="central" {...LABEL_FONT}>
              {chart.domain.min}
            </text>
          </g>
        ) : null}

        {target && target.position === 'inside' ? (
          <g data-target="inside">
            <line x1={plot.left} x2={plot.right} y1={target.y} y2={target.y} stroke={GOLD_200} strokeOpacity={0.75} strokeWidth={1} strokeDasharray="4 4" />
            <text x={plot.right} y={target.labelY} textAnchor="end" className="font-display" style={{ letterSpacing: '0.2em' }} fontSize={9} fill={GOLD_200} fillOpacity={0.85}>
              TARGET
            </text>
          </g>
        ) : null}
        {target && target.position !== 'inside' ? (
          <g data-target={target.position}>
            <path
              d={
                target.position === 'below'
                  ? `M ${plot.left + 2} ${target.labelY - 5} L ${plot.left + 5} ${target.labelY - 2} L ${plot.left + 8} ${target.labelY - 5}`
                  : `M ${plot.left + 2} ${target.labelY - 3} L ${plot.left + 5} ${target.labelY - 6} L ${plot.left + 8} ${target.labelY - 3}`
              }
              fill="none"
              stroke={GOLD_200}
              strokeOpacity={0.85}
              strokeWidth={1}
            />
            <text x={plot.left + 13} y={target.labelY} className="font-display" style={{ letterSpacing: '0.2em' }} fontSize={9} fill={GOLD_200} fillOpacity={0.85}>
              {`TARGET ${formatKg(target.kg)}`}
            </text>
          </g>
        ) : null}

        {chart.area ? <path d={chart.area} fill={`url(#${gradId})`} /> : null}
        {chart.line ? <path d={chart.line} fill="none" stroke={GOLD_400} strokeWidth={1.5} strokeLinecap="butt" strokeLinejoin="round" /> : null}
        {points.map((p, i) =>
          i === n - 1 ? (
            <circle key={p.day} cx={p.x} cy={p.y} r={2.5} fill={GOLD_200} />
          ) : (
            <circle key={p.day} cx={p.x} cy={p.y} r={1.5} fill={GOLD_300} />
          ),
        )}

        {n ? (
          <g className="font-display" style={{ letterSpacing: '0.2em' }}>
            <text x={plot.left} y={chart.height - 4} {...LABEL_FONT}>
              {chart.dayLabels.start.toUpperCase()}
            </text>
            <text x={plot.right} y={chart.height - 4} textAnchor="end" {...LABEL_FONT}>
              {chart.dayLabels.end.toUpperCase()}
            </text>
          </g>
        ) : null}
      </svg>
      {n < 2 ? (
        <p className="pointer-events-none absolute inset-x-0 text-center font-body text-[14px] italic leading-5 text-bone-dim" style={{ top: noteTop }}>
          Two weigh-ins draw the line.
        </p>
      ) : null}
    </div>
  )
}
