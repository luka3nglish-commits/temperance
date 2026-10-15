import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, FolderHeart } from 'lucide-react'
import type { EnergyUnit } from '../lib/types'
import { EmptyLine, IconButton, SectionHeading } from '../components/ui'
import { LibraryRow } from './LibraryRow'
import { ingredientSubline, mealSubline, readFavCollapsed, writeFavCollapsed, type FavouriteItem } from './LibraryFormat'

const FOLDER_LIMIT = 8

type Props = {
  /** the favourites to show (already filtered by the search) */
  items: FavouriteItem[]
  /** how many favourites exist before the search filter; the folder is hidden when there are none */
  total: number
  unit: EnergyUnit
  /** true while a search query is active (the folder shows every match, never collapses) */
  searching: boolean
  /** the list stagger class for this visit (`tp-stagger` or '') */
  stagger?: string
  onOpenMeal(id: string): void
  onOpenIngredient(id: string): void
  onToggleMeal(id: string): void
  onToggleIngredient(id: string): void
  onLogMeal(id: string): void
}

/**
 * THE FOLDER (polish-spec 6.3). The screen's first section, so it carries the one strong gold rule
 * with the folder-heart icon. Favourite meals and ingredients, last used first; up to 8 rows with
 * ALL at the right when there are more; collapse remembered in localStorage. Hidden entirely when
 * nothing is marked; while searching with no match it shows `Nothing matches.` (`tp-fav-empty`).
 */
export function LibraryFavourites({ items, total, unit, searching, stagger = '', onOpenMeal, onOpenIngredient, onToggleMeal, onToggleIngredient, onLogMeal }: Props) {
  const [collapsed, setCollapsed] = useState(readFavCollapsed)
  const [showAll, setShowAll] = useState(false)
  useEffect(() => writeFavCollapsed(collapsed), [collapsed])

  if (total === 0) return null

  const open = !collapsed || searching
  const overflow = items.length > FOLDER_LIMIT
  const shown = showAll || searching ? items : items.slice(0, FOLDER_LIMIT)

  return (
    <section data-testid="tp-fav-folder" aria-labelledby="lib-fav-heading" data-open={open}>
      <SectionHeading
        rule="strong"
        icon={<FolderHeart size={16} strokeWidth={1.5} aria-hidden="true" />}
        right={
          <div className="-my-2.5 -mr-2.5 flex items-center">
            {open && overflow && !searching ? (
              <button
                type="button"
                aria-pressed={showAll}
                onClick={() => setShowAll((v) => !v)}
                className="label press inline-flex h-11 min-w-11 items-center justify-center px-2 text-gold-300 cursor-pointer"
              >
                {showAll ? 'Fewer' : `All ${items.length}`}
              </button>
            ) : null}
            <IconButton
              label={open ? 'Collapse favourites' : 'Expand favourites'}
              aria-expanded={open}
              aria-controls="lib-fav-list"
              onClick={() => setCollapsed((c) => !c)}
            >
              {open ? <ChevronUp size={18} strokeWidth={1.5} /> : <ChevronDown size={18} strokeWidth={1.5} />}
            </IconButton>
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
          className="relative inline-flex items-center uppercase cursor-pointer after:absolute after:-inset-y-[16px] after:-left-6 after:right-0 after:content-['']"
        >
          Favourites
        </button>
      </SectionHeading>

      <div id="lib-fav-list" hidden={!open}>
        {items.length === 0 ? (
          <div data-testid="tp-fav-empty">
            <EmptyLine className="py-4">Nothing matches.</EmptyLine>
          </div>
        ) : (
          <ul className={stagger}>
            {shown.map((f) =>
              f.kind === 'meal' ? (
                <LibraryRow
                  key={`m:${f.item.id}`}
                  id={f.item.id}
                  name={f.item.name}
                  meta={mealSubline(f.item)}
                  kcal={f.item.macros.kcal}
                  unit={unit}
                  favourite={f.item.favourite}
                  onOpen={onOpenMeal}
                  onToggleFavourite={onToggleMeal}
                  onLog={onLogMeal}
                  testIds={{ row: `tp-fav-row-${f.item.id}`, fav: `tp-fav-star-${f.item.id}`, log: `tp-fav-log-${f.item.id}` }}
                />
              ) : (
                <LibraryRow
                  key={`i:${f.item.id}`}
                  id={f.item.id}
                  name={f.item.name}
                  meta={ingredientSubline(f.item)}
                  kcal={f.item.macros.kcal}
                  unit={unit}
                  favourite={f.item.favourite}
                  onOpen={onOpenIngredient}
                  onToggleFavourite={onToggleIngredient}
                  testIds={{ row: `tp-fav-row-${f.item.id}`, fav: `tp-fav-star-${f.item.id}` }}
                />
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  )
}
