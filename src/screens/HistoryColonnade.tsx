import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DaySummary } from '../store/selectors'
import type { EnergyUnit } from '../lib/types'
import { formatDayLabel, parseDayKey } from '../lib/day'
import { formatEnergy, unitLabel } from '../lib/units'
import { useTier } from '../scene/tier'

/**
 * Strip geometry (px), polish-spec 6.4. 180 tall: 154 of column, a 6 px stylobate (4 of stone with a
 * gold top edge, 2 of shadow), 20 of day numbers.
 */
const STRIP_H = 180
const COL_H = 154
const STYLOBATE_H = 6
const LABEL_TOP = COL_H + STYLOBATE_H
const LABEL_H = STRIP_H - LABEL_TOP
/** the gold hairline sits at 60 percent of the column area, measured from the base */
const GOAL_H = Math.round(COL_H * 0.6)
const GOAL_TOP = COL_H - GOAL_H
const COL_W = 22
const GAP = 8
const PITCH = COL_W + GAP
const GUTTER = 20
const STUB_H = 4
/** the smallest ember tip that still reads */
const MIN_TIP = 5
/** ghost stubs drawn when nothing has ever been logged */
const GHOSTS = 14

type Props = {
  /** newest first, from historyDays */
  days: readonly DaySummary[]
  goalKcal: number
  today: string
  unit: EnergyUnit
  onPick(day: string): void
  /** nothing has ever been logged: ghost stubs and one line */
  empty?: boolean
}

/** Column height in px for a day: eaten over goal against the line at 60 percent; a stub when untracked. */
export function columnHeight(kcal: number, goalKcal: number, tracked: boolean): number {
  if (!tracked) return STUB_H
  const ratio = goalKcal > 0 ? kcal / goalKcal : 0
  return Math.min(COL_H, Math.max(STUB_H, Math.round(ratio * GOAL_H)))
}

/**
 * THE COLONNADE. One lit miniature column per day, 22 px wide with 8 px gaps, newest at the right,
 * scroll-snapped by week, standing on a stylobate, with the goal as a fixed gold hairline at 60 percent.
 * Lit from the right like the 3D key; a gold cap marks each value; today is gold; past the line the top
 * is ember. Untracked days are 4 px stubs.
 */
export function HistoryColonnade({ days, goalKcal, today, unit, onPick, empty = false }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const tier = useTier()
  const [entered, setEntered] = useState(false)

  // oldest at the left, grouped into weeks counted back from the newest day so the last group is a full week
  const weeks = useMemo(() => {
    const groups: DaySummary[][] = []
    for (let i = 0; i < days.length; i += 7) groups.push(days.slice(i, i + 7).reverse())
    return groups.reverse()
  }, [days])

  // newest at the right: park the scroller at its end before snap engages
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [days])

  // the columns rise once on mount, staggered from the right
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const total = days.length

  return (
    <div data-testid="tp-history-colonnade" data-empty={empty || undefined} className="relative w-full" style={{ height: STRIP_H }}>
      {/* the stylobate: one stone step under every column, a gold top edge, then a shadow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0" style={{ top: COL_H, height: STYLOBATE_H }}>
        <div className="h-px" style={{ background: 'rgba(216,180,90,0.42)' }} />
        <div className="h-[3px]" style={{ background: 'var(--color-obsidian-800)' }} />
        <div className="h-[2px]" style={{ background: 'var(--color-obsidian-900)' }} />
      </div>

      {/* the goal: a fixed gold hairline across the whole strip, labelled at the right gutter */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-[2] h-px" style={{ top: GOAL_TOP, background: 'rgba(216,180,90,0.8)' }} />
      <span
        aria-hidden="true"
        className="font-display pointer-events-none absolute z-[2] text-[12px] font-bold uppercase leading-none tracking-[0.08em] text-gold-300"
        style={{ top: GOAL_TOP - 17, right: GUTTER, textShadow: '0 0 3px var(--color-obsidian-950), 0 0 8px var(--color-obsidian-950)' }}
      >
        Goal
      </span>

      {empty ? (
        <div className="pointer-events-none absolute inset-x-0 z-[3] flex items-center justify-center px-8 text-center" style={{ top: GOAL_TOP + 14, height: COL_H - GOAL_TOP - 28 }}>
          <p className="font-body text-[18px] font-medium italic leading-[1.35] text-bone-soft">The ledger opens with your first meal.</p>
        </div>
      ) : null}

      <div
        ref={scroller}
        role="list"
        aria-label="Days"
        className="scrollbar-none relative z-[1] flex h-full w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
        style={{
          scrollSnapType: 'x proximity',
          scrollPaddingInline: GUTTER,
          paddingLeft: GUTTER,
          paddingRight: GUTTER - GAP,
          WebkitOverflowScrolling: 'touch',
          // columns scrolled past the gutters fade out instead of being cut
          maskImage: `linear-gradient(90deg, transparent 0, transparent 14px, #000 ${GUTTER - 2}px, #000 calc(100% - ${GUTTER - GAP}px), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(90deg, transparent 0, transparent 14px, #000 ${GUTTER - 2}px, #000 calc(100% - ${GUTTER - GAP}px), transparent 100%)`,
        }}
      >
        <svg width="0" height="0" aria-hidden="true" className="absolute">
          <defs>
            {/* lit from the right, like the 3D key */}
            <linearGradient id="hcol-stone" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#15151B" />
              <stop offset="0.45" stopColor="#24242C" />
              <stop offset="0.75" stopColor="#3A3A44" />
              <stop offset="1" stopColor="#1C1C24" />
            </linearGradient>
            <linearGradient id="hcol-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#D8B45A" />
              <stop offset="1" stopColor="#B8902E" />
            </linearGradient>
            <linearGradient id="hcol-gold-side" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity="0.22" />
              <stop offset="0.6" stopColor="#FFF7DA" stopOpacity="0.16" />
              <stop offset="1" stopColor="#000" stopOpacity="0.12" />
            </linearGradient>
            {/* the --ember-grad stops, run vertically */}
            <linearGradient id="hcol-ember" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFB088" />
              <stop offset="0.3" stopColor="#FF5A1F" />
              <stop offset="1" stopColor="#B3300A" />
            </linearGradient>
          </defs>
        </svg>
        {empty
          ? Array.from({ length: GHOSTS }, (_, i) => (
              <div key={i} role="presentation" className="shrink-0" style={{ width: PITCH, height: STRIP_H }}>
                <svg width={COL_W} height={COL_H} aria-hidden="true" className="block" style={{ opacity: 0.3 }}>
                  <rect x="0" y={COL_H - STUB_H} width={COL_W} height={STUB_H} fill="#9C9791" />
                </svg>
              </div>
            ))
          : weeks.map((week, wi) => (
              <div key={week[0]?.day ?? wi} role="presentation" className="flex shrink-0" style={{ scrollSnapAlign: 'start' }}>
                {week.map((d) => {
                  // position from the right, for the stagger
                  const fromRight = days.findIndex((x) => x.day === d.day)
                  return (
                    <DayColumn
                      key={d.day}
                      d={d}
                      goalKcal={goalKcal}
                      isToday={d.day === today}
                      today={today}
                      unit={unit}
                      glow={tier === 'high'}
                      entered={entered}
                      delay={Math.max(0, Math.min(14, fromRight)) * 22}
                      index={total - fromRight}
                      count={total}
                      onPick={onPick}
                    />
                  )
                })}
              </div>
            ))}
      </div>
    </div>
  )
}

type ColProps = {
  d: DaySummary
  goalKcal: number
  isToday: boolean
  today: string
  unit: EnergyUnit
  glow: boolean
  entered: boolean
  delay: number
  index: number
  count: number
  onPick(day: string): void
}

function DayColumn({ d, goalKcal, isToday, today, unit, glow, entered, delay, index, count, onPick }: ColProps) {
  const tracked = d.count > 0
  const h = columnHeight(d.totals.kcal, goalKcal, tracked)
  const over = tracked && d.totals.kcal > goalKcal
  const stoneH = over ? GOAL_H : h
  const tipH = over ? Math.max(MIN_TIP, h - GOAL_H) : 0
  const stoneTop = COL_H - stoneH
  const tipTop = stoneTop - tipH
  const top = over ? tipTop : stoneTop
  const date = parseDayKey(d.day).getDate()
  const label = formatDayLabel(d.day, today)
  const aria = tracked ? `${label}, ${formatEnergy(d.totals.kcal, unit)} ${unitLabel(unit)}${over ? ', over the line' : ''}` : `${label}, untracked`

  const flute = isToday ? '#5A4518' : '#E7E1D2'
  const fluteOps = isToday ? [0.35, 0.45, 0.3] : [0.07, 0.12, 0.05]

  return (
    <div role="listitem" aria-posinset={index} aria-setsize={count} className="shrink-0" style={{ width: PITCH, height: STRIP_H }}>
      <button
        type="button"
        aria-label={aria}
        aria-current={isToday ? 'date' : undefined}
        data-day={d.day}
        onClick={() => onPick(d.day)}
        className="group relative flex h-full w-full cursor-pointer flex-col items-start justify-start outline-none"
      >
        {/* hover and keyboard focus: a gold wash behind the column */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-1 left-[-3px] rounded-[2px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ width: COL_W + 6, background: 'rgba(216,180,90,0.16)', boxShadow: 'inset 0 0 0 1px var(--color-gold-300)' }}
        />
        {isToday && tracked ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: -14,
              width: COL_W + 28,
              top: top - 40,
              height: 40,
              background: 'radial-gradient(50% 50% at 50% 100%, rgba(216,180,90,0.45), transparent 70%)',
              opacity: entered ? 1 : 0,
              transition: `opacity 400ms var(--ease-stone) ${delay + 300}ms`,
            }}
          />
        ) : null}
        <svg
          width={COL_W}
          height={COL_H}
          viewBox={`0 0 ${COL_W} ${COL_H}`}
          aria-hidden="true"
          className="relative block overflow-visible"
          style={{
            transformOrigin: '50% 100%',
            transform: entered ? 'scaleY(1)' : 'scaleY(0)',
            transition: `transform 500ms var(--ease-stone) ${delay}ms`,
          }}
        >
          {!tracked ? (
            <rect x="0" y={COL_H - STUB_H} width={COL_W} height={STUB_H} fill="#22222A" opacity="0.6" />
          ) : (
            <>
              {over ? (
                <g style={glow ? { filter: 'drop-shadow(0 0 3px var(--ember-glow))' } : undefined}>
                  <rect x="0" y={tipTop} width={COL_W} height={tipH} fill="url(#hcol-ember)" />
                </g>
              ) : null}
              {/* the shaft */}
              <rect x="0" y={stoneTop} width={COL_W} height={stoneH} fill={isToday ? 'url(#hcol-gold)' : 'url(#hcol-stone)'} />
              {isToday ? <rect x="0" y={stoneTop} width={COL_W} height={stoneH} fill="url(#hcol-gold-side)" /> : null}
              {/* three flutes at 30, 50 and 70 percent */}
              {[0.3, 0.5, 0.7].map((f, i) => (
                <line
                  key={f}
                  x1={COL_W * f}
                  y1={stoneTop + 3}
                  x2={COL_W * f}
                  y2={COL_H}
                  stroke={flute}
                  strokeOpacity={fluteOps[i]}
                  strokeWidth="1"
                />
              ))}
              {/* the cap: the value mark */}
              <rect x="0" y={top} width={COL_W} height="2" fill={over ? '#FFB088' : isToday ? '#E6CB78' : '#D8B45A'} />
            </>
          )}
        </svg>
        <span
          aria-hidden="true"
          className={`font-display num absolute left-0 flex items-center justify-center text-[12px] font-bold leading-none tracking-[0.04em] ${
            isToday ? 'text-gold-300' : tracked ? 'text-bone-dim' : 'text-bone-mute'
          }`}
          style={{ top: LABEL_TOP, width: COL_W, height: LABEL_H }}
        >
          {date}
        </span>
      </button>
    </div>
  )
}
