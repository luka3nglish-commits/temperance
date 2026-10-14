/**
 * The wiring between MonumentLayer (owner), ColumnScene (the 3D renderer) and FallbackMonument
 * (the SVG renderer). One `Monument` choreography (strike.ts) tweens a plain `mon` object; every
 * tween calls `invalidate`, which fans out to the R3F invalidate (when a canvas is live) and the
 * SVG renderer (while it is shown). Slots are plain mutable fields so neither renderer needs React
 * state per frame.
 */
import { createContext, useContext } from 'react'
import { isReducedMotion } from '../lib/motion'
import { Monument } from './strike'

export type FrameloopMode = 'never' | 'always' | 'demand'

export type SceneBus = {
  monument: Monument
  /** R3F invalidate, set by ColumnScene while a canvas is live */
  sceneInvalidate: (() => void) | null
  /** keep frameloop `always` for `ms`, set by ColumnScene */
  sceneHold: ((ms: number) => void) | null
  /** SVG monument render, set by FallbackMonument while shown */
  svgRender: (() => void) | null
  /** recompute --goal-y / --plinth-y from the rest camera, set by ColumnScene */
  sceneStageVars: (() => void) | null
  /** live idle wanted (startIdle / stopIdle) */
  idle: boolean
  /** TODAY is the shown tab */
  visible: boolean
  /** live dust instances: the tier count, lowered by the PerformanceMonitor on decline */
  dustCount: number
  /** absolute top of the layer inside the 430 px frame, in px */
  layerTop: () => number
  /** the layer's CSS scale on short phones (1 on a 390 x 844 phone); projected px are multiplied by it */
  layerScale: number
  /** test hook: the live renderer reports the rendered column height here (data-h on tp-column) */
  reportH: ((h: number) => void) | null
  /** --goal-y and --plinth-y writer; the scene calls it at rest and on resize, the layer in svg mode */
  writeStageVars: (goalPx: number, plinthPx: number) => void
}

export function createBus(): SceneBus {
  const bus: SceneBus = {
    monument: null as unknown as Monument,
    sceneInvalidate: null,
    sceneHold: null,
    svgRender: null,
    sceneStageVars: null,
    idle: false,
    visible: true,
    dustCount: 220,
    layerTop: () => 0,
    layerScale: 1,
    reportH: null,
    writeStageVars: (goalPx, plinthPx) => {
      if (typeof document === 'undefined') return
      try {
        const root = document.documentElement.style
        root.setProperty('--goal-y', `${Math.round(goalPx)}px`)
        root.setProperty('--plinth-y', `${Math.round(plinthPx)}px`)
      } catch {
        /* no DOM */
      }
    },
  }
  bus.monument = new Monument({
    invalidate: () => {
      bus.sceneInvalidate?.()
      bus.svgRender?.()
    },
    holdAlways: (ms) => bus.sceneHold?.(ms),
    reduced: () => isReducedMotion(),
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000,
  })
  return bus
}

export const BusContext = createContext<SceneBus | null>(null)

export function useBus(): SceneBus {
  const b = useContext(BusContext)
  if (!b) throw new Error('useBus outside MonumentLayer')
  return b
}
