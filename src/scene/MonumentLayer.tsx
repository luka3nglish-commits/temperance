/**
 * PLACEHOLDER owned by the scene agent (src/scene/**).
 * The real MonumentLayer mounts once at the app root, absolutely positioned behind the TODAY
 * inscriptions (390 x 513 from y 47 to 560 on a 390 x 844 phone), stays alive across tabs
 * (visibility hidden off TODAY), chooses WebGL or the SVG monument via SafeCanvas, subscribes to
 * the store pulse for strikes, writes --goal-y and --plinth-y on :root, and registers a
 * MonumentHandle (src/scene/handle.ts).
 */
export function MonumentLayer({ visible }: { visible: boolean }) {
  return <div data-monument-placeholder aria-hidden="true" style={{ visibility: visible ? 'visible' : 'hidden' }} />
}
