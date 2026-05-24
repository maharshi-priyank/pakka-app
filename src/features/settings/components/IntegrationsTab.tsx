import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
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

export default function IntegrationsTab() {
  const { data: profile, isLoading } = useProfile()
  const connect    = useConnectGoogle()
  const disconnect = useDisconnectGoogle()
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const isConnected = profile?.googleCalendarConnected ?? false

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Integrations</h3>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Connect third-party services to enhance your workflow.</p>
      </div>

      {/* Google Calendar card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF3] dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <CalendarDays size={18} className="text-[#027A48] dark:text-[#34D399]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Google Calendar</p>
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 max-w-sm">
                Auto-generate Google Meet links and send calendar invites to clients when scheduling calls from leads or client drawers.
              </p>
              {isConnected && (
                <div className="flex items-center gap-1.5 mt-2">
                  <CheckCircle2 size={13} className="text-[#027A48] dark:text-[#34D399]" />
                  <span className="text-[12px] font-semibold text-[#027A48] dark:text-[#34D399]">Connected</span>
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
                    onClick={() => { disconnect.mutate(); setConfirmDisconnect(false) }}
                    disabled={disconnect.isPending}
                    className="px-3 py-1.5 rounded-lg bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400 text-[12px] font-semibold hover:bg-[#FEE2E2] dark:hover:bg-red-950/60 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {disconnect.isPending ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />}
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
                onClick={() => connect.mutate()}
                disabled={connect.isPending}
                className="px-4 py-1.5 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                {connect.isPending ? <Loader2 size={12} className="animate-spin" /> : <CalendarDays size={12} />}
                Connect Google Calendar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
