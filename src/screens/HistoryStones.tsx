import { StatStone, StatStones, useStaggerOnce } from '../components/ui'
import { Laurel } from '../components/ornaments'
import type { EnergyUnit } from '../lib/types'
import { formatEnergy, unitLabel } from '../lib/units'

export type StoneValues = {
  /** '' draws the bone-mute middle dot */
  avg: string
  under: string
  streak: string
}

/**
 * What the three stones show. Arabic numerals (polish-spec C13). With nothing logged in the last seven
 * days, AVG and UNDER read as a middle dot (`''`); the streak reads `0` once anything has been logged,
 * and the dot before that.
 */
export function stoneValues(avgKcal: number, under: { under: number; logged: number }, streak: number, unit: EnergyUnit, anyLogged = under.logged > 0): StoneValues {
  return {
    avg: avgKcal > 0 ? formatEnergy(avgKcal, unit) : '',
    under: under.logged > 0 ? `${under.under} of ${under.logged}` : '',
    streak: streak > 0 || anyLogged ? String(Math.max(0, Math.floor(streak))) : '',
  }
}

type Props = {
  avgKcal: number
  under: { under: number; logged: number }
  streak: number
  unit: EnergyUnit
  /** anything logged at all (a zero streak then reads `0`, not a dot) */
  anyLogged?: boolean
}

/**
 * Three stat stones under the colonnade (polish-spec 4.10 and 6.4): AVG 7 DAYS in gold-300 (the screen's
 * focal value besides today's bar), UNDER, and STREAK with the laurel behind it. One bracketed tablet.
 */
export function HistoryStones({ avgKcal, under, streak, unit, anyLogged }: Props) {
  const v = stoneValues(avgKcal, under, streak, unit, anyLogged)
  const stagger = useStaggerOnce('history-stones')
  return (
    <StatStones className={stagger}>
      <StatStone
        testId="tp-stat-avg"
        caption="Avg 7 days"
        value={v.avg}
        unit={v.avg ? unitLabel(unit) : undefined}
        highlight
        data={{ 'data-value': v.avg || '0', 'aria-label': `Seven day average ${formatEnergy(avgKcal, unit)} ${unitLabel(unit)}` } as Record<`data-${string}`, string>}
      />
      <StatStone
        testId="tp-stat-under"
        caption="Under"
        value={v.under}
        data={{ 'data-value': v.under || `0 of 0`, 'aria-label': `Under the line ${under.under} of ${under.logged} days` } as Record<`data-${string}`, string>}
      />
      <StatStone
        testId="tp-stat-streak"
        caption="Streak"
        value={v.streak}
        ornament={v.streak ? <Laurel className="block translate-y-[6px]" /> : undefined}
        data={{ 'data-value': v.streak || '0', 'aria-label': `Streak ${streak} ${streak === 1 ? 'day' : 'days'}` } as Record<`data-${string}`, string>}
      />
    </StatStones>
  )
}
