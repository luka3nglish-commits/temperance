/**
 * The monument's animated state and its choreography (docs/design-spec.md sections 5, 7, 16).
 *
 * Everything the 3D scene and the opening tween lives on one plain object (`Mon`). GSAP tweens
 * that object; `useFrame` copies it onto three objects. Every tween calls `invalidate` on update
 * so a demand frameloop never misses a step. The same object drives the SVG monument's numbers.
 * No React, no three imports beyond types: this file is unit-testable.
 */
import gsap from 'gsap'
import { isReducedMotion, vibrate } from '../lib/motion'
import { CAMERA_OPEN, CAMERA_REST, GOAL_Y } from './tokens'

/** a vibration pattern (vibrate in lib/motion takes one duration); never under reduced motion */
function buzz(pattern: number[]): void {
  try {
    if (!isReducedMotion() && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}

/** CSS cubic-bezier(x1, y1, x2, y2) as a gsap ease function. */
export function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const ax = 3 * x1 - 3 * x2 + 1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1
  const ay = 3 * y1 - 3 * y2 + 1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx
  return (t: number) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let u = t
    for (let i = 0; i < 6; i++) {
      const x = sampleX(u) - t
      if (Math.abs(x) < 1e-5) return sampleY(u)
      const d = slopeX(u)
      if (Math.abs(d) < 1e-6) break
      u -= x / d
    }
    let lo = 0
    let hi = 1
    u = t
    while (hi - lo > 1e-5) {
      u = (lo + hi) / 2
      if (sampleX(u) < t) lo = u
      else hi = u
    }
    return sampleY(u)
  }
}

/** Motion tokens (section 16) as eases. */
export const EASE = {
  cut: bezier(0.7, 0, 0.2, 1),
  stone: bezier(0.16, 1, 0.3, 1),
  hit: bezier(0.6, 0, 1, 0.4),
  settle: bezier(0.34, 1.56, 0.64, 1),
}

export const MS = {
  hit: 170,
  settle: 120,
  shake: 140,
  dust: 1100,
  capital: 300,
  capScale: 220,
  ghost: 440,
  flash: 90,
  flashDecay: 500,
  crack: 700,
  crackOut: 600,
  sink: 600,
  shimmer: 300,
  coalesce: 600,
  /** the scene strike window: long enough for the smoke tail (polish-spec 5.4) */
  always: 1600,
  lightSweep: 14000,
  glintOff: 200,
  fovPunch: 260,
  reflectUp: 60,
  reflectDown: 200,
  shockwave: 480,
}

/** The animated state. World units, seconds, radians. */
export type Mon = {
  /** rendered column scale.y */
  h: number
  /** uCrack as rendered */
  crack: number
  /** camera shake trauma 0..1 */
  trauma: number
  /** sweep light angle */
  theta: number
  /** column group rotation.y (idle turn) */
  rotY: number
  /** capital emissiveIntensity */
  capital: number
  /** capital scale on a strike (1 at rest) */
  capScale: number
  /** the glass ghost's reveal, 0 to 1 rising from the plinth (0 until the opening or setInstant) */
  ghost: number
  /** the charge glint: a band of light riding the shaft top while the stone rises (0 off, 1 on) */
  glintOn: number
  /** 1 when the glint is ember (the strike crosses the line) */
  glintEmber: number
  /** reflection strength factor (1 at rest, 1.5 at the impact flare) */
  reflectK: number
  /** the impact's fov punch, added to fov (0 at rest, -0.5 at the hit) */
  fovPunch: number
  /** shockwave progress 0 to 1, or -1 when idle */
  shock: number
  shockEmber: number
  /** the removal shimmer: the line's glint position while it runs, or null */
  shimmerX: number | null
  /** goal line flash 0..1 (1 = #FFF7DA, sprite opacity 0.9) */
  flash: number
  /** goal slab scale.x */
  goalX: number
  /** goal ring and sprite opacity factor 0..1 */
  goalFade: number
  camY: number
  camZ: number
  fov: number
  lookY: number
  /** crack shader time, ticks only while crack > 0 and motion is not reduced */
  crackTime: number
  /** ember glow sprite pulse phase */
  emberPulse: number
  tiltX: number
  /** dust: burst clock (seconds, -100 = never), top of the column at burst, 1 when the burst crossed the goal */
  burstAt: number
  burstTop: number
  burstEmber: number
  dustVisible: boolean
}

export function createMon(): Mon {
  return {
    h: 0,
    crack: 0,
    trauma: 0,
    theta: 0.6,
    rotY: 0,
    capital: 0,
    capScale: 1,
    ghost: 0,
    glintOn: 0,
    glintEmber: 0,
    reflectK: 1,
    fovPunch: 0,
    shock: -1,
    shockEmber: 0,
    shimmerX: null,
    flash: 0,
    goalX: 0,
    goalFade: 0,
    camY: CAMERA_REST.pos[1],
    camZ: CAMERA_REST.pos[2],
    fov: CAMERA_REST.fov,
    lookY: CAMERA_REST.lookY,
    crackTime: 0,
    emberPulse: 0,
    tiltX: 0,
    burstAt: -100,
    burstTop: 0,
    burstEmber: 0,
    dustVisible: false,
  }
}

export type MonumentHooks = {
  invalidate(): void
  /** keep frameloop at `always` for at least `ms` from now */
  holdAlways(ms: number): void
  reduced(): boolean
  /** seconds, the dust clock */
  now(): number
  /** fired once per burst, after uniforms are set, so the layer can shake the DOM stage */
  onLanding?(): void
  /** fired when the camera lands at rest (for --goal-y) */
  onCameraRest?(): void
}

/** Toggle the `shake` keyframe on the stage element rendered by the today agent. Tolerates absence. */
export function shakeStage(): void {
  if (typeof document === 'undefined') return
  const el = document.querySelector<HTMLElement>('[data-stage]')
  if (!el) return
  el.classList.remove('shake')
  void el.offsetWidth
  el.classList.add('shake')
  window.setTimeout(() => el.classList.remove('shake'), MS.shake + 40)
}

/**
 * The choreography. One instance per MonumentLayer; both the 3D scene and the SVG monument read
 * `mon` from it. Methods are safe before any renderer exists.
 */
export class Monument {
  readonly mon: Mon = createMon()
  /** store targets */
  hTarget = 0
  crackTarget = 0
  /** true once a rise or setInstant has placed the column */
  placed = false
  private hooks: MonumentHooks
  private strikeTl: gsap.core.Timeline | null = null
  private strikeStartedAt = -1e9
  private crackTl: gsap.core.Tween | null = null
  private flashTl: gsap.core.Timeline | null = null
  private capitalTl: gsap.core.Timeline | null = null
  private cameraTl: gsap.core.Tween | null = null
  private riseTl: gsap.core.Timeline | null = null
  private goalTl: gsap.core.Timeline | null = null
  private sweepTl: gsap.core.Tween | null = null
  private ghostTl: gsap.core.Tween | null = null
  private impactTl: gsap.core.Timeline | null = null
  private shimmerTl: gsap.core.Tween | null = null

  constructor(hooks: MonumentHooks) {
    this.hooks = hooks
  }

  setHooks(h: Partial<MonumentHooks>): void {
    this.hooks = { ...this.hooks, ...h }
  }

  private inv = () => this.hooks.invalidate()

  /** New store targets. Does not move anything; strike / sink / setInstant do. */
  setTargets(h: number, crack: number): void {
    this.hTarget = h
    this.crackTarget = crack
  }

  killAll(): void {
    for (const t of [this.strikeTl, this.crackTl, this.flashTl, this.capitalTl, this.cameraTl, this.riseTl, this.goalTl, this.sweepTl, this.ghostTl, this.impactTl, this.shimmerTl]) t?.kill()
    this.strikeTl = this.crackTl = this.flashTl = this.capitalTl = this.cameraTl = this.riseTl = this.goalTl = this.sweepTl = this.ghostTl = this.impactTl = this.shimmerTl = null
  }

  /** Jump every visual to the store state. No motion. */
  setInstant(): void {
    this.killAll()
    const m = this.mon
    m.h = this.hTarget
    m.crack = this.crackTarget
    m.trauma = 0
    m.capital = 0
    m.capScale = 1
    m.ghost = 1
    m.glintOn = 0
    m.reflectK = 1
    m.fovPunch = 0
    m.shock = -1
    m.shimmerX = null
    m.flash = 0
    m.goalX = 1
    m.goalFade = 1
    m.camY = CAMERA_REST.pos[1]
    m.camZ = CAMERA_REST.pos[2]
    m.fov = CAMERA_REST.fov
    m.lookY = CAMERA_REST.lookY
    m.dustVisible = false
    this.placed = true
    this.hooks.onCameraRest?.()
    this.inv()
  }

  /**
   * A non-pulse change while the column is on screen (a new goal, a day rollover, an import):
   * the column eases to its new height over `ms` with the stone easing, no dust, no shake.
   */
  settleSmooth(ms: number): void {
    const m = this.mon
    if (this.hooks.reduced() || ms <= 0 || !this.placed) {
      this.settleSilently()
      return
    }
    this.strikeTl?.kill()
    this.strikeTl = gsap.timeline().to(m, { h: this.hTarget, duration: ms / 1000, ease: EASE.stone, onUpdate: this.inv })
    this.hooks.holdAlways(ms + 100)
    if (this.crackTarget !== m.crack) this.tweenCrack(this.crackTarget, ms)
    this.inv()
  }

  /** Silent update (layer hidden, or a non-pulse store change such as a new goal). */
  settleSilently(): void {
    this.strikeTl?.kill()
    this.strikeTl = null
    this.crackTl?.kill()
    this.crackTl = null
    this.mon.h = this.hTarget
    this.mon.crack = this.crackTarget
    this.mon.dustVisible = false
    this.placed = true
    this.inv()
  }

  private burst(top: number, ember: boolean): void {
    const m = this.mon
    m.burstAt = this.hooks.now()
    m.burstTop = top
    m.burstEmber = ember ? 1 : 0
    m.dustVisible = true
    this.impact(ember)
    this.hooks.holdAlways(MS.always)
    this.hooks.onLanding?.()
    this.inv()
  }

  /**
   * The impact (polish-spec 5.4 items 2 and 3): the camera fov punches 28 to 27.5 and back, the
   * stone's reflection flares 1.6 to 2.4 and back, the glint fades, and a shockwave ring runs across
   * the die. Reduced motion skips all of it (the reflection stays at rest).
   */
  private impact(ember: boolean): void {
    const m = this.mon
    this.impactTl?.kill()
    if (this.hooks.reduced()) {
      m.glintOn = 0
      m.reflectK = 1
      m.shock = -1
      return
    }
    m.shockEmber = ember ? 1 : 0
    const tl = gsap.timeline()
    tl.to(m, { fovPunch: -0.5, duration: MS.fovPunch / 2000, ease: 'power2.out', onUpdate: this.inv }, 0)
    tl.to(m, { fovPunch: 0, duration: MS.fovPunch / 2000, ease: EASE.settle, onUpdate: this.inv }, MS.fovPunch / 2000)
    tl.to(m, { reflectK: 1.5, duration: MS.reflectUp / 1000, ease: 'power1.out', onUpdate: this.inv }, 0)
    tl.to(m, { reflectK: 1, duration: MS.reflectDown / 1000, ease: 'power2.in', onUpdate: this.inv }, MS.reflectUp / 1000)
    tl.to(m, { glintOn: 0, duration: MS.glintOff / 1000, ease: 'power1.out', onUpdate: this.inv }, 0)
    tl.fromTo(m, { shock: 0 }, { shock: 1, duration: MS.shockwave / 1000, ease: 'power3.out', onUpdate: this.inv }, 0)
    tl.set(m, { shock: -1 }, MS.shockwave / 1000)
    this.impactTl = tl
  }

  /** the charge glint switches on as the stone starts to move (it rides the shaft top) */
  private chargeGlint(ember: boolean): void {
    if (this.hooks.reduced()) return
    this.mon.glintOn = 1
    this.mon.glintEmber = ember ? 1 : 0
  }

  /** the capital flares: emissive 0 to 0.8 to 0 over 300 ms, scale 1 to 1.06 to 1 over 220 ms */
  private pulseCapital(): void {
    this.capitalTl?.kill()
    const tl = gsap.timeline()
    tl.to(this.mon, { capital: 0.8, duration: MS.capital / 2000, ease: 'power2.out', onUpdate: this.inv }, 0)
    tl.to(this.mon, { capital: 0, duration: MS.capital / 2000, ease: 'power2.in', onUpdate: this.inv }, MS.capital / 2000)
    tl.fromTo(this.mon, { capScale: 1 }, { capScale: 1.06, duration: MS.capScale / 2000, ease: 'power2.out', onUpdate: this.inv }, 0)
    tl.to(this.mon, { capScale: 1, duration: MS.capScale / 2000, ease: EASE.settle, onUpdate: this.inv }, MS.capScale / 2000)
    this.capitalTl = tl
  }

  private goalFlash(): void {
    this.flashTl?.kill()
    this.flashTl = gsap
      .timeline()
      .set(this.mon, { flash: 1, onUpdate: this.inv })
      .to(this.mon, { flash: 1, duration: MS.flash / 1000, onUpdate: this.inv })
      .to(this.mon, { flash: 0, duration: MS.flashDecay / 1000, ease: 'power2.out', onUpdate: this.inv })
  }

  private tweenCrack(to: number, ms: number): void {
    this.crackTl?.kill()
    if (this.hooks.reduced() || ms <= 0) {
      this.mon.crack = to
      this.inv()
      return
    }
    this.crackTl = gsap.to(this.mon, { crack: to, duration: ms / 1000, ease: EASE.stone, onUpdate: this.inv })
    this.hooks.holdAlways(ms + 50)
  }

  /** Shake only: the trauma model in useFrame plus the DOM stage keyframe. */
  shake(trauma: number): void {
    if (this.hooks.reduced()) return
    this.mon.trauma = Math.max(this.mon.trauma, Math.min(1, Math.max(0, trauma)))
    this.hooks.holdAlways(500)
    shakeStage()
    this.inv()
  }

  /** kind: 'log'. The strike. */
  strikeLog(): void {
    const m = this.mon
    const h0 = m.h
    const h1 = this.hTarget
    const crossed = h0 < GOAL_Y && h1 >= GOAL_Y
    this.placed = true
    if (this.hooks.reduced()) {
      this.strikeTl?.kill()
      this.strikeTl = null
      m.h = h1
      m.crack = this.crackTarget
      this.inv()
      return
    }
    const now = performance.now()
    const coalesce = this.strikeTl !== null && now - this.strikeStartedAt < MS.coalesce
    this.strikeTl?.kill()
    const tl = gsap.timeline()
    this.chargeGlint(crossed)
    tl.to(m, { h: 1.015 * h1, duration: MS.hit / 1000, ease: EASE.hit, onUpdate: this.inv })
    tl.to(m, { h: h1, duration: MS.settle / 1000, ease: EASE.settle, onUpdate: this.inv })
    if (!coalesce) {
      this.strikeStartedAt = now
      tl.call(
        () => {
          m.trauma = 1
          this.burst(h1, crossed)
          this.pulseCapital()
          shakeStage()
          if (crossed) buzz([12, 40, 24])
          else vibrate(18)
          if (crossed) this.goalFlash()
        },
        [],
        MS.hit / 1000,
      )
    } else if (crossed) {
      tl.call(() => this.goalFlash(), [], MS.hit / 1000)
    }
    this.strikeTl = tl
    this.hooks.holdAlways(MS.always)
    if (this.crackTarget !== m.crack) {
      if (crossed) tl.call(() => this.tweenCrack(this.crackTarget, MS.crack), [], MS.hit / 1000)
      else this.tweenCrack(this.crackTarget, MS.crack)
    }
  }

  /** kind: 'remove'. Sink, no dust, no shake. */
  strikeRemove(): void {
    const m = this.mon
    const h1 = this.hTarget
    this.placed = true
    this.strikeTl?.kill()
    this.strikeTl = null
    if (this.hooks.reduced()) {
      m.h = h1
      m.crack = this.crackTarget
      this.inv()
      return
    }
    this.strikeTl = gsap.timeline().to(m, { h: h1, duration: MS.sink / 1000, ease: EASE.stone, onUpdate: this.inv })
    // then one shimmer runs along the gold line, right to left
    this.shimmerTl?.kill()
    const sh = { x: 3 }
    this.shimmerTl = gsap.to(sh, {
      x: -3,
      duration: MS.shimmer / 1000,
      delay: MS.sink / 1000,
      ease: 'power1.inOut',
      onStart: () => {
        m.shimmerX = 3
      },
      onUpdate: () => {
        m.shimmerX = sh.x
        this.inv()
      },
      onComplete: () => {
        m.shimmerX = null
        this.inv()
      },
    })
    this.hooks.holdAlways(MS.sink + MS.shimmer + 100)
    if (h1 < GOAL_Y) {
      if (m.crack > 0) this.tweenCrack(0, MS.crackOut)
    } else if (this.crackTarget !== m.crack) this.tweenCrack(this.crackTarget, MS.crackOut)
  }

  /**
   * Opening S4: camera dolly over `ms` (680 at full speed); column scale.y 0 to H from 60/680 to
   * 580/680 of the window with the hit easing, then the 120 ms settle; dust, trauma 0.75 and a
   * sweep pass at the landing; uCrack bloom from the landing if today is already over.
   */
  playOpeningRise(ms: number): void {
    const m = this.mon
    this.placed = true
    if (this.hooks.reduced() || ms <= 0) {
      this.setInstant()
      return
    }
    this.cameraTl?.kill()
    this.riseTl?.kill()
    this.crackTl?.kill()
    const k = ms / 680
    const H = this.hTarget
    m.camY = CAMERA_OPEN.pos[1]
    m.camZ = CAMERA_OPEN.pos[2]
    m.fov = CAMERA_OPEN.fov
    m.lookY = CAMERA_OPEN.lookY
    m.rotY = 0
    m.crack = 0
    this.cameraTl = gsap.to(m, {
      camY: CAMERA_REST.pos[1],
      camZ: CAMERA_REST.pos[2],
      fov: CAMERA_REST.fov,
      lookY: CAMERA_REST.lookY,
      duration: ms / 1000,
      ease: EASE.stone,
      onUpdate: this.inv,
      onComplete: () => this.hooks.onCameraRest?.(),
    })
    const delay = (60 * k) / 1000
    const rise = (520 * k) / 1000
    const settle = (120 * k) / 1000
    const tl = gsap.timeline()
    tl.set(m, { h: 0 })
    tl.call(() => this.chargeGlint(H > GOAL_Y), [], delay)
    tl.to(m, { h: 1.015 * H, duration: rise, ease: EASE.hit, onUpdate: this.inv }, delay)
    tl.to(m, { h: H, duration: settle, ease: EASE.settle, onUpdate: this.inv }, delay + rise)
    tl.call(
      () => {
        m.trauma = 0.75
        this.burst(H, H > GOAL_Y)
        shakeStage()
        this.sweepOnce(400 * k)
        if (this.crackTarget > 0) this.tweenCrack(this.crackTarget, MS.crack)
      },
      [],
      delay + rise,
    )
    this.riseTl = tl
    this.hooks.holdAlways(ms + MS.always)
    this.inv()
  }

  /** Opening S3: the slab scales X 0 to 1 from the left; ring and sprite fade in. */
  playGoalLine(ms: number): void {
    const m = this.mon
    this.goalTl?.kill()
    if (this.hooks.reduced() || ms <= 0) {
      m.goalX = 1
      m.goalFade = 1
      this.inv()
      return
    }
    const k = ms / 720
    const tl = gsap.timeline()
    tl.set(m, { goalX: 0, goalFade: 0 })
    tl.to(m, { goalX: 1, duration: ms / 1000, ease: EASE.stone, onUpdate: this.inv }, 0)
    tl.to(m, { goalFade: 1, duration: (300 * k) / 1000, ease: 'power1.inOut', onUpdate: this.inv }, (120 * k) / 1000)
    this.goalTl = tl
    this.hooks.holdAlways(ms + 100)
    this.inv()
  }

  /** Opening: the glass ghost rises from the plinth to the line over `ms` (440 at full speed). */
  playGhostReveal(ms: number): void {
    const m = this.mon
    this.ghostTl?.kill()
    if (this.hooks.reduced() || ms <= 0) {
      m.ghost = 1
      this.inv()
      return
    }
    m.ghost = 0
    this.ghostTl = gsap.to(m, { ghost: 1, duration: ms / 1000, ease: EASE.stone, onUpdate: this.inv })
    this.hooks.holdAlways(ms + 50)
    this.inv()
  }

  /** One fast pass of the sweep light: theta += 2.1 rad. */
  sweepOnce(ms: number): void {
    if (this.hooks.reduced() || ms <= 0) return
    this.sweepTl?.kill()
    this.sweepTl = gsap.to(this.mon, { theta: this.mon.theta + 2.1, duration: ms / 1000, ease: EASE.stone, onUpdate: this.inv })
    this.hooks.holdAlways(ms + 50)
  }

  /**
   * Per-frame integration. `dt` seconds, clamped by the caller. Returns true while something is
   * still in motion (trauma or a crack pulse) so a demand loop can keep asking for frames.
   */
  tick(dt: number, idleOn: boolean, reduced: boolean, turnRate = 0.035): boolean {
    const m = this.mon
    let moving = false
    if (m.trauma > 0) {
      m.trauma = Math.max(0, m.trauma - dt * 2.4)
      moving = true
    }
    if (reduced) {
      m.theta = 0.6
      return moving
    }
    if (idleOn) {
      m.rotY += turnRate * dt
      if (m.rotY > Math.PI * 2) m.rotY -= Math.PI * 2
      // the sweep light orbits once per 14 s; sweepOnce adds its 2.1 rad on top
      m.theta += ((Math.PI * 2) / (MS.lightSweep / 1000)) * dt
      if (m.theta > Math.PI * 4) m.theta -= Math.PI * 2
    }
    if (m.crack > 0) {
      m.crackTime += dt
      m.emberPulse += dt
      moving = moving || idleOn
    }
    return moving
  }
}
