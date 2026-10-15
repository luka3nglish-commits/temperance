// A full visual tour of Temperance with realistic data: seeds two weeks of meals, a library,
// weigh-ins and progress photos, then screenshots every screen and state.
//
//   node scripts/tour.mjs --url http://127.0.0.1:4173/temperance/ --out .tmp/tour/before
//   node scripts/tour.mjs --only today,log --out .tmp/tour/mine     (groups: opening today log library history body settings over empty small)
//   flags: --w 390 --h 844 --dpr 2 --nowebgl --reduced --headed
//
// Writes PNGs plus manifest.json (shots, failed steps, console errors, failed requests).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const has = (name) => args.includes(name)
const URL = opt('--url', 'http://127.0.0.1:4173/temperance/')
const OUT = resolve(opt('--out', '.tmp/tour/latest'))
const W = Number(opt('--w', 390))
const H = Number(opt('--h', 844))
const DPR = Number(opt('--dpr', 2))
const ONLY = opt('--only', 'opening,today,log,library,history,body,settings,over,empty,small').split(',')
const want = (g) => ONLY.includes(g)
mkdirSync(OUT, { recursive: true })
const FIX = resolve('.tmp/fixtures')
mkdirSync(FIX, { recursive: true })

const manifest = { url: URL, size: `${W}x${H}@${DPR}`, shots: [], failed: [], errors: [], failedRequests: [] }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: opt('--chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'),
  headless: !has('--headed'),
  defaultViewport: null,
  args: [
    `--window-size=${W + 40},${H + 120}`,
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--use-angle=default',
    '--no-first-run',
    '--no-default-browser-check',
    ...(has('--nowebgl') ? ['--disable-webgl', '--disable-webgl2'] : []),
  ],
})

let n = 0
async function shot(page, name) {
  const file = `${String(++n).padStart(2, '0')}-${name}.png`
  try {
    await page.screenshot({ path: resolve(OUT, file) })
    manifest.shots.push(file)
  } catch (e) {
    manifest.failed.push({ step: `shot ${name}`, error: String(e?.message ?? e) })
  }
}
async function step(name, fn) {
  try {
    await fn()
  } catch (e) {
    manifest.failed.push({ step: name, error: String(e?.message ?? e).slice(0, 300) })
  }
}

async function newPage(w = W, h = H) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: DPR, isMobile: true, hasTouch: true })
  if (has('--reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  if (has('--nowebgl')) {
    await page.evaluateOnNewDocument(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return orig.call(this, type, ...rest)
      }
    })
  }
  page.on('console', (m) => {
    if (m.type() === 'error') manifest.errors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => manifest.errors.push('pageerror: ' + String(e?.message ?? e).slice(0, 300)))
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('favicon')) manifest.failedRequests.push(`${r.status()} ${r.url()}`)
  })
  return page
}

async function waitApp(page) {
  await page.waitForFunction(() => !!window.__tp, { timeout: 15000 })
}

/** quiet relaunch: no opening, settle the scene */
async function quietReload(page, settle = 2200) {
  await page.evaluate(() => sessionStorage.setItem('temperance.seen', String(Date.now())))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitApp(page)
  await sleep(settle)
}

const click = (page, sel) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return false
    el.click()
    return true
  }, sel)

const clickText = (page, text, within = 'body') =>
  page.evaluate(
    (text, within) => {
      const root = document.querySelector(within) || document.body
      const els = [...root.querySelectorAll('button, [role=button], [role=tab], [role=radio], a')]
      const t = text.toLowerCase()
      const el = els.find((b) => (b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase() === t)
      if (!el) return false
      el.click()
      return true
    },
    text,
    within,
  )

/** click a row: the element itself when it is pressable, else its first button inside */
const clickRow = (page, sel) =>
  page.evaluate((sel) => {
    const row = document.querySelector(sel)
    if (!row) return false
    const target = row.matches('button, [role=button]') ? row : row.querySelector('button, [role=button]') || row
    target.click()
    return true
  }, sel)

/** wait for a selector, false on timeout instead of throwing */
const waitFor = (page, sel, timeout = 3000) =>
  page
    .waitForSelector(sel, { timeout })
    .then(() => true)
    .catch(() => false)

const tab = (page, name) => page.evaluate((name) => window.__tp.ui.getState().setTab(name), name)

/** Realistic data: a library, two weeks of meals, three weeks of weigh-ins. Runs in the page. */
async function seed(page) {
  await page.evaluate(() => {
    const s = window.__tp.store.getState()
    s.resetAll()
    s.setGoalKcal(2600)
    s.setTargets({ protein: 190, carbs: 260, fat: 80 })
    s.setTargetWeight(80)
    s.markIntroPlayed()
    const per100 = { amount: 100, unit: 'g' }
    const day = (offset, h, m = 0) => {
      const d = new Date()
      d.setDate(d.getDate() - offset)
      d.setHours(h, m, 0, 0)
      return d.getTime()
    }
    const t0 = day(20, 7)
    const chicken = s.addIngredient({ name: 'Chicken breast', per: per100, macros: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, favourite: true }, t0)
    const rice = s.addIngredient({ name: 'Jasmine rice, cooked', per: per100, macros: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } }, t0)
    const oil = s.addIngredient({ name: 'Olive oil', per: { amount: 10, unit: 'ml' }, macros: { kcal: 88, protein: 0, carbs: 0, fat: 10 } }, t0)
    s.addIngredient({ name: 'Eggs', per: { amount: 1, unit: 'serve' }, macros: { kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3 } }, t0)
    s.addIngredient({ name: 'Rolled oats', per: per100, macros: { kcal: 389, protein: 16.9, carbs: 66, fat: 6.9 } }, t0)
    s.addIngredient({ name: 'Banana', per: { amount: 1, unit: 'serve' }, macros: { kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 } }, t0)
    const comp = (ing, amount) => {
      const k = amount / ing.per.amount
      return { ingredientId: ing.id, name: ing.name, amount, unit: ing.per.unit, macros: { kcal: ing.macros.kcal * k, protein: ing.macros.protein * k, carbs: ing.macros.carbs * k, fat: ing.macros.fat * k } }
    }
    const oats = s.addQuickMeal({ name: 'Oats and whey', macros: { kcal: 410, protein: 32, carbs: 48, fat: 9 }, favourite: true }, t0)
    const bowl = s.addBuiltMeal({ name: 'Chicken and rice bowl', components: [comp(chicken, 200), comp(rice, 250), comp(oil, 10)], favourite: true }, t0)
    const yog = s.addQuickMeal({ name: 'Greek yoghurt', macros: { kcal: 97, protein: 9, carbs: 3.6, fat: 5 }, per: per100, usual: 170 }, t0)
    const shake = s.addQuickMeal({ name: 'Protein shake', macros: { kcal: 160, protein: 30, carbs: 5, fat: 2 }, favourite: true }, t0)
    const steak = s.addQuickMeal({ name: 'Steak and potatoes', macros: { kcal: 780, protein: 58, carbs: 52, fat: 36 } }, t0)
    const kebab = s.addQuickMeal({ name: 'Lamb kebab', macros: { kcal: 850, protein: 40, carbs: 70, fat: 42 } }, t0)
    const salmon = s.addQuickMeal({ name: 'Salmon, greens and rice', macros: { kcal: 640, protein: 42, carbs: 55, fat: 24 } }, t0)
    s.addQuickMeal({ name: 'Peanut butter toast', macros: { kcal: 330, protein: 12, carbs: 30, fat: 18 } }, t0)
    // fourteen past days, some under the line, a few over
    const plans = [
      [oats, bowl, shake, steak],
      [oats, salmon, yog, bowl],
      [oats, bowl, kebab, shake],
      [oats, salmon, steak],
      [oats, bowl, yog, shake, salmon],
      [oats, kebab, steak, shake],
      [oats, bowl, salmon],
    ]
    for (let d = 14; d >= 1; d--) {
      const plan = plans[d % plans.length]
      plan.forEach((meal, i) => {
        const at = day(d, 7 + i * 4, (d * 7) % 50)
        if (meal === yog) s.logMeal(meal.id, { amount: 150 + ((d * 13) % 60), unit: 'g' }, at)
        else s.logMeal(meal.id, i === 1 && d % 3 === 0 ? 1.5 : 1, at)
      })
    }
    // today so far: breakfast, lunch and a yoghurt by grams
    s.logMeal(oats.id, 1, day(0, 7, 40))
    s.logMeal(bowl.id, 1, day(0, 12, 55))
    s.logMeal(yog.id, { amount: 180, unit: 'g' }, day(0, 15, 20))
    // three weeks of weigh-ins drifting down
    for (let d = 21; d >= 0; d--) {
      if (d % 2 === 1 && d !== 1) continue
      const kg = 86.4 - (21 - d) * 0.11 + Math.sin(d * 1.7) * 0.35
      s.addWeight(Math.round(kg * 10) / 10, undefined, day(d, 6, 30))
    }
  })
}

async function makeFixtures(page) {
  const files = []
  for (let i = 0; i < 3; i++) {
    const file = resolve(FIX, `progress-${i + 1}.png`)
    files.push(file)
    if (existsSync(file)) continue
    await page.setContent(
      `<div id="p" style="width:600px;height:800px;background:radial-gradient(60% 50% at 50% 35%,hsl(${30 + i * 8},18%,${26 + i * 4}%),#0b0b0f 75%);display:flex;align-items:flex-end;justify-content:center;font:600 34px Georgia;color:#e7e1d2;letter-spacing:.3em"><div style="position:absolute;left:210px;top:170px;width:180px;height:430px;border-radius:90px 90px 40px 40px;background:linear-gradient(90deg,#1a1714,#3b322a ${40 + i * 6}%,#1a1714)"></div><div style="padding:40px">WEEK ${i * 4 + 1}</div></div>`,
    )
    const el = await page.$('#p')
    await el.screenshot({ path: file })
  }
  return files
}

try {
  // ---------- the opening, fresh profile ----------
  if (want('opening')) {
    await step('opening', async () => {
      const page = await newPage()
      const t = Date.now()
      await page.goto(URL, { waitUntil: 'domcontentloaded' })
      for (const at of [250, 700, 1150, 1600, 2300]) {
        await sleep(Math.max(0, at - (Date.now() - t)))
        await shot(page, `opening-${at}ms`)
      }
      await page.close()
    })
  }

  // ---------- empty states ----------
  if (want('empty')) {
    await step('empty', async () => {
      const page = await newPage()
      await page.goto(URL, { waitUntil: 'domcontentloaded' })
      await waitApp(page)
      await page.evaluate(() => window.__tp.store.getState().markIntroPlayed())
      await quietReload(page)
      await shot(page, 'empty-today')
      await tab(page, 'library')
      await sleep(700)
      await shot(page, 'empty-library')
      await tab(page, 'history')
      await sleep(700)
      await shot(page, 'empty-history')
      await page.close()
    })
  }

  // ---------- the populated app ----------
  const page = await newPage()
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await waitApp(page)
  await seed(page)
  await quietReload(page)

  if (want('today')) {
    await shot(page, 'today')
    await step('today-sheet', async () => {
      if (!(await click(page, '[data-testid=tp-eaten-value]'))) await page.evaluate(() => window.__tp.ui.getState().openToday())
      await sleep(550)
      await shot(page, 'today-sheet')
      await page.evaluate(() => window.__tp.ui.getState().closeToday())
      await sleep(400)
    })
  }

  if (want('log')) {
    await step('log', async () => {
      await page.evaluate(() => window.__tp.ui.getState().openLog())
      await sleep(600)
      await shot(page, 'log-quick-empty')
      const type = async (sel, text) => {
        const el = await page.$(sel)
        if (!el) throw new Error(`missing ${sel}`)
        await el.click({ clickCount: 3 })
        await el.type(text, { delay: 15 })
      }
      await type('[data-testid=tp-log-name]', 'Tuna pasta')
      await type('[data-testid=tp-log-kcal]', '540')
      await type('[data-testid=tp-log-protein]', '38')
      await type('[data-testid=tp-log-carbs]', '62')
      await type('[data-testid=tp-log-fat]', '14')
      await sleep(250)
      await shot(page, 'log-quick-filled')
      // the per 100 g basis, if the form offers it
      if (await clickText(page, 'per 100 g', '[data-testid=tp-log-sheet]')) {
        await sleep(300)
        await shot(page, 'log-quick-per100g')
      }
      await page.evaluate(() => document.querySelector('[data-testid=tp-log-sheet] .overflow-y-auto, #log-sheet-content')?.scrollTo({ top: 9999 }))
      await sleep(350)
      await shot(page, 'log-recents')
      // back to the top of the sheet so BUILD is shot from its first row, not mid-scroll
      await page.evaluate(() => {
        const sheet = document.querySelector('[data-testid=tp-log-sheet]')
        sheet?.querySelectorAll('*').forEach((el) => {
          if (el.scrollTop > 0) el.scrollTop = 0
        })
        document.querySelector('#log-sheet-content')?.scrollTo({ top: 0 })
      })
      await sleep(200)
      if (await clickText(page, 'build', '[data-testid=tp-log-sheet]')) {
        await sleep(400)
        await page.evaluate(() => {
          const sheet = document.querySelector('[data-testid=tp-log-sheet]')
          sheet?.querySelectorAll('*').forEach((el) => {
            if (el.scrollTop > 0) el.scrollTop = 0
          })
        })
        await sleep(150)
        await shot(page, 'log-build')
      }
      await page.evaluate(() => window.__tp.ui.getState().closeLog())
      await sleep(450)
    })
  }

  if (want('library')) {
    await step('library', async () => {
      await tab(page, 'library')
      await sleep(800)
      await shot(page, 'library')
      if (await clickRow(page, '[data-testid^=tp-meal-row-]')) {
        if (!(await waitFor(page, '[data-testid=tp-meal-detail]'))) throw new Error('meal detail sheet did not open')
        await sleep(600)
        await shot(page, 'library-detail')
        // the editor proof is a per 100 g meal (basis switch, PER 100 G tag, USUAL PortionField at 170 g)
        await page.keyboard.press('Escape')
        await sleep(500)
        const yid = await page.evaluate(() => Object.values(window.__tp.store.getState().meals).find((m) => m.name === 'Greek yoghurt')?.id)
        if (yid && (await clickRow(page, `[data-testid=tp-meal-row-${yid}]`)) && (await waitFor(page, '[data-testid=tp-meal-detail]'))) {
          await sleep(600)
          if (await click(page, '[data-testid=tp-meal-detail-edit]')) {
            await sleep(900)
            await shot(page, 'library-editor')
          }
        }
        await page.keyboard.press('Escape')
        await sleep(500)
        await page.keyboard.press('Escape')
        await sleep(500)
      }
    })
  }

  if (want('history')) {
    await step('history', async () => {
      await page.evaluate(() => localStorage.setItem('temperance.history.mode', 'ledger'))
      await tab(page, 'history')
      await sleep(900)
      await clickText(page, 'ledger')
      await sleep(400)
      await shot(page, 'history-ledger')
      await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 520 }))
      await sleep(400)
      await shot(page, 'history-ledger-scrolled')
      const daySheet = '#tp-history-day-sheet, [data-testid=tp-history-day-sheet]'
      // a tracked colonnade day opens the day sheet directly
      let opened = await page.evaluate(() => {
        const days = [...document.querySelectorAll('[data-testid=tp-history] button[data-day]')]
        const tracked = days.filter((b) => !/untracked/i.test(b.getAttribute('aria-label') || ''))
        const el = tracked[tracked.length - 1]
        if (!el) return false
        el.click()
        return true
      })
      if (opened) opened = await waitFor(page, daySheet)
      // else a tracked week row expands, and its OPEN DAY opens the sheet
      if (!opened && (await clickRow(page, '[data-testid^=tp-history-day-][data-tracked=true]'))) {
        await sleep(400)
        if (!(await clickText(page, 'open day', '[data-testid=tp-history]'))) await clickRow(page, '[data-testid^=tp-history-day-][data-tracked=true]')
        opened = await waitFor(page, daySheet)
      }
      if (!opened) throw new Error('history day sheet did not open')
      await sleep(600)
      await shot(page, 'history-day-sheet')
      await page.keyboard.press('Escape')
      await sleep(450)
      await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 0 }))
    })
  }

  if (want('body')) {
    await step('body', async () => {
      await tab(page, 'history')
      await sleep(500)
      await clickText(page, 'body')
      await sleep(800)
      await shot(page, 'body-weight')
      const files = await (async () => {
        const fx = await newPage(700, 900)
        const out = await makeFixtures(fx)
        await fx.close()
        return out
      })()
      const input = await page.$('[data-testid=tp-photo-add]')
      if (input) {
        await input.uploadFile(...files)
        await sleep(2500)
      }
      await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 9999 }))
      await sleep(600)
      // the tile labels sit where the bottom-lane toast lands: wait it out (plus its 200 ms exit)
      await page.waitForSelector('[data-testid=tp-toast]', { hidden: true, timeout: 8000 }).catch(() => {})
      await sleep(300)
      await shot(page, 'body-photos')
      if (await click(page, '[data-testid=tp-photo-grid] button, [data-testid=tp-photo-grid] [role=button]')) {
        await sleep(900)
        await shot(page, 'body-photo-viewer')
        await page.keyboard.press('Escape')
        await sleep(450)
      }
      await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 0 }))
    })
  }

  if (want('settings')) {
    await step('settings', async () => {
      await tab(page, 'settings')
      await sleep(800)
      await shot(page, 'settings')
      await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 9999 }))
      await sleep(450)
      await shot(page, 'settings-end')
    })
  }

  if (want('over')) {
    await step('over', async () => {
      await tab(page, 'today')
      await sleep(700)
      await page.evaluate(() => {
        const s = window.__tp.store.getState()
        const kebab = Object.values(s.meals).find((m) => m.name === 'Lamb kebab')
        s.logMeal(kebab.id, 1)
        s.logMeal(kebab.id, 1)
      })
      await sleep(250)
      await shot(page, 'over-strike')
      await sleep(2200)
      await shot(page, 'over')
    })
  }

  if (want('small')) {
    await step('small', async () => {
      await page.setViewport({ width: 360, height: 640, deviceScaleFactor: DPR, isMobile: true, hasTouch: true })
      await tab(page, 'today')
      await sleep(1200)
      await shot(page, 'small-360x640')
      await page.setViewport({ width: 1280, height: 860, deviceScaleFactor: 1, isMobile: false, hasTouch: false })
      await sleep(1000)
      await shot(page, 'desktop-1280')
    })
  }
} finally {
  await browser.close()
  writeFileSync(resolve(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(JSON.stringify({ out: OUT, shots: manifest.shots.length, failed: manifest.failed, errors: manifest.errors.length, failedRequests: manifest.failedRequests.length }, null, 1))
}
