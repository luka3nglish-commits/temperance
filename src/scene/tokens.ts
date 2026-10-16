/**
 * Scene colours (docs/polish-spec.md section 5, on top of docs/design-spec.md section 2) and the dev
 * tunables. Hex strings for three.Color; the ember emissive is a linear vec3 scaled by 2.5.
 */
export const COL = {
  column: '#121218',
  plinth: '#121217',
  keyLight: '#FFE9B8',
  rimLight: '#C8B07A',
  /** the warm fresnel rim on both silhouettes (obsidian `uRimColor`) */
  rimEdge: '#C9A961',
  sweepLight: '#FFF4D6',
  emberLight: '#FF6A2B',
  goalLine: '#F6E3A1',
  /** the goal slab core */
  goalCore: '#EBD08A',
  goalFlash: '#FFF7DA',
  goalGlow: '#D8B45A',
  capital: '#D8B45A',
  capitalEmissive: '#F6E3A1',
  dust: '#9A8E7A',
  smoke: '#8E826E',
  mote: '#FFE3A8',
  spark: '#FF8C42',
  fog: '#050507',
  ember: '#FF5A1F',
  ambient: '#3A3428',
  envWarm: '#FFF1CC',
  envSide: '#8C7A5A',
  envEmber: '#FF6A2B',
} as const

/** crack emissive, linear: vec3(1.0, 0.35, 0.12) * 2.5 */
export const EMBER_EMISSIVE: [number, number, number] = [2.5, 0.875, 0.3]

/** Scene geometry constants shared by the 3D column and the SVG monument. */
export const GOAL_Y = 2.0
/** input clamp for heightFor (147 percent of goal); the drawn height goes through renderH */
export const H_MAX = 2.86
/** an empty day still shows the base and the capital (0.24 + 0.12) */
export const H_MIN = 0.36
/** design px per world unit at 513 px canvas height (section 7) */
export const PX_PER_UNIT = 122
/** canvas height in CSS px */
export const STAGE_H = 513
/** plinth top within the 513 px stage (screen y 507 minus the 47 px safe top) */
export const STAGE_PLINTH_Y = 460
/** the goal line within the stage (216) */
export const STAGE_GOAL_Y = STAGE_PLINTH_Y - GOAL_Y * PX_PER_UNIT

/** the column (polish-spec 5.3): shaft radius, Attic base height, capital height */
export const COL_R = 0.36
export const BASE_H = 0.24
export const CAP_H = 0.12
/** where the shaft ends under the capital for a drawn height R */
export function shaftTop(r: number): number {
  return r - CAP_H
}

/** Rendered column height: identical up to the goal, then an asymptote 0.30 units (37 px) above the line. */
export const OVER_MAX = 0.3
export const OVER_MAX_PX = Math.round(OVER_MAX * PX_PER_UNIT) // 37
export function renderH(h: number): number {
  return h <= GOAL_Y ? h : GOAL_Y + OVER_MAX * (1 - Math.exp(-(h - GOAL_Y) / OVER_MAX))
}

export const CAMERA_REST = { pos: [0, 0.9, 8.4] as const, fov: 28, lookY: 1.67 }
export const CAMERA_OPEN = { pos: [0, 0.35, 6.0] as const, fov: 34, lookY: 0.6 }

/** Column height in world units for an eaten / goal pair: H_MIN on an empty day, exactly GOAL_Y at the goal. */
export function heightFor(eatenKcal: number, goalKcal: number): number {
  const g = goalKcal > 0 ? goalKcal : 1
  const h = H_MIN + (GOAL_Y - H_MIN) * (Math.max(0, eatenKcal) / g)
  return Math.min(H_MAX, h)
}

/** uCrack: fully fractured at 25 percent over the goal. */
export function crackFor(eatenKcal: number, goalKcal: number): number {
  const g = goalKcal > 0 ? goalKcal : 1
  const c = (eatenKcal - g) / (0.25 * g)
  return Math.max(0, Math.min(1, c))
}

/**
 * Dev tunables, read each frame by the scene (never React state). In dev builds the object is
 * exposed as window.__tune so values can be nudged from the console.
 */
export type Tunables = {
  exposure: number
  key: number
  rim: number
  sweep: number
  ember: number
  ambient: number
  envIntensity: number
  /** sweep light follows --tilt-x by this many radians */
  follow: number
  /** idle turn, rad/s */
  turn: number
}

export const T: Tunables = {
  exposure: 1.0,
  key: 22,
  rim: 2.5,
  sweep: 9,
  ember: 6,
  ambient: 0.22,
  envIntensity: 1,
  follow: 0.4,
  turn: 0.035,
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __tune: Tunables }).__tune = T
}
