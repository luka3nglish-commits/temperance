import { useEffect } from 'react'
import { create } from 'zustand'
import { useToast } from '../components/ui'
import { useUI } from '../store/useUI'

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const SNOOZE_KEY = 'temperance.install.snoozed'
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000
const DELAY_MS = 20_000
const RETRY_MS = 4_000
const TOAST_MS = 8_000

/** The copy of the toast-lane prompt (polish-spec 6.6). */
export const INSTALL_TEXT = 'Keep it on the home screen.'
/** iOS Safari has no install event: the one-line hint instead. */
export const IOS_INSTALL_TEXT = 'Share, then Add to Home Screen.'

/** True when the page runs as an installed app. */
export function isStandalone(): boolean {
  try {
    if (typeof window === 'undefined') return false
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    return (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

/** True on iPhone and iPad (including iPadOS reporting itself as a Mac with touch). */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** Snoozed: the toast-lane prompt was shown (or declined) in the last 14 days. The SETTINGS row ignores it. */
export function isSnoozed(now = Date.now()): boolean {
  try {
    const v = localStorage.getItem(SNOOZE_KEY)
    if (!v) return false
    const at = Number(v)
    return Number.isFinite(at) && now < at + SNOOZE_MS
  } catch {
    return false
  }
}

function snooze(): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()))
  } catch {
    /* storage may be blocked; the prompt still stays away for this session */
  }
}

type InstallState = {
  /** the captured beforeinstallprompt event (Chrome, Edge, Android) */
  deferred: BeforeInstallPromptEvent | null
  /** running as the installed app, or installed during this session */
  installed: boolean
  ios: boolean
  /** the toast-lane prompt already ran this session */
  prompted: boolean
}

/** Install state shared by the SETTINGS INSTALL row and the toast-lane prompt. */
export const useInstall = create<InstallState>()(() => ({
  deferred: null,
  installed: isStandalone(),
  ios: isIOS(),
  prompted: false,
}))

/** Whether the app can be installed from here: a captured prompt, or iOS Safari outside the installed app. */
export function canInstall(s: Pick<InstallState, 'deferred' | 'installed' | 'ios'>): boolean {
  return !s.installed && (s.deferred !== null || s.ios)
}

// capture the event from the first render: this module loads with the app root
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    useInstall.setState({ deferred: e as BeforeInstallPromptEvent })
  })
  window.addEventListener('appinstalled', () => {
    useInstall.setState({ installed: true, deferred: null })
    useToast.getState().dismiss('install')
  })
}

/**
 * Run the install. Chrome: the captured prompt (accepted = installed, dismissed = snoozed 14 days).
 * iOS: the Share hint through the toast lane. Returns nothing; the INSTALL row hides itself once
 * the app is installed.
 */
export async function runInstall(): Promise<void> {
  const { deferred, ios } = useInstall.getState()
  if (!deferred) {
    if (ios) useToast.getState().show({ id: 'install', text: IOS_INSTALL_TEXT, duration: TOAST_MS })
    return
  }
  useInstall.setState({ deferred: null })
  try {
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') useInstall.setState({ installed: true })
    else snooze()
  } catch {
    snooze()
  }
}

/**
 * The toast-lane install prompt (polish-spec 4.13 and 6.6). Renders nothing: it never floats a card.
 * After 20 s on SETTINGS or LIBRARY (never TODAY, never HISTORY), once the opening is done, when the
 * app is installable and the prompt is not snoozed, it shows ONE toast through the shared lane:
 * `Keep it on the home screen.` with INSTALL, for 8 s, and only when the lane is idle (no toast
 * showing, no sheet open); when busy it looks again 4 s later. Showing it snoozes it for 14 days
 * (a toast has no LATER: letting it pass is the later); a declined install snoozes it too. The
 * SETTINGS INSTALL row stays available regardless. Mount once at the app root.
 */
export function InstallPrompt() {
  const introDone = useUI((s) => s.introDone)
  const tab = useUI((s) => s.tab)
  const installable = useInstall(canInstall)
  const prompted = useInstall((s) => s.prompted)

  useEffect(() => {
    if (!introDone || !installable || prompted) return
    if (tab !== 'settings' && tab !== 'library') return
    if (isSnoozed()) return
    let t = 0
    const attempt = () => {
      if (!useToast.getState().idle()) {
        t = window.setTimeout(attempt, RETRY_MS)
        return
      }
      const s = useInstall.getState()
      if (!canInstall(s) || s.prompted) return
      useInstall.setState({ prompted: true })
      snooze()
      useToast.getState().show({
        id: 'install',
        text: s.deferred ? INSTALL_TEXT : IOS_INSTALL_TEXT,
        action: s.deferred ? { label: 'Install', onClick: () => void runInstall() } : undefined,
        duration: TOAST_MS,
      })
    }
    t = window.setTimeout(attempt, DELAY_MS)
    return () => window.clearTimeout(t)
  }, [introDone, installable, prompted, tab])

  return null
}
