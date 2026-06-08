import { useEffect, useState } from 'react'
import { Download, X, Share, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const STORAGE_KEY = 'clearwork-pwa-install-dismissed-at'
const SESSION_KEY = 'clearwork-session-count'
const MIN_SESSIONS_BEFORE_PROMPT = 2
const SUPPRESS_DAYS_AFTER_DISMISS = 30

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) && !/(crios|fxios)/i.test(ua)
}

function shouldShowPrompt(): boolean {
  if (isStandalone()) return false

  // Track session count
  const count = Number(localStorage.getItem(SESSION_KEY) ?? '0')
  if (count < MIN_SESSIONS_BEFORE_PROMPT) return false

  // Respect dismissal
  const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) ?? '0')
  if (dismissedAt) {
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
    if (daysSince < SUPPRESS_DAYS_AFTER_DISMISS) return false
  }

  return true
}

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [showIosInstructions, setShowIosInstructions] = useState(false)

  // Increment session counter once per page load
  useEffect(() => {
    const count = Number(localStorage.getItem(SESSION_KEY) ?? '0')
    localStorage.setItem(SESSION_KEY, String(count + 1))
  }, [])

  // Listen for install prompt (Chrome/Edge/Android)
  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      if (shouldShowPrompt()) setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Hide when installed
  useEffect(() => {
    function onInstalled() { setVisible(false); setDeferred(null) }
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  // iOS path — no beforeinstallprompt event, show manual instructions banner
  useEffect(() => {
    if (isIOS() && shouldShowPrompt()) {
      // Small delay so it doesn't fight the initial paint
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setVisible(false)
    setShowIosInstructions(false)
  }

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        setDeferred(null)
        setVisible(false)
      }
      return
    }
    // iOS — show instructions modal
    if (isIOS()) {
      setShowIosInstructions(true)
    }
  }

  if (!visible) return null

  return (
    <>
      {/* Banner */}
      <div
        className={cn(
          'fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-sm',
          'bottom-4 sm:bottom-6',
          'bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A]',
          'rounded-2xl shadow-2xl shadow-black/10 p-4',
          'animate-in slide-in-from-bottom-4 fade-in duration-300',
        )}
        role="dialog"
        aria-label="Install ClearWork"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#101828] flex items-center justify-center shrink-0">
            <Download size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-[#101828] dark:text-[#ECEEF3]">
              Install ClearWork on your phone
            </p>
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
              Quick access from your home screen — no app store needed.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-3.5 py-1.5 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[12.5px] font-semibold transition-colors"
              >
                Install
              </button>
              <button
                onClick={dismiss}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#667085] hover:text-[#344054] dark:text-[#8B92A8] dark:hover:text-[#C2C8D8] transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-[#98A2B3] hover:text-[#667085] transition-colors -mt-1 -mr-1 p-1"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS instructions modal */}
      {showIosInstructions && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={dismiss}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={e => e.stopPropagation()}
            className="relative glass-modal rounded-2xl w-full max-w-sm p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">
                Install on iPhone
              </h3>
              <button
                onClick={dismiss}
                className="text-[#98A2B3] hover:text-[#667085] -mt-1 -mr-1 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#F4F6FB] dark:bg-[#21222D] text-[#101828] dark:text-[#ECEEF3] text-[12px] font-bold flex items-center justify-center shrink-0">1</span>
                <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8]">
                  Tap the <Share size={14} className="inline mx-0.5 -mt-0.5 text-[#2563EB]" /> Share button at the bottom of Safari.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#F4F6FB] dark:bg-[#21222D] text-[#101828] dark:text-[#ECEEF3] text-[12px] font-bold flex items-center justify-center shrink-0">2</span>
                <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8]">
                  Scroll and tap <span className="font-semibold">Add to Home Screen</span> <Plus size={13} className="inline mx-0.5 -mt-0.5" />.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#F4F6FB] dark:bg-[#21222D] text-[#101828] dark:text-[#ECEEF3] text-[12px] font-bold flex items-center justify-center shrink-0">3</span>
                <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8]">
                  Tap <span className="font-semibold">Add</span> in the top right. ClearWork is now on your home screen.
                </p>
              </li>
            </ol>

            <button
              onClick={dismiss}
              className="mt-5 w-full py-2.5 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13px] font-semibold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
