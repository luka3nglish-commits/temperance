import { useMemo } from 'react'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { matchesQuery } from '../store/selectors'
import { portionAria, portionLabel } from '../lib/portion'
import { Chip } from '../components/ui'
import { DOT, energyLine } from '../components/MealForm'

type Props = {
  query: string
  /** recents, newest first (already de-duplicated and with hidden keys removed) */
  entries: readonly LogEntry[]
  unit: EnergyUnit
  onPick(entry: LogEntry): void
  max?: number
}

/**
 * Up to five chips from recents under the NAME field as he types. Not a datalist. Distinct by
 * name; the chip shows the name, the portion eaten and its energy (`180 g · 175 kcal`), as a tap fills
 * the form with exactly that. Hidden once the typed name is an exact match.
 */
export function LogSuggestions({ query, entries, unit, onPick, max = 5 }: Props) {
  const q = query.trim()
  const hits = useMemo(() => {
    if (!q) return []
    const seen = new Set<string>()
    const out: LogEntry[] = []
    for (const e of entries) {
      const key = e.name.trim().toLowerCase()
      if (seen.has(key) || !matchesQuery(e.name, q)) continue
      seen.add(key)
      out.push(e)
      if (out.length >= max) break
    }
    if (out.length === 1 && out[0].name.trim().toLowerCase() === q.toLowerCase()) return []
    return out
  }, [q, entries, max])

  if (!hits.length) return null

  return (
    <div role="group" aria-label="Suggestions" className="chip-row -mx-5 mt-1.5 -mb-0.5 px-5 py-0.5">
      {hits.map((e) => {
        const label = portionLabel(e)
        const spoken = portionAria(e)
        const energy = energyLine(e.macros.kcal, unit)
        return (
          <Chip
            key={e.id}
            testId={`tp-suggest-${e.id}`}
            aria-label={`${e.name}${spoken ? `, ${spoken}` : ''}, ${energy}`}
            onClick={() => onPick(e)}
            label={e.name}
            trailing={<span className="num">{label ? `${label}${DOT}${energy}` : energy}</span>}
            maxWidth={260}
          />
        )
      })}
    </div>
  )
}
