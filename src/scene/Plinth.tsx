/**
 * The stepped plinth (docs/polish-spec.md section 5.3): a die 1.30 wide and 0.24 tall whose top is
 * Y 0, then two broader steps, all on the shared obsidian program (no flutes); gilded arrises along
 * the die's top and bottom edges merged into one gold mesh (the capital's program); TEMPERANTIA
 * inscribed on the die face; a radial contact shadow under it all. The inscription and the shadow
 * share one MeshBasic program; both face the camera, so FrontSide (three draws a transparent
 * DoubleSide material in two passes, which costs a second, back-face program). Nothing animates.
 */
import { useEffect, useMemo } from 'react'
import { BoxGeometry, type BufferGeometry, CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { COL } from './tokens'
import { createGoldMaterial, createObsidianMaterial } from './obsidianMaterial'
import { CPU_2D, radialTexture } from './textures'

const DIE = 1.3
const HALF = DIE / 2
const DIE_H = 0.24
const T = 0.008

/** the eight gilded arrises: the die's four top edges and four bottom edges */
function arrisGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const bar = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const g = new BoxGeometry(w, h, d)
    g.translate(x, y, z)
    parts.push(g)
  }
  for (const y of [0, -DIE_H]) {
    bar(DIE, T, T, 0, y, HALF)
    bar(DIE, T, T, 0, y, -HALF)
    bar(T, T, DIE, HALF, y, 0)
    bar(T, T, DIE, -HALF, y, 0)
  }
  const merged = mergeGeometries(parts, false) ?? new BoxGeometry(DIE, T, T)
  for (const p of parts) p.dispose()
  return merged
}

const WORD = 'TEMPERANTIA'

/** Letters one by one at 0.2em tracking, cap height 72 percent of the canvas, gold gradient, dark edge. */
function drawInscription(c: HTMLCanvasElement): void {
  const g = c.getContext('2d', CPU_2D)
  if (!g) return
  const W = c.width
  const H = c.height
  g.clearRect(0, 0, W, H)
  // Cinzel caps are about 0.7 em tall
  const px = Math.round((H * 0.72) / 0.7)
  g.font = `700 ${px}px Cinzel, serif`
  g.textBaseline = 'alphabetic'
  const track = 0.2 * px
  const widths = WORD.split('').map((ch) => g.measureText(ch).width)
  const total = widths.reduce((a, b) => a + b, 0) + track * (WORD.length - 1)
  const scale = Math.min(1, (W * 0.96) / total)
  const capTop = (H - H * 0.72) / 2
  const base = capTop + H * 0.72
  g.save()
  g.translate(W / 2, 0)
  g.scale(scale, 1)
  const grad = g.createLinearGradient(0, capTop, 0, base)
  grad.addColorStop(0, '#7A5C22')
  grad.addColorStop(0.45, '#E9CF86')
  grad.addColorStop(0.55, '#F6E3A1')
  grad.addColorStop(1, '#8A6A2A')
  g.fillStyle = grad
  g.strokeStyle = 'rgba(0,0,0,0.6)'
  g.lineWidth = Math.max(1, H / 64)
  let x = -total / 2
  WORD.split('').forEach((ch, i) => {
    g.fillText(ch, x, base)
    g.strokeText(ch, x, base)
    x += widths[i] + track
  })
  g.restore()
}

function inscriptionTexture(width: number): Texture {
  const c = document.createElement('canvas')
  c.width = width
  c.height = Math.round(width / 8)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.generateMipmaps = false
  const draw = () => {
    drawInscription(c)
    tex.needsUpdate = true
  }
  // draw once the font is in (at most 300 ms on), and again if it lands later: an upload, never a recompile
  try {
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    const load: Promise<unknown> = fonts ? fonts.load('700 80px Cinzel') : Promise.resolve()
    void Promise.race([load, new Promise((r) => window.setTimeout(r, 300))]).then(draw)
    void load.then(draw, () => {})
  } catch {
    draw()
  }
  return tex
}

export function Plinth({ inscription }: { inscription: number }) {
  const stone = useMemo(() => createObsidianMaterial({ color: COL.plinth, roughness: 0.35, fluteOn: 0, f0: 0.1, reflect: 0.8, rim: 0.08 }), [])
  const gold = useMemo(() => createGoldMaterial(), [])
  const arris = useMemo(() => arrisGeometry(), [])
  const shadow = useMemo(() => radialTexture('shadow'), [])
  const word = useMemo(() => inscriptionTexture(inscription), [inscription])
  useEffect(
    () => () => {
      stone.dispose()
      gold.dispose()
      arris.dispose()
    },
    [stone, gold, arris],
  )
  useEffect(() => () => word.dispose(), [word])

  return (
    <group>
      <mesh position={[0, -DIE_H / 2, 0]} material={stone}>
        <boxGeometry args={[DIE, DIE_H, DIE]} />
      </mesh>
      <mesh position={[0, -0.285, 0]} material={stone}>
        <boxGeometry args={[1.66, 0.09, 1.66]} />
      </mesh>
      <mesh position={[0, -0.37, 0]} material={stone}>
        <boxGeometry args={[2.02, 0.08, 2.02]} />
      </mesh>
      <mesh geometry={arris} material={gold} />
      <mesh position={[0, -0.125, HALF + 0.0015]}>
        <planeGeometry args={[1.1, 0.13]} />
        <meshBasicMaterial map={word} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh position={[0, -0.412, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[2.8, 2.8]} />
        <meshBasicMaterial color="#000000" map={shadow} transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  )
}
