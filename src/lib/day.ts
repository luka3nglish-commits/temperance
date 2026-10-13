/**
 * Local calendar day helpers. Day keys are "YYYY-MM-DD" in the device's local time zone.
 * Never use toISOString() for day keys: it is UTC and would roll the day over at 10 am in Brisbane.
 */

export function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a day key into a Date at local midnight. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function isValidDayKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  const d = parseDayKey(key)
  return localDayKey(d) === key
}

/** The day key `delta` days away from `key` (negative for the past). */
export function dayKeyOffset(key: string, delta: number): string {
  const d = parseDayKey(key)
  d.setDate(d.getDate() + delta)
  return localDayKey(d)
}

export function yesterdayKey(today: string = localDayKey()): string {
  return dayKeyOffset(today, -1)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Today", "Yesterday", or "Mon 12 Oct". */
export function formatDayLabel(key: string, today: string = localDayKey()): string {
  if (key === today) return 'Today'
  if (key === yesterdayKey(today)) return 'Yesterday'
  const d = parseDayKey(key)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "12 October 2026" */
export function formatDayLong(key: string): string {
  const d = parseDayKey(key)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/** "7:42 am" */
export function formatTime(epochMs: number): string {
  const d = new Date(epochMs)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

/** Milliseconds until the next local midnight (minimum 1 s). */
export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return Math.max(1000, next.getTime() - now.getTime())
}
