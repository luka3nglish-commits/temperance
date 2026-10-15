/**
 * The temple around the monument (docs/polish-spec.md section 5.2, "DOM temple"): a fogged
 * colonnade and a shaft of light behind the canvas, a warm pool on the floor round the plinth, and
 * a faint haze hanging under the goal line. Plain DOM and inline SVG, zero GPU programs, visible
 * from frame 0 and identical on tier none, so the SVG monument stands in the same light.
 *
 * Everything is in stage coordinates (the 390 x 513 layer root, which MonumentLayer scales on
 * short phones). `TempleBack` renders behind the canvas, `TempleFront` (the haze) above it and
 * below the inscriptions. The root carries `data-live` while the idle ticker runs (the shaft
 * breathes only then) and `data-over` on an over day (the arch haze turns to ember).
 * Opening targets: `data-intro="colonnade"` and `data-intro="shaft"` on the wrappers, so the
 * opening's opacity never fights the breathing keyframe on the inner shaft.
 */
import { STAGE_GOAL_Y, STAGE_PLINTH_Y } from './tokens'

const STYLE = `
@keyframes tpShaftBreath { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
.tp-temple-layer { position: absolute; pointer-events: none; }
.tp-shaft, .tp-shaft-flare {
  position: absolute; left: 50%; top: 0; width: 520px; margin-left: -260px; height: 560px; pointer-events: none;
  background: conic-gradient(from 168deg at 50% -168px, transparent 0deg, rgba(255,231,182,0.10) 8deg, rgba(255,236,196,0.16) 12deg, rgba(255,231,182,0.10) 16deg, transparent 24deg);
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.68) 0, #000 80px, #000 429px, transparent 560px);
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.68) 0, #000 80px, #000 429px, transparent 560px);
}
.tp-shaft { opacity: 0.85; animation: tpShaftBreath 8s ease-in-out infinite; animation-play-state: paused; }
[data-live] .tp-shaft { animation-play-state: running; }
.tp-shaft-flare {
  opacity: 0;
  background: conic-gradient(from 168deg at 50% -168px, transparent 2deg, rgba(255,240,210,0.22) 9deg, rgba(255,246,224,0.34) 12deg, rgba(255,240,210,0.22) 15deg, transparent 22deg);
}
.tp-colonnade { position: absolute; inset: 0; pointer-events: none;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 25%, #000 70%, rgba(0,0,0,0.3) 100%);
          mask-image: linear-gradient(180deg, transparent 0, #000 25%, #000 70%, rgba(0,0,0,0.3) 100%); }
.tp-colonnade svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.tp-col-far, .tp-col-near { position: absolute; inset: 0; }
.tp-parallax .tp-col-near { transform: translate3d(calc(var(--tilt-x, 0) * -7px), 0, 0); will-change: transform; }
.tp-parallax .tp-col-far { transform: translate3d(calc(var(--tilt-x, 0) * -2.5px), 0, 0); will-change: transform; }
.tp-haze-ember { opacity: 0; transition: opacity 700ms var(--ease-stone, ease); }
[data-over] .tp-haze-ember { opacity: 1; }
[data-over] .tp-haze-gold { opacity: 0; }
.tp-haze-gold { transition: opacity 700ms var(--ease-stone, ease); }
@media (prefers-reduced-motion: reduce) {
  .tp-shaft { animation: none; opacity: 1; }
  .tp-parallax .tp-col-near, .tp-parallax .tp-col-far { transform: none; }
}
:root.reduce-motion .tp-shaft { animation: none; opacity: 1; }
:root.reduce-motion .tp-parallax .tp-col-near, :root.reduce-motion .tp-parallax .tp-col-far { transform: none; }
`

/** nine semicircular arches, opening 34 px, pier 10 px, springing at y 250, as one even-odd wall */
const ARCH_TOP = 150
const ARCH_FOOT = 520
const SPRING = 250
const openings = Array.from({ length: 9 }, (_, i) => {
  const x0 = 2 + i * 44
  return `M ${x0} ${ARCH_FOOT} V ${SPRING} A 17 17 0 0 1 ${x0 + 34} ${SPRING} V ${ARCH_FOOT} Z`
}).join(' ')
const WALL = `M -8 ${ARCH_TOP} H 398 V ${ARCH_FOOT} H -8 Z ${openings}`

/** the four near columns: centre x and width */
const NEAR: { x: number; w: number; side: 'l' | 'r' }[] = [
  { x: 22, w: 30, side: 'l' },
  { x: 70, w: 26, side: 'l' },
  { x: 320, w: 26, side: 'r' },
  { x: 368, w: 30, side: 'r' },
]

function Colonnade({ parallax }: { parallax: boolean }) {
  return (
    <div className={`tp-colonnade ${parallax ? 'tp-parallax' : ''}`}>
      <div className="tp-col-far">
        <svg viewBox="0 0 390 513" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <defs>
            <linearGradient id="tpArchHaze" gradientUnits="userSpaceOnUse" x1="0" y1="140" x2="0" y2="470">
              <stop offset="0" stopColor="rgb(122,96,56)" stopOpacity="0" />
              <stop offset="0.485" stopColor="rgb(122,96,56)" stopOpacity="0.1" />
              <stop offset="1" stopColor="rgb(122,96,56)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="tpArchEmber" gradientUnits="userSpaceOnUse" x1="0" y1="140" x2="0" y2="470">
              <stop offset="0" stopColor="rgb(255,90,31)" stopOpacity="0" />
              <stop offset="0.485" stopColor="rgb(255,90,31)" stopOpacity="0.08" />
              <stop offset="1" stopColor="rgb(255,90,31)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g opacity="0.55">
            <path d={WALL} fill="#0F0E13" fillRule="evenodd" />
            <path className="tp-haze-gold" d={openings} fill="url(#tpArchHaze)" />
            <path className="tp-haze-ember" d={openings} fill="url(#tpArchEmber)" />
          </g>
        </svg>
      </div>
      <div className="tp-col-near">
        <svg viewBox="0 0 390 513" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <defs>
            {/* lit from the shaft: the left columns are bright on their right, the right ones on their left */}
            <linearGradient id="tpNearL" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#08080B" />
              <stop offset="0.45" stopColor="#17161C" />
              <stop offset="0.6" stopColor="#1E1C22" />
              <stop offset="1" stopColor="#08080B" />
            </linearGradient>
            <linearGradient id="tpNearR" x1="1" x2="0" y1="0" y2="0">
              <stop offset="0" stopColor="#08080B" />
              <stop offset="0.45" stopColor="#17161C" />
              <stop offset="0.6" stopColor="#1E1C22" />
              <stop offset="1" stopColor="#08080B" />
            </linearGradient>
          </defs>
          <rect x="-20" y="30" width="430" height="22" fill="#0B0B0E" />
          {NEAR.map((c) => (
            <g key={c.x}>
              <rect x={c.x - c.w / 2} y="40" width={c.w} height="480" fill={c.side === 'l' ? 'url(#tpNearL)' : 'url(#tpNearR)'} />
              <rect x={c.side === 'l' ? c.x + c.w / 2 - 1.5 : c.x - c.w / 2} y="40" width="1.5" height="480" fill="rgba(255,220,160,0.10)" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

/** Behind the canvas: colonnade, shaft (and its flare twin), the floor pool round the plinth. */
export function TempleBack({ parallax }: { parallax: boolean }) {
  return (
    <>
      <style>{STYLE}</style>
      <div data-intro="colonnade" className="tp-temple-layer" style={{ inset: 0 }}>
        <Colonnade parallax={parallax} />
      </div>
      <div data-intro="shaft" className="tp-temple-layer" style={{ inset: 0 }}>
        <div className="tp-shaft" />
        <div className="tp-shaft-flare" data-tp-flare />
      </div>
      <div
        className="tp-temple-layer"
        style={{
          left: 0,
          right: 0,
          top: STAGE_PLINTH_Y - 40,
          height: 120,
          background: 'radial-gradient(42% 50% at 50% 35%, rgba(216,180,90,0.09), rgba(216,180,90,0) 70%)',
        }}
      />
    </>
  )
}

/** Above the canvas, below the inscriptions: the haze hanging under the goal line. */
export function TempleFront() {
  return (
    <div
      className="tp-temple-layer"
      style={{
        left: 0,
        right: 0,
        top: STAGE_GOAL_Y,
        height: 240,
        background: 'radial-gradient(38% 100% at 50% 0%, rgba(246,227,161,0.07), rgba(246,227,161,0) 72%)',
      }}
    />
  )
}
