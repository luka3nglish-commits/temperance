// Run verify-marks.mjs across scene variants and print one line per variant.
//   node scripts/verify-variants.mjs [--headed]
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const marks = resolve(here, 'verify-marks.mjs')
const headed = process.argv.includes('--headed')
const BASE = 'http://127.0.0.1:4173/temperance/'
const VARIANTS = process.argv.includes('--all') ? ['', '?tp-noenv', '?tp-nocrack', '?tp-std'] : ['', '?tp-noenv']

for (const q of VARIANTS) {
  const out = execFileSync(process.execPath, [marks, '--url', BASE + q, ...(headed ? ['--headed'] : [])], { encoding: 'utf8' })
  const j = JSON.parse(out)
  const f = j.first
  const m = Object.fromEntries(f.marks.map((x) => x.split('@').map((v, i) => (i ? Number(v) : v))))
  const opening = m['tp:opening-done'] - m['tp:opening-start']
  const compile = m['tp:gl-compile-done'] - m['tp:gl-compile-start']
  const firstFrame = m['tp:gl-first-frame'] - m['tp:gl-compile-done']
  const envDone = m['tp:gl-env-done']
  const big = f.longtasks.filter((t) => t[1] > 80)
  console.log(
    `${(q || '(default)').padEnd(24)} opening ${String(opening).padStart(5)} ms | env@${envDone} | compile ${String(compile).padStart(5)} ms | first frame ${String(firstFrame).padStart(5)} ms | long tasks ${JSON.stringify(big)} | errors ${j.errors.length}`,
  )
}
