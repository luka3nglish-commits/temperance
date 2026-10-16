/**
 * HEADER BAND (polish-spec 6.1, y 47 to 87): date left, wordmark centre, streak right. 40 px tall.
 * A 12 px column gap keeps the date off the wordmark; under 390 px wide the weekday drops (`30 MAY`),
 * the full date stays in the aria-label.
 * The opening lands the big wordmark on the [data-intro="wordmark"] slot by FLIP and fades the streak
 * slot in ([data-intro="streak"]). The settings gear is gone: the tab bar already has SETTINGS.
 *
 * Streak: `◆ 12 ◆` (two rhombi, the number Cinzel 700 14 px gold-300) in a 44 x 44 target that opens
 * HISTORY. Nothing is drawn at a zero streak; the slot keeps its width so the wordmark stays centred.
 */
import { Rhombus } from '../components/ornaments'
import { useUI } from '../store/useUI'
import { parseDayKey } from '../lib/day'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `Mon 13 Oct` (rendered uppercase by CSS). */
export function formatHeaderDate(day: string): string {
  const d = parseDayKey(day)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** `Streak 12 days`, `Streak 1 day`. */
export function streakLabel(n: number): string {
  return `Streak ${n} ${n === 1 ? 'day' : 'days'}`
}

export function TodayHeader({ today, streak }: { today: string; streak: number }) {
  const setTab = useUI((s) => s.setTab)
  const d = parseDayKey(today)
  return (
    <header className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-3 px-5">
      <time dateTime={today} aria-label={formatHeaderDate(today)} data-intro="date" className="label whitespace-nowrap">
        <span className="max-[389px]:hidden">{WEEKDAYS[d.getDay()]} </span>
        {d.getDate()} {MONTHS[d.getMonth()]}
      </time>
      <h1
        data-intro="wordmark"
        className="font-display inscribed text-[14px] font-bold uppercase leading-none tracking-[0.3em] text-gold-300 max-[371px]:mr-[-0.2em] max-[371px]:tracking-[0.2em] min-[372px]:mr-[-0.3em]"
      >
        Temperance
      </h1>
      <div className="flex justify-end" style={{ marginRight: -8 }}>
        {streak > 0 ? (
          <button
            type="button"
            data-intro="streak"
            data-testid="tp-streak"
            data-streak={streak}
            aria-label={streakLabel(streak)}
            onClick={() => setTab('history')}
            className="press flex h-11 min-w-11 cursor-pointer items-center justify-center gap-[7px] rounded-[4px] px-2"
          >
            <Rhombus />
            <span className="font-display inscribed text-[14px] font-bold leading-none tracking-[0.02em] text-gold-300">{streak}</span>
            <Rhombus />
          </button>
        ) : (
          <span aria-hidden="true" className="block h-11 w-11" />
        )}
      </div>
    </header>
  )
}
