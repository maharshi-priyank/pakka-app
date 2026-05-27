import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNewRelic } from './lib/newrelic.ts'
import { NewRelicErrorBoundary } from './components/NewRelicErrorBoundary.tsx'

// Must run before React mounts so the agent can instrument page load and AJAX
initNewRelic()

// Apply saved theme before first paint to avoid flash
try {
  const stored = localStorage.getItem('clinekt-theme')
  if (stored && JSON.parse(stored)?.state?.isDark) {
    document.documentElement.classList.add('dark')
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NewRelicErrorBoundary>
      <App />
    </NewRelicErrorBoundary>
  </StrictMode>,
)
