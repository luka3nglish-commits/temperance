import { useMemo } from 'react'
import type { EnergyUnit, LogEntry } from '../lib/types'
import { matchesQuery } from '../store/selectors'
import { energyLine, perServingMacros } from '../components/MealForm'

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
 * name; the chip shows the name and its per-serving energy. Hidden once the typed name is an exact match.
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
    <div role="listbox" aria-label="Suggestions" className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 scrollbar-none">
      {hits.map((e) => (
        <button
          key={e.id}
          type="button"
          role="option"
          data-testid={`tp-suggest-${e.id}`}
          aria-selected="false"
          onClick={() => onPick(e)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-[4px] border border-[var(--gold-line-strong)] bg-obsidian-800 px-3 transition-colors duration-150 hover:bg-[var(--gold-line)] active:scale-[0.97] cursor-pointer"
        >
          <span className="max-w-[160px] truncate font-body text-[16px] font-medium text-bone">{e.name}</span>
          <span className="num font-display inscribed text-[11px] tracking-[0.1em] text-gold-400">{energyLine(perServingMacros(e).kcal, unit)}</span>
        </button>
      ))}
    </div>
  )
}
