import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { libraryIngredients, libraryMeals, matchesQuery } from '../store/selectors'
import { useReducedMotion, vibrate } from '../lib/motion'
import { IconButton, useToast } from '../components/ui'
import { LibrarySearch } from './LibrarySearch'
import { LibraryFavourites } from './LibraryFavourites'
import { LibraryMeals, type MealSort } from './LibraryMeals'
import { LibraryIngredients } from './LibraryIngredients'
import { LibraryAddMenu } from './LibraryAddMenu'
import { LibraryDetailSheet, type DetailTarget } from './LibraryDetailSheet'
import { LibraryEditor, type EditorTarget } from './LibraryEditor'
import { energyText, favouriteItems, mostLogged } from './LibraryFormat'

/**
 * THE ARCHIVE. Header 56 px, search 48 px, then three inscribed sections: the FAVOURITES folder,
 * MEALS and INGREDIENTS. Scrolls inside <main>; App pads the bottom for the tab bar.
 * Entrance stagger on mount only (rise-in classes on the five blocks).
 */
export function LibraryScreen() {
  const meals = useStore((s) => s.meals)
  const ingredients = useStore((s) => s.ingredients)
  const unit = useStore((s) => s.settings.unit)
  const libraryFocus = useUI((s) => s.libraryFocus)
  const setLibraryFocus = useUI((s) => s.setLibraryFocus)
  const reduced = useReducedMotion()

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<MealSort>('alpha')
  const [menuOpen, setMenuOpen] = useState(false)
  const [detail, setDetail] = useState<DetailTarget | null>(null)
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  // an editor asked for from the detail sheet opens once the detail sheet has left
  const pendingEditor = useRef<EditorTarget | null>(null)
  const pendingDetail = useRef<DetailTarget | null>(null)

  const searching = query.trim().length > 0

  const favourites = useMemo(() => {
    const all = favouriteItems(meals, ingredients)
    return searching ? all.filter((f) => matchesQuery(f.item.name, query)) : all
  }, [meals, ingredients, query, searching])

  const mealList = useMemo(() => {
    const base = sort === 'logged' ? mostLogged(Object.values(meals)) : libraryMeals(meals)
    return searching ? base.filter((m) => matchesQuery(m.name, query)) : base
  }, [meals, sort, query, searching])

  const ingredientList = useMemo(() => {
    const base = libraryIngredients(ingredients)
    return searching ? base.filter((g) => matchesQuery(g.name, query)) : base
  }, [ingredients, query, searching])

  const mealCount = useMemo(() => Object.keys(meals).length, [meals])
  const ingredientCount = useMemo(() => Object.keys(ingredients).length, [ingredients])

  // another screen asked for an item: open it, then clear the request
  useEffect(() => {
    if (!libraryFocus) return
    const exists = libraryFocus.kind === 'meal' ? !!useStore.getState().meals[libraryFocus.id] : !!useStore.getState().ingredients[libraryFocus.id]
    if (exists) setDetail(libraryFocus)
    setLibraryFocus(null)
  }, [libraryFocus, setLibraryFocus])

  const openMeal = useCallback((id: string) => setDetail({ kind: 'meal', id }), [])
  const openIngredient = useCallback((id: string) => setDetail({ kind: 'ingredient', id }), [])
  const toggleMeal = useCallback((id: string) => useStore.getState().toggleFavouriteMeal(id), [])
  const toggleIngredient = useCallback((id: string) => useStore.getState().toggleFavouriteIngredient(id), [])

  const logOne = useCallback(
    (id: string) => {
      // one tap logs the meal's usual amount (the last one chosen)
      const entry = useStore.getState().logMeal(id)
      if (!entry) return
      vibrate(8)
      useToast.getState().show({
        text: `Logged · ${energyText(entry.macros.kcal, unit)}`,
        action: { label: 'Undo', icon: 'undo', onClick: () => useStore.getState().deleteEntry(entry.id) },
      })
    },
    [unit],
  )

  const closeDetail = useCallback(() => setDetail(null), [])
  const editFromDetail = useCallback((t: DetailTarget) => {
    pendingEditor.current = { kind: t.kind, id: t.id }
    pendingDetail.current = t
    setDetail(null)
  }, [])
  // an assembled meal reopens in the LOG sheet's BUILD mode once the detail sheet has left
  const pendingBuild = useRef<string | null>(null)
  const buildFromDetail = useCallback((mealId: string) => {
    pendingBuild.current = mealId
    setDetail(null)
  }, [])
  const onDetailClosed = useCallback(() => {
    const next = pendingEditor.current
    pendingEditor.current = null
    if (next) setEditor(next)
    const build = pendingBuild.current
    pendingBuild.current = null
    if (build && useStore.getState().meals[build]) useUI.getState().openLog({ mealId: build, mode: 'build' })
  }, [])

  const closeEditor = useCallback(() => setEditor(null), [])
  // editing from the detail sheet returns to it (if the item still exists)
  const onEditorClosed = useCallback(() => {
    const next = pendingDetail.current
    pendingDetail.current = null
    if (!next) return
    const s = useStore.getState()
    const exists = next.kind === 'meal' ? !!s.meals[next.id] : !!s.ingredients[next.id]
    if (exists) setDetail(next)
  }, [])

  // the add menu is a short sheet; the editor opens once it has dropped away
  const pendingAdd = useRef<EditorTarget | null>(null)
  const pickAdd = useCallback((kind: 'meal' | 'ingredient') => {
    pendingAdd.current = { kind }
    setMenuOpen(false)
  }, [])
  const onMenuClosed = useCallback(() => {
    const next = pendingAdd.current
    pendingAdd.current = null
    if (next) setEditor(next)
  }, [])

  const rise = (i: number) => (reduced ? '' : i === 0 ? 'rise-in' : `rise-in rise-in-${i}`)

  return (
    <div data-testid="tp-library" className="px-5">
      {/* header and search stay put while the archive scrolls beneath them */}
      <div className="sticky top-0 z-10 -mx-5 bg-obsidian-950/92 px-5 pb-4 backdrop-blur-[12px]" style={{ paddingTop: 'var(--safe-top)' }}>
        <header className={`flex h-14 items-center justify-between ${rise(0)}`}>
          <h1 className="font-display inscribed text-[14px] tracking-[0.35em] text-bone">Library</h1>
          <IconButton label="Add a meal or ingredient" data-testid="tp-library-add" onClick={() => setMenuOpen(true)} className="-mr-2 text-gold-400 hover:text-gold-300">
            <Plus size={22} strokeWidth={1.5} />
          </IconButton>
        </header>
        <div className={`pt-1 ${rise(1)}`}>
          <LibrarySearch label="Search the library" data-testid="tp-library-search" placeholder="Search" value={query} onChange={setQuery} />
        </div>
      </div>

      <div className="h-2" aria-hidden="true" />

      <div className={rise(2)}>
        <LibraryFavourites
          items={favourites}
          unit={unit}
          searching={searching}
          onOpenMeal={openMeal}
          onOpenIngredient={openIngredient}
          onToggleMeal={toggleMeal}
          onToggleIngredient={toggleIngredient}
        />
      </div>

      <div className={`mt-6 ${rise(3)}`}>
        <LibraryMeals
          meals={mealList}
          total={mealCount}
          unit={unit}
          sort={sort}
          searching={searching}
          onSort={setSort}
          onOpen={openMeal}
          onLog={logOne}
          onToggleFavourite={toggleMeal}
        />
      </div>

      <div className={`mt-6 ${rise(4)}`}>
        <LibraryIngredients ingredients={ingredientList} total={ingredientCount} unit={unit} searching={searching} onOpen={openIngredient} onToggleFavourite={toggleIngredient} />
      </div>

      <LibraryAddMenu open={menuOpen} onClose={() => setMenuOpen(false)} onClosed={onMenuClosed} onPick={pickAdd} />
      <LibraryDetailSheet target={detail} onClose={closeDetail} onClosed={onDetailClosed} onEdit={editFromDetail} onBuild={buildFromDetail} />
      <LibraryEditor target={editor} onClose={closeEditor} onClosed={onEditorClosed} />
    </div>
  )
}
