// Drive the production preview in the locally installed Chrome and capture evidence.
//   node scripts/verify.mjs [--url http://127.0.0.1:4173/temperance/] [--headed] [--nowebgl] [--reduced] [--out .tmp/shots]
// Writes PNG screenshots plus summary.json (console errors, failed requests, test-hook presence, store state).
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const has = (name) => args.includes(name)

const URL = opt('--url', 'http://127.0.0.1:4173/temperance/')
const OUT = resolve(opt('--out', '.tmp/shots'))
const HEADED = has('--headed')
const NOWEBGL = has('--nowebgl')
const REDUCED = has('--reduced')
const CHROME = opt('--chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
mkdirSync(OUT, { recursive: true })

const summary = { url: URL, mode: { headed: HEADED, nowebgl: NOWEBGL, reduced: REDUCED }, errors: [], warnings: [], failedRequests: [], steps: [], hooks: {}, store: {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let shotIndex = 0
const shot = async (page, name) => {
  const file = `${String(++shotIndex).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: resolve(OUT, file) })
  summary.steps.push({ step: name, file })
  return file
}
const step = async (name, fn) => {
  try {
    const r = await fn()
    summary.steps.push({ step: name, ok: true, info: r ?? null })
  } catch (e) {
    summary.steps.push({ step: name, ok: false, error: String(e && e.message ? e.message : e) })
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: HEADED ? false : true,
  defaultViewport: null,
  args: [
    '--window-size=430,960',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--use-angle=default',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=TranslateUI',
    ...(NOWEBGL ? ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] : []),
  ],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  if (REDUCED) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  if (NOWEBGL) {
    await page.evaluateOnNewDocument(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return orig.call(this, type, ...rest)
      }
    })
  }
  page.on('console', (m) => {
    const t = m.type()
    const text = m.text()
    if (t === 'error') summary.errors.push(text)
    else if (t === 'warning' || t === 'warn') summary.warnings.push(text)
  })
  page.on('pageerror', (e) => summary.errors.push('pageerror: ' + (e && e.message ? e.message : String(e))))
  page.on('requestfailed', (r) => summary.failedRequests.push({ url: r.url(), reason: r.failure() && r.failure().errorText }))
  page.on('response', (r) => {
    if (r.status() >= 400) summary.failedRequests.push({ url: r.url(), status: r.status() })
  })

  // ---- the opening, as a flipbook ----
  const t0 = Date.now()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  for (let i = 0; i < 9; i++) {
    await shot(page, `opening-${Date.now() - t0}ms`)
    await sleep(220)
  }
  await sleep(600)
  await shot(page, 'home-after-opening')

  await step('hooks', async () => {
    const h = await page.evaluate(() => {
      const q = (s) => document.querySelector(s)
      const ids = [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid'))
      const marks = performance.getEntriesByType('mark').map((m) => `${m.name}@${Math.round(m.startTime)}`)
      const mon = q('[data-testid=tp-monument]')
      const col = q('[data-testid=tp-column]')
      const op = q('[data-testid=tp-opening]')
      return {
        tier: document.documentElement.dataset.tier ?? null,
        introDone: document.documentElement.dataset.introDone ?? null,
        marks,
        monument: mon ? { mode: mon.getAttribute('data-mode'), ready: mon.getAttribute('data-ready') } : null,
        column: col ? { h: col.getAttribute('data-h') } : null,
        opening: op ? { state: op.getAttribute('data-state') } : null,
        goalY: getComputedStyle(document.documentElement).getPropertyValue('--goal-y').trim(),
        plinthY: getComputedStyle(document.documentElement).getPropertyValue('--plinth-y').trim(),
        classes: document.documentElement.className,
        testids: [...new Set(ids)].sort(),
        fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
        innerWidth: innerWidth,
        innerHeight: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        canvas: !!q('canvas'),
      }
    })
    summary.hooks = h
    return h
  })

  // ---- log a quick meal through the sheet ----
  const inputByLabel = async (label) => {
    const handle = await page.evaluateHandle((label) => {
      const dlg = document.querySelector('[role=dialog]') || document
      const labels = [...dlg.querySelectorAll('label')]
      const l = labels.find((x) => x.textContent.trim().toLowerCase() === label.toLowerCase())
      if (!l) return null
      const id = l.getAttribute('for')
      return id ? document.getElementById(id) : l.querySelector('input')
    }, label)
    const el = handle.asElement()
    if (!el) throw new Error(`no input labelled ${label}`)
    return el
  }
  const clickByText = async (text, within = 'body') => {
    const ok = await page.evaluate(
      (text, within) => {
        const root = document.querySelector(within) || document.body
        const els = [...root.querySelectorAll('button, [role=button], [role=tab]')]
        const el = els.find((b) => (b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase() === text.toLowerCase())
        if (!el) return false
        el.click()
        return true
      },
      text,
      within,
    )
    if (!ok) throw new Error(`no control named ${text}`)
  }

  await step('seed-yesterday', async () => {
    // one meal logged yesterday so the REPEAT YESTERDAY chip and the history rows have something
    return page.evaluate(() => {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      y.setHours(12, 30, 0, 0)
      const e = window.__tp.store.getState().logQuick({ name: 'Oats and whey', macros: { kcal: 410, protein: 32, carbs: 48, fat: 9 } }, y.getTime())
      return { day: e.day, kcal: e.macros.kcal }
    })
  })

  await step('open-log-sheet', async () => {
    await clickByText('Log a meal')
    await sleep(450)
    await shot(page, 'log-sheet-open')
    return page.evaluate(() => !!document.querySelector('[data-testid=tp-repeat-yesterday]'))
  })

  await step('fill-quick-meal', async () => {
    const name = await inputByLabel('Name')
    await name.click()
    await name.type('Chicken and rice', { delay: 20 })
    const kcal = await inputByLabel('Calories')
    await kcal.click()
    await kcal.type('612', { delay: 40 })
    const p = await inputByLabel('Protein')
    await p.click()
    await p.type('42', { delay: 30 })
    const c = await inputByLabel('Carbs')
    await c.click()
    await c.type('68', { delay: 30 })
    const f = await inputByLabel('Fat')
    await f.click()
    await f.type('14', { delay: 30 })
    await sleep(250)
    await shot(page, 'log-sheet-filled')
  })

  await step('submit-strike', async () => {
    const submitted = await page.evaluate(() => {
      const byId = document.querySelector('[data-testid=tp-log-submit]')
      if (byId) {
        byId.click()
        return 'testid'
      }
      const dlg = document.querySelector('[role=dialog]')
      const btns = [...(dlg || document).querySelectorAll('button')]
      const b = btns.find((x) => x.textContent.trim().toLowerCase() === 'log' && !x.disabled)
      if (!b) return null
      b.click()
      return 'text'
    })
    if (!submitted) throw new Error('LOG button not found or disabled')
    await sleep(260)
    await shot(page, 'strike-260ms')
    await sleep(420)
    await shot(page, 'strike-680ms')
    await sleep(900)
    await shot(page, 'strike-settled')
    return submitted
  })

  await step('store-after-log', async () => {
    const s = await page.evaluate(() => {
      const st = window.__tp.store.getState()
      const col = document.querySelector('[data-testid=tp-column]')
      return { entries: st.entries.length, meals: Object.keys(st.meals).length, lastKcal: st.entries.at(-1)?.macros.kcal, columnH: col?.getAttribute('data-h'), persisted: !!localStorage.getItem('temperance.v1') }
    })
    summary.store.afterLog = s
    return s
  })

  await step('recents-row', async () => {
    await clickByText('Log a meal')
    await sleep(450)
    await shot(page, 'log-sheet-recents')
    await page.keyboard.press('Escape')
    await sleep(300)
  })

  await step('today-sheet', async () => {
    const opened = await page.evaluate(() => {
      const el = document.querySelector('[data-testid=tp-eaten-value]')
      if (!el) return false
      el.click()
      return true
    })
    if (!opened) throw new Error('tp-eaten-value not found')
    await sleep(450)
    await shot(page, 'today-sheet')
    await page.keyboard.press('Escape')
    await sleep(300)
  })

  for (const tab of ['Library', 'History', 'Settings']) {
    await step(`tab-${tab}`, async () => {
      await clickByText(tab)
      await sleep(700)
      await shot(page, `tab-${tab.toLowerCase()}`)
      if (tab === 'Settings') {
        await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 99999 }))
        await sleep(300)
        await shot(page, 'tab-settings-bottom')
      }
      if (tab === 'History') {
        // BODY: weight log plus a photo
        const switched = await page.evaluate(() => {
          const radios = [...document.querySelectorAll('[data-testid=tp-history-mode] [role=radio]')]
          const body = radios.find((r) => r.textContent.trim().toLowerCase() === 'body')
          if (!body) return false
          body.click()
          return true
        })
        if (!switched) throw new Error('BODY switch not found')
        await sleep(600)
        await shot(page, 'history-body-empty')
        await page.evaluate(() => {
          const y = new Date()
          y.setDate(y.getDate() - 1)
          window.__tp.store.getState().addWeight(85.4, undefined, y.getTime() - 86400000 * 0)
        })
        const input = await page.$('[data-testid=tp-weight-input]')
        if (!input) throw new Error('tp-weight-input not found')
        await input.click()
        await input.type('84.6', { delay: 40 })
        await page.click('[data-testid=tp-weight-log]')
        await sleep(600)
        await shot(page, 'history-body-weight')
        const fileInput = await page.$('[data-testid=tp-photo-add]')
        if (!fileInput) throw new Error('tp-photo-add not found')
        await fileInput.uploadFile(resolve(OUT, '10-home-after-opening.png'))
        await sleep(1800)
        await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 99999 }))
        await sleep(400)
        await shot(page, 'history-body-photo')
        const tile = await page.$('[data-testid^="tp-photo-"][data-testid$="-tile"], [data-testid=tp-photo-grid] button, [data-testid=tp-photo-grid] [role=button]')
        if (tile) {
          await tile.click()
          await sleep(600)
          await shot(page, 'history-photo-viewer')
          await page.keyboard.press('Escape')
          await sleep(300)
        }
        await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 0 }))
      }
    })
  }

  await step('over-the-line', async () => {
    await clickByText('Today')
    await sleep(500)
    await page.evaluate(() => window.__tp.store.getState().setGoalKcal(900))
    await sleep(800)
    await shot(page, 'goal-900-before')
    await page.evaluate(() => window.__tp.store.getState().logQuick({ name: 'Kebab', macros: { kcal: 850, protein: 40, carbs: 70, fat: 42 }, servings: 1 }))
    await sleep(300)
    await shot(page, 'over-strike-300ms')
    await sleep(600)
    await shot(page, 'over-strike-900ms')
    await sleep(1400)
    await shot(page, 'over-settled')
    const s = await page.evaluate(() => {
      const st = window.__tp.store.getState()
      const col = document.querySelector('[data-testid=tp-column]')
      const label = document.querySelector('[data-testid=tp-hero-label]')?.textContent
      const num = document.querySelector('[data-testid=tp-hero-number]')?.getAttribute('aria-label')
      return { pulseOver: st.pulse?.over, columnH: col?.getAttribute('data-h'), label, num }
    })
    summary.store.over = s
    return s
  })

  await step('desktop-slab', async () => {
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false })
    await sleep(600)
    await shot(page, 'desktop-1280')
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  })

  await step('short-phone', async () => {
    await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await sleep(600)
    await shot(page, 'short-360x640')
    const sw = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }))
    return sw
  })
} finally {
  await browser.close()
  writeFileSync(resolve(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
  const errs = summary.errors.length
  const fails = summary.steps.filter((s) => s.ok === false).length
  console.log(JSON.stringify({ out: OUT, shots: shotIndex, consoleErrors: errs, failedRequests: summary.failedRequests.length, failedSteps: fails, tier: summary.hooks.tier, monument: summary.hooks.monument, introDone: summary.hooks.introDone, marks: summary.hooks.marks }, null, 1))
}
