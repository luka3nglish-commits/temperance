import { useReducedMotion } from '../lib/motion'

/**
 * THE TEMPLE AIR (polish-spec 3.4). Fixed at z 0, under the shards and the slab. Four layers, all
 * static images (no live filters), drawn once:
 * 1. Key pool: a 96vmax warm radial (cream to gold to nothing) centred 40 px under the goal line,
 *    drifting with `--tilt-x` (7vw at full tilt). It replaces the old cool grey light.
 * 2. Floor pool: a low gold ellipse at the plinth, static.
 * 3. Floor falloff: the bottom of the page sinks into black, static.
 * 4. Grain: a feTurbulence tile rendered once into a data-URI SVG at opacity 0.055 so black never bands.
 * Reduced motion keeps every layer; the key pool simply stops following the tilt.
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
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[var(--z-backdrop)] overflow-hidden">
      {/* 1: key pool under the goal line */}
      <div
        className="absolute left-1/2 h-[96vmax] w-[96vmax]"
        style={{
          top: 'calc(var(--goal-y) + 40px)',
          background:
            'radial-gradient(closest-side, rgba(255,247,218,0.09) 0%, rgba(216,180,90,0.055) 34%, rgba(122,94,34,0.024) 62%, transparent 100%)',
          transform: reduced ? 'translate(-50%, -50%)' : 'translate(calc(-50% + var(--tilt-x) * 7vw), -50%)',
          willChange: reduced ? undefined : 'transform',
        }}
      />
      {/* 2: floor pool at the plinth */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(60% 22% at 50% var(--plinth-y), rgba(216,180,90,0.08), transparent 70%)' }}
      />
      {/* 3: floor falloff */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(80% 50% at 50% 100%, rgba(0,0,0,0.5), transparent 70%)' }} />
      {/* 4: grain */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{ backgroundImage: GRAIN_URL, backgroundSize: '160px 160px', backgroundRepeat: 'repeat' }}
      />
    </div>
  )
}
