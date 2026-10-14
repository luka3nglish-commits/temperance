import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui'
import { useUI } from '../store/useUI'
import { isIOS, isStandalone } from './SettingsData'

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const SNOOZE_KEY = 'temperance.install.snoozed'
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000
const DELAY_MS = 20_000

function snoozed(): boolean {
  try {
    const v = localStorage.getItem(SNOOZE_KEY)
    if (!v) return false
    const at = Number(v)
    return Number.isFinite(at) && Date.now() < at + SNOOZE_MS
  } catch {
    return false
  }
}

function snooze(): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()))
  } catch {
    /* storage may be blocked; the slab still goes away for this session */
  }
}

/**
 * A quiet obsidian slab above the tab bar, 20 s after the opening is done, only when the app is not
 * already installed. INSTALL runs the captured beforeinstallprompt; LATER snoozes it 14 days.
 * iOS Safari has no prompt event, so the slab carries the one-line hint instead.
 * Mount once at the app root so the event is captured from the first render.
 */
export function InstallPrompt() {
  const introDone = useUI((s) => s.introDone)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [armed, setArmed] = useState(false)
  const [gone, setGone] = useState(() => isStandalone() || snoozed())
  const ios = useMemo(isIOS, [])

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setGone(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  useEffect(() => {
    if (!introDone || gone) return
    const t = window.setTimeout(() => setArmed(true), DELAY_MS)
    return () => window.clearTimeout(t)
  }, [introDone, gone])

  const show = armed && !gone && (deferred !== null || ios)
  if (!show) return null

  const later = () => {
    snooze()
    setGone(true)
  }
  const install = async () => {
    const ev = deferred
    if (!ev) return
    setDeferred(null)
    try {
      await ev.prompt()
      const choice = await ev.userChoice
      if (choice.outcome === 'accepted') setGone(true)
      else later()
    } catch {
      later()
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Install Temperance"
      className="pointer-events-none fixed inset-x-0 flex justify-center px-4"
      style={{ bottom: 'calc(var(--safe-bottom) + 72px)', zIndex: 45 }}
    >
      <div className="rise-in pointer-events-auto w-full max-w-[358px] rounded-[4px] border border-[var(--gold-line-strong)] bg-obsidian-800 px-4 pt-3 pb-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <p className="font-display text-[10px] tracking-[0.35em] text-bone-dim">Install</p>
        <p className="mt-1 font-body text-[15px] leading-[1.4] text-bone">{ios ? 'Share, then Add to Home Screen.' : 'Keep it on the home screen. Data stays on this device.'}</p>
        <div className="mt-1 flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={later}>
            Later
          </Button>
          {ios ? (
            <Button variant="ghost" size="sm" className="text-gold-300" onClick={later}>
              Done
            </Button>
          ) : (
            <Button variant="hairline" size="sm" onClick={() => void install()}>
              Install
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
