// Measure the opening without screenshots stalling the page: load, wait, print the performance marks
// and every long task (main-thread stall over 50 ms) during the first seconds.
//   node scripts/verify-marks.mjs [--url http://127.0.0.1:4173/temperance/] [--reduced] [--second] [--headed] [--nowebgl]
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const URL = opt('--url', 'http://127.0.0.1:4173/temperance/')
const NOWEBGL = args.includes('--nowebgl')
const browser = await puppeteer.launch({
  executablePath: opt('--chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'),
  headless: !args.includes('--headed'),
  defaultViewport: null,
  args: ['--window-size=430,960', '--ignore-gpu-blocklist', '--use-angle=default', '--no-first-run', ...(NOWEBGL ? ['--disable-webgl', '--disable-webgl2'] : [])],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  if (args.includes('--reduced')) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.evaluateOnNewDocument((nowebgl) => {
    window.__longtasks = []
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__longtasks.push([Math.round(e.startTime), Math.round(e.duration)])
      }).observe({ type: 'longtask', buffered: true })
    } catch {}
    if (nowebgl) {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null
        return orig.call(this, type, ...rest)
      }
    }
  }, NOWEBGL)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => (m.type() === 'error' ? errors.push(m.text()) : null))
  const read = () =>
    page.evaluate(() => ({
      marks: performance.getEntriesByType('mark').map((m) => `${m.name}@${Math.round(m.startTime)}`),
      longtasks: window.__longtasks,
      opening: document.querySelector('[data-testid=tp-opening]')?.getAttribute('data-state') ?? null,
      introDone: document.documentElement.dataset.introDone ?? null,
      introCount: window.__tp?.store.getState().settings.introCount,
      monument: document.querySelector('[data-testid=tp-monument]')?.getAttribute('data-ready') ?? null,
      mode: document.querySelector('[data-testid=tp-monument]')?.getAttribute('data-mode') ?? null,
      tier: document.documentElement.dataset.tier ?? null,
      h: document.querySelector('[data-testid=tp-monument]')?.getAttribute('data-h-target') ?? null,
      rotY: window.__tp?.mon?.rotY ?? null,
      parallelCompile: (() => {
        try {
          const g = document.createElement('canvas').getContext('webgl2')
          return g ? !!g.getExtension('KHR_parallel_shader_compile') : null
        } catch {
          return null
        }
      })(),
    }))
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 4500))
  const first = await read()
  let second = null
  if (args.includes('--second')) {
    await page.evaluate(() => sessionStorage.removeItem('temperance.seen'))
    await page.reload({ waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 3000))
    second = await read()
    // live idle: the column turns at 0.035 rad/s, so rotY must move over a second
    await new Promise((r) => setTimeout(r, 1200))
    second.rotYLater = await page.evaluate(() => window.__tp?.mon?.rotY ?? null)
    second.idleTurning = second.rotYLater !== null && second.rotY !== null && second.rotYLater > second.rotY
  }
  console.log(JSON.stringify({ mode: { headed: args.includes('--headed'), nowebgl: NOWEBGL, reduced: args.includes('--reduced') }, first, second, errors }, null, 1))
} finally {
  await browser.close()
}
