import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../components/ui'
import { useStore } from '../store/useStore'
import { averageKcal, disciplineStreak, historyDays, underTheLine } from '../store/selectors'
import { dayKeyOffset, localDayKey, parseDayKey } from '../lib/day'
import { useToday } from '../lib/useToday'
import { HistoryColonnade } from './HistoryColonnade'
import { HistoryStones } from './HistoryStones'
import { HistoryWeek } from './HistoryWeek'
import { HistoryMonths } from './HistoryMonths'
import { HistoryDaySheet } from './HistoryDaySheet'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** The colonnade window is 30 days ending at `anchor`. */
const WINDOW = 30

/** Last day of the month `delta` months away from the month of `key`, as a day key. */
function monthEnd(key: string, delta: number): string {
  const d = parseDayKey(key)
  return localDayKey(new Date(d.getFullYear(), d.getMonth() + delta + 1, 0))
}

/**
 * HISTORY. A ledger of discipline: the colonnade of the last 30 days, three stat stones,
 * the week list and the months beyond. Scrolls inside the app column between the header and the bar.
 */
export function HistoryScreen() {
  const today = useToday()
  const entries = useStore((s) => s.entries)
  const goalKcal = useStore((s) => s.settings.goalKcal)
  const unit = useStore((s) => s.settings.unit)

  // the colonnade window: 30 days ending at `anchor` (today, or a month end when navigating back)
  const [anchor, setAnchor] = useState(today)
  const effectiveAnchor = anchor > today ? today : anchor

  const earliest = useMemo(() => {
    let min: string | null = null
    for (const e of entries) if (min === null || e.day < min) min = e.day
    return min
  }, [entries])

  const windowStart = dayKeyOffset(effectiveAnchor, -(WINDOW - 1))
  const canBack = earliest !== null && earliest < windowStart
  const canForward = effectiveAnchor < today

  const colonnadeDays = useMemo(() => historyDays(entries, effectiveAnchor, WINDOW), [entries, effectiveAnchor])
  const recentDays = useMemo(() => historyDays(entries, today, WINDOW), [entries, today])

  const avg = useMemo(() => averageKcal(recentDays, 7), [recentDays])
  const under = useMemo(() => underTheLine(recentDays, goalKcal, 7), [recentDays, goalKcal])
  const streak = useMemo(() => disciplineStreak(entries, goalKcal, today), [entries, goalKcal, today])

  const anchorDate = parseDayKey(effectiveAnchor)
  const monthLabel = `${MONTHS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`

  const back = () => setAnchor((a) => monthEnd(a > today ? today : a, -1))
  const forward = () =>
    setAnchor((a) => {
      const next = monthEnd(a, 1)
      return next > today ? today : next
    })

  // the day sheet keeps its last day through the close transition
  const [pickedDay, setPickedDay] = useState<string | null>(null)
  const lastPicked = useRef<string>(today)
  if (pickedDay) lastPicked.current = pickedDay
  const closeSheet = useCallback(() => setPickedDay(null), [])

  return (
    <section data-testid="tp-history" aria-label="History" className="pb-6">
      <header
        className="rise-in sticky top-0 z-10 flex h-14 items-center justify-between bg-obsidian-950/95 px-5 backdrop-blur-[20px]"
        style={{ marginTop: 'var(--safe-top)' }}
      >
        <IconButton label="Earlier month" onClick={back} disabled={!canBack} className="disabled:opacity-30 disabled:pointer-events-none">
          <ChevronLeft size={22} strokeWidth={1.5} />
        </IconButton>
        <h1 className="font-display inscribed text-[12px] tracking-[0.3em] text-bone" aria-live="polite">
          {monthLabel}
        </h1>
        <IconButton label="Later month" onClick={forward} disabled={!canForward} className="disabled:opacity-30 disabled:pointer-events-none">
          <ChevronRight size={22} strokeWidth={1.5} />
        </IconButton>
      </header>

      <div className="rise-in rise-in-1">
        <HistoryColonnade days={colonnadeDays} goalKcal={goalKcal} today={today} unit={unit} onPick={setPickedDay} />
      </div>

      <div className="rise-in rise-in-2 px-5 pt-5">
        <HistoryStones avgKcal={avg} under={under} streak={streak} unit={unit} />
      </div>

      <div className="rise-in rise-in-3 px-5 pt-6">
        <HistoryWeek entries={entries} today={today} goalKcal={goalKcal} unit={unit} onOpenDay={setPickedDay} />
      </div>

      <div className="rise-in rise-in-4 px-5 pt-6">
        <HistoryMonths entries={entries} today={today} goalKcal={goalKcal} unit={unit} onOpenDay={setPickedDay} />
      </div>

      <HistoryDaySheet day={lastPicked.current} open={pickedDay !== null} onClose={closeSheet} today={today} unit={unit} goalKcal={goalKcal} />
    </section>
  )
}
