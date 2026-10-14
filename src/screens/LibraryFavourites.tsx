import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, FolderHeart } from 'lucide-react'
import type { EnergyUnit } from '../lib/types'
import { EmptyLine, SectionHeading } from '../components/ui'
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
    <section data-testid="tp-fav-folder" aria-labelledby="lib-fav-heading" data-open={open}>
      <SectionHeading
        icon={<FolderHeart size={14} strokeWidth={1.5} aria-hidden="true" className="text-gold-400" />}
        right={
          <div className="-mb-2 -mr-2 flex items-center">
            {open && overflow ? (
              <button
                type="button"
                aria-pressed={showAll}
                onClick={() => setShowAll((v) => !v)}
                className="font-display inline-flex h-11 min-w-11 items-center justify-center px-2 text-[10px] tracking-[0.3em] text-gold-400 hover:text-gold-300 cursor-pointer"
              >
                {showAll ? 'Fewer' : 'All'}
              </button>
            ) : null}
            <button
              type="button"
              aria-label={open ? 'Collapse favourites' : 'Expand favourites'}
              aria-expanded={open}
              aria-controls="lib-fav-list"
              onClick={() => setCollapsed((c) => !c)}
              className="flex h-11 w-11 items-center justify-center text-bone-dim hover:text-bone cursor-pointer"
            >
              {open ? <ChevronUp size={18} strokeWidth={1.5} /> : <ChevronDown size={18} strokeWidth={1.5} />}
            </button>
          </div>
        }
      >
        {/* the label keeps the same baseline as MEALS and INGREDIENTS; the 44 px target is the pseudo-element */}
        <button
          type="button"
          id="lib-fav-heading"
          aria-expanded={open}
          aria-controls="lib-fav-list"
          onClick={() => setCollapsed((c) => !c)}
          className="relative inline-flex items-center cursor-pointer after:absolute after:-inset-y-[17px] after:-left-6 after:right-0 after:content-['']"
        >
          Favourites
        </button>
      </SectionHeading>

      <div id="lib-fav-list" hidden={!open}>
        {items.length === 0 ? (
          <div data-testid="tp-fav-empty">
            <EmptyLine className="py-4">{searching ? 'Nothing matches.' : 'Mark a meal to keep it here.'}</EmptyLine>
          </div>
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
                  onOpen={onOpenMeal}
                  onToggleFavourite={onToggleMeal}
                  testIds={{ row: `tp-fav-row-${f.item.id}` }}
                />
              ) : (
                <LibraryRow
                  key={`i:${f.item.id}`}
                  id={f.item.id}
                  name={f.item.name}
                  subline={ingredientSubline(f.item, unit)}
                  favourite={f.item.favourite}
                  onOpen={onOpenIngredient}
                  onToggleFavourite={onToggleIngredient}
                  testIds={{ row: `tp-fav-row-${f.item.id}` }}
                />
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
