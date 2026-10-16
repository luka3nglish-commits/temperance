import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LogEntry, Meal } from '../lib/types'
import { useStore } from '../store/useStore'
import { useUI, type LogPrefill } from '../store/useUI'
import { favouritesByUse, recentEntries, recentKey } from '../store/selectors'
import { roundMacros } from '../lib/macros'
import { yesterdayKey } from '../lib/day'
import { useToday } from '../lib/useToday'
import { Button, Segmented, Sheet, useToast } from '../components/ui'
import { useKeyboardUp } from '../components/ui/Sheet'
import {
  EMPTY_DRAFT,
  buildTotals,
  canLogDraft,
  componentFromRow,
  draftForEntry,
  draftForMeal,
  draftFrom,
  liveMealFor,
  loggedToastText,
  perServingComponents,
  perServingMacros,
  quickSubmission,
  rowFromComponent,
  saveToLibraryFor,
  type BuildRow,
  type QuickDraft,
} from '../components/MealForm'
import { MealFormQuick } from '../components/MealFormQuick'
import { MealFormBuild } from '../components/MealFormBuild'
import { LogFavourites } from './LogFavourites'
import { LogRecents } from './LogRecents'
import { RepeatYesterdayChip, daySummary, repeatToastText } from './LogRepeat'

type Mode = 'quick' | 'build'
const MODES: readonly { value: Mode; label: string }[] = [
  { value: 'quick', label: 'Quick' },
  { value: 'build', label: 'Build' },
]

const FORM_ID = 'log-form'
const CONTENT_ID = 'log-sheet-content'
const RECENT_LIMIT = 12

/**
 * THE LOG SHEET. Opens from the keystone (or a prefill from TODAY and LIBRARY), QUICK or BUILD,
 * the chip row (REPEAT YESTERDAY, then favourites) and the LOG button in a sticky footer, RECENT
 * underneath. Every write is a synchronous store call; the sheet closes and the strike plays from
 * the store pulse.
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
  const today = useToday()

  const unit = settings.unit
  const [mode, setMode] = useState<Mode>('quick')
  const [draft, setDraft] = useState<QuickDraft>(EMPTY_DRAFT)
  const [rows, setRows] = useState<BuildRow[]>([])
  const [buildName, setBuildName] = useState('')
  const [buildSave, setBuildSave] = useState<boolean | null>(null)
  const caloriesRef = useRef<HTMLInputElement | null>(null)
  /** the recent being edited first: read once by the prefill it triggers */
  const editRef = useRef<LogEntry | null>(null)

  const recents = useMemo(() => recentEntries(entries, RECENT_LIMIT, settings.hiddenRecents), [entries, settings.hiddenRecents])
  const suggestFrom = useMemo(() => recentEntries(entries, 40, settings.hiddenRecents), [entries, settings.hiddenRecents])
  const favourites = useMemo(() => favouritesByUse(meals).slice(0, 8), [meals])
  // REPEAT YESTERDAY shows while yesterday holds at least one entry
  const yesterday = yesterdayKey(today)
  const repeat = useMemo(() => daySummary(entries, yesterday), [entries, yesterday])

  // The newest visible log as of the last open (the store hydrates synchronously, so the first
  // render already sees it). A row logged since, here or from LIBRARY and TODAY, rises in on the
  // next open; the test is time, not identity, so hiding or deleting the top row never rises the
  // one beneath it. Set in an effect so it batches with the Sheet's own mount and RECENT, which
  // reads `risingKey` once at mount, sees it on its first render.
  const top = recents[0]
  const topRef = useRef(top)
  topRef.current = top
  const seenAt = useRef(top?.at ?? 0)
  const [risingKey, setRisingKey] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    const t = topRef.current
    setRisingKey(t && t.at > seenAt.current ? recentKey(t) : null)
    seenAt.current = Math.max(seenAt.current, t?.at ?? 0)
  }, [open])

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
      // a long-pressed recent: its basis and the amount eaten come through (LogPrefill has no portion)
      const held = editRef.current
      editRef.current = null
      if (held) {
        setDraft(draftForEntry(held, meals, unit))
        return
      }
      // a library meal keeps its basis (Meal.per) and usual amount (Meal.usual)
      if (meal && !p.macros) {
        setDraft({ ...draftForMeal(meal, unit, p.servings), ...(p.name ? { name: p.name } : {}) })
        return
      }
      setDraft(draftFrom({ name: p.name ?? meal?.name, macros: p.macros ?? meal?.macros, amount: p.servings, mealId: meal ? p.mealId : undefined, usual: meal?.per ? undefined : meal?.usual }, unit))
    },
    [meals, ingredients, unit],
  )

  useEffect(() => {
    if (!open || !prefill) return
    applyPrefill(prefill)
    document.getElementById(CONTENT_ID)?.scrollTo?.({ top: 0 })
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
    setRisingKey(null)
    if (useUI.getState().logPrefill) useUI.setState({ logPrefill: null })
  }, [])

  // ---------- after any write ----------
  /** The write already happened and counts; when it could not be persisted the toast says so instead. True when it did. */
  const warnIfSessionOnly = useCallback((): boolean => {
    if (!useStore.getState().persistFailed) return false
    toast({
      text: 'Saved for this session only. Export now.',
      tone: 'warn',
      duration: 8000,
      action: { label: 'Export', onClick: () => setTab('settings') },
    })
    return true
  }, [setTab, toast])

  const afterLog = useCallback(
    (entry: LogEntry) => {
      closeLog()
      if (warnIfSessionOnly()) return
      toast({
        text: loggedToastText(entry, unit),
        action: { label: 'Undo', icon: 'undo', onClick: () => deleteEntry(entry.id) },
      })
    },
    [closeLog, deleteEntry, toast, unit, warnIfSessionOnly],
  )

  // ---------- submit ----------
  const canLog = mode === 'quick' ? canLogDraft(draft, unit) : rows.some((r) => componentFromRow(r, ingredients).amount > 0)

  const submit = useCallback(() => {
    if (mode === 'quick') {
      const plan = quickSubmission(draft, unit, meals)
      if (!plan) return
      if (plan.meal) {
        const entry = logMeal(plan.meal.id, plan.meal.portion)
        if (entry) {
          afterLog(entry)
          return
        }
      }
      afterLog(logQuick(plan.quick))
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
      setDraft((d) => ({ ...draftForEntry(e, meals, unit), saveOverride: d.saveOverride }))
      caloriesRef.current?.focus({ preventScroll: true })
    },
    [meals, unit],
  )

  const onFavourite = useCallback(
    (m: Meal) => {
      // one tap logs the meal's usual amount (the last one he chose)
      const entry = logMeal(m.id)
      if (entry) afterLog(entry)
    },
    [afterLog, logMeal],
  )

  const onRelog = useCallback(
    (e: LogEntry) => {
      // exactly what he had last time: amount, portion and components included
      const entry = useStore.getState().relogEntry(e.id) ?? logQuick({ name: e.name, macros: perServingMacros(e), servings: e.servings, components: perServingComponents(e) })
      afterLog(entry)
    },
    [afterLog, logQuick],
  )

  const onEditFirst = useCallback(
    (e: LogEntry) => {
      // a long-press timer landing during the close animation must not reopen the sheet
      if (!useUI.getState().logOpen) return
      editRef.current = e
      openLog({ name: e.name, macros: perServingMacros(e), servings: e.servings, mealId: liveMealFor(e, meals)?.id, mode: 'quick' })
    },
    [meals, openLog],
  )

  const onHide = useCallback((e: LogEntry) => hideRecent(recentKey(e)), [hideRecent])

  // REPEAT YESTERDAY: every entry from yesterday copied onto today in one store write, one toast, one UNDO
  const onRepeat = useCallback(() => {
    // the sheet is already on its way out: a second tap during the close never doubles the day
    if (!useUI.getState().logOpen) return
    const copies = useStore.getState().repeatDay(yesterdayKey(today))
    if (!copies.length) return
    closeLog()
    if (warnIfSessionOnly()) return
    const kcal = copies.reduce((sum, c) => sum + c.macros.kcal, 0)
    toast({
      text: repeatToastText(kcal, unit),
      action: { label: 'Undo', icon: 'undo', onClick: () => useStore.getState().deleteEntries(copies.map((c) => c.id)) },
    })
  }, [closeLog, deleteEntry, today, toast, unit, warnIfSessionOnly])

  return (
    <Sheet
      open={open}
      onClose={closeLog}
      onClosed={reset}
      title="Log"
      testId="tp-log-sheet"
      contentId={CONTENT_ID}
      headerRight={<Segmented<Mode> value={mode} options={MODES} onChange={(v) => setMode(v)} label="Mode" />}
      footer={
        <div>
          {!kbUp ? (
            <LogFavourites
              meals={favourites}
              unit={unit}
              onPick={onFavourite}
              lead={repeat.count > 0 ? <RepeatYesterdayChip kcal={repeat.kcal} count={repeat.count} unit={unit} onRepeat={onRepeat} /> : null}
            />
          ) : null}
          <Button variant="gold" full type="submit" form={FORM_ID} disabled={!canLog} aria-disabled={!canLog} data-testid="tp-log-submit">
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
      <LogRecents entries={recents} unit={unit} onRelog={onRelog} onEditFirst={onEditFirst} onHide={onHide} limit={RECENT_LIMIT} risingKey={risingKey} />
    </Sheet>
  )
}
