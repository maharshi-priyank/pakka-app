import { useState } from 'react'
import { Smartphone, CheckCircle2, XCircle, Mail, MessageCircle, Loader2, AlertCircle } from 'lucide-react'
import { useWhatsappConnection, useConnectWhatsapp, useDisconnectWhatsapp } from '@/features/whatsapp/hooks/useWhatsappConnection'
import { useWhatsappRules, useToggleWhatsappRule } from '@/features/whatsapp/hooks/useWhatsappRules'

const EVENT_LABELS: Record<string, string> = {
  'wa.proposal.sent':    'Proposal Shared',
  'wa.contract.sent':    'Contract Sent',
  'wa.contract.signed':  'Contract Signed',
  'wa.invoice.sent':     'Invoice Sent',
  'wa.invoice.due_soon': 'Payment Reminder (3 days before due)',
  'wa.invoice.paid':     'Payment Received',
  'wa.project.completed':'Project Completed',
}

const EVENT_ORDER = [
  'wa.proposal.sent',
  'wa.contract.sent',
  'wa.contract.signed',
  'wa.invoice.sent',
  'wa.invoice.due_soon',
  'wa.invoice.paid',
  'wa.project.completed',
]

export default function CommunicationTab() {
  const { data: status, isLoading: statusLoading } = useWhatsappConnection()
  const { data: rules = [], isLoading: rulesLoading }  = useWhatsappRules()
  const connectMutation    = useConnectWhatsapp()
  const disconnectMutation = useDisconnectWhatsapp()
  const toggleMutation     = useToggleWhatsappRule()

  const [connectError, setConnectError] = useState<string | null>(null)

  function handleConnect() {
    setConnectError(null)
    // TODO(WhatsApp): Replace this entire block with the Meta Embedded Signup flow.
    // Steps to uncomment:
    //   1. Add your Meta App ID to the page (load the Meta JS SDK below)
    //   2. Call FB.login() with the whatsapp_business_management + whatsapp_business_messaging scopes
    //   3. On success, call connectMutation.mutate(result.authResponse.code)
    //
    // Example (uncomment when Meta App is registered):
    // window.FB.login(
    //   (response) => {
    //     if (response.status === 'connected' && response.authResponse?.code) {
    //       connectMutation.mutate(response.authResponse.code, {
    //         onError: (err) => setConnectError((err as Error).message),
    //       })
    //     }
    //   },
    //   {
    //     config_id:  import.meta.env.VITE_META_APP_CONFIG_ID,
    //     response_type: 'code',
    //     override_default_response_type: true,
    //     extras: { sessionInfoVersion: 2 },
    //   },
    // )
    //
    // For now, hit the endpoint so the "coming soon" error surfaces to the user:
    connectMutation.mutate('__placeholder__', {
      onError: (err) => setConnectError((err as Error).message),
    })
  }

  function handleDisconnect() {
    disconnectMutation.mutate(undefined, {
      onError: (err) => setConnectError((err as Error).message),
    })
  }

  const sortedRules = EVENT_ORDER
    .map((key) => rules.find((r) => r.key === key))
    .filter(Boolean) as typeof rules

  return (
    <div className="space-y-5">
      {/* ── Connection card ── */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
            <Smartphone size={20} className="text-[#25D366]" strokeWidth={1.75} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[14px] font-semibold text-[#0D1117] dark:text-[#ECEEF3]">
                WhatsApp Business
              </h3>
              {!statusLoading && status?.connected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#027A48] text-[11px] font-medium">
                  <CheckCircle2 size={11} />
                  Connected
                </span>
              )}
              {!statusLoading && !status?.connected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2F4F7] text-[#667085] text-[11px] font-medium">
                  <XCircle size={11} />
                  Not connected
                </span>
              )}
            </div>

            {status?.connected ? (
              <div className="mt-1">
                <p className="text-[13px] text-[#374151] dark:text-[#9CA3AF]">
                  Sending from <span className="font-medium text-[#0D1117] dark:text-[#ECEEF3]">{status.displayPhone}</span>
                </p>
                {status.connectedAt && (
                  <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
                    Connected {new Date(status.connectedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1 leading-relaxed">
                Connect your WhatsApp Business account to send event notifications — proposals, invoices, and more — from your own verified business number.
              </p>
            )}

            {connectError && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-[#FEF3F2] dark:bg-[#2A1A1A] rounded-lg">
                <AlertCircle size={14} className="text-[#B42318] mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-[#B42318]">{connectError}</p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              {status?.connected ? (
                <button
                  onClick={handleDisconnect}
                  disabled={disconnectMutation.isPending}
                  className="btn-secondary text-[12px] px-3 py-1.5 h-auto text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                >
                  {disconnectMutation.isPending
                    ? <><Loader2 size={12} className="animate-spin" /> Disconnecting…</>
                    : 'Disconnect'}
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connectMutation.isPending || statusLoading}
                  className="btn-primary text-[12px] px-3 py-1.5 h-auto"
                >
                  {connectMutation.isPending
                    ? <><Loader2 size={12} className="animate-spin" /> Connecting…</>
                    : 'Connect WhatsApp Business'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Notification rules grid (only when connected) ── */}
      {status?.connected && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F1F3F8] dark:border-[#26283A]">
            <h3 className="text-[13px] font-semibold text-[#0D1117] dark:text-[#ECEEF3]">
              Notification Events
            </h3>
            <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
              Toggle which events send a WhatsApp message to your client.
            </p>
          </div>

          {rulesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[#D0D5DD] dark:text-[#3D4258]" />
            </div>
          ) : (
            <div>
              {/* Header row */}
              <div className="grid grid-cols-[1fr_80px_80px] px-5 py-2.5 border-b border-[#F1F3F8] dark:border-[#26283A]">
                <span className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">Event</span>
                <span className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide text-center flex items-center justify-center gap-1">
                  <Mail size={11} /> Email
                </span>
                <span className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide text-center flex items-center justify-center gap-1">
                  <MessageCircle size={11} /> WhatsApp
                </span>
              </div>

              {sortedRules.length === 0 ? (
                <div className="px-5 py-8 text-center text-[13px] text-[#98A2B3] dark:text-[#545C74]">
                  No WhatsApp rules found. Try refreshing.
                </div>
              ) : (
                sortedRules.map((rule, i) => (
                  <div
                    key={rule.id}
                    className={`grid grid-cols-[1fr_80px_80px] px-5 py-3 items-center ${
                      i < sortedRules.length - 1 ? 'border-b border-[#F9FAFB] dark:border-[#1E1F2A]' : ''
                    }`}
                  >
                    <span className="text-[13px] text-[#374151] dark:text-[#C2C8D8]">
                      {EVENT_LABELS[rule.key] ?? rule.name}
                    </span>

                    {/* Email — always on, locked */}
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 rounded bg-[#6366F1]/10 flex items-center justify-center">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#6366F1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>

                    {/* WhatsApp — toggleable */}
                    <div className="flex items-center justify-center">
                      <button
                        role="switch"
                        aria-checked={rule.isActive}
                        disabled={toggleMutation.isPending && toggleMutation.variables?.id === rule.id}
                        onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                        className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-1 ${
                          rule.isActive
                            ? 'bg-[#6366F1]'
                            : 'bg-[#E5E7EB] dark:bg-[#3D4258]'
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-150 ${
                            rule.isActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          } mt-[3px]`}
                        />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Info note ── */}
      <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] leading-relaxed">
        WhatsApp messages are sent using pre-approved message templates from your Meta Business account.
        Email notifications are always on and are unaffected by WhatsApp settings.
      </p>
    </div>
  )
}
