import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LogEntry, Meal } from '../lib/types'
import { useStore } from '../store/useStore'
import { useUI, type LogPrefill } from '../store/useUI'
import { favouritesByUse, recentEntries, recentKey } from '../store/selectors'
import { roundMacros } from '../lib/macros'
import { Button, Segmented, Sheet, useToast } from '../components/ui'
import { useKeyboardUp } from '../components/ui/Sheet'
import {
  EMPTY_DRAFT,
  buildTotals,
  canLogDraft,
  componentFromRow,
  draftFrom,
  draftMacros,
  draftUntouched,
  energyLine,
  perServingComponents,
  perServingMacros,
  rowFromComponent,
  saveToLibraryFor,
  type BuildRow,
  type QuickDraft,
} from '../components/MealForm'
import { MealFormQuick } from '../components/MealFormQuick'
import { MealFormBuild } from '../components/MealFormBuild'
import { LogFavourites } from './LogFavourites'
import { LogRecents } from './LogRecents'

type Mode = 'quick' | 'build'
const MODES: readonly { value: Mode; label: string }[] = [
  { value: 'quick', label: 'Quick' },
  { value: 'build', label: 'Build' },
]

const FORM_ID = 'log-form'
const CONTENT_ID = 'log-sheet-content'
const RECENT_LIMIT = 12

const sameMacros = (a: { kcal: number; protein: number; carbs: number; fat: number }, b: typeof a) =>
  Math.abs(a.kcal - b.kcal) < 0.6 && Math.abs(a.protein - b.protein) < 0.06 && Math.abs(a.carbs - b.carbs) < 0.06 && Math.abs(a.fat - b.fat) < 0.06

/** The meal a logged entry still points at, only when the library copy matches the snapshot per serving. */
function liveMealFor(entry: LogEntry, meals: Record<string, Meal>): Meal | undefined {
  if (!entry.mealId) return undefined
  const m = meals[entry.mealId]
  if (!m) return undefined
  return sameMacros(m.macros, perServingMacros(entry)) ? m : undefined
}

/**
 * THE LOG SHEET. Opens from the keystone (or a prefill from TODAY and LIBRARY), QUICK or BUILD,
 * favourites chips and the LOG button in a sticky footer, RECENT underneath. Every write is a
 * synchronous store call; the sheet closes and the strike plays from the store pulse.
 */
export function LogSheet() {
  const open = useUI((s) => s.logOpen)
  const prefill = useUI((s) => s.logPrefill)
  const closeLog = useUI((s) => s.closeLog)
  const openLog = useUI((s) => s.openLog)
  const setTab = useUI((s) => s.setTab)

  const settings = useStore((s) => s.settings)
  const meals = useStore((s) => s.meals)
  const ingredients = useStore((s) => s.ingredients)
  const entries = useStore((s) => s.entries)
  const logQuick = useStore((s) => s.logQuick)
  const logMeal = useStore((s) => s.logMeal)
  const deleteEntry = useStore((s) => s.deleteEntry)
  const hideRecent = useStore((s) => s.hideRecent)
  const toast = useToast((s) => s.show)
  const kbUp = useKeyboardUp()

  const unit = settings.unit
  const [mode, setMode] = useState<Mode>('quick')
  const [draft, setDraft] = useState<QuickDraft>(EMPTY_DRAFT)
  const [rows, setRows] = useState<BuildRow[]>([])
  const [buildName, setBuildName] = useState('')
  const [buildSave, setBuildSave] = useState<boolean | null>(null)
  const caloriesRef = useRef<HTMLInputElement | null>(null)

  const recents = useMemo(() => recentEntries(entries, RECENT_LIMIT, settings.hiddenRecents), [entries, settings.hiddenRecents])
  const suggestFrom = useMemo(() => recentEntries(entries, 40, settings.hiddenRecents), [entries, settings.hiddenRecents])
  const favourites = useMemo(() => favouritesByUse(meals).slice(0, 8), [meals])

  // ---------- prefill ----------
  const applyPrefill = useCallback(
    (p: LogPrefill) => {
      const meal = p.mealId ? meals[p.mealId] : undefined
      if (p.mode === 'build') {
        setMode('build')
        setBuildName(p.name ?? meal?.name ?? '')
        setBuildSave(meal ? false : null)
        setRows(meal?.components?.length ? meal.components.map((c) => rowFromComponent(c, ingredients)) : [])
        return
      }
      setMode('quick')
      setDraft(draftFrom({ name: p.name ?? meal?.name, macros: p.macros ?? meal?.macros, servings: p.servings, mealId: meal ? p.mealId : undefined }, unit))
    },
    [meals, ingredients, unit],
  )

  useEffect(() => {
    if (!open || !prefill) return
    applyPrefill(prefill)
    document.getElementById(CONTENT_ID)?.scrollTo({ top: 0 })
    if (prefill.mode !== 'build') {
      const id = window.setTimeout(() => caloriesRef.current?.focus({ preventScroll: true }), 340)
      return () => window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill])

  const reset = useCallback(() => {
    setMode('quick')
    setDraft(EMPTY_DRAFT)
    setRows([])
    setBuildName('')
    setBuildSave(null)
    if (useUI.getState().logPrefill) useUI.setState({ logPrefill: null })
  }, [])

  // ---------- after any write ----------
  const afterLog = useCallback(
    (entry: LogEntry) => {
      closeLog()
      toast({
        text: `Logged · ${energyLine(entry.macros.kcal, unit)}`,
        action: { label: 'Undo', icon: 'undo', onClick: () => deleteEntry(entry.id) },
      })
      if (useStore.getState().persistFailed) {
        toast({
          text: 'Saved for this session only. Export now.',
          tone: 'warn',
          duration: 8000,
          action: {
            label: 'Export',
            onClick: () => {
              closeLog()
              setTab('settings')
            },
          },
        })
      }
    },
    [closeLog, deleteEntry, setTab, toast, unit],
  )

  // ---------- submit ----------
  const canLog = mode === 'quick' ? canLogDraft(draft, unit) : rows.some((r) => componentFromRow(r, ingredients).amount > 0)

  const submit = useCallback(() => {
    if (mode === 'quick') {
      const macros = draftMacros(draft, unit)
      if (!macros) return
      if (draft.source && draftUntouched(draft, unit)) {
        const entry = logMeal(draft.source.mealId, draft.servings)
        if (entry) {
          afterLog(entry)
          return
        }
      }
      const entry = logQuick({
        name: draft.name,
        macros,
        servings: draft.servings,
        saveToLibrary: saveToLibraryFor(draft, meals),
      })
      afterLog(entry)
      return
    }
    const components = rows.map((r) => componentFromRow(r, ingredients)).filter((c) => c.amount > 0)
    if (!components.length) return
    const entry = logQuick({
      name: buildName,
      macros: roundMacros(buildTotals(rows, ingredients)),
      servings: 1,
      components,
      saveToLibrary: saveToLibraryFor({ name: buildName, saveOverride: buildSave }, meals),
    })
    afterLog(entry)
  }, [afterLog, buildName, buildSave, draft, ingredients, logMeal, logQuick, meals, mode, rows, unit])

  // ---------- chips and recents ----------
  const onSuggestion = useCallback(
    (e: LogEntry) => {
      const live = liveMealFor(e, meals)
      setDraft((d) => ({
        ...draftFrom({ name: e.name, macros: perServingMacros(e), servings: d.servings, mealId: live?.id }, unit),
        saveOverride: d.saveOverride,
      }))
      caloriesRef.current?.focus({ preventScroll: true })
    },
    [meals, unit],
  )

  const onFavourite = useCallback(
    (m: Meal) => {
      const entry = logMeal(m.id, 1)
      if (entry) afterLog(entry)
    },
    [afterLog, logMeal],
  )

  const onRelog = useCallback(
    (e: LogEntry) => {
      const entry = logQuick({ name: e.name, macros: perServingMacros(e), servings: e.servings, components: perServingComponents(e) })
      afterLog(entry)
    },
    [afterLog, logQuick],
  )

  const onEditFirst = useCallback(
    (e: LogEntry) => {
      openLog({ name: e.name, macros: perServingMacros(e), servings: e.servings, mealId: liveMealFor(e, meals)?.id, mode: 'quick' })
    },
    [meals, openLog],
  )

  const onHide = useCallback((e: LogEntry) => hideRecent(recentKey(e)), [hideRecent])

  return (
    <Sheet
      open={open}
      onClose={closeLog}
      onClosed={reset}
      title="Log"
      contentId={CONTENT_ID}
      headerRight={<Segmented<Mode> value={mode} options={MODES} onChange={(v) => setMode(v)} label="Mode" />}
      footer={
        <div>
          {!kbUp ? <LogFavourites meals={favourites} unit={unit} onPick={onFavourite} /> : null}
          <Button variant="gold" full type="submit" form={FORM_ID} disabled={!canLog} aria-disabled={!canLog}>
            Log
          </Button>
        </div>
      }
    >
      {mode === 'quick' ? (
        <MealFormQuick
          draft={draft}
          onChange={setDraft}
          unit={unit}
          meals={meals}
          suggestFrom={suggestFrom}
          onSuggestion={onSuggestion}
          caloriesRef={caloriesRef}
          formId={FORM_ID}
          onSubmit={submit}
        />
      ) : (
        <MealFormBuild
          rows={rows}
          onRows={setRows}
          name={buildName}
          onName={setBuildName}
          saveOverride={buildSave}
          onSaveOverride={setBuildSave}
          unit={unit}
          ingredients={ingredients}
          meals={meals}
          formId={FORM_ID}
          onSubmit={submit}
        />
      )}
      <LogRecents entries={recents} unit={unit} onRelog={onRelog} onEditFirst={onEditFirst} onHide={onHide} limit={RECENT_LIMIT} />
    </Sheet>
  )
}
