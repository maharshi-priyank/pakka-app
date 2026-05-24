import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, FileSignature, Receipt, AlertTriangle, Video, CalendarDays, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortalData, type PortalProposal, type PortalContract, type PortalInvoice, type PortalMeeting } from '@/features/portal/hooks/usePortal'
import PortalProposalCard from '@/features/portal/components/PortalProposalCard'
import PortalContractCard from '@/features/portal/components/PortalContractCard'
import PortalInvoiceCard  from '@/features/portal/components/PortalInvoiceCard'

const APP_URL = (import.meta.env.VITE_API_URL as string).replace('/api/v1', '')

type Tab = 'overview' | 'proposals' | 'contracts' | 'invoices' | 'meetings'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded-lg', className)} />
}

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, isError } = usePortalData(token!)

  const [tab, setTab] = useState<Tab>('overview')

  // Local state mirrors for optimistic updates across tabs
  const [proposals, setProposals] = useState<PortalProposal[] | null>(null)
  const [contracts, setContracts] = useState<PortalContract[] | null>(null)
  const [invoices,  setInvoices]  = useState<PortalInvoice[]  | null>(null)

  const activeProposals = proposals ?? data?.proposals ?? []
  const activeContracts = contracts ?? data?.contracts ?? []
  const activeInvoices  = invoices  ?? data?.invoices  ?? []
  const activeMeetings  = data?.meetings ?? []

  function handleProposalStatusChange(id: string, status: string) {
    setProposals((data?.proposals ?? []).map(p => p.id === id ? { ...p, status } : p))
  }
  function handleContractStatusChange(id: string, status: string) {
    setContracts((data?.contracts ?? []).map(c => c.id === id ? { ...c, status } : c))
  }
  function handleInvoiceStatusChange(id: string, status: string) {
    setInvoices((data?.invoices ?? []).map(i => i.id === id ? { ...i, status } : i))
  }

  const upcomingMeetings = activeMeetings.filter(m => m.status === 'SCHEDULED' && new Date(m.scheduledAt) >= new Date())

  const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; count: number }[] = [
    { key: 'overview',   label: 'Overview',  icon: FileText,      count: 0 },
    { key: 'proposals',  label: 'Proposals', icon: FileText,      count: activeProposals.length },
    { key: 'contracts',  label: 'Contracts', icon: FileSignature, count: activeContracts.length },
    { key: 'invoices',   label: 'Invoices',  icon: Receipt,       count: activeInvoices.length },
    { key: 'meetings',   label: 'Meetings',  icon: Video,         count: upcomingMeetings.length },
  ]

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F4F5F8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#EAECF0] p-10 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3F2] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-[#D92D20]" />
          </div>
          <h1 className="text-[16px] font-bold text-[#101828] mb-1">Portal link invalid</h1>
          <p className="text-[13px] text-[#667085]">This portal link is invalid or has expired. Contact the sender for a new link.</p>
        </div>
      </div>
    )
  }

  const freelancerName = data?.freelancer.businessName ?? 'Your provider'
  const pendingCount   = activeInvoices.filter(i => i.status === 'SENT' || i.status === 'OVERDUE' || i.status === 'VIEWED').length
                        + activeProposals.filter(p => p.status === 'SENT' || p.status === 'OPENED').length
                        + activeContracts.filter(c => c.status === 'SENT').length

  return (
    <div className="min-h-screen bg-[#F4F5F8]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-[#EAECF0] sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-8 w-8 rounded-lg" />
            ) : data?.freelancer.logoUrl ? (
              <img src={data.freelancer.logoUrl} alt={freelancerName} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center">
                <span className="text-white text-[13px] font-bold">{freelancerName.charAt(0)}</span>
              </div>
            )}
            {isLoading
              ? <Skeleton className="h-4 w-32" />
              : <span className="text-[14px] font-bold text-[#101828]">{freelancerName}</span>
            }
          </div>
          <span className="text-[11px] text-[#98A2B3] font-medium">Client Portal</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Greeting */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : (
          <div>
            <h1 className="text-[20px] font-bold text-[#101828]">Hi, {data?.client.name} 👋</h1>
            <p className="text-[13px] text-[#667085] mt-0.5">
              {pendingCount > 0
                ? `You have ${pendingCount} item${pendingCount > 1 ? 's' : ''} waiting for your attention`
                : 'Everything is up to date'}
            </p>
          </div>
        )}

        {/* Stat chips */}
        {!isLoading && (
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Proposals', count: activeProposals.length,   color: 'bg-[#EEF2FF] text-[#4338CA]' },
              { label: 'Contracts', count: activeContracts.length,   color: 'bg-[#F4F3FF] text-[#5925DC]' },
              { label: 'Invoices',  count: activeInvoices.length,    color: 'bg-[#ECFDF3] text-[#027A48]' },
              { label: 'Meetings',  count: upcomingMeetings.length,  color: 'bg-[#FFF1F3] text-[#C01048]' },
            ].map(({ label, count, color }) => (
              <span key={label} className={cn('text-[12px] font-semibold px-3 py-1 rounded-full', color)}>
                {count} {label}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#EAECF0] p-1 shadow-sm">
          {TABS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12.5px] font-semibold transition-all',
                tab === key
                  ? 'bg-[#6366F1] text-white shadow-sm'
                  : 'text-[#667085] hover:text-[#344054] hover:bg-[#F4F5F8]',
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  tab === key ? 'bg-white/20 text-white' : 'bg-[#F2F4F7] text-[#667085]',
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <>
            {/* Overview — latest from each */}
            {tab === 'overview' && (
              <div className="space-y-5">
                {activeProposals.length === 0 && activeContracts.length === 0 && activeInvoices.length === 0 && upcomingMeetings.length === 0 ? (
                  <EmptyState label="No documents shared yet" />
                ) : (
                  <>
                    {upcomingMeetings.slice(0, 2).map(m => (
                      <PortalMeetingCard key={m.id} meeting={m} />
                    ))}
                    {activeProposals.slice(0, 2).map(p => (
                      <PortalProposalCard key={p.id} proposal={p} appUrl={APP_URL} onStatusChange={handleProposalStatusChange} />
                    ))}
                    {activeContracts.slice(0, 2).map(c => (
                      <PortalContractCard key={c.id} contract={c} appUrl={APP_URL} onStatusChange={handleContractStatusChange} />
                    ))}
                    {activeInvoices.slice(0, 2).map(i => (
                      <PortalInvoiceCard
                        key={i.id} invoice={i} appUrl={APP_URL}
                        portalToken={token!}
                        clientName={data!.client.name}
                        clientEmail={data!.client.email}
                        freelancerName={data!.freelancer.businessName}
                        onStatusChange={handleInvoiceStatusChange}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {tab === 'proposals' && (
              <div className="space-y-3">
                {activeProposals.length === 0 ? <EmptyState label="No proposals yet" /> : activeProposals.map(p => (
                  <PortalProposalCard key={p.id} proposal={p} appUrl={APP_URL} onStatusChange={handleProposalStatusChange} />
                ))}
              </div>
            )}

            {tab === 'contracts' && (
              <div className="space-y-3">
                {activeContracts.length === 0 ? <EmptyState label="No contracts yet" /> : activeContracts.map(c => (
                  <PortalContractCard key={c.id} contract={c} appUrl={APP_URL} onStatusChange={handleContractStatusChange} />
                ))}
              </div>
            )}

            {tab === 'invoices' && (
              <div className="space-y-3">
                {activeInvoices.length === 0 ? <EmptyState label="No invoices yet" /> : activeInvoices.map(i => (
                  <PortalInvoiceCard
                    key={i.id} invoice={i} appUrl={APP_URL}
                    portalToken={token!}
                    clientName={data!.client.name}
                    clientEmail={data!.client.email}
                    freelancerName={data!.freelancer.businessName}
                    onStatusChange={handleInvoiceStatusChange}
                  />
                ))}
              </div>
            )}

            {tab === 'meetings' && (
              <div className="space-y-3">
                {activeMeetings.length === 0
                  ? <EmptyState label="No meetings scheduled yet" />
                  : activeMeetings.map(m => <PortalMeetingCard key={m.id} meeting={m} />)
                }
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-[#C9CDD4] pb-4">Powered by Clinekt</p>
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] p-10 text-center">
      <p className="text-[13px] text-[#98A2B3]">{label}</p>
    </div>
  )
}

function PortalMeetingCard({ meeting }: { meeting: PortalMeeting }) {
  const date    = new Date(meeting.scheduledAt)
  const isUpcoming = meeting.status === 'SCHEDULED' && date >= new Date()

  const dateStr = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const durationLabel = meeting.durationMins >= 60
    ? `${meeting.durationMins / 60}h`
    : `${meeting.durationMins}m`

  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
          isUpcoming ? 'bg-[#EEF2FF]' : 'bg-[#F2F4F7]',
        )}>
          <Video size={16} className={isUpcoming ? 'text-[#6366F1]' : 'text-[#98A2B3]'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold text-[#101828] truncate">{meeting.title}</p>
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
              isUpcoming ? 'bg-[#EEF2FF] text-[#4338CA]'
                : meeting.status === 'COMPLETED' ? 'bg-[#ECFDF3] text-[#027A48]'
                : 'bg-[#F2F4F7] text-[#667085]',
            )}>
              {isUpcoming ? 'Upcoming' : meeting.status === 'COMPLETED' ? 'Completed' : 'Scheduled'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-[12px] text-[#667085]">
              <CalendarDays size={11} /> {dateStr} · {timeStr}
            </span>
            <span className="text-[11px] text-[#98A2B3] bg-[#F2F4F7] px-2 py-0.5 rounded-full">{durationLabel}</span>
          </div>
          {meeting.agenda && (
            <p className="text-[12px] text-[#667085] mt-1.5 line-clamp-2">{meeting.agenda}</p>
          )}
        </div>
      </div>
      {isUpcoming && meeting.meetLink && (
        <a
          href={meeting.meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#4F46E5] transition-colors"
        >
          <Video size={12} /> Join Meeting <ExternalLink size={10} />
        </a>
      )}
    </div>
  )
}
