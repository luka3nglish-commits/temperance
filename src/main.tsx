import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useStore } from './store/useStore'
import { useUI } from './store/useUI'
import { bootInfo, installStableMark, type BootInfo } from './lib/boot'

performance.mark('tp:boot')

// Single-user app: expose the stores for end-to-end tests and quick console checks.
declare global {
  interface Window {
    __tp?: { store: typeof useStore; ui: typeof useUI; boot: BootInfo }
  }
}
window.__tp = { store: useStore, ui: useUI, boot: bootInfo() }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// the crash-loop guard (index.html): this boot is stable after 30 s, or as soon as the person leaves
installStableMark()

// Pick up a new release when the app comes back to the foreground. The browser's own service-worker
// check can be deferred for several launches; this asks at most once a minute.
if ('serviceWorker' in navigator) {
  let lastCheck = 0
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 60_000) return
    lastCheck = Date.now()
    navigator.serviceWorker
      .getRegistration()
      .then((r) => r?.update())
      .catch(() => {
        /* offline or no registration: the next launch checks again */
      })
  })
}
