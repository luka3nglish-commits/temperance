/**
 * The crash-loop guard's app half. The decision itself is the inline `<script id="tp-boot">` in
 * index.html, which runs before any stylesheet or module and writes the result on <html>:
 *
 *   data-safe="0|1|2"    the safe level (1 after a crash, 2 after a crash in safe mode)
 *   data-gl="0"          no WebGL context at all: the SVG monument
 *   data-fx="0"          flat gold, no blend, filter, will-change, animation or transition (index.css)
 *   data-sweep="0"       no moving gold: no tilt loop and no opening sweeps
 *   data-intro="0"       no opening: the home screen is the final frame at once
 *   data-bare="1"        level 2: no backdrop and no shards either
 *
 * and `window.__tpBoot = { level, flags, reason }`. These readers look at the attributes on every
 * call (they never change during a session, and tests flip them between cases).
 *
 * Storage: localStorage `temperance.boot` = { at, stable, level } (this boot), `temperance.safe` =
 * { level, at } (sticky for 14 days), sessionStorage `temperance.flags` (the URL switches).
 */

export const BOOT_KEY = 'temperance.boot'
export const SAFE_KEY = 'temperance.safe'
export const FLAGS_KEY = 'temperance.flags'
/**
 * A boot that lives this long (or is left on purpose: pagehide, hidden) is not a crash. 30 s, not
 * less: the WebKit style-cache bug behind the iOS crash grew memory at about 190 MB/s, so a crash can
 * land well after the first seconds, and leaving the page marks it stable at once anyway.
 */
export const STABLE_MS = 30000

export type BootReason = 'crash' | 'sticky' | 'url' | 'none'
export type BootInfo = { level: number; flags: Record<string, string>; reason: BootReason }
export type Feature = 'gl' | 'fx' | 'sweep' | 'intro'

declare global {
  interface Window {
    __tpBoot?: BootInfo
  }
}

function data(): DOMStringMap | null {
  try {
    return typeof document !== 'undefined' ? document.documentElement.dataset : null
  } catch {
    return null
  }
}

/** 0 (full), 1 (safe) or 2 (bare). */
export function safeLevel(): number {
  const v = data()?.safe
  return v === '2' ? 2 : v === '1' ? 1 : 0
}

/** True when the boot guard switched this feature off (a URL switch or any safe level). */
export function featureOff(name: Feature): boolean {
  return data()?.[name] === '0'
}

/** Level 2: no backdrop and no shards. */
export function isBare(): boolean {
  return data()?.bare === '1'
}

/** What the boot guard decided, for tests and the console (`window.__tp.boot`). */
export function bootInfo(): BootInfo {
  const b = typeof window !== 'undefined' ? window.__tpBoot : undefined
  return b ?? { level: safeLevel(), flags: {}, reason: 'none' }
}

/** Mark this boot stable: the next launch is not a crash recovery. Keeps the level. */
export function markBootStable(): void {
  try {
    const raw = localStorage.getItem(BOOT_KEY)
    const prev = raw ? (JSON.parse(raw) as { at?: unknown; level?: unknown } | null) : null
    const at = prev && typeof prev.at === 'number' ? prev.at : Date.now()
    const level = prev && typeof prev.level === 'number' ? prev.level : safeLevel()
    localStorage.setItem(BOOT_KEY, JSON.stringify({ at, stable: true, level }))
  } catch {
    /* no storage: the guard could not have recorded the boot either */
  }
}

/**
 * Mark the boot stable after `ms`, or at once when the person leaves (pagehide, or the page going
 * hidden): leaving is not a crash. Everything is removed once marked. Returns the cancel function.
 */
export function installStableMark(ms: number = STABLE_MS): () => void {
  if (typeof window === 'undefined') return () => {}
  let done = false
  let timer = 0
  const cleanup = () => {
    window.clearTimeout(timer)
    window.removeEventListener('pagehide', mark)
    document.removeEventListener('visibilitychange', onVisibility)
  }
  function mark() {
    if (done) return
    done = true
    cleanup()
    markBootStable()
  }
  function onVisibility() {
    if (document.visibilityState === 'hidden') mark()
  }
  timer = window.setTimeout(mark, ms)
  window.addEventListener('pagehide', mark)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    done = true
    cleanup()
  }
}

/** TRY FULL MODE: forget the sticky level, this boot and the session switches, then reload at level 0. */
export function tryFullMode(loc: Pick<Location, 'pathname' | 'replace'> = window.location): void {
  try {
    localStorage.removeItem(SAFE_KEY)
    localStorage.removeItem(BOOT_KEY)
  } catch {
    /* no storage */
  }
  try {
    sessionStorage.removeItem(FLAGS_KEY)
  } catch {
    /* no storage */
  }
  loc.replace(`${loc.pathname}?safe=0`)
}
