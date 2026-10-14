/**
 * Vitest setup: browser globals that jsdom does not implement but the app uses.
 * Each stub is only installed when the real thing is missing, so a test can still define its own.
 */

type MQL = Pick<MediaQueryList, 'matches' | 'media' | 'addEventListener' | 'removeEventListener' | 'addListener' | 'removeListener' | 'onchange' | 'dispatchEvent'>

if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MQL as MediaQueryList
  }

  if (typeof (window as { IntersectionObserver?: unknown }).IntersectionObserver !== 'function') {
    class IO {
      readonly root = null
      readonly rootMargin = '0px'
      readonly thresholds: readonly number[] = [0]
      private readonly cb: IntersectionObserverCallback
      constructor(cb: IntersectionObserverCallback) {
        this.cb = cb
      }
      observe(target: Element) {
        // report every observed element as visible at once
        this.cb([{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }
    ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO
    ;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO
  }

  if (typeof (window as { ResizeObserver?: unknown }).ResizeObserver !== 'function') {
    class RO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = RO
    ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = RO
  }

  if (typeof window.requestAnimationFrame !== 'function') {
    window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16)
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id)
  }

  if (!('vibrate' in navigator)) {
    Object.defineProperty(navigator, 'vibrate', { value: () => true, configurable: true })
  }
}
