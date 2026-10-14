// Load the app, wait for the opening, then report the monument camera state, the goal-line variables,
// and the computed styles of a few controls. Optional --shot path.png takes a screenshot at the end.
//   node scripts/probe.mjs [--url ...] [--shot .tmp/shots/probe.png] [--settings]
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const URL = opt('--url', 'http://127.0.0.1:4173/temperance/')
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  defaultViewport: null,
  args: ['--window-size=430,960', '--ignore-gpu-blocklist', '--use-angle=default', '--no-first-run'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: Number(opt('--w', 390)), height: Number(opt('--h', 844)), deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  if (args.includes('--nowebgl')) {
    await page.evaluateOnNewDocument(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return orig.call(this, type, ...rest)
      }
    })
  }
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, Number(opt('--wait', 4500))))
  const state = await page.evaluate(() => {
    const cs = (el) => (el ? getComputedStyle(el) : null)
    const root = document.documentElement
    const mon = window.__tp?.mon
    return {
      mon: mon ? { h: mon.h, camY: mon.camY, camZ: mon.camZ, fov: mon.fov, lookY: mon.lookY, rotY: mon.rotY, crack: mon.crack } : null,
      placed: window.__tp?.monument?.placed ?? null,
      goalY: cs(root).getPropertyValue('--goal-y').trim(),
      plinthY: cs(root).getPropertyValue('--plinth-y').trim(),
      monument: (() => {
        const m = document.querySelector('[data-testid=tp-monument]')
        return m ? { mode: m.dataset.mode, ready: m.dataset.ready, h: m.dataset.h, transform: cs(m).transform, height: cs(m).height } : null
      })(),
      marks: performance.getEntriesByType('mark').map((m) => `${m.name}@${Math.round(m.startTime)}`),
    }
  })
  let exp = null
  if (args.includes('--exp')) {
    // does the dolly tween run at all? call it directly and sample the camera
    exp = await page.evaluate(async () => {
      const m = window.__tp.monument
      const mon = window.__tp.mon
      const samples = []
      m.playOpeningRise(680)
      for (const t of [0, 200, 400, 800]) {
        await new Promise((r) => setTimeout(r, t === 0 ? 0 : 200))
        samples.push({ t, camZ: mon.camZ, fov: mon.fov, h: mon.h })
      }
      return samples
    })
  }
  if (args.includes('--exp2')) {
    // the opening's own call sequence on the handle, then the camera after it all settles
    exp = await page.evaluate(async () => {
      const m = window.__tp.monument
      const mon = window.__tp.mon
      const wait = (ms) => new Promise((r) => setTimeout(r, ms))
      m.playGoalLine(720)
      await wait(180)
      m.playOpeningRise(680)
      await wait(480)
      m.sweepOnce(400)
      m.shake(0.75)
      await wait(400)
      const mid = { camZ: mon.camZ, fov: mon.fov, h: mon.h }
      await wait(600)
      const afterRise = { camZ: mon.camZ, fov: mon.fov, h: mon.h }
      m.startIdle?.()
      window.__tp.store.getState().markIntroPlayed()
      await wait(900)
      const afterSettle = { camZ: mon.camZ, fov: mon.fov, h: mon.h }
      return { mid, afterRise, afterSettle }
    })
  }
  let settings = null
  if (args.includes('--settings')) {
    await page.evaluate(() => window.__tp.ui.getState().setTab('settings'))
    await new Promise((r) => setTimeout(r, 700))
    settings = await page.evaluate(() => {
      const radios = [...document.querySelectorAll('[role=radiogroup] [role=radio]')].slice(0, 3)
      return radios.map((r) => {
        const s = getComputedStyle(r)
        return { text: r.textContent.trim(), paddingLeft: s.paddingLeft, paddingRight: s.paddingRight, borderLeft: `${s.borderLeftWidth} ${s.borderLeftColor}`, width: s.width }
      })
    })
    const rowBorder = await page.evaluate(() => {
      const el = document.querySelector('[data-testid=tp-settings] .border-b, .border-b')
      return el ? getComputedStyle(el).borderBottomColor + ' ' + getComputedStyle(el).borderBottomWidth : null
    })
    settings = { radios: settings, rowBorder }
  }
  const shot = opt('--shot', '')
  if (shot) await page.screenshot({ path: shot })
  console.log(JSON.stringify({ state, exp, settings, errors }, null, 1))
} finally {
  await browser.close()
}
