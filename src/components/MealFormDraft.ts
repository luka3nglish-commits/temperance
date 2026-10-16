/**
 * The half-typed LOG sheet, kept across a reload.
 *
 * iPhone Safari can reload the page under an open sheet: a downward swipe that reaches the page
 * (pull to refresh in a Safari tab), or iOS reclaiming the page while he checks a label in another
 * app. The form lives in React state, so the meal he was typing was lost and he had to start again.
 * LogSheet saves its form here on every edit while the sheet is open, forgets it the moment a meal is
 * logged or the sheet is closed on purpose, and after a reload opens the sheet again with it.
 *
 * Storage: localStorage `temperance.logDraft` = { v, at, unit, restores, mode, draft, rows, buildName,
 * buildSave }. localStorage, not sessionStorage: a home screen app relaunched after iOS evicted it
 * does not keep its session. `at` is the last edit; a draft older than 30 minutes, typed in the other
 * energy unit, malformed or empty is dropped. `restores` counts the boots that reopened it without
 * an edit since; after LOG_DRAFT_MAX_RESTORES it is dropped, so a sheet that itself crashed the page
 * can never hold a crash loop open (the boot guard in index.html handles the page itself).
 * Every storage call is guarded: without storage nothing is kept and nothing breaks.
 */
import type { AmountUnit, EnergyUnit, Macros } from '../lib/types'
import { EMPTY_DRAFT, amountFor, rekeyRows, type BuildRow, type DraftSource, type QuickDraft } from './MealForm'

export const LOG_DRAFT_KEY = 'temperance.logDraft'
/** A draft not edited for this long is not the meal he is still logging. */
export const LOG_DRAFT_MAX_AGE_MS = 30 * 60_000
/** Boots that may reopen the same unedited draft. */
export const LOG_DRAFT_MAX_RESTORES = 3
/** A saved time this far past the clock is a clock change, not a draft. */
const CLOCK_SKEW_MS = 60_000
const VERSION = 1

export type LogMode = 'quick' | 'build'

/** The sheet's form: what LogSheet holds in state. */
export type LogDraftState = {
  mode: LogMode
  draft: QuickDraft
  rows: BuildRow[]
  buildName: string
  buildSave: boolean | null
}

type StoredRow = Omit<BuildRow, 'key'>
type Content = { mode: LogMode; draft: QuickDraft; rows: StoredRow[]; buildName: string; buildSave: boolean | null }
type Stored = Content & { v: number; at: number; unit: EnergyUnit; restores: number }

const BASES: readonly AmountUnit[] = ['serve', 'g', 'ml']

// ---------- storage ----------

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function readRaw(): unknown {
  try {
    const raw = storage()?.getItem(LOG_DRAFT_KEY)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function write(s: Stored): void {
  try {
    storage()?.setItem(LOG_DRAFT_KEY, JSON.stringify(s))
  } catch {
    /* full or blocked: nothing is kept */
  }
}

function remove(): void {
  try {
    storage()?.removeItem(LOG_DRAFT_KEY)
  } catch {
    /* blocked */
  }
}

// ---------- reading untrusted storage ----------

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const isBasis = (x: unknown): x is AmountUnit => BASES.includes(x as AmountUnit)

function readMacros(x: unknown): Macros | null {
  if (!isObj(x) || !isNum(x.kcal) || !isNum(x.protein) || !isNum(x.carbs) || !isNum(x.fat)) return null
  return { kcal: x.kcal, protein: x.protein, carbs: x.carbs, fat: x.fat }
}

function readSource(x: unknown): DraftSource | null {
  if (!isObj(x) || typeof x.mealId !== 'string' || typeof x.name !== 'string' || !isBasis(x.basis)) return null
  const macros = readMacros(x.macros)
  if (!macros) return null
  return { mealId: x.mealId, name: x.name, macros, basis: x.basis, ...(isNum(x.usual) && x.usual > 0 ? { usual: x.usual } : {}) }
}

/** The QUICK draft in a fixed key order (the order `sameContent` compares in). */
function readDraft(x: unknown): QuickDraft | null {
  if (!isObj(x)) return null
  const { name, energy, protein, carbs, fat, basis } = x
  if (typeof name !== 'string' || typeof energy !== 'string' || typeof protein !== 'string' || typeof carbs !== 'string' || typeof fat !== 'string') return null
  if (!isBasis(basis)) return null
  return {
    name,
    energy,
    basis,
    amount: amountFor(basis, isNum(x.amount) ? x.amount : undefined),
    protein,
    carbs,
    fat,
    source: readSource(x.source),
    saveOverride: typeof x.saveOverride === 'boolean' ? x.saveOverride : null,
  }
}

function readRow(x: unknown): StoredRow | null {
  if (!isObj(x)) return null
  const { ingredientId, name, amount, unit, perAmount, removed } = x
  if (typeof ingredientId !== 'string' || typeof name !== 'string' || typeof amount !== 'string' || !isBasis(unit)) return null
  if (!isNum(perAmount) || perAmount <= 0 || typeof removed !== 'boolean') return null
  const perMacros = readMacros(x.perMacros)
  if (!perMacros) return null
  return { ingredientId, name, amount, unit, perMacros, perAmount, removed }
}

function readContent(x: Record<string, unknown>): Content | null {
  const mode = x.mode === 'quick' || x.mode === 'build' ? x.mode : null
  const draft = readDraft(x.draft)
  if (!mode || !draft) return null
  const rows = Array.isArray(x.rows) ? x.rows.map(readRow).filter((r): r is StoredRow => r !== null) : []
  return {
    mode,
    draft,
    rows,
    buildName: typeof x.buildName === 'string' ? x.buildName : '',
    buildSave: typeof x.buildSave === 'boolean' ? x.buildSave : null,
  }
}

function readStored(): Stored | null {
  const x = readRaw()
  if (!isObj(x) || x.v !== VERSION || !isNum(x.at) || !isNum(x.restores) || (x.unit !== 'kcal' && x.unit !== 'kJ')) return null
  const content = readContent(x)
  return content ? { v: VERSION, at: x.at, unit: x.unit, restores: x.restores, ...content } : null
}

// ---------- content ----------

/** The form as stored: rows without their keys, every object in a fixed key order. */
function contentOf(s: LogDraftState): Content {
  return readContent({ ...s, rows: s.rows.map(({ key: _key, ...row }) => row) }) ?? { mode: s.mode, draft: EMPTY_DRAFT, rows: [], buildName: '', buildSave: null }
}

const sameContent = (a: Content, b: Content) =>
  JSON.stringify([a.mode, a.draft, a.rows, a.buildName, a.buildSave]) === JSON.stringify([b.mode, b.draft, b.rows, b.buildName, b.buildSave])

/** True when the sheet holds something he typed or picked: a QUICK field, a portion, a picked meal, a BUILD row or name. */
export function hasLogDraftContent(s: { draft: QuickDraft; rows: readonly object[]; buildName: string }): boolean {
  const d = s.draft
  const typed = [d.name, d.energy, d.protein, d.carbs, d.fat].some((v) => v.trim() !== '')
  const portion = d.basis !== EMPTY_DRAFT.basis || d.amount !== EMPTY_DRAFT.amount
  return typed || portion || d.source !== null || s.rows.length > 0 || s.buildName.trim() !== ''
}

// ---------- the API LogSheet uses ----------

/**
 * Keep the open sheet's form. An empty form forgets the old draft. The same content as the stored
 * draft (the restored sheet rendering what it was given) is not an edit: the time and the restore
 * count stay, so an untouched draft still runs out.
 */
export function saveLogDraft(s: LogDraftState, unit: EnergyUnit, now: number = Date.now()): void {
  boot = { state: null }
  if (!hasLogDraftContent(s)) {
    remove()
    return
  }
  const content = contentOf(s)
  const prev = readStored()
  if (prev && prev.unit === unit && sameContent(prev, content)) return
  write({ v: VERSION, at: now, unit, restores: 0, ...content })
}

/** Forget the draft: a meal was logged, or the sheet was closed on purpose. */
export function clearLogDraft(): void {
  boot = { state: null }
  remove()
}

/**
 * The draft a reload interrupted, or null. Counts this boot as a restore. Anything stale, empty,
 * in the other unit, malformed or past the restore limit is removed and gives null.
 */
export function takeLogDraft(unit: EnergyUnit, now: number = Date.now()): LogDraftState | null {
  const s = readStored()
  if (!s) {
    remove()
    return null
  }
  const fresh = now - s.at <= LOG_DRAFT_MAX_AGE_MS && s.at - now <= CLOCK_SKEW_MS
  if (!fresh || s.unit !== unit || s.restores >= LOG_DRAFT_MAX_RESTORES || !hasLogDraftContent(s)) {
    remove()
    return null
  }
  write({ ...s, restores: s.restores + 1 })
  return { mode: s.mode, draft: s.draft, rows: rekeyRows(s.rows), buildName: s.buildName, buildSave: s.buildSave }
}

// one read per page load: React StrictMode runs state initializers twice, and only the first boot counts
let boot: { state: LogDraftState | null } | null = null

/** The draft to open the sheet with at launch: read once per page load, null once anything is saved or cleared. */
export function bootLogDraft(unit: EnergyUnit): LogDraftState | null {
  if (!boot) boot = { state: takeLogDraft(unit) }
  return boot.state
}

/** Test seam: a fresh page load. */
export function resetLogDraftBootForTests(): void {
  boot = null
}
