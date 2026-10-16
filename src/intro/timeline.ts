import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { featureOff } from '../lib/boot'
import { getMonumentHandle } from '../scene/handle'
import { queryArcs, targetList, type Targets } from './targets'

/**
 * The opening timelines (docs/design-spec.md section 5). Pure builders: they take the DOM targets
 * and return one GSAP timeline each. Times in the spec are milliseconds; `ms()` turns them into
 * the seconds GSAP wants, and every position below is written in the spec's milliseconds.
 *
 * The monument is driven through getMonumentHandle() at call time, never a cached handle, because
 * the scene may swap webgl for svg after a context loss. Every tween is created inside the
 * opening's gsap.context (the async S1 join included) so one revert returns the DOM to pure CSS.
 */

gsap.registerPlugin(CustomEase)

export const ms = (n: number) => n / 1000

export const EASE = {
  cut: CustomEase.create('tp-cut', '0.7,0,0.2,1'),
  stone: CustomEase.create('tp-stone', '0.16,1,0.3,1'),
  hit: CustomEase.create('tp-hit', '0.6,0,1,0.4'),
  settle: CustomEase.create('tp-settle', '0.34,1.56,0.64,1'),
}

export const FULL_MS = 1900
export const SHORT_MS = 700
export const FADE_MS = 240
export const FONTS_CAP_MS = 300

/** S4: the rise is called at 420 so the column lands at 1000 inside a 680 ms dolly (spec S4). */
export const RISE_AT_MS = 420
export const RISE_MS = 680
/** the ghost reveal (polish-spec 5.5): 420 to 860 */
export const GHOST_AT_MS = 420
export const GHOST_MS = 440

export type Overlay = {
  wordmark: HTMLElement | null
  letters: HTMLElement[]
}

export type BuildInput = {
  targets: Targets
  overlay: Overlay
  stage: HTMLElement | null
  /** the opening's context; tweens added after the build (the fonts gate) go through it */
  ctx: gsap.Context
  /** resolves when the fonts are ready (raced against the 300 ms cap inside the builder) */
  fontsReady: Promise<unknown>
  /** false once the opening was reverted or finished; async joins check it before touching the DOM */
  isLive(): boolean
  /** the shard glint gradients follow this (SVG attributes cannot read --tilt-x) */
  onTilt(x: number): void
  /** hand the light back to the tilt loop (called when the shard sweep ends; idempotent) */
  releaseTilt(): void
  onComplete(): void
}

const fadeIn = (tl: gsap.core.Timeline, el: HTMLElement | undefined, at: number, dur: number, ease: gsap.EaseFunction | string = EASE.stone) => {
  if (!el) return
  tl.to(el, { opacity: 1, duration: ms(dur), ease, clearProps: 'opacity' }, ms(at))
}

const riseIn = (tl: gsap.core.Timeline, el: HTMLElement | undefined, at: number, dur: number, px: number) => {
  if (!el) return
  tl.fromTo(
    el,
    { opacity: 0, y: px },
    { opacity: 1, y: 0, duration: ms(dur), ease: EASE.stone, clearProps: 'opacity,transform' },
    ms(at),
  )
}

/** The big number is cut upward out of the stone, then one brushed highlight crosses it. */
const cutNumber = (tl: gsap.core.Timeline, el: HTMLElement | undefined, at: number, cutDur: number, sweepDur: number) => {
  if (!el) return
  tl.fromTo(
    el,
    { clipPath: 'inset(100% 0 0 0)' },
    { clipPath: 'inset(0% 0 0 0)', duration: ms(cutDur), ease: EASE.cut, clearProps: 'clipPath' },
    ms(at),
  )
  // the boot guard's sweep=0 (any safe level): the number is cut but no light crosses it
  if (featureOff('sweep')) return
  tl.fromTo(
    el,
    { '--tilt-x': -1 },
    {
      '--tilt-x': 1,
      duration: ms(sweepDur),
      ease: 'power1.inOut',
      onComplete: () => el.style.removeProperty('--tilt-x'),
    },
    ms(at),
  )
}

/**
 * Shards fade in while the glint band sweeps once from the top left to the bottom right, and the
 * glint strength (`--shard-glint` on the shards root, 0.4 at rest) flares 0 to 0.8 over `glintHalf`
 * then settles to 0.4 over the same again (polish-spec 3.5). Finite, on the shards root only, never
 * :root; a skip clears the inline value through clearTargetStyles.
 */
const revealShards = (tl: gsap.core.Timeline, el: HTMLElement | undefined, at: number, fadeDur: number, sweepDur: number, glintHalf: number, onTilt: (x: number) => void) => {
  if (!el) return
  tl.to(el, { opacity: 1, duration: ms(fadeDur), ease: 'none', clearProps: 'opacity' }, ms(at))
  if (featureOff('sweep')) return
  tl.fromTo(el, { '--shard-glint': 0 }, { '--shard-glint': 0.8, duration: ms(glintHalf), ease: 'power1.out' }, ms(at))
  tl.to(
    el,
    { '--shard-glint': 0.4, duration: ms(glintHalf), ease: 'power1.inOut', onComplete: () => el.style.removeProperty('--shard-glint') },
    ms(at + glintHalf),
  )
  const sweep = { x: -1 }
  tl.to(
    sweep,
    {
      x: 1,
      duration: ms(sweepDur),
      ease: 'power1.inOut',
      onUpdate: () => {
        el.style.setProperty('--tilt-x', sweep.x.toFixed(4))
        onTilt(sweep.x)
      },
      onComplete: () => el.style.removeProperty('--tilt-x'),
    },
    ms(at),
  )
}

/**
 * The ring. When the three arcs expose `data-arc` paths they draw by stroke length, staggered;
 * otherwise the ring is revealed from its centre with a circle clip. The track and the centre
 * value fade in with the first arc so nothing pops.
 */
const drawRing = (tl: gsap.core.Timeline, ring: HTMLElement | undefined, at: number, each: number, stagger: number) => {
  if (!ring) return
  const arcs = queryArcs(ring)
  tl.to(ring, { opacity: 1, duration: ms(200), ease: 'none', clearProps: 'opacity' }, ms(at))
  if (arcs.length) {
    let drew = 0
    arcs.forEach((arc, i) => {
      // the ring's arcs carry pathLength="1": dash units are then path lengths, not user units
      const pl = parseFloat(arc.getAttribute('pathLength') ?? '')
      let len = Number.isFinite(pl) && pl > 0 ? pl : 0
      if (!len) {
        try {
          len = arc.getTotalLength()
        } catch {
          len = 0
        }
      }
      if (!len) return
      drew += 1
      tl.fromTo(
        arc,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: ms(each), ease: EASE.stone, clearProps: 'strokeDasharray,strokeDashoffset' },
        ms(at + i * stagger),
      )
    })
    if (drew) return
  }
  tl.fromTo(
    ring,
    { clipPath: 'circle(0% at 50% 50%)' },
    { clipPath: 'circle(75% at 50% 50%)', duration: ms(each), ease: EASE.stone, clearProps: 'clipPath' },
    ms(at),
  )
}

/** The landing: camera shake in the scene and the matching 140 ms DOM shake on the stage. */
const land = (stage: HTMLElement | null, trauma: number) => {
  getMonumentHandle().shake(trauma)
  if (!stage) return
  stage.classList.remove('shake')
  void stage.offsetWidth
  stage.classList.add('shake')
  const off = () => stage.classList.remove('shake')
  stage.addEventListener('animationend', off, { once: true })
  window.setTimeout(off, 220)
}

/**
 * The wordmark FLIP: measure the overlay wordmark and the header slot, translate and scale the
 * overlay copy into the slot while its tracking closes from 0.42em to the header's 0.3em, then
 * swap (overlay hidden, header shown) in the same frame.
 */
const flipWordmark = (tl: gsap.core.Timeline, overlay: HTMLElement | null, header: HTMLElement | undefined, at: number, dur: number) => {
  if (!overlay) return
  let x = 0
  let y = -312
  let scale = 0.43
  if (header) {
    const from = overlay.getBoundingClientRect()
    const to = header.getBoundingClientRect()
    if (from.width && from.height && to.width && to.height) {
      x = to.left + to.width / 2 - (from.left + from.width / 2)
      y = to.top + to.height / 2 - (from.top + from.height / 2)
      scale = Math.max(0.2, Math.min(1, to.height / from.height))
    }
  }
  tl.to(
    overlay,
    { x, y, scale, letterSpacing: '0.3em', paddingLeft: '0.3em', transformOrigin: '50% 50%', duration: ms(dur), ease: EASE.stone },
    ms(at),
  )
  tl.set(overlay, { opacity: 0 }, ms(at + dur))
  if (header) tl.set(header, { opacity: 1, clearProps: 'opacity' }, ms(at + dur))
}

/**
 * The wordmark's gold runs continuously across its letters: each letter carries the word-sized
 * gradient (and the sheen) offset by its own position, measured here once the font is in.
 */
const measureWordmark = (wordmark: HTMLElement | null, letters: HTMLElement[]) => {
  if (!wordmark || !letters.length) return
  const first = letters[0]
  const last = letters[letters.length - 1]
  const ww = last.offsetLeft + last.offsetWidth - first.offsetLeft
  if (!(ww > 0)) return
  wordmark.style.setProperty('--ww', `${ww}px`)
  for (const l of letters) l.style.setProperty('--lx', `${l.offsetLeft - first.offsetLeft}px`)
}

/**
 * The full opening, 1900 ms (polish-spec 5.5). Light enters first: the colonnade fades up from 0
 * and the shaft of light from 120 ms, so 250 ms is never a void. The wordmark cut (S1) starts at
 * once when Cinzel is already in, else at the fonts gate (300 ms cap); one sheen crosses it and the
 * FLIP follows its last letter. The goal line draws 300 to 1020, the glass ghost rises 420 to 860
 * and the stone rises inside it, landing at 1000.
 */
export function buildFull(input: BuildInput): gsap.core.Timeline {
  const { targets, overlay, stage, ctx, isLive, onTilt } = input
  const tl = gsap.timeline({ paused: true, onComplete: input.onComplete })

  // S0 the temple: the colonnade from the dark, then the shaft of light
  riseIn(tl, targets.colonnade, 0, 900, 6)
  fadeIn(tl, targets.shaft, 120, 700)

  // S2 the shards: fade 120 to 420, glint 0 to 0.8 (120 to 420) then 0.4 (420 to 720), sweep 120 to
  // 720, then the tilt loop takes the light back
  revealShards(tl, targets.shards, 120, 300, 600, 300, onTilt)
  tl.call(() => input.releaseTilt(), [], ms(720))

  // S3 the line: the gold goal slab draws 300 to 1020; its label follows the slab's landing
  tl.call(() => getMonumentHandle().playGoalLine(720), [], ms(300))
  fadeIn(tl, targets['goal-label'], 1020, 200)

  // the glass ghost rises from the plinth to the line, 420 to 860, and the stone rises inside it
  tl.call(() => getMonumentHandle().playGhostReveal(GHOST_MS), [], ms(GHOST_AT_MS))

  // S4 the rise. One call at 420 whatever the shader state: the scene routes it (3D when ready,
  // the SVG monument otherwise, handing over to the canvas when shaders resolve before 600 ms, or
  // crossfading at the first idle frame after 1900 when they resolve later). The column lands at
  // 1000 with the dust; the shake and one fast light pass are cued from here.
  tl.call(() => getMonumentHandle().playOpeningRise(RISE_MS), [], ms(RISE_AT_MS))
  tl.call(() => getMonumentHandle().sweepOnce(400), [], ms(960))
  tl.call(() => land(stage, 0.75), [], ms(1000))

  // the header date and the streak land with the wordmark
  fadeIn(tl, targets.date, 1100, 160)
  fadeIn(tl, targets.streak, 1100, 200)

  // S5 the cut
  fadeIn(tl, targets.label, 1060, 160)
  cutNumber(tl, targets.number, 1100, 320, 600)
  fadeIn(tl, targets.subline, 1300, 200)
  fadeIn(tl, targets.flanks, 1340, 200)

  // S6 the ring
  drawRing(tl, targets.ring, 1380, 360, 80)
  fadeIn(tl, targets['ring-readouts'], 1500, 200)

  // S7 the word
  riseIn(tl, targets.stoic, 1620, 280, 6)
  riseIn(tl, targets.tabbar, 1600, 240, 8)

  // pin the end at 1900 whatever the gate did
  tl.call(() => {}, [], ms(FULL_MS))

  // S1 the letters chiselled in, with one sheen pass: at once when Cinzel is already in, else once
  // the fonts are ready (at most 300 ms in)
  const startLetters = () => {
    ctx.add(() => {
      const now = Math.min(tl.time(), ms(FONTS_CAP_MS))
      measureWordmark(overlay.wordmark, overlay.letters)
      const letters = gsap.timeline()
      if (overlay.letters.length) {
        letters.to(overlay.letters, {
          clipPath: 'inset(0% 0 0 0)',
          duration: ms(180),
          ease: EASE.cut,
          stagger: ms(40),
        })
      }
      if (overlay.wordmark) letters.fromTo(overlay.wordmark, { '--sheen-p': 1.3 }, { '--sheen-p': -0.3, duration: ms(900), ease: 'power1.inOut' }, 0)
      // the FLIP starts at 680 or after the last letter, whichever is later
      const lastLetter = (overlay.letters.length ? (overlay.letters.length - 1) * 40 + 180 : 0) / 1000
      const flipAt = Math.max(ms(680) - now, lastLetter)
      flipWordmark(letters, overlay.wordmark, targets.wordmark, flipAt * 1000, 420)
      tl.add(letters, now)
    })
  }
  let fontIn = false
  try {
    fontIn = typeof document !== 'undefined' && !!document.fonts && document.fonts.check('700 30px Cinzel')
  } catch {
    fontIn = false
  }
  if (fontIn) startLetters()
  else {
    const cap = new Promise<void>((r) => window.setTimeout(r, FONTS_CAP_MS))
    void Promise.race([input.fontsReady.catch(() => undefined), cap]).then(() => {
      if (!isLive() || tl.progress() >= 1) return
      startLetters()
    })
  }

  return tl
}

/** The short opening, 700 ms: the column already stands; the line, the cut and the ring replay. */
export function buildShort(input: BuildInput): gsap.core.Timeline {
  const { targets, onTilt } = input
  const tl = gsap.timeline({ paused: true, onComplete: input.onComplete })

  tl.call(
    () => {
      const h = getMonumentHandle()
      h.setInstant()
      h.playGoalLine(300)
      h.playGhostReveal(300)
    },
    [],
    0,
  )
  revealShards(tl, targets.shards, 0, 200, 500, 150, onTilt)
  tl.call(() => input.releaseTilt(), [], ms(500))
  riseIn(tl, targets.colonnade, 0, 400, 6)
  fadeIn(tl, targets.shaft, 0, 400)
  fadeIn(tl, targets.wordmark, 0, 200)
  fadeIn(tl, targets.date, 0, 200)
  fadeIn(tl, targets.streak, 0, 200)
  tl.call(() => getMonumentHandle().sweepOnce(400), [], ms(100))

  fadeIn(tl, targets.label, 150, 160)
  cutNumber(tl, targets.number, 150, 300, 500)
  fadeIn(tl, targets.subline, 250, 200)
  fadeIn(tl, targets.flanks, 250, 200)
  fadeIn(tl, targets['goal-label'], 300, 160)

  drawRing(tl, targets.ring, 300, 240, 60)
  fadeIn(tl, targets['ring-readouts'], 400, 200)

  riseIn(tl, targets.stoic, 450, 250, 6)
  riseIn(tl, targets.tabbar, 450, 250, 8)

  tl.call(() => {}, [], ms(SHORT_MS))
  return tl
}

/**
 * OFF and reduced motion: one 240 ms crossfade into the final frame. No rise, no dust, no sweep.
 * Every target was hidden with opacity (hiddenVars 'fade'), so opacity is all that moves.
 */
export function buildFade(input: BuildInput): gsap.core.Timeline {
  const { targets } = input
  const tl = gsap.timeline({ paused: true, onComplete: input.onComplete })
  tl.call(() => getMonumentHandle().setInstant(), [], 0)
  const els = targetList(targets)
  if (els.length) {
    tl.to(els, { opacity: 1, duration: ms(FADE_MS), ease: 'power1.out', clearProps: 'opacity' }, 0)
  }
  tl.call(() => {}, [], ms(FADE_MS))
  return tl
}
