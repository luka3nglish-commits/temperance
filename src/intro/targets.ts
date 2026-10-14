/**
 * The DOM the opening animates. Every element that takes part carries a `data-intro` attribute
 * (CLAUDE.md "Opening DOM targets"). TodayScreen owns wordmark, date, label, number, subline,
 * flanks, goal-label, ring, ring-readouts and stoic; TabBar owns tabbar and keystone; Shards owns
 * shards. A missing target is skipped, never an error: the opening degrades shot by shot.
 */

export const TARGET_NAMES = [
  'wordmark',
  'date',
  'label',
  'number',
  'subline',
  'flanks',
  'goal-label',
  'ring',
  'ring-readouts',
  'stoic',
  'tabbar',
  'shards',
] as const

export type TargetName = (typeof TARGET_NAMES)[number]
export type Targets = Partial<Record<TargetName, HTMLElement>>

/** Targets hidden with opacity before the timeline; the rest hide with clip-path. */
export const OPACITY_TARGETS: readonly TargetName[] = [
  'wordmark',
  'date',
  'label',
  'subline',
  'flanks',
  'goal-label',
  'ring',
  'ring-readouts',
  'stoic',
  'tabbar',
  'shards',
]

/** Targets hidden with clip-path (they are cut out of the stone, not faded). */
export const CLIP_TARGETS: readonly TargetName[] = ['number']

export function queryTargets(root: ParentNode = document): Targets {
  const out: Targets = {}
  for (const name of TARGET_NAMES) {
    const el = root.querySelector<HTMLElement>(`[data-intro="${name}"]`)
    if (el) out[name] = el
  }
  return out
}

/** The stage container that runs the landing shake (falls back to the main column). */
export function queryStage(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-intro="stage"]') ?? root.querySelector<HTMLElement>('#main')
}

/** The three macro arcs, when the ring exposes them (`data-arc` on each path). */
export function queryArcs(ring: HTMLElement | undefined): SVGPathElement[] {
  if (!ring) return []
  return Array.from(ring.querySelectorAll<SVGPathElement>('path[data-arc]'))
}

/** Remove every inline style the opening may have left so the final frame is pure CSS. */
export function clearTargetStyles(targets: Targets, arcs: SVGElement[] = []): void {
  const props = ['opacity', 'clip-path', 'transform', 'translate', '--tilt-x', 'will-change']
  for (const name of TARGET_NAMES) {
    const el = targets[name]
    if (!el) continue
    for (const p of props) el.style.removeProperty(p)
  }
  for (const a of arcs) {
    a.style.removeProperty('stroke-dasharray')
    a.style.removeProperty('stroke-dashoffset')
  }
}
