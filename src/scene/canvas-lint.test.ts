/**
 * docs/design-spec.md sections 7 and 15: every canvas goes through SafeCanvas. Nothing else under
 * src/ may import `Canvas` from @react-three/fiber or render a bare <Canvas.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..')
const ALLOWED = join('src', 'scene', 'SafeCanvas.tsx')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p)
  }
  return out
}

const IMPORT_RE = /import\s*(?:type\s*)?\{[^}]*\bCanvas\b[^}]*\}\s*from\s*['"]@react-three\/fiber['"]/
const JSX_RE = /<Canvas\b/

/** code only: block and line comments stripped, so prose about <Canvas> does not count */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1')
}

describe('canvas lint', () => {
  const files = walk(SRC)

  it('finds the source tree', () => {
    expect(files.length).toBeGreaterThan(10)
    expect(files.some((f) => f.endsWith(`${sep}SafeCanvas.tsx`))).toBe(true)
  })

  it('only SafeCanvas imports Canvas from @react-three/fiber', () => {
    const offenders = files
      .filter((f) => relative(join(SRC, '..'), f) !== ALLOWED)
      .filter((f) => !f.endsWith('canvas-lint.test.ts'))
      .filter((f) => IMPORT_RE.test(code(f)))
      .map((f) => relative(SRC, f))
    expect(offenders).toEqual([])
  })

  it('only SafeCanvas renders a bare <Canvas', () => {
    const offenders = files
      .filter((f) => relative(join(SRC, '..'), f) !== ALLOWED)
      .filter((f) => !f.endsWith('canvas-lint.test.ts'))
      .filter((f) => JSX_RE.test(code(f)))
      .map((f) => relative(SRC, f))
    expect(offenders).toEqual([])
  })
})
