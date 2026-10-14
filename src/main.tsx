import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useStore } from './store/useStore'
import { useUI } from './store/useUI'

performance.mark('tp:boot')

// Single-user app: expose the stores for end-to-end tests and quick console checks.
declare global {
  interface Window {
    __tp?: { store: typeof useStore; ui: typeof useUI }
  }
}
window.__tp = { store: useStore, ui: useUI }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
