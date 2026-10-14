import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DaySummary } from '../store/selectors'
import { formatDayLabel, parseDayKey } from '../lib/day'
import { formatInt } from '../lib/units'
import { useTier } from '../scene/tier'

/** Strip geometry (px). The strip is 180 tall: 162 of column, 18 of day numbers. */
const STRIP_H = 180
const COL_H = 162
const LABEL_H = STRIP_H - COL_H
/** the gold hairline sits at 60 percent of the column area, measured from the base */
const GOAL_H = Math.round(COL_H * 0.6)
const COL_W = 22
const GAP = 8
const PITCH = COL_W + GAP
const GUTTER = 20
const STUB_H = 4
/** the smallest ember tip that still reads */
const MIN_TIP = 5

type Props = {
  /** newest first, from historyDays */
  days: readonly DaySummary[]
  goalKcal: number
  today: string
  onPick(day: string): void
}

/**
 * THE COLONNADE. One miniature obsidian column per day, 22 px wide with 8 px gaps, newest at the right,
 * scroll-snapped by week, with the goal as a fixed gold hairline at 60 percent of the strip. Height is
 * eaten over goal against that line; past it the top is ember. Untracked days are 4 px stubs.
 */
export function HistoryColonnade({ days, goalKcal, today, onPick }: Props) {
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
    <div className="relative w-full" style={{ height: STRIP_H }}>
      {/* the goal: a fixed gold hairline across the whole strip */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 z-[1] h-px bg-gold-400"
        style={{ top: COL_H - GOAL_H, boxShadow: '0 0 6px rgba(216,180,90,0.25)' }}
      />
      <div
        ref={scroller}
        role="list"
        aria-label="Days"
        className="scrollbar-none flex h-full w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
        style={{
          scrollSnapType: 'x proximity',
          scrollPaddingInline: GUTTER,
          paddingLeft: GUTTER,
          paddingRight: GUTTER - GAP,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <svg width="0" height="0" aria-hidden="true" className="absolute">
          <defs>
            <linearGradient id="hcol-stone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1A1A21" />
              <stop offset="0.55" stopColor="#0B0B0F" />
              <stop offset="1" stopColor="#050507" />
            </linearGradient>
            <linearGradient id="hcol-ember" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFB088" />
              <stop offset="0.35" stopColor="#FF5A1F" />
              <stop offset="1" stopColor="#B3300A" />
            </linearGradient>
          </defs>
        </svg>
        {weeks.map((week, wi) => (
          <div key={week[0]?.day ?? wi} className="flex shrink-0" style={{ scrollSnapAlign: 'start' }}>
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
  glow: boolean
  entered: boolean
  delay: number
  index: number
  count: number
  onPick(day: string): void
}

function DayColumn({ d, goalKcal, isToday, today, glow, entered, delay, index, count, onPick }: ColProps) {
  const tracked = d.count > 0
  const ratio = goalKcal > 0 ? d.totals.kcal / goalKcal : 0
  const h = tracked ? Math.min(COL_H, Math.max(STUB_H, Math.round(ratio * GOAL_H))) : STUB_H
  const over = tracked && d.totals.kcal > goalKcal
  const stoneH = over ? GOAL_H : h
  const tipH = over ? Math.max(MIN_TIP, h - GOAL_H) : 0
  const stoneTop = COL_H - stoneH
  const tipTop = stoneTop - tipH
  const date = parseDayKey(d.day).getDate()
  const label = formatDayLabel(d.day, today)
  const aria = tracked ? `${label}, ${formatInt(Math.round(d.totals.kcal))} kcal${over ? ', over the line' : ''}` : `${label}, untracked`

  return (
    <button
      type="button"
      role="listitem"
      aria-label={aria}
      aria-posinset={index}
      aria-setsize={count}
      onClick={() => onPick(d.day)}
      className="group relative flex shrink-0 cursor-pointer flex-col items-start outline-none"
      style={{ width: PITCH, height: STRIP_H }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-[-3px] rounded-[2px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ width: COL_W + 6, background: 'var(--gold-line)' }}
      />
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
        {over ? (
          <g style={glow ? { filter: 'drop-shadow(0 0 2px var(--ember-glow))' } : undefined}>
            <rect x="0" y={tipTop} width={COL_W} height={tipH} fill="url(#hcol-ember)" />
            <rect x="0" y={tipTop} width={COL_W} height="1" fill="#FFB088" opacity="0.8" />
          </g>
        ) : null}
        {/* the stone */}
        <rect x="0" y={stoneTop} width={COL_W} height={stoneH} fill={tracked ? 'url(#hcol-stone)' : '#1A1A21'} />
        {tracked ? (
          <>
            {/* capital edge */}
            {!over ? <rect x="0" y={stoneTop} width={COL_W} height="1" fill="#26262E" /> : null}
            {/* two flutes */}
            <line x1="7.5" y1={stoneTop + 2} x2="7.5" y2={COL_H} stroke="#E7E1D2" strokeOpacity="0.25" strokeWidth="1" />
            <line x1="15.5" y1={stoneTop + 2} x2="15.5" y2={COL_H} stroke="#E7E1D2" strokeOpacity="0.08" strokeWidth="1" />
          </>
        ) : null}
        {isToday ? <rect x="0" y={COL_H - 2} width={COL_W} height="2" fill="#D8B45A" /> : null}
      </svg>
      <span
        aria-hidden="true"
        className={`font-display num flex items-center justify-center text-[9px] tracking-[0.1em] ${
          isToday ? 'text-gold-400' : tracked ? 'text-bone-dim' : 'text-bone-mute'
        }`}
        style={{ width: COL_W, height: LABEL_H }}
      >
        {date}
      </span>
    </button>
  )
}
