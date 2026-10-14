/**
 * HEADER BAND (spec section 6, y 47 to 87): date left, wordmark centre, settings right.
 * 40 px tall. The opening lands the big wordmark on the [data-intro="wordmark"] slot by FLIP.
 */
import { Settings } from 'lucide-react'
import { IconButton } from '../components/ui'
import { useUI } from '../store/useUI'
import { parseDayKey } from '../lib/day'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `Mon 13 Oct` (rendered uppercase by CSS). */
export function formatHeaderDate(day: string): string {
  const d = parseDayKey(day)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function TodayHeader({ today }: { today: string }) {
  const setTab = useUI((s) => s.setTab)
  return (
    <header className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4">
      <time dateTime={today} data-intro="date" className="num font-body text-[14px] uppercase leading-none tracking-[0.08em] text-bone-dim">
        {formatHeaderDate(today)}
      </time>
      <h1
        data-intro="wordmark"
        className="font-display inscribed text-[12px] font-bold leading-none tracking-[0.34em] text-gold-400"
        style={{ marginRight: '-0.34em' }}
      >
        Temperance
      </h1>
      <div className="flex justify-end" style={{ marginRight: -11 }}>
        <IconButton label="Settings" onClick={() => setTab('settings')}>
          <Settings size={22} strokeWidth={1.5} />
        </IconButton>
      </div>
    </header>
  )
}
