import { Suspense, lazy, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useUI, type Tab } from './store/useUI'
import { useMotionClass, useReducedMotion } from './lib/motion'
import { startTilt } from './lib/tilt'
import { TabBar } from './components/TabBar'
import { Backdrop } from './components/Backdrop'
import { Shards } from './components/ui/Shards'
import { Toaster } from './components/ui'
import { MonumentLayer } from './scene/MonumentLayer'
import { Opening } from './intro/Opening'
import { TodayScreen } from './screens/TodayScreen'
import { LogSheet } from './screens/LogSheet'
import { LibraryScreen } from './screens/LibraryScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { InstallPrompt } from './screens/SettingsInstall'

const SCREENS: Record<Tab, () => React.JSX.Element> = {
  today: TodayScreen,
  library: LibraryScreen,
  history: HistoryScreen,
  settings: SettingsScreen,
}

const ORDER: Record<Tab, number> = { today: 0, library: 1, history: 2, settings: 3 }

/** DEV ONLY: the primitives kit at /temperance/#kit (never in a production build). */
const Kit = import.meta.env.DEV ? lazy(() => import('./components/ui/Kit')) : null
const useKitHash = () => {
  const [on, setOn] = useState(() => !!Kit && typeof location !== 'undefined' && location.hash === '#kit')
  useEffect(() => {
    if (!Kit) return
    const sync = () => setOn(location.hash === '#kit')
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  return on
}
const TAB_OUT_MS = 120

/**
 * Root layout. One column on phones; on 768 px and up a 430 px obsidian slab (a dark hairline, a
 * faint gold second edge and a deep drop shadow) on a #040406 field with a warm pool behind it.
 * The monument canvas is mounted once here and kept alive across tabs. TODAY is a fixed frame (no
 * page scroll); the other tabs scroll between the header and the bar.
 *
 * Tab change (polish-spec 7.2 item 4): the outgoing screen fades out over 120 ms (linear), then the
 * incoming one fades in and slides 14 px from the side it comes from over 260 ms (stone ease), while
 * a diagonal gold and ember light wipes across once. Reduced motion: a plain crossfade, no wipe, no slide.
 */
export default function App() {
  const tab = useUI((s) => s.tab)
  const reduced = useReducedMotion()
  const kit = useKitHash()
  useMotionClass()
  useEffect(() => startTilt(), [])

  const [shown, setShown] = useState<Tab>(tab)
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const dir = useRef(0)
  const wipeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (tab === shown) return
    // reduced motion: transitions are zeroed globally, so a fade-out phase would only blank the frame; swap at once
    if (reduced) {
      dir.current = 0
      setShown(tab)
      setPhase('idle')
      return
    }
    dir.current = Math.sign(ORDER[tab] - ORDER[shown])
    setPhase('out')
    const wipe = wipeRef.current
    if (wipe && !reduced) {
      wipe.classList.remove('tp-sweep-run')
      void wipe.offsetWidth
      wipe.classList.add('tp-sweep-run')
    }
    const t = window.setTimeout(() => {
      setShown(tab)
      setPhase('in')
    }, TAB_OUT_MS)
    return () => window.clearTimeout(t)
  }, [tab, shown, reduced])

  useEffect(() => {
    if (phase !== 'in') return
    const t = window.setTimeout(() => setPhase('idle'), 300)
    return () => window.clearTimeout(t)
  }, [phase])

  const Screen = SCREENS[shown]
  const mainStyle: CSSProperties = {
    paddingBottom: shown === 'today' ? 0 : 'calc(56px + var(--safe-bottom) + 24px)',
    opacity: phase === 'out' ? 0 : 1,
    transition: phase === 'out' ? `opacity ${TAB_OUT_MS}ms linear` : undefined,
    ['--tab-dir' as string]: dir.current,
  }

  return (
    <div className="relative min-h-dvh bg-obsidian-950 md:bg-[#040406] md:[background-image:radial-gradient(60%_50%_at_50%_40%,rgba(216,180,90,0.06),transparent_70%)]">
      <Backdrop />
      <div className="relative mx-auto h-dvh w-full max-w-[430px] overflow-hidden md:h-[min(100vh,932px)] md:shadow-[0_0_0_1px_#1A1A21,0_0_0_2px_rgba(216,180,90,0.06),0_40px_120px_rgba(0,0,0,0.8)]">
        <MonumentLayer visible={shown === 'today' && !kit} />
        <main
          id="main"
          className={`relative z-[var(--z-inscriptions)] h-full ${phase === 'in' ? 'tp-tab-in' : ''} ${
            shown === 'today' ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain scrollbar-none'
          }`}
          style={mainStyle}
        >
          {kit && Kit ? (
            <Suspense fallback={null}>
              <Kit />
            </Suspense>
          ) : (
            <Screen />
          )}
        </main>
        <div ref={wipeRef} aria-hidden="true" className="tp-sweep pointer-events-none absolute inset-0 z-[var(--z-inscriptions)] opacity-0" />
        <TabBar />
        <Shards />
      </div>
      <LogSheet />
      <Toaster />
      <InstallPrompt />
      <Opening />
    </div>
  )
}
