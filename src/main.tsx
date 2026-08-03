import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNewRelic } from './lib/newrelic.ts'
import { initPostHog } from './lib/posthog.ts'
import { NewRelicErrorBoundary } from './components/NewRelicErrorBoundary.tsx'

// Must run before React mounts so the agent can instrument page load and AJAX.
// Guarded: analytics SDKs read cookies/storage during init and throw SecurityError
// in sandboxed contexts (e.g. the public /q/:token form embedded in a sandboxed
// iframe) -- an uncaught throw here would stop this module before React mounts.
try {
  initNewRelic()
  initPostHog()
} catch (err) {
  console.error('Analytics init failed', err)
}

// Apply saved theme before first paint to avoid flash
try {
  const stored = localStorage.getItem('clearwork-theme')
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
