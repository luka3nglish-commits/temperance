import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, FolderHeart } from 'lucide-react'
import type { EnergyUnit } from '../lib/types'
import { EmptyLine } from '../components/ui'
import { LibraryRow } from './LibraryRow'
import { ingredientSubline, mealSubline, readFavCollapsed, writeFavCollapsed, type FavouriteItem } from './LibraryFormat'

const FOLDER_LIMIT = 8

type Props = {
  items: FavouriteItem[]
  unit: EnergyUnit
  /** true while a search query is active (the folder shows every match, never collapses) */
  searching: boolean
  onOpenMeal(id: string): void
  onOpenIngredient(id: string): void
  onToggleMeal(id: string): void
  onToggleIngredient(id: string): void
}

/**
 * THE FOLDER. Pinned at the top: favourite meals and ingredients, last used first.
 * Up to 8 rows with ALL at the right when there are more; collapse remembered in localStorage.
 */
export function LibraryFavourites({ items, unit, searching, onOpenMeal, onOpenIngredient, onToggleMeal, onToggleIngredient }: Props) {
  const [collapsed, setCollapsed] = useState(readFavCollapsed)
  const [showAll, setShowAll] = useState(false)
  useEffect(() => writeFavCollapsed(collapsed), [collapsed])

  const open = !collapsed || searching
  const overflow = items.length > FOLDER_LIMIT
  const shown = showAll || searching ? items : items.slice(0, FOLDER_LIMIT)

  return (
    <section aria-labelledby="lib-fav-heading">
      <div className="flex items-end justify-between border-b border-[var(--gold-line-strong)]">
        <button
          type="button"
          id="lib-fav-heading"
          aria-expanded={open}
          aria-controls="lib-fav-list"
          onClick={() => setCollapsed((c) => !c)}
          className="font-display inline-flex min-h-11 flex-1 items-center gap-2 text-[10px] tracking-[0.4em] text-bone-dim cursor-pointer"
        >
          <FolderHeart size={14} strokeWidth={1.5} aria-hidden="true" className="text-gold-400" />
          Favourites
        </button>
        <div className="flex items-center">
          {open && overflow ? (
            <button
              type="button"
              aria-pressed={showAll}
              onClick={() => setShowAll((v) => !v)}
              className="font-display inline-flex h-11 items-center px-2 text-[10px] tracking-[0.3em] text-gold-400 cursor-pointer"
            >
              {showAll ? 'Fewer' : 'All'}
            </button>
          ) : null}
          <button
            type="button"
            aria-label={open ? 'Collapse favourites' : 'Expand favourites'}
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-11 w-11 items-center justify-center text-bone-dim hover:text-bone cursor-pointer"
          >
            {open ? <ChevronUp size={18} strokeWidth={1.5} /> : <ChevronDown size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <div id="lib-fav-list" hidden={!open}>
        {items.length === 0 ? (
          <EmptyLine className="py-4">{searching ? 'Nothing matches.' : 'Mark a meal to keep it here.'}</EmptyLine>
        ) : (
          <ul>
            {shown.map((f) =>
              f.kind === 'meal' ? (
                <LibraryRow
                  key={`m:${f.item.id}`}
                  id={f.item.id}
                  name={f.item.name}
                  subline={mealSubline(f.item.macros, unit)}
                  favourite={f.item.favourite}
                  trailing="star"
                  onOpen={onOpenMeal}
                  onToggleFavourite={onToggleMeal}
                />
              ) : (
                <LibraryRow
                  key={`i:${f.item.id}`}
                  id={f.item.id}
                  name={f.item.name}
                  subline={ingredientSubline(f.item, unit)}
                  favourite={f.item.favourite}
                  trailing="star"
                  onOpen={onOpenIngredient}
                  onToggleFavourite={onToggleIngredient}
                />
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
