// Poll the live site until its index.html references the same JS bundle as the local dist (or time out).
//   node scripts/wait-live.mjs [--url https://luka3nglish-commits.github.io/temperance/] [--timeout 240]
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def
}
const URL = opt('--url', 'https://luka3nglish-commits.github.io/temperance/')
const timeout = Number(opt('--timeout', 240)) * 1000
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const local = readFileSync(resolve(root, 'dist/index.html'), 'utf8')
const bundle = local.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0]
if (!bundle) {
  console.log('no local bundle reference found')
  process.exit(1)
}
const started = Date.now()
for (;;) {
  try {
    const res = await fetch(URL + '?t=' + Date.now(), { cache: 'no-store' })
    const html = await res.text()
    if (html.includes(bundle)) {
      console.log(`live serves ${bundle} after ${Math.round((Date.now() - started) / 1000)} s`)
      process.exit(0)
    }
  } catch (e) {
    /* network hiccup, keep polling */
  }
  if (Date.now() - started > timeout) {
    console.log(`timed out waiting for ${bundle}`)
    process.exit(2)
  }
  await new Promise((r) => setTimeout(r, 10000))
}
