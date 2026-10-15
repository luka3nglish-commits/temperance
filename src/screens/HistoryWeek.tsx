import { useMemo, useState } from 'react'
import { ChevronRight, Flame } from 'lucide-react'
import { Button, SectionHeading, ValueUnit, useStaggerOnce } from '../components/ui'
import { Rhombus } from '../components/ornaments'
import type { EnergyUnit, LogEntry, Macros } from '../lib/types'
import { dayKeyOffset, formatTime, parseDayKey } from '../lib/day'
import { formatEnergy, unitLabel } from '../lib/units'
import { macroEnergySplit } from '../lib/macros'
import { portionAria, portionLabel } from '../lib/portion'
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
  return `${formatEnergy(kcal, unit)} ${unitLabel(unit)}`
}

/** What the delta says: `272 left` or `340 over`, a magnitude, never a minus sign. */
export function deltaText(kcal: number, goalKcal: number, unit: EnergyUnit): { over: boolean; text: string } {
  const rem = goalKcal - kcal
  const over = rem < 0
  return { over, text: `${formatEnergy(Math.abs(rem), unit)} ${over ? 'over' : 'left'}` }
}

/**
 * The name line of an entry row, polish-spec 4.11: the name truncates, the portion (` · 180 g`) never
 * does. Empty portion for exactly one serve.
 */
export function EntryName({ entry }: { entry: Pick<LogEntry, 'name' | 'portion' | 'servings'> }) {
  const label = portionLabel(entry)
  return (
    <span className="flex min-w-0 items-baseline">
      <span className="truncate font-body text-[19px] font-medium leading-[1.25] text-bone">{entry.name}</span>
      {label ? <span className="num shrink-0 whitespace-pre font-body text-[16px] font-medium text-bone-soft">{` · ${label}`}</span> : null}
    </span>
  )
}

/** The spoken row: `Greek yoghurt, 180 grams, 175 kcal`. */
export function entryAria(entry: LogEntry, unit: EnergyUnit): string {
  const portion = portionAria(entry)
  return [entry.name, portion, energyText(entry.macros.kcal, unit)].filter(Boolean).join(', ')
}

/** `3:20 pm · P 16 · C 7 · F 9`, macros as integers. */
export function entryMeta(entry: LogEntry): string {
  const m = entry.macros
  return `${formatTime(entry.at)} · P ${Math.round(m.protein)} · C ${Math.round(m.carbs)} · F ${Math.round(m.fat)}`
}

/** `272 LEFT` in bone-dim, or a flame and `340 OVER` in ember-text. Cinzel 700 12 px 0.08em. */
export function Delta({ kcal, goalKcal, unit, testId }: { kcal: number; goalKcal: number; unit: EnergyUnit; testId?: string }) {
  const { over, text } = deltaText(kcal, goalKcal, unit)
  const mag = Math.round(Math.abs(goalKcal - kcal))
  return (
    <span
      data-testid={testId}
      data-over={over}
      data-kcal={mag}
      className={`font-display num inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-bold uppercase leading-none tracking-[0.08em] ${over ? 'text-ember-text' : 'text-bone-dim'}`}
      aria-label={over ? `${energyText(mag, unit)} over the line` : `${energyText(mag, unit)} left`}
    >
      {over ? <Flame size={14} strokeWidth={1.5} aria-hidden="true" className="shrink-0" /> : null}
      {text}
    </span>
  )
}

// ---------- the small ring ----------

/** Macro arc colours (arc and swatch only, never text). Fat is the lifted #8E7243. */
export const RING_COLOURS = { protein: '#F2D98A', carbs: '#B8923E', fat: '#8E7243' } as const
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
 * A 56 px ring of a day's macro energy split (protein, carbs, fat; 6 degree gaps, butt ends). Arcs only,
 * no text (polish-spec 6.1: at 56 px any SVG text would fall under 12 px). Grooved track like TODAY's.
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
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={`shrink-0 ${className}`}>
      <circle cx="60" cy="60" r="50" fill="none" stroke="#0A0A0D" strokeWidth="12" />
      <circle cx="60" cy="60" r="44" fill="none" stroke="rgba(231,225,210,0.36)" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(231,225,210,0.36)" strokeWidth="1.2" />
      {arcs.map((arc) => (
        <path key={arc.key} d={arc.d} fill="none" stroke={empty ? '#2A2A33' : RING_COLOURS[arc.key]} strokeWidth="12" strokeLinecap="butt" />
      ))}
      <circle cx="60" cy="60" r="36" fill="#0E0E13" stroke="rgba(216,180,90,0.35)" strokeWidth="1" />
    </svg>
  )
}

/** Three macro readouts beside the ring: swatch, label (Cinzel 12 px), grams (Cormorant 600 18 px). */
export function MacroReadouts({ macros, className = '' }: { macros: Macros; className?: string }) {
  const rows = [
    { key: 'protein', label: 'Protein', value: macros.protein },
    { key: 'carbs', label: 'Carbs', value: macros.carbs },
    { key: 'fat', label: 'Fat', value: macros.fat },
  ] as const
  return (
    <ul className={`flex flex-col justify-center gap-1.5 ${className}`}>
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-2.5">
          <span aria-hidden="true" className="h-[2px] w-3 shrink-0" style={{ background: RING_COLOURS[r.key], boxShadow: 'inset 0 1px 0 rgba(255,247,218,0.3)' }} />
          <span className="label w-[68px] shrink-0 tracking-[0.1em]">{r.label}</span>
          <span className="num font-body text-[18px] font-semibold leading-none text-bone">
            {Math.round(r.value)}
            <span className="unit"> g</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ---------- rows ----------

/** One week-list grid: mark 14, day 72, figures, delta. */
const ROW_GRID = 'grid grid-cols-[14px_72px_minmax(0,1fr)_auto] items-center'

type RowProps = {
  d: DaySummary
  entries: readonly LogEntry[]
  today: string
  goalKcal: number
  unit: EnergyUnit
  open: boolean
  onToggle(day: string): void
  onOpenDay(day: string): void
  /** the stamp column text, default `Thu 15` */
  stamp?: string
}

/**
 * One 56 px ledger row (polish-spec 6.4): a rhombus on today's row, the day in Cinzel 12 px, the energy in
 * bone (gold-300 today) with protein beside it, and the delta at the right. Tap expands the day inline:
 * its ring, readouts and entries, and OPEN DAY for the full sheet.
 */
export function DayRow({ d, entries, today, goalKcal, unit, open, onToggle, onOpenDay, stamp }: RowProps) {
  const tracked = d.count > 0
  const isToday = d.day === today
  const text = stamp ?? dayStamp(d.day)
  const panelId = `hday-${d.day}`

  const stampCls = `font-display num truncate text-[12px] font-bold uppercase leading-none tracking-[0.08em] ${isToday ? 'text-gold-300' : tracked ? 'text-bone-dim' : 'text-bone-mute'}`

  if (!tracked) {
    return (
      <li data-testid={`tp-history-day-${d.day}`} data-tracked="false" className={`row-rule ${ROW_GRID} h-14`}>
        <span className="flex items-center">{isToday ? <Rhombus solid /> : null}</span>
        <span className={stampCls}>{text}</span>
        <span className="hint col-span-2 text-bone-mute">Nothing logged.</span>
      </li>
    )
  }

  return (
    <li data-testid={`tp-history-day-${d.day}`} data-tracked="true" className="row-rule">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onToggle(d.day)}
        className={`row-press ${ROW_GRID} h-14 w-full cursor-pointer text-left`}
      >
        <span className="flex items-center">{isToday ? <Rhombus solid /> : null}</span>
        <span className={stampCls}>{text}</span>
        <span className="flex min-w-0 items-baseline gap-3">
          <span data-testid="tp-history-day-kcal" data-kcal={Math.round(d.totals.kcal)} className="inline-flex">
            <ValueUnit value={formatEnergy(d.totals.kcal, unit)} unit={unitLabel(unit)} size={17} tone={isToday ? 'gold' : 'bone'} />
          </span>
          <span className="meta truncate">P {Math.round(d.totals.protein)}</span>
        </span>
        <span className="flex items-center justify-end">
          <Delta kcal={d.totals.kcal} goalKcal={goalKcal} unit={unit} testId="tp-history-day-delta" />
        </span>
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
    <div className="pb-2 pl-[14px]">
      <div className="flex items-center gap-4 pt-1 pb-3">
        <MiniRing macros={totals} />
        <MacroReadouts macros={totals} />
      </div>
      <ul>
        {list.map((e) => (
          <li key={e.id} className="flex min-h-12 items-center gap-3 border-t border-[var(--rule)] py-1.5">
            <span className="sr-only">{entryAria(e, unit)}</span>
            <span className="flex min-w-0 flex-1 flex-col" aria-hidden="true">
              <EntryName entry={e} />
              <span className="meta truncate">{formatTime(e.at)}</span>
            </span>
            <span aria-hidden="true" className="shrink-0">
              <ValueUnit value={formatEnergy(e.macros.kcal, unit)} unit={unitLabel(unit)} />
            </span>
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="-ml-3" onClick={() => onOpenDay(day)} trailing={<ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />}>
        Open day
      </Button>
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
 * THIS WEEK: the last seven days newest first (untracked days read as such; a week with nothing logged
 * is one line), then EARLIER: every logged day back to 90 days. Older days live in HistoryMonths.
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
  const stagger = useStaggerOnce('history-week')
  const weekEmpty = week.every((d) => d.count === 0)

  return (
    <div>
      <SectionHeading rule="strong" right="7 days">
        This week
      </SectionHeading>
      {weekEmpty ? (
        <p data-testid="tp-history-week-empty" className="empty-line row-rule flex h-14 items-center pl-[14px]">
          Nothing logged this week.
        </p>
      ) : (
        <ul className={stagger}>
          {week.map((d) => (
            <DayRow key={d.day} d={d} entries={entries} today={today} goalKcal={goalKcal} unit={unit} open={openDay === d.day} onToggle={toggle} onOpenDay={onOpenDay} />
          ))}
        </ul>
      )}
      {older.length ? (
        <>
          <SectionHeading right="To 90 days" className="mt-8">
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
