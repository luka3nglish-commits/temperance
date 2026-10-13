import { useEffect, useRef, useState } from 'react'
import { useUI, type Tab } from './store/useUI'
import { useMotionClass } from './lib/motion'
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

const SCREENS: Record<Tab, () => React.JSX.Element> = {
  today: TodayScreen,
  library: LibraryScreen,
  history: HistoryScreen,
  settings: SettingsScreen,
}

/**
 * Root layout. One 390 px column on phones; a 430 px slab centred on a #040406 field at 768 px and up.
 * The monument canvas is mounted once here and kept alive across tabs. Screens crossfade 180 ms with a
 * diagonal gold wipe. TODAY is a fixed frame (no page scroll); the other tabs scroll between the header and the bar.
 */
export default function App() {
  const tab = useUI((s) => s.tab)
  useMotionClass()
  useEffect(() => startTilt(), [])

  // 180 ms crossfade + 460 ms gold wipe on tab change
  const [shown, setShown] = useState<Tab>(tab)
  const [fading, setFading] = useState(false)
  const wipeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (tab === shown) return
    setFading(true)
    const wipe = wipeRef.current
    if (wipe) {
      wipe.classList.remove('tp-sweep-run')
      void wipe.offsetWidth
      wipe.classList.add('tp-sweep-run')
    }
    const t = window.setTimeout(() => {
      setShown(tab)
      setFading(false)
    }, 180)
    return () => window.clearTimeout(t)
  }, [tab, shown])

  const Screen = SCREENS[shown]

  return (
    <div className="relative min-h-dvh bg-obsidian-950 md:bg-[#040406] md:[background-image:radial-gradient(60%_50%_at_50%_40%,rgba(216,180,90,0.05),transparent_70%)]">
      <Backdrop />
      <div className="relative mx-auto h-dvh w-full max-w-[430px] overflow-hidden md:h-[min(100vh,932px)] md:shadow-[0_0_0_1px_var(--gold-line)]">
        <MonumentLayer visible={shown === 'today'} />
        <main
          id="main"
          className={`relative z-[var(--z-inscriptions)] h-full transition-opacity duration-[180ms] ${fading ? 'opacity-0' : 'opacity-100'} ${
            shown === 'today' ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain scrollbar-none'
          }`}
          style={{ paddingBottom: shown === 'today' ? 0 : 'calc(56px + var(--safe-bottom) + 24px)' }}
        >
          <Screen />
        </main>
        <div
          ref={wipeRef}
          aria-hidden="true"
          className="tp-sweep pointer-events-none absolute inset-0 z-[var(--z-inscriptions)] opacity-0"
        />
        <TabBar />
        <Shards />
      </div>
      <LogSheet />
      <Toaster />
      <Opening />
    </div>
  )
}
