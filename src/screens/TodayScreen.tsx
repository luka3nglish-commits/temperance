/**
 * TODAY: the home screen (polish-spec 6.1). One fixed, non-scrolling frame; the parent <main> is
 * overflow hidden. The monument canvas and its temple (scene agent, app root) sit behind at top
 * --safe-top, 513 px tall; everything here is DOM inscriptions above them. Its only background is the
 * number scrim: the shaft, colonnade and pools belong to the scene.
 *
 * Vertical rhythm, relative to the top safe area (the spec assumes 47 px):
 *   header 40 | stage 460 (the monument, shrinks to a 280 px floor) | ring row 132 | stoic (flex, 67 floor) | air 64 + safe bottom
 * The non-stage rows add up to the 303 px the monument layer budgets for when it scales the stage on a
 * short phone, so the inscriptions and the scaled monument stay registered. Under 700 px tall the
 * number drops to 72 px and the flanks tighten; under 372 px wide the ring row goes compact.
 * The final layout IS the home screen: nothing re-lays out after the opening.
 */
import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { useToday } from '../lib/useToday'
import { disciplineStreak, remainingKcal, totalsForDay } from '../store/selectors'
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
  const narrow = useMediaQuery('(max-width: 371px)')

  const totals = useMemo(() => totalsForDay(entries, today), [entries, today])
  const streak = useMemo(() => disciplineStreak(entries, settings.goalKcal, today), [entries, settings.goalKcal, today])
  const remaining = remainingKcal(totals, settings.goalKcal)

  return (
    <div data-testid="tp-today" className="relative flex h-full w-full flex-col overflow-hidden" style={{ paddingTop: 'var(--safe-top)' }}>
      <TodayHeader today={today} streak={streak} />

      {/* data-stage: the scene toggles .shake here; data-intro="stage": the opening's landing shake (targets.ts queryStage) */}
      <div data-stage data-intro="stage" className="relative w-full" style={{ flex: '0 1 460px', minHeight: 280 }}>
        <TodayNumber
          remaining={remaining}
          eaten={totals.kcal}
          goal={settings.goalKcal}
          unit={settings.unit}
          hero={settings.hero}
          short={short}
          onSwap={() => setHero(settings.hero === 'eaten' ? 'remaining' : 'eaten')}
        />
        <TodayFlanks
          eaten={totals.kcal}
          remaining={remaining}
          goal={settings.goalKcal}
          unit={settings.unit}
          swapped={settings.hero === 'eaten'}
          compact={short}
          onEaten={openToday}
        />
      </div>

      <TodayRingRow totals={totals} targets={settings.targets} compact={narrow} onOpen={openToday} />
      <TodayStoic today={today} />

      {/* 8 px of air above the tab bar (56 px) and the bottom safe area */}
      <div aria-hidden="true" className="shrink-0" style={{ flex: '0 0 calc(64px + var(--safe-bottom))' }} />

      <TodayGoalLabel goal={settings.goalKcal} unit={settings.unit} />
      <TodaySheet today={today} />
    </div>
  )
}
