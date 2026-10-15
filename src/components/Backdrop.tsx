import { featureOff, isBare } from '../lib/boot'
import { useReducedMotion } from '../lib/motion'

/**
 * THE POLISHED CENTRE (docs/design-spec.md section 8). Fixed at z 0, under the shards and the slab.
 *
 * Two layers: a 96vmax radial key light (rgba(220,224,230,0.06)) that drifts with `--tilt-x`, and a
 * static feTurbulence grain rendered once into a data-URI SVG and tiled as a background image at
 * opacity 0.05 so pure black never bands. The grain is an image, not a live filter: it costs one
 * rasterisation. Under reduced motion only the grain remains.
 *
 * Safe mode (src/lib/boot.ts): `data-fx="0"` drops the key light (a 96vmax compositing layer), and
 * level 2 (`data-bare="1"`) drops the whole backdrop for the plain obsidian page.
 */

const GRAIN_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">` +
  `<filter id="g" x="0" y="0" width="100%" height="100%">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" seed="7"/>` +
  `<feColorMatrix values="0 0 0 0 0.91 0 0 0 0 0.88 0 0 0 0 0.82 0 0 0 1 0"/>` +
  `</filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`

const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`

export function Backdrop() {
  const reduced = useReducedMotion()
  if (isBare()) return null
  const keyLight = !reduced && !featureOff('fx')
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[var(--z-backdrop)] overflow-hidden">
      {keyLight && (
        <div
          className="absolute left-1/2 top-[40%] h-[96vmax] w-[96vmax] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(220,224,230,0.06) 0%, rgba(220,224,230,0.028) 28%, rgba(220,224,230,0) 58%)',
            transform: 'translate(calc(-50% + var(--tilt-x) * 7vw), -50%)',
            willChange: 'transform',
          }}
        />
      )}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: GRAIN_URL, backgroundSize: '160px 160px', backgroundRepeat: 'repeat' }}
      />
    </div>
  )
}
