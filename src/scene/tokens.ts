/**
 * Scene colours (docs/design-spec.md section 2, "Three.js colours") and the dev tunables.
 * Hex strings for three.Color; the ember emissive is a linear vec3 scaled by 2.5.
 */
export const COL = {
  column: '#0B0B0F',
  plinth: '#0D0D12',
  keyLight: '#FFE9B8',
  rimLight: '#C8B07A',
  sweepLight: '#FFF4D6',
  emberLight: '#FF6A2B',
  goalLine: '#F6E3A1',
  goalFlash: '#FFF7DA',
  goalGlow: '#D8B45A',
  capital: '#D8B45A',
  capitalEmissive: '#F6E3A1',
  dust: '#9A8E7A',
  spark: '#FF8C42',
  fog: '#050507',
  ember: '#FF5A1F',
  ambient: '#2A2A33',
  envWarm: '#FFF1CC',
  envSide: '#8C7A5A',
  envEmber: '#FF6A2B',
} as const

/** crack emissive, linear: vec3(1.0, 0.35, 0.12) * 2.5 */
export const EMBER_EMISSIVE: [number, number, number] = [2.5, 0.875, 0.3]

/** Scene geometry constants shared by the 3D column and the SVG monument. */
export const GOAL_Y = 2.0
/** scale.y clamp: 147 percent of goal */
export const H_MAX = 2.86
export const H_MIN = 0.18
/** design px per world unit at 513 px canvas height (section 7) */
export const PX_PER_UNIT = 122
/** canvas height in CSS px */
export const STAGE_H = 513
/** plinth top within the 513 px stage (screen y 507 minus the 47 px safe top) */
export const STAGE_PLINTH_Y = 460

export const CAMERA_REST = { pos: [0, 0.9, 8.4] as const, fov: 28, lookY: 1.67 }
export const CAMERA_OPEN = { pos: [0, 0.35, 6.0] as const, fov: 34, lookY: 0.6 }

/** Column height in world units for an eaten / goal pair (section 7, Units). */
export function heightFor(eatenKcal: number, goalKcal: number): number {
  const g = goalKcal > 0 ? goalKcal : 1
  const h = H_MIN + 1.82 * (Math.max(0, eatenKcal) / g)
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
  exposure: 0.95,
  key: 18,
  rim: 1.2,
  sweep: 9,
  ember: 6,
  ambient: 0.12,
  envIntensity: 1,
  follow: 0.4,
  turn: 0.035,
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __tune: Tunables }).__tune = T
}
