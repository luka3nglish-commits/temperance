import { RotateCcw } from 'lucide-react'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { DOT, energyLine } from '../components/MealForm'
import { Chip } from '../components/ui'

/** What REPEAT YESTERDAY would copy: how many entries `day` holds and their energy in kcal. */
export function daySummary(entries: readonly LogEntry[], day: string): { count: number; kcal: number } {
  let count = 0
  let kcal = 0
  for (const e of entries) {
    if (e.day !== day) continue
    count++
    kcal += e.macros.kcal
  }
  return { count, kcal }
}

/** The toast after a repeat: `Logged · 2 140 kcal · yesterday's meals`, in the display unit, never a minus sign. */
export function repeatToastText(kcal: number, unit: EnergyUnit): string {
  return `Logged${DOT}${energyLine(kcal, unit)}${DOT}yesterday's meals`
}

type Props = {
  /** yesterday's energy in kcal, drawn in the display unit */
  kcal: number
  /** how many entries yesterday holds */
  count: number
  unit: EnergyUnit
  onRepeat(): void
}

/**
 * REPEAT YESTERDAY: the first chip of the favourites row, shown when yesterday has at least one
 * entry. One tap copies every entry from yesterday onto today, as the snapshots they were.
 */
export function RepeatYesterdayChip({ kcal, count, unit, onRepeat }: Props) {
  const energy = energyLine(kcal, unit)
  return (
    <Chip
      testId="tp-repeat-yesterday"
      data-count={count}
      data-kcal={Math.round(kcal)}
      onClick={onRepeat}
      aria-label={`Repeat yesterday's meals, ${energy}`}
      icon={<RotateCcw aria-hidden="true" size={16} strokeWidth={1.5} className="text-gold-400" />}
      label="Repeat"
      trailing={<span className="num">{energy}</span>}
      maxWidth={200}
    />
  )
}
