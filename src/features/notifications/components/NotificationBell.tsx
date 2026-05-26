import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, CheckCircle2, Eye, ThumbsUp, FileSignature, UserPlus, BellOff,
  Volume2, VolumeX, ThumbsDown, CreditCard, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead, type AppNotification } from '../hooks/useNotifications'
import {
  useNotificationAlert, setMuted, requestDesktopPermission, getSound,
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

const TYPE_CONFIG: Record<string, { icon: React.ElementType; iconColor: string; bg: string }> = {
  'invoice.paid':       { icon: CheckCircle2,   iconColor: 'text-[#027A48] dark:text-[#34D399]',  bg: 'bg-[#ECFDF3] dark:bg-emerald-950/50' },
  'proposal.opened':    { icon: Eye,            iconColor: 'text-[#6366F1]',                       bg: 'bg-[#EEF2FF] dark:bg-[#1E2040]'       },
  'proposal.accepted':  { icon: ThumbsUp,       iconColor: 'text-[#027A48] dark:text-[#34D399]',  bg: 'bg-[#ECFDF3] dark:bg-emerald-950/50' },
  'proposal.declined':  { icon: ThumbsDown,     iconColor: 'text-[#B42318] dark:text-red-400',    bg: 'bg-[#FEF3F2] dark:bg-red-950/40'      },
  'contract.signed':    { icon: FileSignature,  iconColor: 'text-[#7C3AED] dark:text-[#A78BFA]',  bg: 'bg-[#F5F3FF] dark:bg-violet-950/40'  },
  'invoice.partial':    { icon: CreditCard,     iconColor: 'text-[#B54708] dark:text-amber-400',  bg: 'bg-[#FFFBEB] dark:bg-amber-950/30'   },
  'invoice.overdue':    { icon: AlertCircle,    iconColor: 'text-[#B42318] dark:text-red-400',    bg: 'bg-[#FEF3F2] dark:bg-red-950/40'      },
  'lead.created':       { icon: UserPlus,       iconColor: 'text-[#D97706] dark:text-amber-400',  bg: 'bg-[#FFFBEB] dark:bg-amber-950/30'   },
}

const DEFAULT_CONFIG = {
  icon: Bell,
  iconColor: 'text-[#6B7280] dark:text-[#8B92A8]',
  bg: 'bg-[#F3F4F6] dark:bg-[#21222D]',
}

function NotifIcon({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? DEFAULT_CONFIG
  const Icon = cfg.icon
  return (
    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', cfg.bg)}>
      <Icon size={14} className={cfg.iconColor} strokeWidth={2} />
    </div>
  )
}

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  invoice:  id => `/app/invoices/${id}`,
  proposal: id => `/app/proposals/${id}`,
  contract: id => `/app/contracts/${id}`,
  lead:     () => `/app/leads`,
}

function NotifRow({ n, onRead, onClose }: { n: AppNotification; onRead: (id: string) => void; onClose: () => void }) {
  const navigate = useNavigate()
  const time = timeAgo(n.createdAt)

  const routeFn  = n.entityType ? ENTITY_ROUTES[n.entityType] : undefined
  const href     = routeFn && n.entityId ? routeFn(n.entityId) : undefined

  function handleClick() {
    if (!n.read) onRead(n.id)
    if (href) { onClose(); navigate(href) }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
        href ? 'cursor-pointer' : 'cursor-default',
        'hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23]',
        !n.read && 'bg-[#EEF2FF]/50 dark:bg-[#1E2040]/40',
      )}
    >
      <NotifIcon type={n.type} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] leading-tight">{n.title}</p>
        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] leading-snug mt-0.5">{n.body}</p>
        <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-1">{time}</p>
      </div>
      {!n.read && (
        <span className="w-2 h-2 rounded-full bg-[#6366F1] mt-1.5 shrink-0" />
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

  useNotificationAlert(notifications)

  useEffect(() => {
    if (open) requestDesktopPermission()
  }, [open])

  function toggleMute() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

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
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
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
        <div className="fixed sm:absolute right-2 sm:right-0 top-[60px] sm:top-[calc(100%+8px)] w-[calc(100vw-16px)] sm:w-[360px] bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl shadow-xl dark:shadow-black/40 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <span className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#0D1117] dark:bg-[#6366F1] text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                title={muted ? 'Unmute notifications' : 'Mute notifications'}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
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
                <BellOff size={28} className="text-[#D0D5DD] dark:text-[#3D4258] mb-3" strokeWidth={1.5} />
                <p className="text-[13px] font-medium text-[#667085] dark:text-[#8B92A8]">No notifications yet</p>
                <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5 text-center">
                  Activity on your proposals, contracts, and invoices will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                {notifications.map(n => (
                  <NotifRow
                    key={n.id}
                    n={n}
                    onRead={(id) => markRead.mutate(id)}
                    onClose={() => setOpen(false)}
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
