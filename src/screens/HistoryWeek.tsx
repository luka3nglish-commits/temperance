import { useMemo, useState } from 'react'
import { ChevronRight, Flame } from 'lucide-react'
import { SectionHeading } from '../components/ui'
import type { EnergyUnit, LogEntry, Macros } from '../lib/types'
import { dayKeyOffset, formatTime, parseDayKey } from '../lib/day'
import { formatEnergy, unitLabel } from '../lib/units'
import { macroEnergySplit } from '../lib/macros'
import { entriesForDay, historyDays, loggedDays, type DaySummary } from '../store/selectors'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Mon 13" (Cinzel uppercases it on screen). */
export function dayStamp(key: string): string {
  const d = parseDayKey(key)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`
}

/** "Mon 13 Oct" */
export function dayStampLong(key: string): string {
  const d = parseDayKey(key)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Energy in the display unit followed by its lowercase unit after a thin space. */
export function energyText(kcal: number, unit: EnergyUnit): string {
  return `${formatEnergy(kcal, unit)} ${unitLabel(unit)}`
}

/** Gold Cinzel energy figure with the unit kept lowercase. */
export function EnergyFigure({ kcal, unit, size = 16, className = '', testId }: { kcal: number; unit: EnergyUnit; size?: number; className?: string; testId?: string }) {
  return (
    <span data-testid={testId} data-kcal={Math.round(kcal)} className={`font-display inscribed num whitespace-nowrap tracking-[0.02em] text-gold-400 ${className}`} style={{ fontSize: size }}>
      {formatEnergy(kcal, unit)}
      {/* the unit stays lowercase and never drops under the 9 px Cinzel floor */}
      <span className="normal-case" style={{ fontSize: Math.max(9, Math.round(size * 0.68)) }}>
        {' '}
        {unitLabel(unit)}
      </span>
    </span>
  )
}

/** "260 LEFT" in bone-dim or "340 OVER" in ember-text. Never a minus sign. */
export function Delta({ kcal, goalKcal, unit, testId }: { kcal: number; goalKcal: number; unit: EnergyUnit; testId?: string }) {
  const rem = goalKcal - kcal
  const over = rem < 0
  return (
    <span
      data-testid={testId}
      data-over={over}
      data-kcal={Math.round(Math.abs(rem))}
      className={`font-display num inline-flex items-center gap-1 whitespace-nowrap text-[10px] tracking-[0.2em] ${over ? 'text-ember-text' : 'text-bone-dim'}`}
      aria-label={over ? `${formatEnergy(-rem, unit)} ${unitLabel(unit)} over the line` : `${formatEnergy(rem, unit)} ${unitLabel(unit)} left`}
    >
      {over ? <Flame size={12} strokeWidth={1.5} aria-hidden="true" /> : null}
      {formatEnergy(Math.abs(rem), unit)} {over ? 'over' : 'left'}
    </span>
  )
}

// ---------- the small ring ----------

const RING_COLOURS = { protein: '#F2D98A', carbs: '#B8923E', fat: '#6E5324' } as const
const GAP_DEG = 6
const SWEEP = 360 - GAP_DEG * 3

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const xy = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const
  }
  const [x0, y0] = xy(a0)
  const [x1, y1] = xy(a1)
  const large = a1 - a0 > 180 ? 1 : 0
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

/**
 * A 56 px inline ring of a day's macro energy split (protein, carbs, fat; 6 degree gaps, butt ends).
 * Not the Today ring: this one is static and only drawn when a day is expanded.
 */
export function MiniRing({ macros, size = 56, className = '' }: { macros: Macros; size?: number; className?: string }) {
  const split = macroEnergySplit(macros)
  const empty = split.protein + split.carbs + split.fat === 0
  const arcs: { key: keyof typeof RING_COLOURS; d: string }[] = []
  let a = GAP_DEG / 2
  for (const key of ['protein', 'carbs', 'fat'] as const) {
    const deg = empty ? SWEEP / 3 : SWEEP * split[key]
    if (deg > 0.5) arcs.push({ key, d: arcPath(60, 60, 50, a, a + deg) })
    a += deg + GAP_DEG
  }
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={className}>
      <circle cx="60" cy="60" r="50" fill="none" stroke="#1A1A21" strokeWidth="7" />
      {arcs.map((arc) => (
        <path key={arc.key} d={arc.d} fill="none" stroke={empty ? '#1A1A21' : RING_COLOURS[arc.key]} strokeWidth="7" strokeLinecap="butt" />
      ))}
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#D8B45A"
        fontSize="22"
        fontWeight="700"
        fontFamily="Cinzel, 'Cinzel Fallback', Georgia, serif"
      >
        {Math.round(macros.protein)}
      </text>
    </svg>
  )
}

/** Three macro readouts beside the ring: swatch, label, grams. */
export function MacroReadouts({ macros, className = '' }: { macros: Macros; className?: string }) {
  const rows = [
    { key: 'protein', label: 'Protein', value: macros.protein },
    { key: 'carbs', label: 'Carbs', value: macros.carbs },
    { key: 'fat', label: 'Fat', value: macros.fat },
  ] as const
  return (
    <ul className={`flex flex-col justify-center gap-1 ${className}`}>
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-2">
          <span aria-hidden="true" className="h-[2px] w-[10px] shrink-0" style={{ background: RING_COLOURS[r.key] }} />
          <span className="font-display w-[58px] text-[9px] tracking-[0.3em] text-bone-dim">{r.label}</span>
          <span className="num font-body text-[15px] text-bone">{Math.round(r.value)} g</span>
        </li>
      ))}
    </ul>
  )
}

// ---------- rows ----------

type RowProps = {
  d: DaySummary
  entries: readonly LogEntry[]
  today: string
  goalKcal: number
  unit: EnergyUnit
  open: boolean
  onToggle(day: string): void
  onOpenDay(day: string): void
}

/**
 * One 56 px ledger row: day stamp (60 px column), energy in gold, protein, and the delta at the right.
 * Tap expands the day inline over 240 ms: its ring, readouts and entries.
 */
export function DayRow({ d, entries, today, goalKcal, unit, open, onToggle, onOpenDay }: RowProps) {
  const tracked = d.count > 0
  const isToday = d.day === today
  const stamp = dayStamp(d.day)
  const panelId = `hday-${d.day}`

  if (!tracked) {
    return (
      <li data-testid={`tp-history-day-${d.day}`} data-tracked="false" className="flex min-h-14 items-center gap-3 border-b border-[var(--gold-line)]">
        <span className={`font-display w-[60px] shrink-0 text-[10px] tracking-[0.28em] ${isToday ? 'text-gold-300' : 'text-bone-mute'}`}>{stamp}</span>
        <span className="font-body italic text-[14px] text-bone-mute">Nothing logged.</span>
      </li>
    )
  }

  return (
    <li data-testid={`tp-history-day-${d.day}`} data-tracked="true" className="border-b border-[var(--gold-line)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(d.day)}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3 text-left transition-colors duration-150 hover:bg-[var(--gold-line)] active:bg-[var(--gold-line)]"
      >
        <span className={`font-display w-[60px] shrink-0 text-[10px] tracking-[0.28em] ${isToday ? 'text-gold-300' : 'text-bone-dim'}`}>{stamp}</span>
        <span className="flex min-w-0 flex-1 items-baseline gap-3">
          <EnergyFigure kcal={d.totals.kcal} unit={unit} testId="tp-history-day-kcal" />
          <span className="num font-body text-[13px] text-bone-dim">P {Math.round(d.totals.protein)}</span>
        </span>
        <Delta kcal={d.totals.kcal} goalKcal={goalKcal} unit={unit} testId="tp-history-day-delta" />
      </button>
      <div
        id={panelId}
        className="grid transition-[grid-template-rows]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', transitionDuration: 'var(--t-row-in)', transitionTimingFunction: 'var(--ease-stone)' }}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">{open ? <DayPanel day={d.day} entries={entries} totals={d.totals} unit={unit} onOpenDay={onOpenDay} /> : null}</div>
      </div>
    </li>
  )
}

function DayPanel({ day, entries, totals, unit, onOpenDay }: { day: string; entries: readonly LogEntry[]; totals: Macros; unit: EnergyUnit; onOpenDay(day: string): void }) {
  const list = useMemo(() => entriesForDay(entries, day), [entries, day])
  return (
    <div className="pb-3 pl-[72px]">
      <div className="flex items-center gap-4 py-2">
        <MiniRing macros={totals} />
        <MacroReadouts macros={totals} />
      </div>
      <ul className="mt-1">
        {list.map((e) => (
          <li key={e.id} className="flex min-h-10 items-center gap-3 border-t border-[var(--bone-08)]">
            <span className="num w-[60px] shrink-0 font-body text-[14px] text-bone-dim">{formatTime(e.at)}</span>
            <span className="min-w-0 flex-1 truncate font-body text-[17px] font-medium text-bone">{e.name}</span>
            <EnergyFigure kcal={e.macros.kcal} unit={unit} size={13} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onOpenDay(day)}
        className="font-display mt-1 inline-flex h-11 cursor-pointer items-center gap-1 text-[10px] tracking-[0.3em] text-bone-dim transition-colors duration-150 hover:text-gold-300"
      >
        Open day
        <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  )
}

// ---------- the list ----------

type Props = {
  entries: readonly LogEntry[]
  today: string
  goalKcal: number
  unit: EnergyUnit
  onOpenDay(day: string): void
}

/**
 * The week list: the last seven days newest first (untracked days read as such), then every logged day
 * back to 90 days. Days older than that live in HistoryMonths.
 */
export function HistoryWeek({ entries, today, goalKcal, unit, onOpenDay }: Props) {
  const week = useMemo(() => historyDays(entries, today, 7), [entries, today])
  const older = useMemo(() => {
    const newest = dayKeyOffset(today, -7)
    const oldest = dayKeyOffset(today, -89)
    return loggedDays(entries).filter((d) => d.day <= newest && d.day >= oldest)
  }, [entries, today])
  const [openDay, setOpenDay] = useState<string | null>(null)
  const toggle = (day: string) => setOpenDay((cur) => (cur === day ? null : day))

  return (
    <div>
      <SectionHeading rule="strong" right="7 days">
        This week
      </SectionHeading>
      <ul>
        {week.map((d) => (
          <DayRow key={d.day} d={d} entries={entries} today={today} goalKcal={goalKcal} unit={unit} open={openDay === d.day} onToggle={toggle} onOpenDay={onOpenDay} />
        ))}
      </ul>
      {older.length ? (
        <>
          <SectionHeading rule="strong" right="To 90 days" className="mt-6">
            Earlier
          </SectionHeading>
          <ul>
            {older.map((d) => (
              <DayRow key={d.day} d={d} entries={entries} today={today} goalKcal={goalKcal} unit={unit} open={openDay === d.day} onToggle={toggle} onOpenDay={onOpenDay} />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
