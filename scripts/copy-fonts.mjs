// Copy the five latin woff2 files we preload from @fontsource into public/fonts.
// Run: node scripts/copy-fonts.mjs  (also runs on `npm run build` via the prebuild script)
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'fonts')
mkdirSync(out, { recursive: true })

const files = [
  ['@fontsource/cinzel/files/cinzel-latin-400-normal.woff2', 'cinzel-400.woff2'],
  ['@fontsource/cinzel/files/cinzel-latin-700-normal.woff2', 'cinzel-700.woff2'],
  ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2', 'cormorant-400.woff2'],
  ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2', 'cormorant-500.woff2'],
  ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2', 'cormorant-400-italic.woff2'],
]

for (const [src, dest] of files) {
  const from = join(root, 'node_modules', src)
  if (!existsSync(from)) {
    console.error('missing font source', from)
    process.exit(1)
  }
  copyFileSync(from, join(out, dest))
  console.log('copied', dest)
}
