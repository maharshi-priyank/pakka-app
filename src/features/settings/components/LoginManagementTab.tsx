import { useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Clock3,
  Globe2,
  Laptop,
  Loader2,
  LogOut,
  MapPin,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmModal } from '@/components/ConfirmModal'
import { signOutCurrentDevice } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  useLoginSessions,
  useRevokeLoginSession,
  useRevokeOtherLoginSessions,
  type LoginSession,
} from '../hooks/useLoginSessions'

type Confirmation =
  | { kind: 'session'; session: LoginSession }
  | { kind: 'others'; count: number }

function DeviceIcon({ type }: { type: LoginSession['deviceType'] }) {
  const props = { size: 18, strokeWidth: 2 }
  if (type === 'mobile') return <Smartphone {...props} />
  if (type === 'tablet') return <Tablet {...props} />
  if (type === 'desktop') return <Laptop {...props} />
  return <Monitor {...props} />
}

function validDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function relativeDate(value: string) {
  const date = validDate(value)
  return date ? formatDistanceToNow(date, { addSuffix: true }) : 'Unknown'
}

function fullDate(value: string) {
  const date = validDate(value)
  return date ? format(date, 'd MMM yyyy, h:mm a') : 'Unknown'
}

function SessionSkeleton() {
  return (
    <div className="flex items-start gap-4 px-5 py-5 animate-pulse">
      <div className="h-10 w-10 shrink-0 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D]" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3.5 w-40 rounded bg-[#F2F4F7] dark:bg-[#21222D]" />
        <div className="h-3 w-56 max-w-full rounded bg-[#F2F4F7] dark:bg-[#21222D]" />
        <div className="h-3 w-32 rounded bg-[#F2F4F7] dark:bg-[#21222D]" />
      </div>
    </div>
  )
}

function SessionRow({
  session,
  isRevoking,
  onSignOut,
}: {
  session: LoginSession
  isRevoking: boolean
  onSignOut: () => void
}) {
  const browserAndOs = [session.browser, session.os].filter(Boolean).join(' on ')
  const locationAndIp = [session.location, session.ipAddress].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
          session.isCurrent
            ? 'border-[#C7D7FE] bg-[#EEF4FF] text-[#2563EB] dark:border-[#2D3A65] dark:bg-[#1E2945] dark:text-[#84ADFF]'
            : 'border-[#EAECF0] bg-[#F9FAFB] text-[#667085] dark:border-[#2A2D3D] dark:bg-[#21222D] dark:text-[#8B92A8]',
        )}>
          <DeviceIcon type={session.deviceType} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[13.5px] font-bold text-[#101828] dark:text-[#ECEEF3]">
              {session.deviceName || browserAndOs || 'Unknown device'}
            </p>
            {session.isCurrent && (
              <span className="rounded-full bg-[#ECFDF3] px-2 py-0.5 text-[10px] font-bold text-[#027A48] dark:bg-emerald-950/50 dark:text-emerald-400">
                This device
              </span>
            )}
          </div>

          {browserAndOs && (
            <p className="mt-0.5 truncate text-[12px] text-[#667085] dark:text-[#8B92A8]">
              {browserAndOs}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
            <span className="flex items-center gap-1.5" title={locationAndIp || 'Location unavailable'}>
              <MapPin size={11.5} strokeWidth={2} />
              {locationAndIp || 'Location unavailable'}
            </span>
            <span className="flex items-center gap-1.5" title={fullDate(session.lastActiveAt)}>
              <Clock3 size={11.5} strokeWidth={2} />
              Active {relativeDate(session.lastActiveAt)}
            </span>
          </div>
          <p className="mt-1 text-[10.5px] text-[#B3B8C5] dark:text-[#464D63]">
            Signed in {fullDate(session.createdAt)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSignOut}
        disabled={isRevoking}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-[#FDA29B] px-3 text-[12px] font-semibold text-[#B42318] transition-colors hover:bg-[#FEF3F2] disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 sm:self-center"
      >
        {isRevoking
          ? <Loader2 size={13} className="animate-spin" />
          : <LogOut size={13} strokeWidth={2.25} />}
        Sign out
      </button>
    </div>
  )
}

export default function LoginManagementTab() {
  const { data: sessions = [], isLoading, isError, isFetching, refetch } = useLoginSessions()
  const revokeSession = useRevokeLoginSession()
  const revokeOthers = useRevokeOtherLoginSessions()
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [isSigningOutCurrent, setIsSigningOutCurrent] = useState(false)

  const orderedSessions = useMemo(() => [...sessions].sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1
    return new Date(right.lastActiveAt).getTime() - new Date(left.lastActiveAt).getTime()
  }), [sessions])
  const otherSessionCount = sessions.filter(session => !session.isCurrent).length
  const pendingSessionId = confirmation?.kind === 'session'
    && (revokeSession.isPending || isSigningOutCurrent)
    ? confirmation.session.id
    : null

  async function confirmSignOut() {
    if (!confirmation) return

    if (confirmation.kind === 'session') {
      const { session } = confirmation
      try {
        if (session.isCurrent) {
          setIsSigningOutCurrent(true)
          try {
            await signOutCurrentDevice()
          } finally {
            setIsSigningOutCurrent(false)
          }
        } else {
          await revokeSession.mutateAsync(session.id)
          toast.success(`${session.deviceName || 'Device'} signed out`)
          setConfirmation(null)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not sign out this device')
      }
      return
    }

    try {
      const { revoked } = await revokeOthers.mutateAsync()
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) {
        toast.warning('Other devices were blocked in ClearWork, but provider sign-out could not be confirmed.')
      } else {
        toast.success(revoked === 1 ? '1 other device signed out' : `${revoked} other devices signed out`)
      }
      setConfirmation(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not sign out other devices')
    }
  }

  const isConfirming = revokeSession.isPending || revokeOthers.isPending || isSigningOutCurrent

  return (
    <div className="space-y-5">
      <div className="card-glass overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#EAECF0] px-5 py-5 dark:border-[#26283A] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] dark:bg-[#1E2040] dark:text-[#818CF8]">
              <ShieldCheck size={17} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Login Management</h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[#667085] dark:text-[#8B92A8]">
                Review where your account is signed in and remove devices you no longer use.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={otherSessionCount === 0 || revokeOthers.isPending}
            onClick={() => setConfirmation({ kind: 'others', count: otherSessionCount })}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-[#FDA29B] px-3 text-[12px] font-semibold text-[#B42318] transition-colors hover:bg-[#FEF3F2] disabled:cursor-not-allowed disabled:border-[#EAECF0] disabled:text-[#B3B8C5] disabled:hover:bg-transparent dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 dark:disabled:border-[#2A2D3D] dark:disabled:text-[#464D63] sm:self-center"
          >
            {revokeOthers.isPending
              ? <Loader2 size={13} className="animate-spin" />
              : <LogOut size={13} strokeWidth={2.25} />}
            Sign out all others
          </button>
        </div>

        <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]" aria-live="polite">
          {isLoading && (
            <>
              <SessionSkeleton />
              <SessionSkeleton />
            </>
          )}

          {!isLoading && isError && (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2F4F7] text-[#667085] dark:bg-[#21222D] dark:text-[#8B92A8]">
                <Globe2 size={18} />
              </div>
              <p className="mt-3 text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Could not load your devices</p>
              <p className="mt-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">Check your connection and try again.</p>
              <button type="button" onClick={() => refetch()} className="btn-secondary mt-4 text-[12px]">
                <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
                Try again
              </button>
            </div>
          )}

          {!isLoading && !isError && orderedSessions.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No active sessions found</p>
              <p className="mt-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">Refresh to register this device.</p>
              <button type="button" onClick={() => refetch()} className="btn-secondary mt-4 text-[12px]">
                <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          )}

          {!isLoading && !isError && orderedSessions.map(session => (
            <SessionRow
              key={session.id}
              session={session}
              isRevoking={pendingSessionId === session.id}
              onSignOut={() => setConfirmation({ kind: 'session', session })}
            />
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-[#EAECF0] bg-white/50 px-4 py-3.5 dark:border-[#26283A] dark:bg-[#1A1B23]/40">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#667085] dark:text-[#8B92A8]" strokeWidth={2} />
        <p className="text-[11.5px] leading-relaxed text-[#667085] dark:text-[#8B92A8]">
          If you do not recognize a device, sign it out immediately and update your account password.
          Location is approximate and may reflect a VPN or your network provider.
        </p>
      </div>

      <ConfirmModal
        open={confirmation !== null}
        onClose={() => !isConfirming && setConfirmation(null)}
        onConfirm={confirmSignOut}
        title={confirmation?.kind === 'others'
          ? 'Sign out all other devices?'
          : confirmation?.session.isCurrent
            ? 'Sign out this device?'
            : `Sign out ${confirmation?.session.deviceName || 'this device'}?`}
        description={confirmation?.kind === 'others'
          ? `${confirmation.count} other ${confirmation.count === 1 ? 'device' : 'devices'} will need to sign in again. This device will stay signed in.`
          : confirmation?.session.isCurrent
            ? 'You will be returned to the sign-in page. Your other devices will stay signed in.'
            : 'That device will lose access to ClearWork and will need to sign in again.'}
        confirmLabel={confirmation?.kind === 'others' ? 'Sign out other devices' : 'Sign out device'}
        variant="delete"
        isLoading={isConfirming}
      />
    </div>
  )
}
