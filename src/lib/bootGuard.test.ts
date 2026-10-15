// @vitest-environment jsdom
/**
 * The crash-loop guard: the inline `<script id="tp-boot">` in index.html, extracted by its id and run
 * against fake storage and a fake location, exactly as the browser runs it before any module.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const HTML = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')

function extractBootScript(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const el = doc.getElementById('tp-boot')
  if (!el || !el.textContent) throw new Error('no <script id="tp-boot"> in index.html')
  return el.textContent
}

const BOOT_SRC = extractBootScript(HTML)
const run = new Function('window', 'document', BOOT_SRC) as (w: FakeWindow, d: { documentElement: HTMLElement }) => void

const NOW = Date.UTC(2026, 9, 15, 9, 0, 0)
const DAY = 86_400_000

class MemoryStorage {
  map = new Map<string, string>()
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v))
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  json(k: string) {
    const v = this.getItem(k)
    return v === null ? null : JSON.parse(v)
  }
}

type FakeWindow = {
  localStorage?: unknown
  sessionStorage?: unknown
  location: { search: string }
  __tpBoot?: { level: number; flags: Record<string, string>; reason: string }
}

let local: MemoryStorage
let session: MemoryStorage
let root: HTMLElement

function boot(search = '', w: Partial<FakeWindow> = {}): FakeWindow & { root: HTMLElement } {
  root = document.createElement('html')
  const win: FakeWindow = { localStorage: local, sessionStorage: session, location: { search }, ...w }
  run(win, { documentElement: root })
  return Object.assign(win, { root })
}

/** what main.tsx does once stable: the last boot did not crash */
const settle = () => {
  const b = local.json('temperance.boot')
  if (b) local.setItem('temperance.boot', JSON.stringify({ ...b, stable: true }))
}

const attrs = (el: HTMLElement) => ({
  safe: el.getAttribute('data-safe'),
  gl: el.getAttribute('data-gl'),
  fx: el.getAttribute('data-fx'),
  sweep: el.getAttribute('data-sweep'),
  intro: el.getAttribute('data-intro'),
  bare: el.getAttribute('data-bare'),
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  local = new MemoryStorage()
  session = new MemoryStorage()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('tp-boot script', () => {
  it('sits in <head> right after the charset meta, before any stylesheet, font or module', () => {
    const head = HTML.slice(HTML.indexOf('<head>'), HTML.indexOf('</head>'))
    const charset = head.indexOf('<meta charset')
    const script = head.indexOf('<script id="tp-boot">')
    expect(charset).toBeGreaterThan(-1)
    expect(script).toBeGreaterThan(charset)
    // nothing but whitespace between the charset meta and the guard
    expect(head.slice(head.indexOf('>', charset) + 1, script).trim()).toBe('')
    expect(head.indexOf('<link')).toBeGreaterThan(script)
    // a classic script: no type=module, no let/const/arrow (it must parse anywhere)
    expect(BOOT_SRC).not.toMatch(/\b(let|const)\s|=>|`/)
  })

  it('a fresh load is level 0 and records an unstable boot', () => {
    const w = boot()
    expect(w.__tpBoot).toEqual({ level: 0, flags: {}, reason: 'none' })
    expect(attrs(w.root)).toEqual({ safe: '0', gl: null, fx: null, sweep: null, intro: null, bare: null })
    expect(local.json('temperance.boot')).toEqual({ at: NOW, stable: false, level: 0 })
    expect(local.getItem('temperance.safe')).toBeNull()
  })

  it('a recent unstable boot means a crash: level 1, everything off, sticky written', () => {
    local.setItem('temperance.boot', JSON.stringify({ at: NOW - 2_000, stable: false, level: 0 }))
    const w = boot()
    expect(w.__tpBoot).toMatchObject({ level: 1, reason: 'crash' })
    expect(attrs(w.root)).toEqual({ safe: '1', gl: '0', fx: '0', sweep: '0', intro: '0', bare: null })
    expect(local.json('temperance.boot')).toEqual({ at: NOW, stable: false, level: 1 })
    expect(local.json('temperance.safe')).toEqual({ level: 1, at: NOW })
  })

  it('a crash at level 1 steps up to 2 (bare), and 2 is the ceiling', () => {
    local.setItem('temperance.boot', JSON.stringify({ at: NOW - 5_000, stable: false, level: 1 }))
    let w = boot()
    expect(w.__tpBoot).toMatchObject({ level: 2, reason: 'crash' })
    expect(attrs(w.root)).toEqual({ safe: '2', gl: '0', fx: '0', sweep: '0', intro: '0', bare: '1' })
    expect(local.json('temperance.safe')).toEqual({ level: 2, at: NOW })

    vi.setSystemTime(NOW + 3_000)
    w = boot()
    expect(w.__tpBoot).toMatchObject({ level: 2, reason: 'crash' })
  })

  it('an unstable boot older than 90 s is not a crash, nor is a stable one', () => {
    local.setItem('temperance.boot', JSON.stringify({ at: NOW - 90_001, stable: false, level: 0 }))
    expect(boot().__tpBoot).toMatchObject({ level: 0, reason: 'none' })
    local.setItem('temperance.boot', JSON.stringify({ at: NOW - 2_000, stable: true, level: 0 }))
    expect(boot().__tpBoot).toMatchObject({ level: 0, reason: 'none' })
    // a clock that went backwards is not a crash either
    local.setItem('temperance.boot', JSON.stringify({ at: NOW + 60_000, stable: false, level: 0 }))
    expect(boot().__tpBoot).toMatchObject({ level: 0, reason: 'none' })
  })

  it('honours the sticky level for 14 days without refreshing its date, then drops it', () => {
    local.setItem('temperance.safe', JSON.stringify({ level: 1, at: NOW - 13 * DAY }))
    local.setItem('temperance.boot', JSON.stringify({ at: NOW - DAY, stable: true, level: 1 }))
    const w = boot()
    expect(w.__tpBoot).toMatchObject({ level: 1, reason: 'sticky' })
    expect(attrs(w.root).gl).toBe('0')
    expect(local.json('temperance.safe')).toEqual({ level: 1, at: NOW - 13 * DAY })

    vi.setSystemTime(NOW + DAY)
    const later = boot()
    expect(later.__tpBoot).toMatchObject({ level: 0, reason: 'none' })
    expect(attrs(later.root).gl).toBeNull()
    expect(local.getItem('temperance.safe')).toBeNull()
  })

  it('a crash beats a lower sticky level', () => {
    local.setItem('temperance.safe', JSON.stringify({ level: 1, at: NOW - DAY }))
    local.setItem('temperance.boot', JSON.stringify({ at: NOW - 3_000, stable: false, level: 1 }))
    expect(boot().__tpBoot).toMatchObject({ level: 2, reason: 'crash' })
    expect(local.json('temperance.safe')).toEqual({ level: 2, at: NOW })
  })

  it('?safe=0 deletes the sticky key and forces level 0, once', () => {
    local.setItem('temperance.safe', JSON.stringify({ level: 2, at: NOW - DAY }))
    const w = boot('?safe=0')
    expect(w.__tpBoot).toEqual({ level: 0, flags: { safe: '0' }, reason: 'url' })
    expect(attrs(w.root)).toEqual({ safe: '0', gl: null, fx: null, sweep: null, intro: null, bare: null })
    expect(local.getItem('temperance.safe')).toBeNull()
    // safe=0 is never kept for the tab: a tab left on it would clear the sticky level on every
    // reload and flip between a crash and safe mode
    expect(session.json('temperance.flags')).toEqual({})

    // a plain reload after it stays at 0 (nothing sticky is left)
    settle()
    expect(boot('').__tpBoot).toMatchObject({ level: 0, reason: 'none' })
    // and a crash after full mode was tried makes safe mode stick again
    local.setItem('temperance.boot', JSON.stringify({ at: NOW - 2_000, stable: false, level: 0 }))
    expect(boot('').__tpBoot).toMatchObject({ level: 1, reason: 'crash' })
    settle()
    expect(boot('').__tpBoot).toMatchObject({ level: 1, reason: 'sticky' })
  })

  it('a crash during a ?safe=0 session still steps up, so the tab can never loop', () => {
    local.setItem('temperance.boot', JSON.stringify({ at: NOW - 2_000, stable: false, level: 0 }))
    expect(boot('?safe=0').__tpBoot).toMatchObject({ level: 1, reason: 'crash' })
  })

  it('?safe=1 and ?safe=2 force that level for the tab, never sticky', () => {
    let w = boot('?safe=1')
    expect(w.__tpBoot).toMatchObject({ level: 1, reason: 'url', flags: { safe: '1' } })
    expect(attrs(w.root)).toEqual({ safe: '1', gl: '0', fx: '0', sweep: '0', intro: '0', bare: null })
    // a URL test is not a crash: nothing sticks beyond this tab
    expect(local.getItem('temperance.safe')).toBeNull()
    expect(session.json('temperance.flags')).toEqual({ safe: '1' })

    session = new MemoryStorage()
    local = new MemoryStorage()
    w = boot('?safe=2')
    expect(w.__tpBoot).toMatchObject({ level: 2, reason: 'url' })
    expect(attrs(w.root).bare).toBe('1')
  })

  it('parses every feature switch, ignores other parameters, and keeps them for the tab', () => {
    const w = boot('?utm=x&gl=0&fx=0&sweep=0&intro=0&foo=1')
    expect(w.__tpBoot).toEqual({ level: 0, flags: { gl: '0', fx: '0', sweep: '0', intro: '0' }, reason: 'none' })
    expect(attrs(w.root)).toEqual({ safe: '0', gl: '0', fx: '0', sweep: '0', intro: '0', bare: null })
    expect(session.json('temperance.flags')).toEqual({ gl: '0', fx: '0', sweep: '0', intro: '0' })

    // each one alone
    for (const name of ['gl', 'fx', 'sweep', 'intro'] as const) {
      settle()
      session = new MemoryStorage()
      const one = boot(`?${name}=0`)
      const a = attrs(one.root)
      expect(a[name]).toBe('0')
      expect(Object.entries(a).filter(([k, v]) => k !== name && k !== 'safe' && v !== null)).toEqual([])
    }
  })

  it('a reload keeps the session switches, and the URL wins over them', () => {
    session.setItem('temperance.flags', JSON.stringify({ gl: '0', fx: '0', evil: '1' }))
    let w = boot('')
    expect(w.__tpBoot!.flags).toEqual({ gl: '0', fx: '0' })
    expect(attrs(w.root)).toMatchObject({ gl: '0', fx: '0', sweep: null })

    settle()
    w = boot('?fx=1&sweep=0')
    expect(w.__tpBoot!.flags).toEqual({ gl: '0', fx: '1', sweep: '0' })
    expect(attrs(w.root)).toMatchObject({ gl: '0', fx: null, sweep: '0' })
    expect(session.json('temperance.flags')).toEqual({ gl: '0', fx: '1', sweep: '0' })
  })

  it('storage that throws boots at level 0 without throwing, and URL switches still apply', () => {
    const throwing = {}
    Object.defineProperty(throwing, 'localStorage', { get: () => { throw new Error('SecurityError') } })
    Object.defineProperty(throwing, 'sessionStorage', { get: () => { throw new Error('SecurityError') } })
    const win = Object.assign(throwing, { location: { search: '?gl=0' } }) as FakeWindow
    root = document.createElement('html')
    expect(() => run(win, { documentElement: root })).not.toThrow()
    expect(win.__tpBoot).toEqual({ level: 0, flags: { gl: '0' }, reason: 'none' })
    expect(attrs(root)).toMatchObject({ safe: '0', gl: '0' })

    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    const w = boot('', { localStorage: broken, sessionStorage: broken })
    expect(w.__tpBoot).toEqual({ level: 0, flags: {}, reason: 'none' })
    expect(attrs(w.root).safe).toBe('0')
  })

  it('garbage in storage is ignored', () => {
    local.setItem('temperance.boot', '{not json')
    local.setItem('temperance.safe', '"nope"')
    session.setItem('temperance.flags', '[1,2]')
    expect(boot().__tpBoot).toEqual({ level: 0, flags: {}, reason: 'none' })
  })
})
