import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, AlertCircle, Loader2, Mail, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useProfile } from '../hooks/useProfile'
import { useConnectClickUp, useDisconnectClickUp, useSyncClickUp } from '../hooks/useClickUp'

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
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

function useConnectOutlook() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ data: { authUrl: string } }>('/auth/microsoft/connect')
      return data.data.authUrl
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl
    },
  })
}

function useDisconnectOutlook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/microsoft/disconnect'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

interface IntegrationCardProps {
  icon:        React.ReactNode
  iconBg:      string
  title:       string
  description: string
  isLoading:   boolean
  isConnected: boolean
  connectLabel: string
  onConnect:   () => void
  onDisconnect: () => void
  connectPending:    boolean
  disconnectPending: boolean
  extraAction?: React.ReactNode
}

function IntegrationCard({
  icon, iconBg, title, description,
  isLoading, isConnected,
  connectLabel, onConnect, onDisconnect,
  connectPending, disconnectPending,
  extraAction,
}: IntegrationCardProps) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">{title}</p>
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 max-w-sm">{description}</p>
            {isConnected && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#027A48] dark:text-[#34D399]" />
                  <span className="text-[12px] font-semibold text-[#027A48] dark:text-[#34D399]">Connected</span>
                </div>
                {extraAction}
              </div>
            )}
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
                  disabled={disconnectPending}
                  className="px-3 py-1.5 rounded-lg bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400 text-[12px] font-semibold hover:bg-[#FEE2E2] dark:hover:bg-red-950/60 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {disconnectPending ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />}
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
              disabled={connectPending}
              className="px-4 py-1.5 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {connectPending ? <Loader2 size={12} className="animate-spin" /> : null}
              {connectLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ClickUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.667 23.111l4.31-3.288c2.25 3.038 4.643 4.421 7.254 4.421 2.598 0 4.964-1.372 7.181-4.384l4.343 3.244C22.697 27.42 19.381 29.333 14.23 29.333c-5.163 0-8.512-1.94-11.563-6.222z" fill="#8930FD"/>
      <path d="M14.218 2.667l-9.44 8.63 3.045 3.332 6.395-5.847 6.36 5.836 3.059-3.321-9.419-8.63z" fill="#49CCF9"/>
    </svg>
  )
}

export default function IntegrationsTab() {
  const { data: profile, isLoading } = useProfile()
  const connectGoogle    = useConnectGoogle()
  const disconnectGoogle = useDisconnectGoogle()
  const connectOutlook    = useConnectOutlook()
  const disconnectOutlook = useDisconnectOutlook()
  const connectClickUp    = useConnectClickUp()
  const disconnectClickUp = useDisconnectClickUp()
  const syncClickUp       = useSyncClickUp()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Integrations</h3>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Connect third-party services to enhance your workflow.</p>
      </div>

      <IntegrationCard
        icon={<CalendarDays size={18} className="text-[#027A48] dark:text-[#34D399]" />}
        iconBg="bg-[#ECFDF3] dark:bg-emerald-950/40"
        title="Google Calendar"
        description="Auto-generate Google Meet links and send calendar invites to clients when scheduling calls from leads or client drawers."
        isLoading={isLoading}
        isConnected={profile?.googleCalendarConnected ?? false}
        connectLabel="Connect Google Calendar"
        onConnect={() => connectGoogle.mutate()}
        onDisconnect={() => disconnectGoogle.mutate()}
        connectPending={connectGoogle.isPending}
        disconnectPending={disconnectGoogle.isPending}
      />

      <IntegrationCard
        icon={<Mail size={18} className="text-[#0078D4]" />}
        iconBg="bg-[#EFF6FF] dark:bg-blue-950/40"
        title="Outlook Calendar"
        description="Auto-generate Microsoft Teams meeting links and send calendar invites to clients when scheduling calls. Connects via your Microsoft 365 account."
        isLoading={isLoading}
        isConnected={profile?.outlookConnected ?? false}
        connectLabel="Connect Outlook"
        onConnect={() => connectOutlook.mutate()}
        onDisconnect={() => disconnectOutlook.mutate()}
        connectPending={connectOutlook.isPending}
        disconnectPending={disconnectOutlook.isPending}
      />

      <IntegrationCard
        icon={<ClickUpIcon />}
        iconBg="bg-[#F3EEFF] dark:bg-purple-950/40"
        title="ClickUp"
        description="Import your ClickUp lists as projects, sync time entries, and pull workspace members as clients. One-click manual sync keeps your data up to date."
        isLoading={isLoading}
        isConnected={profile?.clickUpConnected ?? false}
        connectLabel="Connect ClickUp"
        onConnect={() => connectClickUp.mutate()}
        onDisconnect={() => disconnectClickUp.mutate()}
        connectPending={connectClickUp.isPending}
        disconnectPending={disconnectClickUp.isPending}
        extraAction={
          <button
            onClick={() => syncClickUp.mutate()}
            disabled={syncClickUp.isPending}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6941C6] dark:text-[#A78BFA] hover:text-[#53389E] dark:hover:text-[#C4B5FD] transition-colors disabled:opacity-50"
          >
            {syncClickUp.isPending
              ? <Loader2 size={12} className="animate-spin" />
              : <RefreshCw size={12} />
            }
            {syncClickUp.isPending ? 'Syncing…' : 'Sync Now'}
          </button>
        }
      />
    </div>
  )
}
