import type { EnergyUnit } from '../lib/types'
import { formatEnergy, unitLabel } from '../lib/units'

/** Roman numeral for the streak stone. 0 reads as a plain "0". */
export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 4000) return String(Math.round(n))
  const table: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let v = Math.floor(n)
  let out = ''
  for (const [value, glyph] of table) {
    while (v >= value) {
      out += glyph
      v -= value
    }
  }
  return out
}

type Props = {
  avgKcal: number
  under: { under: number; logged: number }
  streak: number
  unit: EnergyUnit
}

/**
 * Three stat stones under the colonnade: 7 DAY AVG, UNDER THE LINE, STREAK (roman).
 * Cinzel 20 px value over a Cinzel 9 px tracking 0.3em label, bone over bone-dim, split by neutral hairlines.
 */
export function HistoryStones({ avgKcal, under, streak, unit }: Props) {
  const stones: { id: string; label: string; value: string; sub?: string; aria: string }[] = [
    {
      id: 'tp-stat-avg',
      label: '7 day avg',
      value: avgKcal > 0 ? formatEnergy(avgKcal, unit) : '0',
      sub: avgKcal > 0 ? unitLabel(unit) : undefined,
      aria: `Seven day average ${formatEnergy(avgKcal, unit)} ${unitLabel(unit)}`,
    },
    {
      id: 'tp-stat-under',
      label: 'Under the line',
      value: `${under.under} of ${under.logged}`,
      aria: `Under the line ${under.under} of ${under.logged} days`,
    },
    {
      id: 'tp-stat-streak',
      label: 'Streak',
      value: toRoman(streak),
      aria: `Streak ${streak} ${streak === 1 ? 'day' : 'days'}`,
    },
  ]
  return (
    <dl className="grid grid-cols-3 rounded-[4px] bg-obsidian-900" style={{ boxShadow: '0 0 0 1px var(--bone-08)' }}>
      {stones.map((s, i) => (
        <div
          key={s.label}
          data-testid={s.id}
          data-value={s.value}
          className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 px-1 py-3 text-center ${i > 0 ? 'border-l border-[var(--bone-08)]' : ''}`}
          aria-label={s.aria}
        >
          <dd className="font-display inscribed num flex items-baseline gap-1 text-[20px] leading-[1.1] tracking-[0.02em] text-bone">
            <span>{s.value}</span>
            {s.sub ? <span className="text-[9px] normal-case tracking-[0.1em] text-bone-dim">{s.sub}</span> : null}
          </dd>
          <dt className="font-display text-[9px] tracking-[0.3em] text-bone-dim">{s.label}</dt>
        </div>
      ))}
    </dl>
  )
}
