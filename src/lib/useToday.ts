import { useEffect, useState } from 'react'
import { localDayKey, msUntilNextLocalMidnight } from './day'

/** The current local day key, re-evaluated at midnight and when the tab becomes visible again. */
export function useToday(): string {
  const [today, setToday] = useState(() => localDayKey())
  useEffect(() => {
    let timer = 0
    const schedule = () => {
      timer = window.setTimeout(() => {
        setToday(localDayKey())
        schedule()
      }, msUntilNextLocalMidnight())
    }
    schedule()
    const onVisible = () => {
      if (document.visibilityState === 'visible') setToday(localDayKey())
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])
  return today
}
