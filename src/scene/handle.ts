/**
 * The contract between the 3D scene (src/scene/**) and the opening sequence (src/intro/**).
 *
 * The scene registers a MonumentHandle via `setMonumentHandle` when its canvas (or the SVG
 * fallback) is mounted. The opening timeline calls these methods at scheduled times. Every method
 * must be safe to call before the scene is ready (no-op or deferred), and must never throw.
 */

export type MonumentMode = 'webgl' | 'svg'

export interface MonumentHandle {
  mode: MonumentMode
  /** resolves when shaders are compiled (webgl) or at once (svg). Never rejects. */
  ready(): Promise<void>
  /** true once ready() has resolved */
  isReady(): boolean
  /** jump every visual to the state for the current store (column at H, cracks, camera at rest). No motion. */
  setInstant(): void
  /** the opening: column from scale 0 to H with the hit easing, camera dolly, dust at landing. ms = total. */
  playOpeningRise(ms: number): void
  /** draw the gold goal line across the stage (opening S3). */
  playGoalLine(ms: number): void
  /** one fast pass of the sweep light (opening S4 landing, strike). */
  sweepOnce(ms: number): void
  /** camera / stage shake. trauma 0..1 */
  shake(trauma: number): void
  /** start the live idle (slow turn, light sweep, demand ticker). */
  startIdle(): void
  /** stop the ticker (another tab, hidden). */
  stopIdle(): void
}

const noop: MonumentHandle = {
  mode: 'svg',
  ready: () => Promise.resolve(),
  isReady: () => true,
  setInstant: () => {},
  playOpeningRise: () => {},
  playGoalLine: () => {},
  sweepOnce: () => {},
  shake: () => {},
  startIdle: () => {},
  stopIdle: () => {},
}

let current: MonumentHandle = noop
const listeners = new Set<(h: MonumentHandle) => void>()

export function setMonumentHandle(h: MonumentHandle | null): void {
  current = h ?? noop
  listeners.forEach((l) => l(current))
}

export function getMonumentHandle(): MonumentHandle {
  return current
}

/** Subscribe to handle changes (the scene may swap webgl -> svg after a context loss). */
export function onMonumentHandle(l: (h: MonumentHandle) => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}
