import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useUI } from '../store/useUI'
import { libraryIngredients, libraryMeals, matchesQuery } from '../store/selectors'
import { vibrate } from '../lib/motion'
import { Button, EmptyState, IconButton, useStaggerOnce, useToast } from '../components/ui'
import { LibrarySearch } from './LibrarySearch'
import { LibraryFavourites } from './LibraryFavourites'
import { LibraryMeals, type MealSort } from './LibraryMeals'
import { LibraryIngredients } from './LibraryIngredients'
import { LibraryAddMenu } from './LibraryAddMenu'
import { LibraryDetailSheet, type DetailTarget } from './LibraryDetailSheet'
import { LibraryEditor, type EditorTarget } from './LibraryEditor'
import { favouriteItems, loggedText, mostLogged } from './LibraryFormat'

/** The header fades into the page instead of ending on a hard edge (polish-spec 6.3; no blur, C23). */
const HEADER_FADE = 'linear-gradient(180deg, var(--color-obsidian-950) 0%, var(--color-obsidian-950) 70%, transparent 100%)'

/**
 * THE ARCHIVE (polish-spec 6.3). A 56 px header (LIBRARY, the gold plus) and the carved search stay
 * put while the archive scrolls beneath them; the header fades to nothing at its foot. Then the
 * FAVOURITES folder (the screen's one strong gold rule), MEALS (count and sort in the heading) and
 * INGREDIENTS. An empty library is one bracketed tablet with NEW MEAL and NEW INGREDIENT.
 * Lists rise in once per session (`useStaggerOnce('library')`).
 */
export function LibraryScreen() {
  const meals = useStore((s) => s.meals)
  const ingredients = useStore((s) => s.ingredients)
  const unit = useStore((s) => s.settings.unit)
  const libraryFocus = useUI((s) => s.libraryFocus)
  const setLibraryFocus = useUI((s) => s.setLibraryFocus)
  const stagger = useStaggerOnce('library')

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<MealSort>('alpha')
  const [menuOpen, setMenuOpen] = useState(false)
  const [detail, setDetail] = useState<DetailTarget | null>(null)
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  // an editor asked for from the detail sheet opens once the detail sheet has left
  const pendingEditor = useRef<EditorTarget | null>(null)
  const pendingDetail = useRef<DetailTarget | null>(null)

  const searching = query.trim().length > 0

  const allFavourites = useMemo(() => favouriteItems(meals, ingredients), [meals, ingredients])
  const favourites = useMemo(
    () => (searching ? allFavourites.filter((f) => matchesQuery(f.item.name, query)) : allFavourites),
    [allFavourites, query, searching],
  )

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
  const empty = mealCount === 0 && ingredientCount === 0

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
        text: loggedText(entry, unit),
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

  const leadIsFavourites = allFavourites.length > 0

  return (
    <div data-testid="tp-library" data-empty={empty || undefined} className="px-5">
      {/* header and search stay put while the archive scrolls beneath them */}
      <div className="sticky top-0 z-10 -mx-5 px-5 pb-4" style={{ paddingTop: 'var(--safe-top)', background: HEADER_FADE }}>
        <header className="flex h-14 items-center justify-between">
          <h1 className="title-screen inscribed">Library</h1>
          <IconButton label="Add a meal or ingredient" data-testid="tp-library-add" onClick={() => setMenuOpen(true)} className="-mr-2.5 text-gold-300">
            <Plus size={22} strokeWidth={1.5} />
          </IconButton>
        </header>
        {empty ? null : <LibrarySearch label="Search the library" data-testid="tp-library-search" placeholder="Search" value={query} onChange={setQuery} />}
      </div>

      {empty ? (
        <EmptyState
          testId="tp-library-empty"
          className="mt-12 px-4"
          action={
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="hairline"
                size="sm"
                className="px-3"
                aria-label="New meal"
                icon={<Plus size={16} strokeWidth={1.5} />}
                data-testid="tp-library-empty-meal"
                onClick={() => setEditor({ kind: 'meal' })}
              >
                Meal
              </Button>
              <Button
                variant="hairline"
                size="sm"
                className="px-3"
                aria-label="New ingredient"
                icon={<Plus size={16} strokeWidth={1.5} />}
                data-testid="tp-library-empty-ingredient"
                onClick={() => setEditor({ kind: 'ingredient' })}
              >
                Ingredient
              </Button>
            </div>
          }
        >
          Nothing saved yet.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-8 pt-2">
          <LibraryFavourites
            items={favourites}
            total={allFavourites.length}
            unit={unit}
            searching={searching}
            stagger={stagger}
            onOpenMeal={openMeal}
            onOpenIngredient={openIngredient}
            onToggleMeal={toggleMeal}
            onToggleIngredient={toggleIngredient}
            onLogMeal={logOne}
          />

          <LibraryMeals
            meals={mealList}
            total={mealCount}
            unit={unit}
            sort={sort}
            searching={searching}
            lead={!leadIsFavourites}
            stagger={stagger}
            onSort={setSort}
            onOpen={openMeal}
            onLog={logOne}
            onToggleFavourite={toggleMeal}
          />

          <LibraryIngredients ingredients={ingredientList} total={ingredientCount} unit={unit} searching={searching} stagger={stagger} onOpen={openIngredient} onToggleFavourite={toggleIngredient} />
        </div>
      )}

      <LibraryAddMenu open={menuOpen} onClose={() => setMenuOpen(false)} onClosed={onMenuClosed} onPick={pickAdd} />
      <LibraryDetailSheet target={detail} onClose={closeDetail} onClosed={onDetailClosed} onEdit={editFromDetail} onBuild={buildFromDetail} />
      <LibraryEditor target={editor} onClose={closeEditor} onClosed={onEditorClosed} />
    </div>
  )
}
