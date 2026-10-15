// Acceptance checks for the polish (docs/polish-spec.md section 9) and the custom portion flow.
//
//   node scripts/check-acceptance.mjs --url http://127.0.0.1:4173/temperance/ [--out .tmp/acceptance] [--headed]
//
// Checks, at 360 x 640 and 390 x 844:
//   layout   no horizontal scroll on any tab, with the LOG and TODAY sheets open
//   type     no text under 12 px (SVG text measured at its rendered size), no tracking over 0.2em below 13 px
//   targets  pressables under 44 x 44 that carry no enlarging pseudo-element (candidates to inspect)
//   errors   console errors, page errors, failed requests
// and the portion flow end to end:
//   QUICK per 100 g: 165 kcal per 100 g, 180 g eaten logs 297 kcal and records 180 g
//   a pick sets the amount; the live result follows it
//   one-tap favourite logs the meal's usual amount
//   library detail logs a typed amount in the meal's basis and remembers it
//   recents label the entry "· 180 g" and re-log it exactly
// Writes report.json (and a few PNGs) to --out; exits 1 when anything fails.
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const URL = opt('--url', 'http://127.0.0.1:4173/temperance/')
const OUT = resolve(opt('--out', '.tmp/acceptance'))
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const report = { url: URL, layout: [], type: [], targets: [], errors: [], portion: [], pass: true }
const fail = (section, item) => {
  report[section].push(item)
  if (section !== 'targets') report.pass = false
}

const browser = await puppeteer.launch({
  executablePath: opt('--chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'),
  headless: !args.includes('--headed'),
  args: ['--ignore-gpu-blocklist', '--use-angle=default', '--no-first-run', '--hide-scrollbars'],
})

async function open(w, h) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  page.on('console', (m) => {
    if (m.type() === 'error') fail('errors', `${w}x${h} console: ${m.text().slice(0, 240)}`)
  })
  page.on('pageerror', (e) => fail('errors', `${w}x${h} pageerror: ${String(e?.message ?? e).slice(0, 240)}`))
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('favicon')) fail('errors', `${w}x${h} ${r.status()} ${r.url()}`)
  })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__tp, { timeout: 20000 })
  await seed(page)
  await page.evaluate(() => sessionStorage.setItem('temperance.seen', String(Date.now())))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__tp, { timeout: 20000 })
  await sleep(1800)
  return page
}

async function seed(page) {
  await page.evaluate(() => {
    const s = window.__tp.store.getState()
    s.resetAll()
    s.setGoalKcal(2600)
    s.setTargets({ protein: 190, carbs: 260, fat: 80 })
    s.setTargetWeight(80)
    s.markIntroPlayed()
    const day = (offset, h) => {
      const d = new Date()
      d.setDate(d.getDate() - offset)
      d.setHours(h, 10, 0, 0)
      return d.getTime()
    }
    const t0 = day(10, 7)
    s.addIngredient({ name: 'Chicken breast', per: { amount: 100, unit: 'g' }, macros: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } }, t0)
    s.addIngredient({ name: 'Eggs', per: { amount: 1, unit: 'serve' }, macros: { kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3 } }, t0)
    const oats = s.addQuickMeal({ name: 'Oats and whey', macros: { kcal: 410, protein: 32, carbs: 48, fat: 9 }, favourite: true }, t0)
    s.addQuickMeal({ name: 'Greek yoghurt', macros: { kcal: 97, protein: 9, carbs: 3.6, fat: 5 }, per: { amount: 100, unit: 'g' }, usual: 170, favourite: true }, t0)
    const steak = s.addQuickMeal({ name: 'Steak and potatoes', macros: { kcal: 780, protein: 58, carbs: 52, fat: 36 } }, t0)
    for (let d = 7; d >= 1; d--) {
      s.logMeal(oats.id, 1, day(d, 7))
      s.logMeal(steak.id, 1, day(d, 19))
    }
    s.logMeal(oats.id, 1, day(0, 7))
    for (let d = 10; d >= 0; d -= 2) s.addWeight(85 - d * 0.1, undefined, day(d, 6))
  })
}

const tab = (page, name) => page.evaluate((n) => window.__tp.ui.getState().setTab(n), name)

async function layoutCheck(page, label) {
  const r = await page.evaluate(() => {
    const vw = window.innerWidth
    const main = document.querySelector('main')
    const over = []
    if (document.documentElement.scrollWidth > vw + 1) over.push(`document ${document.documentElement.scrollWidth} > ${vw}`)
    if (document.body.scrollWidth > vw + 1) over.push(`body ${document.body.scrollWidth} > ${vw}`)
    if (main && main.scrollWidth > main.clientWidth + 1) over.push(`main ${main.scrollWidth} > ${main.clientWidth}`)
    for (const d of document.querySelectorAll('[role=dialog]')) {
      const el = d
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'hidden') over.push(`dialog ${el.getAttribute('data-testid') ?? ''} ${el.scrollWidth} > ${el.clientWidth}`)
    }
    return over
  })
  for (const o of r) fail('layout', `${label}: ${o}`)
}

async function typeCheck(page, label) {
  const r = await page.evaluate(() => {
    const out = []
    const seen = new Set()
    const visible = (el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return false
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return false
      let n = el
      while (n && n.nodeType === 1) {
        const cs = getComputedStyle(n)
        if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) return false
        if (n.getAttribute('aria-hidden') === 'true' && !(n instanceof SVGElement)) return false
        n = n.parentElement
      }
      return true
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const t = walker.currentNode
      const text = (t.textContent || '').trim()
      if (!text) continue
      const el = t.parentElement
      if (!el || seen.has(el) || el.closest('.sr-only, [data-noaudit]')) continue
      seen.add(el)
      if (!visible(el)) continue
      const cs = getComputedStyle(el)
      let px = parseFloat(cs.fontSize)
      if (el instanceof SVGElement && el.getScreenCTM) {
        const m = el.getScreenCTM()
        if (m) px = px * Math.hypot(m.a, m.b)
      }
      const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing)
      const em = px > 0 ? ls / parseFloat(cs.fontSize) : 0
      if (px < 11.95) out.push(`${text.slice(0, 28)} · ${px.toFixed(1)} px`)
      else if (px < 13 && em > 0.201) out.push(`${text.slice(0, 28)} · ${px.toFixed(1)} px tracked ${em.toFixed(2)}em`)
    }
    return out
  })
  for (const o of r) fail('type', `${label}: ${o}`)
}

async function targetCheck(page, label) {
  const r = await page.evaluate(() => {
    const out = []
    const sel = 'button, a[href], input, select, textarea, [role=button], [role=tab], [role=radio], [role=switch], [role=checkbox]'
    for (const el of document.querySelectorAll(sel)) {
      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1 || rect.bottom < 0 || rect.top > window.innerHeight) continue
      if (rect.width >= 43.5 && rect.height >= 43.5) continue
      const grows = ['::before', '::after'].some((p) => {
        const cs = getComputedStyle(el, p)
        return cs.content !== 'none' && cs.position === 'absolute'
      })
      if (grows) continue
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('data-testid') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 30)
      out.push(`${name} ${Math.round(rect.width)}x${Math.round(rect.height)}`)
    }
    return out
  })
  for (const o of r) report.targets.push(`${label}: ${o}`)
}

async function sweep(w, h) {
  const page = await open(w, h)
  const label = (s) => `${w}x${h} ${s}`
  for (const t of ['today', 'library', 'history', 'settings']) {
    await tab(page, t)
    await sleep(900)
    await layoutCheck(page, label(t))
    await typeCheck(page, label(t))
    await targetCheck(page, label(t))
    if (t === 'history') {
      // the BODY view
      const switched = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-testid=tp-history-mode] [role=radio], [data-testid=tp-history-mode] button')].find((x) => /body/i.test(x.textContent || ''))
        if (!b) return false
        b.click()
        return true
      })
      if (switched) {
        await sleep(900)
        await layoutCheck(page, label('history body'))
        await typeCheck(page, label('history body'))
        await targetCheck(page, label('history body'))
      }
    }
    if (t === 'settings') {
      await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 99999 }))
      await sleep(500)
      await typeCheck(page, label('settings end'))
      await targetCheck(page, label('settings end'))
    }
  }
  await tab(page, 'today')
  await sleep(600)
  await page.evaluate(() => window.__tp.ui.getState().openLog())
  await sleep(800)
  await layoutCheck(page, label('log sheet'))
  await typeCheck(page, label('log sheet'))
  await targetCheck(page, label('log sheet'))
  await page.evaluate(() => window.__tp.ui.getState().closeLog())
  await sleep(600)
  await page.evaluate(() => window.__tp.ui.getState().openToday())
  await sleep(800)
  await layoutCheck(page, label('today sheet'))
  await typeCheck(page, label('today sheet'))
  await page.evaluate(() => window.__tp.ui.getState().closeToday())
  await sleep(500)
  await page.close()
}

/** set a PortionField inside `scope` (a CSS selector) to `value` by typing, then blur to commit */
async function setPortion(page, scope, value) {
  const handle = await page.evaluateHandle((scope) => {
    const root = document.querySelector(scope)
    if (!root) return null
    const groups = [...root.querySelectorAll('[role=group]')]
    const g = groups.find((x) => /portion|usual|amount/i.test(x.getAttribute('aria-label') || '')) || groups.find((x) => x.querySelector('input[inputmode=decimal]'))
    return g ? g.querySelector('input') : null
  }, scope)
  const el = handle.asElement()
  if (!el) throw new Error(`no portion input in ${scope}`)
  await el.click({ clickCount: 3 })
  await sleep(80)
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyA')
  await page.keyboard.up('Control')
  await page.keyboard.type(String(value), { delay: 20 })
  await sleep(120)
  // commit by blurring, not Enter (Enter may submit the form)
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await sleep(250)
}

const lastEntry = (page) => page.evaluate(() => {
  const e = window.__tp.store.getState().entries
  return e.length ? e[e.length - 1] : null
})

async function step(name, fn) {
  try {
    const detail = await fn()
    report.portion.push({ step: name, ok: true, detail })
  } catch (e) {
    fail('portion', { step: name, ok: false, error: String(e?.message ?? e).slice(0, 300) })
  }
}

async function portionFlow() {
  const page = await open(390, 844)
  const typeInto = async (id, text) => {
    const el = await page.$(`[data-testid=${id}]`)
    if (!el) throw new Error(`missing ${id}`)
    await el.click({ clickCount: 3 })
    await el.type(text, { delay: 10 })
  }

  await step('quick per 100 g logs 180 g as 297 kcal', async () => {
    await page.evaluate(() => window.__tp.ui.getState().openLog())
    await sleep(800)
    await typeInto('tp-log-name', 'Chicken breast grilled')
    await typeInto('tp-log-kcal', '165')
    await typeInto('tp-log-protein', '31')
    await typeInto('tp-log-carbs', '0')
    await typeInto('tp-log-fat', '3.6')
    const basis = (await page.$('[data-testid=tp-log-basis-g]')) ?? null
    if (!basis) throw new Error('missing tp-log-basis-g')
    await basis.click()
    await sleep(300)
    await setPortion(page, '[data-testid=tp-log-sheet]', 180)
    const result = await page.$eval('[data-testid=tp-log-result]', (n) => n.textContent || '').catch(() => '')
    await page.screenshot({ path: `${OUT}/portion-quick-180g.png` }).catch(() => {})
    if (!/297/.test(result.replace(/\s/g, ''))) throw new Error(`live result reads "${result}"`)
    await (await page.$('[data-testid=tp-log-submit]')).click()
    await sleep(700)
    const e = await lastEntry(page)
    if (!e || Math.round(e.macros.kcal) !== 297 || e.portion?.amount !== 180 || e.portion?.unit !== 'g') throw new Error(`logged ${JSON.stringify(e && { kcal: e.macros.kcal, portion: e.portion })}`)
    return { kcal: e.macros.kcal, portion: e.portion, result }
  })

  await step('a pick sets the amount and the result follows', async () => {
    await page.evaluate(() => window.__tp.ui.getState().openLog())
    await sleep(800)
    await typeInto('tp-log-name', 'Rice')
    await typeInto('tp-log-kcal', '130')
    await (await page.$('[data-testid=tp-log-basis-g]')).click()
    await sleep(250)
    const pick = await page.$('[data-testid^=tp-log-portion-pick-250]')
    if (!pick) throw new Error('missing tp-log-portion-pick-250')
    await pick.click()
    await sleep(300)
    const result = await page.$eval('[data-testid=tp-log-result]', (n) => n.textContent || '')
    if (!/325/.test(result.replace(/\s/g, ''))) throw new Error(`live result reads "${result}"`)
    await page.screenshot({ path: `${OUT}/portion-pick-250g.png` }).catch(() => {})
    await page.evaluate(() => window.__tp.ui.getState().closeLog())
    await sleep(600)
    return { result }
  })

  await step('per serve takes a typed 1.5 serves', async () => {
    await page.evaluate(() => window.__tp.ui.getState().openLog())
    await sleep(800)
    await typeInto('tp-log-name', 'Pasta bake')
    await typeInto('tp-log-kcal', '600')
    const serve = await page.$('[data-testid=tp-log-basis-serve]')
    if (serve) await serve.click()
    await sleep(200)
    await setPortion(page, '[data-testid=tp-log-sheet]', 1.5)
    await (await page.$('[data-testid=tp-log-submit]')).click()
    await sleep(700)
    const e = await lastEntry(page)
    if (!e || Math.round(e.macros.kcal) !== 900 || e.servings !== 1.5) throw new Error(`logged ${JSON.stringify(e && { kcal: e.macros.kcal, servings: e.servings })}`)
    return { kcal: e.macros.kcal, servings: e.servings }
  })

  await step('one-tap favourite logs the usual 170 g', async () => {
    await page.evaluate(() => window.__tp.ui.getState().openLog())
    await sleep(800)
    const id = await page.evaluate(() => Object.values(window.__tp.store.getState().meals).find((m) => m.name === 'Greek yoghurt').id)
    const chip = await page.$(`[data-testid=tp-fav-chip-${id}]`)
    if (!chip) throw new Error('missing the Greek yoghurt favourite chip')
    await chip.click()
    await sleep(700)
    const e = await lastEntry(page)
    if (!e || e.portion?.amount !== 170 || Math.round(e.macros.kcal) !== 165) throw new Error(`logged ${JSON.stringify(e && { kcal: e.macros.kcal, portion: e.portion })}`)
    return { kcal: e.macros.kcal, portion: e.portion }
  })

  await step('library detail logs 200 g and remembers it', async () => {
    await tab(page, 'library')
    await sleep(900)
    const id = await page.evaluate(() => Object.values(window.__tp.store.getState().meals).find((m) => m.name === 'Greek yoghurt').id)
    const row = (await page.$(`[data-testid=tp-meal-row-${id}]`)) ?? (await page.$(`[data-testid=tp-fav-row-${id}]`))
    if (!row) throw new Error('missing the Greek yoghurt row')
    // the row's test id is on the list item; the opener is the first button inside it
    await page.evaluate((id) => {
      const row = document.querySelector(`[data-testid=tp-meal-row-${id}]`) || document.querySelector(`[data-testid=tp-fav-row-${id}]`)
      const opener = row.matches('button') ? row : row.querySelector('button') || row
      opener.click()
    }, id)
    await page.waitForSelector('[data-testid=tp-meal-detail]', { timeout: 3000 })
    await sleep(500)
    await setPortion(page, '[data-testid=tp-meal-detail]', 200)
    await page.screenshot({ path: `${OUT}/portion-library-200g.png` }).catch(() => {})
    await (await page.$('[data-testid=tp-meal-detail-log]')).click()
    await sleep(800)
    const e = await lastEntry(page)
    const usual = await page.evaluate((id) => window.__tp.store.getState().meals[id].usual, id)
    if (!e || e.portion?.amount !== 200 || Math.round(e.macros.kcal) !== 194) throw new Error(`logged ${JSON.stringify(e && { kcal: e.macros.kcal, portion: e.portion })}`)
    if (usual !== 200) throw new Error(`usual is ${usual}, expected 200`)
    await page.keyboard.press('Escape')
    await sleep(500)
    return { kcal: e.macros.kcal, portion: e.portion, usual }
  })

  await step('recents label the grams and re-log exactly', async () => {
    await tab(page, 'today')
    await sleep(600)
    await page.evaluate(() => window.__tp.ui.getState().openLog())
    await sleep(800)
    const target = await page.evaluate(() => {
      const es = window.__tp.store.getState().entries
      return es.filter((x) => x.portion && x.portion.unit === 'g').pop()?.id
    })
    if (!target) throw new Error('no gram entry to find')
    const rowText = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-testid^=tp-recent-row-]')]
      const r = rows.find((x) => /\d+\s*g\b/.test(x.textContent || ''))
      return r ? r.textContent : null
    })
    if (!rowText) throw new Error('no recent row shows a gram amount')
    const before = await page.evaluate(() => window.__tp.store.getState().entries.length)
    const relogged = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-testid^=tp-recent-row-]')]
      const r = rows.find((x) => /\d+\s*g\b/.test(x.textContent || ''))
      const btn = r && [...r.querySelectorAll('button')].pop()
      if (!btn) return false
      btn.click()
      return true
    })
    if (!relogged) throw new Error('no re-log button on the gram row')
    await sleep(700)
    const after = await page.evaluate(() => window.__tp.store.getState().entries.length)
    const e = await lastEntry(page)
    if (after !== before + 1 || !e.portion || e.portion.unit !== 'g') throw new Error(`re-log produced ${JSON.stringify(e && { portion: e.portion })}`)
    return { rowText: rowText.replace(/\s+/g, ' ').slice(0, 60), portion: e.portion }
  })

  await step('today entry editor changes grams', async () => {
    const id = await page.evaluate(() => {
      const es = window.__tp.store.getState().entries
      return es.filter((x) => x.portion && x.portion.unit === 'g').pop()?.id
    })
    await page.evaluate(() => window.__tp.ui.getState().closeLog())
    await sleep(500)
    await page.evaluate(() => window.__tp.ui.getState().openToday())
    await sleep(800)
    const ok = await page.evaluate((id) => {
      const row = document.querySelector(`[data-testid=tp-today-entry-${id}]`)
      if (!row) return false
      const btn = row.querySelector('button') || row
      btn.click()
      return true
    }, id)
    if (!ok) throw new Error('no today entry row for the gram entry')
    await sleep(700)
    const before = await page.evaluate((id) => window.__tp.store.getState().entries.find((e) => e.id === id), id)
    await setPortion(page, '[data-testid=tp-today-sheet]', before.portion.amount + 50)
    await page.screenshot({ path: `${OUT}/portion-today-edit.png` }).catch(() => {})
    const saved = await page.evaluate(() => {
      const root = document.querySelector('[data-testid=tp-today-sheet]')
      const btn = root && [...root.querySelectorAll('button')].find((b) => /^\s*save\s*$/i.test(b.textContent || ''))
      if (!btn) return false
      btn.click()
      return true
    })
    if (!saved) throw new Error('no SAVE button in the entry editor')
    await sleep(600)
    const after = await page.evaluate((id) => window.__tp.store.getState().entries.find((e) => e.id === id), id)
    if (!after.portion || after.portion.amount !== before.portion.amount + 50) throw new Error(`portion is ${JSON.stringify(after.portion)}`)
    const expect = Math.round((before.macros.kcal * (before.portion.amount + 50)) / before.portion.amount)
    if (Math.abs(after.macros.kcal - expect) > 1) throw new Error(`kcal ${after.macros.kcal}, expected about ${expect}`)
    return { from: before.portion, to: after.portion, kcal: after.macros.kcal }
  })

  await page.close()
}

try {
  await sweep(390, 844)
  await sweep(360, 640)
  await portionFlow()
} catch (e) {
  fail('errors', `script: ${String(e?.stack ?? e).slice(0, 400)}`)
} finally {
  await browser.close()
  writeFileSync(resolve(OUT, 'report.json'), JSON.stringify(report, null, 2))
  const n = (k) => report[k].length
  console.log(JSON.stringify({ pass: report.pass, layout: n('layout'), type: n('type'), targetCandidates: n('targets'), errors: n('errors'), portion: report.portion.map((p) => `${p.ok ? 'ok  ' : 'FAIL'} ${p.step}${p.ok ? '' : ' :: ' + p.error}`) }, null, 1))
  process.exitCode = report.pass ? 0 : 1
}
