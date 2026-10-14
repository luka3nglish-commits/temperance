/**
 * The demand ticker (docs/design-spec.md section 7, Frameloop). Calls `onTick` at 24 fps
 * (12 on low tier) only while every gate passes:
 *   idle wanted (startIdle) + TODAY visible + document visible + canvas on screen + a pointerdown
 *   within the last 90 s.
 * Any pointerdown restarts the 90 s clock and ticks once. Becoming visible ticks once.
 */
export type Ticker = {
  setFps(fps: number): void
  /** startIdle / stopIdle */
  setEnabled(on: boolean): void
  /** TODAY is the shown tab */
  setVisible(on: boolean): void
  /** watch this element with an IntersectionObserver */
  observe(el: Element | null): void
  /** treat as a touch: restart the 90 s clock and tick once */
  touch(): void
  /** one tick regardless of gates (store change, resize) */
  poke(): void
  isRunning(): boolean
  dispose(): void
}

export const LIVE_IDLE_CAP = 90_000

export function createTicker(onTick: () => void, fps = 24): Ticker {
  let rate = fps
  let enabled = false
  let visible = true
  let docVisible = typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  let onScreen = true
  let lastTouch = typeof performance !== 'undefined' ? performance.now() : 0
  let timer = 0
  let io: IntersectionObserver | null = null
  let observed: Element | null = null
  let disposed = false

  const now = () => performance.now()
  const gatesOpen = () => enabled && visible && docVisible && onScreen && now() - lastTouch < LIVE_IDLE_CAP

  const stop = () => {
    if (timer) {
      window.clearInterval(timer)
      timer = 0
    }
  }
  const start = () => {
    if (timer || disposed) return
    timer = window.setInterval(() => {
      if (gatesOpen()) onTick()
      else stop()
    }, 1000 / rate)
  }
  const evaluate = () => {
    if (disposed) return
    if (gatesOpen()) start()
    else stop()
  }

  const onVisibility = () => {
    docVisible = document.visibilityState === 'visible'
    if (docVisible) onTick()
    evaluate()
  }
  const onPointer = () => {
    lastTouch = now()
    onTick()
    evaluate()
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pointerdown', onPointer, { capture: true, passive: true })
    window.addEventListener('keydown', onPointer, { capture: true, passive: true })
  }

  return {
    setFps(f) {
      if (f === rate || f <= 0) return
      rate = f
      if (timer) {
        stop()
        evaluate()
      }
    },
    setEnabled(on) {
      enabled = on
      evaluate()
    },
    setVisible(on) {
      visible = on
      if (on) onTick()
      evaluate()
    },
    observe(el) {
      if (el === observed) return
      io?.disconnect()
      io = null
      observed = el
      onScreen = true
      if (el && typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver(
          (entries) => {
            const e = entries[entries.length - 1]
            if (!e) return
            onScreen = e.isIntersecting
            evaluate()
          },
          { threshold: 0 },
        )
        io.observe(el)
      }
    },
    touch: onPointer,
    poke: () => {
      if (!disposed) onTick()
    },
    isRunning: () => timer !== 0,
    dispose() {
      disposed = true
      stop()
      io?.disconnect()
      io = null
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
        window.removeEventListener('pointerdown', onPointer, { capture: true })
        window.removeEventListener('keydown', onPointer, { capture: true })
      }
    },
  }
}
