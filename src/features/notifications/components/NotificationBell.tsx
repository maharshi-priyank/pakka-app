import { useRef, useState, useEffect } from 'react'
import {
  Bell, CheckCircle2, Eye, ThumbsUp, FileSignature, UserPlus, BellOff,
  Volume2, VolumeX,
} from 'lucide-react'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead, type AppNotification } from '../hooks/useNotifications'
import {
  useNotificationAlert, getMuted, setMuted, requestDesktopPermission, getSound,
} from '../hooks/useNotificationAlert'

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)  return `${days}d ago`
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'invoice.paid':       { icon: CheckCircle2,   color: '#027A48', bg: '#ECFDF3' },
  'proposal.opened':    { icon: Eye,            color: '#6366F1', bg: '#EEF2FF' },
  'proposal.accepted':  { icon: ThumbsUp,       color: '#027A48', bg: '#ECFDF3' },
  'contract.signed':    { icon: FileSignature,  color: '#7C3AED', bg: '#F5F3FF' },
  'lead.created':       { icon: UserPlus,       color: '#D97706', bg: '#FFFBEB' },
}

const DEFAULT_CONFIG = { icon: Bell, color: '#6B7280', bg: '#F3F4F6' }

function NotifIcon({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? DEFAULT_CONFIG
  const Icon = cfg.icon
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ background: cfg.bg }}
    >
      <Icon size={14} style={{ color: cfg.color }} strokeWidth={2} />
    </div>
  )
}

function NotifRow({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const time = timeAgo(n.createdAt)
  return (
    <button
      onClick={() => !n.read && onRead(n.id)}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#F9FAFB] transition-colors ${!n.read ? 'bg-[#EEF2FF]/50' : ''}`}
    >
      <NotifIcon type={n.type} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#101828] leading-tight">{n.title}</p>
        <p className="text-[12px] text-[#667085] leading-snug mt-0.5">{n.body}</p>
        <p className="text-[11px] text-[#98A2B3] mt-1">{time}</p>
      </div>
      {!n.read && (
        <span className="w-2 h-2 rounded-full bg-[#6366F1] mt-1 shrink-0" />
      )}
    </button>
  )
}

export default function NotificationBell() {
  const [open,  setOpen]  = useState(false)
  const [muted, setMutedState] = useState(() => getSound() === 'none')
  const ref = useRef<HTMLDivElement>(null)

  const { data: notifications = [] } = useNotifications()
  const { data: unreadCount = 0 }    = useUnreadCount()
  const markRead    = useMarkRead()
  const markAllRead = useMarkAllRead()

  // Sound + desktop alerts
  useNotificationAlert(notifications)

  // Request desktop notification permission once when bell is first opened
  useEffect(() => {
    if (open) requestDesktopPermission()
  }, [open])

  function toggleMute() {
    const next = !muted
    setMuted(next)           // saves 'none' or 'chime' to localStorage
    setMutedState(next)
  }

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#F5F6FA] hover:text-[#344054] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={16} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#F04438] flex items-center justify-center">
            <span className="text-[9px] font-bold text-white leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] bg-white border border-[#EAECF0] rounded-xl shadow-lg z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F7]">
            <span className="text-[13px] font-bold text-[#101828]">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#6366F1] text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {/* Mute toggle */}
              <button
                onClick={toggleMute}
                title={muted ? 'Unmute notifications' : 'Mute notifications'}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#F5F6FA] hover:text-[#344054] transition-colors"
              >
                {muted
                  ? <VolumeX size={13} strokeWidth={2} />
                  : <Volume2 size={13} strokeWidth={2} />
                }
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-[11.5px] text-[#6366F1] font-semibold hover:text-[#4F46E5] transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <BellOff size={28} className="text-[#D0D5DD] mb-3" strokeWidth={1.5} />
                <p className="text-[13px] font-medium text-[#667085]">No notifications yet</p>
                <p className="text-[12px] text-[#98A2B3] mt-0.5 text-center">
                  Activity on your proposals, contracts, and invoices will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F2F4F7]">
                {notifications.map(n => (
                  <NotifRow
                    key={n.id}
                    n={n}
                    onRead={(id) => markRead.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
