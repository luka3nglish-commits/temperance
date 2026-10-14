import { useMemo, useState } from 'react'
import { SectionHeading } from '../components/ui'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { dayKeyOffset, parseDayKey } from '../lib/day'
import { loggedDays, type DaySummary } from '../store/selectors'
import { DayRow, EnergyFigure } from './HistoryWeek'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type Month = {
  key: string
  label: string
  days: DaySummary[]
  avgKcal: number
  under: number
}

function groupByMonth(days: readonly DaySummary[], goalKcal: number): Month[] {
  const map = new Map<string, DaySummary[]>()
  for (const d of days) {
    const k = d.day.slice(0, 7)
    const list = map.get(k)
    if (list) list.push(d)
    else map.set(k, [d])
  }
  return [...map.entries()].map(([key, list]) => {
    const d = parseDayKey(`${key}-01`)
    const total = list.reduce((s, x) => s + x.totals.kcal, 0)
    return {
      key,
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      days: list,
      avgKcal: Math.round(total / list.length),
      under: list.filter((x) => x.totals.kcal <= goalKcal).length,
    }
  })
}

/** A 48 x 6 miniature of the month's average against the goal mark at 60 percent. */
function MonthBar({ avgKcal, goalKcal }: { avgKcal: number; goalKcal: number }) {
  const W = 48
  const GOAL_X = Math.round(W * 0.6)
  const ratio = goalKcal > 0 ? avgKcal / goalKcal : 0
  const x = Math.min(W, Math.round(ratio * GOAL_X))
  const over = avgKcal > goalKcal
  return (
    <svg width={W} height="6" viewBox={`0 0 ${W} 6`} aria-hidden="true" className="shrink-0">
      <rect x="0" y="1" width={W} height="4" fill="#1A1A21" />
      <rect x="0" y="1" width={over ? GOAL_X : x} height="4" fill="#9C7B33" />
      {over ? <rect x={GOAL_X} y="1" width={x - GOAL_X} height="4" fill="#FF5A1F" /> : null}
      <rect x={GOAL_X} y="0" width="1" height="6" fill="#D8B45A" />
    </svg>
  )
}

type Props = {
  entries: readonly LogEntry[]
  today: string
  goalKcal: number
  unit: EnergyUnit
  onOpenDay(day: string): void
}

/**
 * Days older than 90 collapse into month rows: the month, its average per logged day in gold,
 * the goal bar, and how many days were logged and under the line. Tap a month to open its days.
 */
export function HistoryMonths({ entries, today, goalKcal, unit, onOpenDay }: Props) {
  const months = useMemo(() => {
    const cutoff = dayKeyOffset(today, -90)
    return groupByMonth(
      loggedDays(entries).filter((d) => d.day <= cutoff),
      goalKcal,
    )
  }, [entries, today, goalKcal])
  const [openMonth, setOpenMonth] = useState<string | null>(null)
  const [openDay, setOpenDay] = useState<string | null>(null)
  const toggleDay = (day: string) => setOpenDay((cur) => (cur === day ? null : day))

  if (!months.length) return null

  return (
    <div>
      <SectionHeading rule="strong" right="Before 90 days">
        Months
      </SectionHeading>
      <ul>
        {months.map((m) => {
          const open = openMonth === m.key
          const panelId = `hmonth-${m.key}`
          return (
            <li key={m.key} className="border-b border-[var(--gold-line)]">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenMonth((cur) => (cur === m.key ? null : m.key))}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 text-left transition-colors duration-150 hover:bg-[var(--gold-line)] active:bg-[var(--gold-line)]"
              >
                <span className="font-display w-[60px] shrink-0 text-[10px] tracking-[0.28em] text-bone-dim">{m.label}</span>
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <EnergyFigure kcal={m.avgKcal} unit={unit} />
                  <span className="font-display text-[9px] tracking-[0.3em] text-bone-dim">avg</span>
                  <MonthBar avgKcal={m.avgKcal} goalKcal={goalKcal} />
                </span>
                <span className="font-display num whitespace-nowrap text-[10px] tracking-[0.2em] text-bone-dim">
                  {m.under} of {m.days.length} under
                </span>
              </button>
              <div
                id={panelId}
                className="grid transition-[grid-template-rows]"
                style={{ gridTemplateRows: open ? '1fr' : '0fr', transitionDuration: 'var(--t-row-in)', transitionTimingFunction: 'var(--ease-stone)' }}
                aria-hidden={!open}
              >
                <div className="min-h-0 overflow-hidden">
                  {open ? (
                    <ul className="mb-2 border-t border-[var(--bone-08)] pl-3">
                      {m.days.map((d) => (
                        <DayRow key={d.day} d={d} entries={entries} today={today} goalKcal={goalKcal} unit={unit} open={openDay === d.day} onToggle={toggleDay} onOpenDay={onOpenDay} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
