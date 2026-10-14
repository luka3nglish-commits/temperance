/**
 * Canvas-drawn textures for the scene: 64 px radial alphas for the dust, the glow sprites and the
 * plinth contact shadow. Built lazily, cached per shape, never throwing (a missing 2D context
 * yields a 1 x 1 white texture so a material still renders).
 */
import { CanvasTexture, LinearFilter, NoColorSpace, Texture } from 'three'

export type RadialShape = 'soft' | 'glow' | 'shadow'

const cache = new Map<RadialShape, Texture>()

function falloff(shape: RadialShape, r: number): number {
  switch (shape) {
    case 'soft':
      // a particle: full to 0.35 r, cosine tail
      return r < 0.35 ? 1 : Math.max(0, 0.5 + 0.5 * Math.cos(((r - 0.35) / 0.65) * Math.PI))
    case 'glow':
      // a light: steep centre, long tail
      return Math.pow(Math.max(0, 1 - r), 2.2)
    case 'shadow':
      // contact shadow: flat core, soft rim
      return r < 0.45 ? 1 : Math.max(0, 1 - (r - 0.45) / 0.55)
  }
}

export function radialTexture(shape: RadialShape, size = 64): Texture {
  const hit = cache.get(shape)
  if (hit) return hit
  let tex: Texture
  try {
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('no 2d')
    const img = ctx.createImageData(size, size)
    const half = size / 2
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x + 0.5 - half) / half
        const dy = (y + 0.5 - half) / half
        const r = Math.min(1, Math.sqrt(dx * dx + dy * dy))
        const a = falloff(shape, r)
        const i = (y * size + x) * 4
        img.data[i] = 255
        img.data[i + 1] = 255
        img.data[i + 2] = 255
        img.data[i + 3] = Math.round(a * 255)
      }
    }
    ctx.putImageData(img, 0, 0)
    tex = new CanvasTexture(c)
  } catch {
    const data = new Uint8Array([255, 255, 255, 255])
    tex = new Texture()
    tex.image = { data, width: 1, height: 1 }
  }
  // alpha masks over white: no colour transform wanted
  tex.colorSpace = NoColorSpace
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  cache.set(shape, tex)
  return tex
}
