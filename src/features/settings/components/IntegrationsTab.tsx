import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, AlertCircle, Loader2, Link, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useProfile } from '../hooks/useProfile'

function useConnectGoogle() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ data: { authUrl: string } }>('/auth/google/connect')
      return data.data.authUrl
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl
    },
  })
}

function useDisconnectGoogle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/google/disconnect'),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

function useConnectCalendly() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ data: { authUrl: string } }>('/auth/calendly/connect')
      return data.data.authUrl
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl
    },
  })
}

function useDisconnectCalendly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/calendly/disconnect'),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

interface IntegrationCardProps {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  isLoading: boolean
  isConnected: boolean
  connectedBadge?: React.ReactNode
  onConnect: () => void
  onDisconnect: () => void
  connectLabel: string
  connectIcon: React.ReactNode
  isPendingConnect: boolean
  isPendingDisconnect: boolean
}

function IntegrationCard({
  icon, iconBg, title, description,
  isLoading, isConnected, connectedBadge,
  onConnect, onDisconnect, connectLabel, connectIcon,
  isPendingConnect, isPendingDisconnect,
}: IntegrationCardProps) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">{title}</p>
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 max-w-sm">{description}</p>
            {isConnected && (
              <div className="flex items-center gap-1.5 mt-2">
                <CheckCircle2 size={13} className="text-[#027A48] dark:text-[#34D399]" />
                <span className="text-[12px] font-semibold text-[#027A48] dark:text-[#34D399]">Connected</span>
              </div>
            )}
            {isConnected && connectedBadge}
          </div>
        </div>

        <div className="shrink-0">
          {isLoading ? (
            <div className="w-8 h-8 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-[#98A2B3]" />
            </div>
          ) : isConnected ? (
            confirmDisconnect ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDisconnect(false)}
                  className="text-[12px] text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onDisconnect(); setConfirmDisconnect(false) }}
                  disabled={isPendingDisconnect}
                  className="px-3 py-1.5 rounded-lg bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400 text-[12px] font-semibold hover:bg-[#FEE2E2] dark:hover:bg-red-950/60 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isPendingDisconnect ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                  Confirm disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDisconnect(true)}
                className="px-3 py-1.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] text-[12px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
              >
                Disconnect
              </button>
            )
          ) : (
            <button
              onClick={onConnect}
              disabled={isPendingConnect}
              className="px-4 py-1.5 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {isPendingConnect ? <Loader2 size={12} className="animate-spin" /> : connectIcon}
              {connectLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsTab() {
  const { data: profile, isLoading } = useProfile()

  const connectGoogle    = useConnectGoogle()
  const disconnectGoogle = useDisconnectGoogle()
  const connectCalendly    = useConnectCalendly()
  const disconnectCalendly = useDisconnectCalendly()

  function copySchedulingUrl() {
    if (profile?.calendlySchedulingUrl) {
      navigator.clipboard.writeText(profile.calendlySchedulingUrl)
      toast.success('Scheduling link copied!')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Integrations</h3>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Connect third-party services to enhance your workflow.</p>
      </div>

      <IntegrationCard
        iconBg="bg-[#ECFDF3] dark:bg-emerald-950/40"
        icon={<CalendarDays size={18} className="text-[#027A48] dark:text-[#34D399]" />}
        title="Google Calendar"
        description="Auto-generate Google Meet links and send calendar invites to clients when scheduling calls from leads or client drawers."
        isLoading={isLoading}
        isConnected={profile?.googleCalendarConnected ?? false}
        onConnect={() => connectGoogle.mutate()}
        onDisconnect={() => disconnectGoogle.mutate()}
        connectLabel="Connect Google Calendar"
        connectIcon={<CalendarDays size={12} />}
        isPendingConnect={connectGoogle.isPending}
        isPendingDisconnect={disconnectGoogle.isPending}
      />

      <IntegrationCard
        iconBg="bg-[#EFF6FF] dark:bg-blue-950/40"
        icon={
          <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px] text-[#006BFF] dark:text-[#60A5FA]" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 12.5c0-2.21 1.79-4 4-4s4 1.79 4 4v1c0 .55-.45 1-1 1H9c-.55 0-1-.45-1-1v-1Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 8.5V7M9.5 9.5 8.5 8.5M14.5 9.5l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
        title="Calendly"
        description="Share your Calendly scheduling link with clients so they can book calls directly — no back-and-forth required."
        isLoading={isLoading}
        isConnected={profile?.calendlyConnected ?? false}
        connectedBadge={
          profile?.calendlySchedulingUrl ? (
            <div className="flex items-center gap-2 mt-2">
              <Link size={11} className="text-[#667085] dark:text-[#8B92A8] shrink-0" />
              <span className="text-[11px] text-[#667085] dark:text-[#8B92A8] truncate max-w-[200px]">
                {profile.calendlySchedulingUrl.replace('https://', '')}
              </span>
              <button
                onClick={copySchedulingUrl}
                className="p-0.5 rounded hover:bg-[#F2F4F7] dark:hover:bg-[#2A2D3E] transition-colors"
                title="Copy link"
              >
                <Copy size={11} className="text-[#667085] dark:text-[#8B92A8]" />
              </button>
            </div>
          ) : null
        }
        onConnect={() => connectCalendly.mutate()}
        onDisconnect={() => disconnectCalendly.mutate()}
        connectLabel="Connect Calendly"
        connectIcon={<Link size={12} />}
        isPendingConnect={connectCalendly.isPending}
        isPendingDisconnect={disconnectCalendly.isPending}
      />
    </div>
  )
}
