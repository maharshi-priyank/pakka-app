import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileSignature, Receipt, AlertTriangle, Video, CalendarDays, ExternalLink, FolderKanban, Clock, IndianRupee, Bell, ChevronRight, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortalData, type PortalProposal, type PortalContract, type PortalInvoice, type PortalMeeting, type PortalProject } from '@/features/portal/hooks/usePortal'
import PortalProposalCard from '@/features/portal/components/PortalProposalCard'
import PortalContractCard from '@/features/portal/components/PortalContractCard'
import PortalInvoiceCard  from '@/features/portal/components/PortalInvoiceCard'

const APP_URL = import.meta.env.VITE_APP_URL as string

type Tab = 'overview' | 'proposals' | 'contracts' | 'invoices' | 'meetings' | 'projects'

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg', className)} />
}

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, isError } = usePortalData(token!)

  const [tab, setTab] = useState<Tab>('overview')

  const [proposals, setProposals] = useState<PortalProposal[] | null>(null)
  const [contracts, setContracts] = useState<PortalContract[] | null>(null)
  const [invoices,  setInvoices]  = useState<PortalInvoice[]  | null>(null)

  const activeProposals = proposals ?? data?.proposals ?? []
  const activeContracts = contracts ?? data?.contracts ?? []
  const activeInvoices  = invoices  ?? data?.invoices  ?? []
  const activeMeetings  = data?.meetings  ?? []
  const activeProjects  = data?.projects  ?? []

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

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'overview',  label: 'Overview',  count: 0 },
    { key: 'proposals', label: 'Proposals', count: activeProposals.length },
    { key: 'contracts', label: 'Contracts', count: activeContracts.length },
    { key: 'invoices',  label: 'Invoices',  count: activeInvoices.length },
    { key: 'meetings',  label: 'Meetings',  count: upcomingMeetings.length },
    { key: 'projects',  label: 'Projects',  count: activeProjects.length },
  ]

  const visibleTabs = TABS.filter(t => t.key === 'overview' || t.count > 0)

  const attentionItems: { label: string; tab: Tab; urgent?: boolean }[] = data ? [
    ...activeInvoices
      .filter(i => i.status === 'OVERDUE')
      .map(i => ({ label: `Invoice ${i.invoiceNumber} is overdue — ₹${fmt(i.total)}`, tab: 'invoices' as Tab, urgent: true })),
    ...activeInvoices
      .filter(i => i.status === 'SENT' || i.status === 'VIEWED')
      .map(i => ({ label: `Invoice ${i.invoiceNumber} awaits payment — ₹${fmt(i.total)}`, tab: 'invoices' as Tab })),
    ...activeContracts
      .filter(c => c.status === 'SENT')
      .map(c => ({ label: `"${c.title}" needs your signature`, tab: 'contracts' as Tab })),
    ...activeProposals
      .filter(p => p.status === 'SENT' || p.status === 'OPENED')
      .map(p => ({ label: `"${p.title}" proposal awaits your response`, tab: 'proposals' as Tab })),
  ] : []

  const freelancerName = data?.freelancer.businessName ?? 'Clinekt'

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

  return (
    <div className="min-h-screen bg-[#F4F5F8]">

      {/* Sticky header */}
      <header className="bg-white border-b border-[#EAECF0] sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isLoading ? (
              <Skeleton className="h-7 w-7 rounded-lg bg-[#F2F4F7]" />
            ) : data?.freelancer.logoUrl ? (
              <img src={data.freelancer.logoUrl} alt={freelancerName} className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center shrink-0">
                <span className="text-white text-[11px] font-bold">{freelancerName.charAt(0)}</span>
              </div>
            )}
            {isLoading
              ? <Skeleton className="h-3.5 w-28 bg-[#F2F4F7]" />
              : <span className="text-[13px] font-bold text-[#101828]">{freelancerName}</span>
            }
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#98A2B3] font-medium">
            <Shield size={11} />
            Secured by Clinekt
          </div>
        </div>
      </header>

      {/* Dark hero */}
      <div className="bg-[#0F172A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-10">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-3.5 w-14 bg-white/10" />
              <Skeleton className="h-9 w-60 bg-white/10" />
              <Skeleton className="h-3.5 w-48 bg-white/10" />
              <div className="flex gap-2 mt-5">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-7 w-20 rounded-full bg-white/10" />)}
              </div>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1">Hello,</p>
              <h1 className="text-[30px] sm:text-[34px] font-extrabold text-white leading-tight">{data?.client.name}</h1>
              <p className="text-[13.5px] text-white/50 mt-1.5">
                Your workspace with <span className="text-white/80 font-medium">{freelancerName}</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {[
                  { label: 'Proposals', count: activeProposals.length },
                  { label: 'Contracts', count: activeContracts.length },
                  { label: 'Invoices',  count: activeInvoices.length },
                  { label: 'Meetings',  count: upcomingMeetings.length },
                  { label: 'Projects',  count: activeProjects.length },
                ].filter(s => s.count > 0).map(({ label, count }) => (
                  <span key={label} className="text-[12px] font-semibold px-3 py-1 rounded-full bg-white/10 text-white/80">
                    {count} {label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 space-y-4">

        {/* Attention banner */}
        {!isLoading && attentionItems.length > 0 && (
          <div className="bg-[#FFFAEB] border border-[#FDE68A] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#FDE68A]">
              <Bell size={13} className="text-[#B45309] shrink-0" />
              <p className="text-[12.5px] font-bold text-[#92400E]">
                {attentionItems.length === 1 ? '1 item needs your attention' : `${attentionItems.length} items need your attention`}
              </p>
            </div>
            <div className="divide-y divide-[#FDE68A]">
              {attentionItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setTab(item.tab)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#FEF3C7] transition-colors"
                >
                  <span className={cn(
                    'text-[12.5px] font-medium',
                    item.urgent ? 'text-[#B42318]' : 'text-[#78350F]',
                  )}>
                    {item.label}
                  </span>
                  <ChevronRight size={12} className="text-[#B45309] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-[#EAECF0] p-1 shadow-sm min-w-fit">
            {visibleTabs.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-[12.5px] font-semibold transition-all whitespace-nowrap',
                  tab === key
                    ? 'bg-[#0F172A] text-white shadow-sm'
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
        </div>

        {/* Tab content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl bg-white" />)}
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-3">
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

            {tab === 'projects' && (
              <div className="space-y-3">
                {activeProjects.length === 0
                  ? <EmptyState label="No projects shared yet" />
                  : activeProjects.map(p => <PortalProjectCard key={p.id} project={p} />)
                }
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] text-[#C9CDD4] pb-4 flex items-center justify-center gap-1.5">
          <Shield size={10} /> Secured & powered by Clinekt · 2026
        </p>
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

const PORTAL_PROJECT_STATUS: Record<string, { label: string; className: string }> = {
  ACTIVE:    { label: 'Active',    className: 'bg-emerald-50 text-emerald-700' },
  COMPLETED: { label: 'Completed', className: 'bg-blue-50 text-blue-700' },
  ON_HOLD:   { label: 'On Hold',   className: 'bg-amber-50 text-amber-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
}

function PortalProjectCard({ project }: { project: PortalProject }) {
  const totalMins    = project.timeEntries.reduce((s, e) => s + e.durationMins, 0)
  const totalHours   = totalMins / 60
  const expenseTotal = project.expenses.reduce((s, e) => s + Number(e.amount), 0)
  const billedValue  = project.timeEntries.reduce((s, e) => {
    if (!e.hourlyRate) return s
    return s + (e.durationMins / 60) * Number(e.hourlyRate)
  }, 0)

  const statusInfo = PORTAL_PROJECT_STATUS[project.status] ?? PORTAL_PROJECT_STATUS['ACTIVE']

  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
            <FolderKanban size={16} className="text-[#6366F1]" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#101828]">{project.name}</p>
            {(project.startDate || project.endDate) && (
              <p className="text-[11.5px] text-[#98A2B3] mt-0.5 flex items-center gap-1">
                <CalendarDays size={10} />
                {project.startDate ? new Date(project.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                {' → '}
                {project.endDate ? new Date(project.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
              </p>
            )}
          </div>
        </div>
        <span className={cn('text-[10.5px] font-bold px-2.5 py-1 rounded-full shrink-0', statusInfo.className)}>
          {statusInfo.label}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-[#F4F5F8] rounded-lg px-3 py-1.5">
          <Clock size={12} className="text-[#6366F1]" />
          <span className="text-[12px] font-semibold text-[#344054]">{totalHours.toFixed(1)}h logged</span>
        </div>
        {billedValue > 0 && (
          <div className="flex items-center gap-1.5 bg-[#F4F5F8] rounded-lg px-3 py-1.5">
            <IndianRupee size={12} className="text-[#6366F1]" />
            <span className="text-[12px] font-semibold text-[#344054]">
              ₹{billedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} time value
            </span>
          </div>
        )}
        {expenseTotal > 0 && (
          <div className="flex items-center gap-1.5 bg-[#FEF3F2] rounded-lg px-3 py-1.5">
            <Receipt size={12} className="text-[#D92D20]" />
            <span className="text-[12px] font-semibold text-[#344054]">
              ₹{expenseTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} expenses
            </span>
          </div>
        )}
        {project.budget && (
          <div className="flex items-center gap-1.5 bg-[#ECFDF3] rounded-lg px-3 py-1.5">
            <IndianRupee size={12} className="text-[#027A48]" />
            <span className="text-[12px] font-semibold text-[#344054]">
              ₹{Number(project.budget).toLocaleString('en-IN', { maximumFractionDigits: 0 })} budget
            </span>
          </div>
        )}
      </div>

      {project.timeEntries.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">Time Log</p>
          <div className="space-y-1.5">
            {project.timeEntries.map(e => (
              <div key={e.id} className="flex items-center justify-between gap-2 py-1 border-b border-[#F2F4F7] last:border-0">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-[#344054] truncate">{e.description || 'Work session'}</p>
                  <p className="text-[11px] text-[#98A2B3]">
                    {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-right">
                  <div>
                    <p className="text-[12.5px] font-semibold text-[#101828]">{(e.durationMins / 60).toFixed(1)}h</p>
                    {project.shareRateWithClient && e.hourlyRate && (
                      <p className="text-[11px] text-[#98A2B3]">₹{Number(e.hourlyRate).toLocaleString('en-IN')}/hr</p>
                    )}
                  </div>
                  {e.isBilled && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#027A48]">Billed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.expenses.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">Expenses</p>
          <div className="space-y-1.5">
            {project.expenses.map(e => (
              <div key={e.id} className="flex items-center justify-between gap-2 py-1 border-b border-[#F2F4F7] last:border-0">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-[#344054] truncate">{e.description}</p>
                  <p className="text-[11px] text-[#98A2B3]">
                    {e.category} · {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-[12.5px] font-semibold text-[#101828]">
                    ₹{Number(e.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  {e.isBilled && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#027A48]">Billed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
          className="mt-3 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#0F172A] text-white text-[12.5px] font-semibold hover:bg-[#1e293b] transition-colors"
        >
          <Video size={13} /> Join Meeting <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}
