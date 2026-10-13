/**
 * PLACEHOLDER owned by the intro/shell agent. See docs/design-spec.md section 8 "Light".
 * The real tilt loop writes --tilt-x (-1..1) and --tilt-angle on :root at 30 Hz (15 Hz low tier)
 * from pointer position (desktop) or DeviceOrientation gamma (phone, opt-in on iOS), lerped 0.12
 * per frame, and toggles the `auto-sweep` class on :root while tilt is not live.
 */
export function startTilt(): () => void {
  document.documentElement.classList.add('auto-sweep')
  return () => document.documentElement.classList.remove('auto-sweep')
}

/** Ask iOS for orientation permission inside a user gesture. Resolves true when granted. */
export async function requestTiltPermission(): Promise<boolean> {
  const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> } }).DeviceOrientationEvent
  if (D && typeof D.requestPermission === 'function') {
    try {
      return (await D.requestPermission()) === 'granted'
    } catch {
      return false
    }
  }
  return true
}
