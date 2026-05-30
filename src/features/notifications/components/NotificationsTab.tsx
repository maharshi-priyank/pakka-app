import { useState } from 'react'
import { toast } from 'sonner'
import { Volume2, VolumeX, Monitor, CheckCircle2, AlertCircle, Play, Smartphone, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SOUND_OPTIONS, type SoundId,
  getSound, saveSound,
  getDesktopEnabled, saveDesktopEnabled,
  getDesktopPermission, requestDesktopPermission,
  playSound,
} from '../hooks/useNotificationAlert'
import { usePush } from '../usePush'

export default function NotificationsTab() {
  const [selectedSound,  setSelectedSound]  = useState<SoundId>(() => getSound())
  const [desktopEnabled, setDesktopEnabled] = useState(() => getDesktopEnabled())
  const [permission,     setPermission]     = useState(() => getDesktopPermission())
  const [previewingId,   setPreviewingId]   = useState<SoundId | null>(null)
  const push = usePush()

  async function handlePushToggle() {
    if (push.subscribed) {
      await push.disable()
      toast.success('Push notifications disabled')
    } else {
      const ok = await push.enable()
      if (ok) toast.success('Push notifications enabled')
      else if (push.permission === 'denied') toast.error('Permission was blocked. Enable it in your browser settings.')
    }
  }

  async function handleSendTest() {
    try {
      await push.sendTest()
      toast.message('Test push sent', { description: 'Should arrive within a few seconds.' })
    } catch {
      toast.error('Could not send test push')
    }
  }

  function handleSoundSelect(id: SoundId) {
    setSelectedSound(id)
    saveSound(id)
  }

  async function previewSound(id: SoundId) {
    setPreviewingId(id)
    playSound(id)
    setTimeout(() => setPreviewingId(null), 800)
  }

  async function handleDesktopToggle() {
    const next = !desktopEnabled

    if (next && permission !== 'granted') {
      const granted = await requestDesktopPermission()
      setPermission(getDesktopPermission())
      if (!granted) return
    }

    setDesktopEnabled(next)
    saveDesktopEnabled(next)
  }

  return (
    <div className="space-y-7">

      {/* ── Sound ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Volume2 size={15} strokeWidth={2} className="text-[#344054] dark:text-[#C2C8D8]" />
          <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Notification sound</h3>
        </div>
        <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mb-4 ml-[23px]">
          Plays when a new notification arrives (proposal opened, invoice paid, etc.)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-[23px]">
          {SOUND_OPTIONS.map(opt => {
            const isSelected  = selectedSound === opt.id
            const isPreviewing = previewingId === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => handleSoundSelect(opt.id)}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E2040]'
                    : 'border-[#EAECF0] dark:border-[#3D4258] bg-white dark:bg-[#1A1B23] hover:border-[#C7D7FD] dark:hover:border-[#4B5280] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Selected indicator */}
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                    isSelected ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#D0D5DD] dark:border-[#3D4258]',
                  )}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={cn(
                      'text-[13px] font-semibold leading-none',
                      isSelected ? 'text-[#2563EB]' : 'text-[#344054] dark:text-[#C2C8D8]',
                    )}>
                      {opt.label}
                    </p>
                    <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{opt.description}</p>
                  </div>
                </div>

                {/* Preview button (not for 'none') */}
                {opt.id !== 'none' && (
                  <button
                    onClick={e => { e.stopPropagation(); previewSound(opt.id) }}
                    title="Preview"
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                      isPreviewing
                        ? 'bg-[#0D1117] dark:bg-[#6366F1] text-white scale-95'
                        : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8] hover:bg-[#E4E7EC] dark:hover:bg-[#26283A] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                    )}
                  >
                    <Play size={11} strokeWidth={2.5} className={isPreviewing ? 'animate-pulse' : ''} />
                  </button>
                )}

                {opt.id === 'none' && (
                  <VolumeX size={14} className="text-[#98A2B3] dark:text-[#545C74] shrink-0" strokeWidth={2} />
                )}
              </button>
            )
          })}
        </div>
      </section>

      <div className="border-t border-[#EAECF0] dark:border-[#26283A]" />

      {/* ── Desktop notifications ──────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={15} strokeWidth={2} className="text-[#344054] dark:text-[#C2C8D8]" />
          <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Desktop notifications</h3>
        </div>
        <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mb-4 ml-[23px]">
          Show a system notification even when this tab is in the background.
        </p>

        <div className="ml-[23px] space-y-3">
          {/* Permission status banner */}
          {permission === 'denied' && (
            <div className="flex items-start gap-2.5 bg-[#FEF3F2] dark:bg-red-950/40 border border-[#FECDCA] dark:border-red-900/60 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-[#D92D20] dark:text-red-400 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-[12.5px] font-semibold text-[#D92D20] dark:text-red-400">Permission blocked</p>
                <p className="text-[12px] text-[#912018] dark:text-red-300/80 mt-0.5">
                  Desktop notifications were denied. Open your browser site settings and allow notifications for this site.
                </p>
              </div>
            </div>
          )}

          {permission === 'granted' && desktopEnabled && (
            <div className="flex items-center gap-2 text-[12px] text-[#027A48] dark:text-[#34D399]">
              <CheckCircle2 size={13} strokeWidth={2.5} />
              Browser permission granted
            </div>
          )}

          {/* Toggle row */}
          <div className={cn(
            'flex items-center justify-between px-4 py-4 bg-white dark:bg-[#1A1B23] border rounded-xl',
            permission === 'denied' ? 'border-[#FECDCA] dark:border-red-900/60 opacity-60' : 'border-[#EAECF0] dark:border-[#3D4258]',
          )}>
            <div>
              <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Enable desktop notifications</p>
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
                {permission === 'default'
                  ? 'Browser will ask for permission when you turn this on'
                  : permission === 'granted'
                  ? 'Notifications will appear in your OS notification centre'
                  : 'Blocked in browser settings — cannot enable'}
              </p>
            </div>
            <button
              onClick={handleDesktopToggle}
              disabled={permission === 'denied'}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors shrink-0',
                desktopEnabled && permission === 'granted'
                  ? 'bg-[#2563EB]'
                  : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
              )}
              role="switch"
              aria-checked={desktopEnabled}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                desktopEnabled && permission === 'granted' ? 'translate-x-4' : 'translate-x-0',
              )} />
            </button>
          </div>
        </div>
      </section>

      <div className="border-t border-[#EAECF0] dark:border-[#26283A]" />

      {/* ── Mobile push notifications ───────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Smartphone size={15} strokeWidth={2} className="text-[#344054] dark:text-[#C2C8D8]" />
          <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Mobile push notifications</h3>
        </div>
        <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mb-4 ml-[23px]">
          Get pinged on your phone the moment a client pays, signs, or opens your work — even when Rupway is closed. Install Rupway to your home screen first for the best experience.
        </p>

        <div className="ml-[23px] space-y-3">
          {!push.isSupported && (
            <div className="flex items-start gap-2.5 bg-[#F2F4F7] dark:bg-[#21222D] border border-[#EAECF0] dark:border-[#3D4258] rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-[#667085] dark:text-[#8B92A8] shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8]">
                Push notifications aren't supported in this browser. Try Chrome, Edge, or Safari 16.4+ on iOS.
              </p>
            </div>
          )}

          {push.isSupported && push.permission === 'denied' && (
            <div className="flex items-start gap-2.5 bg-[#FEF3F2] dark:bg-red-950/40 border border-[#FECDCA] dark:border-red-900/60 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-[#D92D20] dark:text-red-400 shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="text-[12.5px] font-semibold text-[#D92D20] dark:text-red-400">Permission blocked</p>
                <p className="text-[12px] text-[#912018] dark:text-red-300/80 mt-0.5">
                  Push notifications were denied. Open your browser site settings and allow notifications for this site.
                </p>
              </div>
            </div>
          )}

          {push.subscribed && (
            <div className="flex items-center gap-2 text-[12px] text-[#027A48] dark:text-[#34D399]">
              <CheckCircle2 size={13} strokeWidth={2.5} />
              Push notifications active on this device
            </div>
          )}

          {/* Toggle row */}
          <div className={cn(
            'flex items-center justify-between px-4 py-4 bg-white dark:bg-[#1A1B23] border rounded-xl',
            !push.isSupported || push.permission === 'denied'
              ? 'border-[#EAECF0] dark:border-[#3D4258] opacity-60'
              : 'border-[#EAECF0] dark:border-[#3D4258]',
          )}>
            <div>
              <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Enable push on this device</p>
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
                {!push.isSupported
                  ? 'Browser does not support push'
                  : push.permission === 'denied'
                  ? 'Blocked in browser settings — cannot enable'
                  : push.subscribed
                  ? 'Server will send pushes to this device'
                  : 'Browser will ask for permission when you turn this on'}
              </p>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={!push.isSupported || push.permission === 'denied' || push.busy}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:cursor-not-allowed',
                push.subscribed ? 'bg-[#2563EB]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
              )}
              role="switch"
              aria-checked={push.subscribed}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
                push.subscribed ? 'translate-x-4' : 'translate-x-0',
              )} />
            </button>
          </div>

          {push.subscribed && (
            <button
              onClick={handleSendTest}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] bg-white dark:bg-[#1A1B23] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] transition-colors"
            >
              <Send size={12} strokeWidth={2} /> Send a test push
            </button>
          )}
        </div>
      </section>

    </div>
  )
}
