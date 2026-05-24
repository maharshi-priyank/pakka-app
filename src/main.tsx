import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply saved theme before first paint to avoid flash
try {
  const stored = localStorage.getItem('clinekt-theme')
  if (stored && JSON.parse(stored)?.state?.isDark) {
    document.documentElement.classList.add('dark')
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
