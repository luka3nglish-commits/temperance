/**
 * TODAY: the home screen (spec section 6). One fixed, non-scrolling frame; the parent <main> is
 * overflow hidden. The monument canvas (scene agent, app root) sits behind at top --safe-top,
 * 513 px tall; everything here is DOM inscriptions above it.
 *
 * Vertical rhythm, relative to the top safe area (the spec assumes 47 px):
 *   header 40 | stage 460 (the monument, shrinks to a 280 px floor) | ring row 124 | stoic 64 | air
 * On a 390 x 844 phone with a 47 px safe area the rows land exactly on the spec y values; on shorter
 * phones only the stage gives. Under 700 px the number drops to 72 px and the flanks share one row.
 * The final layout IS the home screen: nothing re-lays out after the opening.
 */
import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useToday } from '../lib/useToday'
import { remainingKcal, totalsForDay } from '../store/selectors'
import { TodayHeader } from './TodayHeader'
import { TodayNumber } from './TodayNumber'
import { TodayFlanks, TodayGoalLabel } from './TodayFlanks'
import { TodayRingRow } from './TodayRing'
import { TodayStoic } from './TodayStoic'
import { TodaySheet } from './TodaySheet'
import { useMediaQuery } from './TodayMotion'

export function TodayScreen() {
  const today = useToday()
  const entries = useStore((s) => s.entries)
  const settings = useStore((s) => s.settings)
  const setHero = useStore((s) => s.setHero)
  const openToday = useUI((s) => s.openToday)
  const short = useMediaQuery('(max-height: 699px)')

  const totals = useMemo(() => totalsForDay(entries, today), [entries, today])
  const remaining = remainingKcal(totals, settings.goalKcal)

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden" style={{ paddingTop: 'var(--safe-top)' }}>
      <TodayHeader today={today} />

      <div data-stage className="relative w-full" style={{ flex: '0 1 460px', minHeight: 280 }}>
        <TodayNumber
          remaining={remaining}
          eaten={totals.kcal}
          goal={settings.goalKcal}
          unit={settings.unit}
          hero={settings.hero}
          short={short}
          onSwap={() => setHero(settings.hero === 'eaten' ? 'remaining' : 'eaten')}
        />
        <TodayFlanks eaten={totals.kcal} goal={settings.goalKcal} unit={settings.unit} compact={short} onEaten={openToday} />
      </div>

      <TodayRingRow totals={totals} targets={settings.targets} onOpen={openToday} />
      <TodayStoic today={today} />

      {/* air above the entablature: 19 px plus the 56 px bar and the bottom safe area */}
      <div aria-hidden="true" style={{ flex: '1 0 calc(75px + var(--safe-bottom))' }} />

      <TodayGoalLabel goal={settings.goalKcal} unit={settings.unit} />
      <TodaySheet today={today} />
    </div>
  )
}
