import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton, Segmented } from '../components/ui'
import { useStore } from '../store/useStore'
import { averageKcal, disciplineStreak, historyDays, underTheLine } from '../store/selectors'
import { dayKeyOffset, localDayKey, parseDayKey } from '../lib/day'
import { useToday } from '../lib/useToday'
import { HistoryColonnade } from './HistoryColonnade'
import { HistoryStones } from './HistoryStones'
import { HistoryWeek } from './HistoryWeek'
import { HistoryMonths } from './HistoryMonths'
import { HistoryDaySheet } from './HistoryDaySheet'
import { HistoryBody } from './HistoryBody'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export type HistoryMode = 'ledger' | 'body'

/** Remembered per device, outside the persisted store: it is a view preference, not data. */
export const HISTORY_MODE_KEY = 'temperance.history.mode'

const MODES: readonly { value: HistoryMode; label: string }[] = [
  { value: 'ledger', label: 'Ledger' },
  { value: 'body', label: 'Body' },
]

/** The remembered mode; LEDGER when nothing (or something unknown) is stored, or storage is off. */
export function readHistoryMode(): HistoryMode {
  try {
    return localStorage.getItem(HISTORY_MODE_KEY) === 'body' ? 'body' : 'ledger'
  } catch {
    return 'ledger'
  }
}

function writeHistoryMode(mode: HistoryMode): void {
  try {
    localStorage.setItem(HISTORY_MODE_KEY, mode)
  } catch {
    /* private mode or a full disk: the switch still works for this visit */
  }
}

/** The colonnade window is 30 days ending at `anchor`. */
const WINDOW = 30

/** Last day of the month `delta` months away from the month of `key`, as a day key. */
function monthEnd(key: string, delta: number): string {
  const d = parseDayKey(key)
  return localDayKey(new Date(d.getFullYear(), d.getMonth() + delta + 1, 0))
}

/**
 * HISTORY, in two modes behind a LEDGER | BODY switch in the sticky header.
 * LEDGER: a ledger of discipline: the colonnade of the last 30 days, three stat stones, the week list and
 * the months beyond, under its month navigation row. BODY: weight and progress photos (HistoryBody).
 * Both scroll inside the app column between the header and the bar.
 */
export function HistoryScreen() {
  const today = useToday()
  const entries = useStore((s) => s.entries)
  const goalKcal = useStore((s) => s.settings.goalKcal)
  const unit = useStore((s) => s.settings.unit)

  const [mode, setMode] = useState<HistoryMode>(readHistoryMode)
  const root = useRef<HTMLElement>(null)
  const changeMode = (next: HistoryMode) => {
    if (next === mode) return
    setMode(next)
    writeHistoryMode(next)
    // the other view starts at its top, not at the scroll depth of the one just left
    const main = root.current?.closest('main')
    if (main) main.scrollTop = 0
  }

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
    <section ref={root} data-testid="tp-history" data-mode={mode} aria-label="History" className="pb-6">
      {/* two rows: the switch (about 170 px) and the month row (about 275 px at SEPTEMBER 2026) cannot share 350 px */}
      <header className="rise-in sticky top-0 z-10 bg-obsidian-950/95 px-5 backdrop-blur-[20px]" style={{ marginTop: 'var(--safe-top)' }}>
        <div className="flex h-14 items-center justify-center">
          <div data-testid="tp-history-mode" data-mode={mode}>
            <Segmented size="md" label="History view" value={mode} options={MODES} onChange={changeMode} />
          </div>
        </div>
        {mode === 'ledger' ? (
          <div className="flex h-14 items-center justify-between">
            <IconButton label="Earlier month" onClick={back} disabled={!canBack} className="disabled:opacity-30 disabled:pointer-events-none">
              <ChevronLeft size={22} strokeWidth={1.5} />
            </IconButton>
            <h1 className="font-display inscribed text-[12px] tracking-[0.3em] text-bone" aria-live="polite">
              {monthLabel}
            </h1>
            <IconButton label="Later month" onClick={forward} disabled={!canForward} className="disabled:opacity-30 disabled:pointer-events-none">
              <ChevronRight size={22} strokeWidth={1.5} />
            </IconButton>
          </div>
        ) : (
          <h1 className="sr-only">History</h1>
        )}
      </header>

      {mode === 'ledger' ? (
        <>
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
        </>
      ) : (
        <HistoryBody today={today} />
      )}
    </section>
  )
}
