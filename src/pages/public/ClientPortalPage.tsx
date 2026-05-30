import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  FileText, FileSignature, Receipt, AlertTriangle, Video, CalendarDays,
  ExternalLink, FolderKanban, Clock, IndianRupee, Shield, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  usePortalData,
  type PortalProposal, type PortalContract, type PortalInvoice,
  type PortalMeeting, type PortalProject,
} from '@/features/portal/hooks/usePortal'
import PortalProposalCard from '@/features/portal/components/PortalProposalCard'
import PortalContractCard from '@/features/portal/components/PortalContractCard'
import PortalInvoiceCard  from '@/features/portal/components/PortalInvoiceCard'

const APP_URL = import.meta.env.VITE_APP_URL as string

type Tab = 'overview' | 'proposals' | 'contracts' | 'invoices' | 'meetings' | 'projects'

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded-lg', className)} />
}

const NAV_ICONS: Partial<Record<Tab, React.ComponentType<{ size?: number; className?: string }>>> = {
  proposals: FileText,
  contracts: FileSignature,
  invoices:  Receipt,
  meetings:  Video,
  projects:  FolderKanban,
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

  const upcomingMeetings = activeMeetings.filter(
    m => m.status === 'SCHEDULED' && new Date(m.scheduledAt) >= new Date(),
  )

  const hasPendingInvoices  = activeInvoices.some(i => ['SENT', 'VIEWED', 'OVERDUE'].includes(i.status))
  const hasPendingContracts = activeContracts.some(c => c.status === 'SENT')
  const hasPendingProposals = activeProposals.some(p => ['SENT', 'OPENED'].includes(p.status))

  const pendingMap: Partial<Record<Tab, boolean>> = {
    proposals: hasPendingProposals,
    contracts: hasPendingContracts,
    invoices:  hasPendingInvoices,
  }

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
      .map(p => ({ label: `"${p.title}" awaits your response`, tab: 'proposals' as Tab })),
  ] : []

  const freelancerName = data?.freelancer.businessName ?? 'Rupway'

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-[#F4F6FB]">

      {/* Header */}
      <header className="bg-white border-b border-[#EAECF0] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isLoading ? (
              <Skeleton className="h-7 w-7 rounded-lg" />
            ) : data?.freelancer.logoUrl ? (
              <img src={data.freelancer.logoUrl} alt={freelancerName} className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#101828] flex items-center justify-center shrink-0">
                <span className="text-white text-[11px] font-bold">{freelancerName.charAt(0)}</span>
              </div>
            )}
            <span className="text-[13px] font-bold text-[#101828]">{freelancerName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#98A2B3] font-medium">
            <Shield size={11} /> Secured by Rupway
          </div>
        </div>
      </header>

      {/* Two-panel body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-5 py-6 flex gap-6 items-start">

        {/* Left sidebar — desktop only */}
        <aside className="hidden lg:block w-[232px] shrink-0 sticky top-[80px]">
          <div className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden">

            {/* Client info */}
            <div className="p-4 border-b border-[#F2F4F7]">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-28 mt-3" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-[#F4F6FB] border border-[#EAECF0] flex items-center justify-center mb-3">
                    <span className="text-[13px] font-bold text-[#344054]">{data?.client.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <p className="text-[14px] font-bold text-[#101828] leading-snug">{data?.client.name}</p>
                  {data?.client.company && (
                    <p className="text-[12px] text-[#667085] mt-0.5">{data.client.company}</p>
                  )}
                  {data?.client.email && (
                    <p className="text-[11.5px] text-[#98A2B3] mt-0.5 truncate">{data.client.email}</p>
                  )}
                </>
              )}
            </div>

            {/* Navigation */}
            <nav className="p-2">
              {isLoading ? (
                <div className="space-y-1 p-1">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 rounded-lg" />)}
                </div>
              ) : (
                visibleTabs.map(({ key, label, count }) => {
                  const Icon = key === 'overview' ? FileText : NAV_ICONS[key]
                  const hasPending = pendingMap[key] ?? false
                  return (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all mb-0.5',
                        tab === key
                          ? 'bg-[#F4F6FB] text-[#101828] font-semibold'
                          : 'text-[#667085] hover:bg-[#F4F6FB] hover:text-[#344054]',
                      )}
                    >
                      {Icon && <Icon size={14} className="shrink-0 text-current opacity-70" />}
                      <span className="flex-1 text-left">{label}</span>
                      {hasPending && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F79009] shrink-0" />
                      )}
                      {count > 0 && (
                        <span className={cn(
                          'text-[10.5px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none',
                          tab === key ? 'bg-[#101828] text-white' : 'bg-[#F2F4F7] text-[#667085]',
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </nav>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-[#F2F4F7]">
              <p className="text-[10.5px] text-[#C9CDD4] flex items-center gap-1.5">
                <Shield size={10} /> Secured & powered by Rupway
              </p>
            </div>
          </div>
        </aside>

        {/* Right content */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* Mobile: horizontal tab bar */}
          <div className="lg:hidden overflow-x-auto -mx-1">
            <div className="flex items-center gap-1 bg-white rounded-xl border border-[#EAECF0] p-1 min-w-fit shadow-sm">
              {visibleTabs.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'flex items-center gap-1.5 py-2 px-3 rounded-lg text-[12.5px] font-semibold transition-all whitespace-nowrap',
                    tab === key ? 'bg-[#101828] text-white' : 'text-[#667085] hover:bg-[#F4F6FB]',
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

          {/* Page title */}
          {!isLoading && (
            <div>
              <h2 className="text-[17px] font-bold text-[#101828]">
                {visibleTabs.find(t => t.key === tab)?.label ?? 'Overview'}
              </h2>
              {tab === 'overview' && (
                <p className="text-[13px] text-[#667085] mt-0.5">
                  {attentionItems.length > 0
                    ? `${attentionItems.length} item${attentionItems.length !== 1 ? 's' : ''} need your attention`
                    : 'Everything is up to date'}
                </p>
              )}
            </div>
          )}

          {/* Attention banner */}
          {!isLoading && attentionItems.length > 0 && tab === 'overview' && (
            <div className="bg-[#FFFAEB] border border-[#FDE68A] rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={14} className="text-[#B45309] mt-0.5 shrink-0" />
                <div className="space-y-2 w-full">
                  {attentionItems.map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-3">
                      <p className={cn('text-[12.5px]', item.urgent ? 'text-[#B42318] font-medium' : 'text-[#78350F]')}>
                        {item.label}
                      </p>
                      <button
                        onClick={() => setTab(item.tab)}
                        className="text-[11.5px] font-semibold text-[#B45309] hover:underline shrink-0"
                      >
                        View →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab content */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="space-y-3">
                  {activeProposals.length === 0 && activeContracts.length === 0 &&
                   activeInvoices.length === 0 && upcomingMeetings.length === 0 ? (
                    <EmptyState label="No documents shared yet" />
                  ) : (
                    <>
                      {upcomingMeetings.slice(0, 2).map(m => <PortalMeetingCard key={m.id} meeting={m} />)}
                      {activeProposals.slice(0, 2).map(p => (
                        <PortalProposalCard key={p.id} proposal={p} appUrl={APP_URL} onStatusChange={handleProposalStatusChange} />
                      ))}
                      {activeContracts.slice(0, 2).map(c => (
                        <PortalContractCard key={c.id} contract={c} appUrl={APP_URL} onStatusChange={handleContractStatusChange} />
                      ))}
                      {activeInvoices.slice(0, 2).map(i => (
                        <PortalInvoiceCard
                          key={i.id} invoice={i} appUrl={APP_URL} portalToken={token!}
                          clientName={data!.client.name} clientEmail={data!.client.email}
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
                      key={i.id} invoice={i} appUrl={APP_URL} portalToken={token!}
                      clientName={data!.client.name} clientEmail={data!.client.email}
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
        </main>
      </div>
    </div>
  )
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-10 text-center">
      <p className="text-[13px] text-[#98A2B3]">{label}</p>
    </div>
  )
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-[#EFF6FF] text-[#2563EB]',
  ON_HOLD:   'bg-[#FFFAEB] text-[#B54708]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
}

// ─── PortalProjectCard ────────────────────────────────────────────────────────

function PortalProjectCard({ project }: { project: PortalProject }) {
  const [open, setOpen] = useState(false)

  const totalMins    = project.timeEntries.reduce((s, e) => s + e.durationMins, 0)
  const totalHours   = totalMins / 60
  const expenseTotal = project.expenses.reduce((s, e) => s + Number(e.amount), 0)
  const billedValue  = project.timeEntries.reduce((s, e) => {
    if (!e.hourlyRate) return s
    return s + (e.durationMins / 60) * Number(e.hourlyRate)
  }, 0)

  const statusBadge = STATUS_BADGE[project.status] ?? STATUS_BADGE['ACTIVE']

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0]">
      {/* Header row */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#F4F6FB] border border-[#EAECF0] flex items-center justify-center shrink-0">
            <FolderKanban size={14} className="text-[#667085]" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#101828] truncate">{project.name}</p>
            {(project.startDate || project.endDate) && (
              <p className="text-[11.5px] text-[#98A2B3] mt-0.5 flex items-center gap-1">
                <CalendarDays size={10} />
                {project.startDate
                  ? new Date(project.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
                {' → '}
                {project.endDate
                  ? new Date(project.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Ongoing'}
              </p>
            )}
          </div>
        </div>
        <span className={cn('text-[10.5px] font-semibold px-2.5 py-1 rounded-full shrink-0', statusBadge)}>
          {project.status.charAt(0) + project.status.slice(1).toLowerCase().replace('_', ' ')}
        </span>
      </div>

      {/* Summary row */}
      <div className="px-4 pb-4 flex flex-wrap gap-x-5 gap-y-1.5 border-b border-[#F2F4F7]">
        <span className="flex items-center gap-1.5 text-[12px] text-[#667085]">
          <Clock size={12} className="text-[#98A2B3]" />
          {totalHours.toFixed(1)}h logged
        </span>
        {billedValue > 0 && (
          <span className="flex items-center gap-1.5 text-[12px] text-[#667085]">
            <IndianRupee size={12} className="text-[#98A2B3]" />
            ₹{billedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} time value
          </span>
        )}
        {expenseTotal > 0 && (
          <span className="flex items-center gap-1.5 text-[12px] text-[#667085]">
            <Receipt size={12} className="text-[#98A2B3]" />
            ₹{expenseTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} expenses
          </span>
        )}
        {project.budget && (
          <span className="flex items-center gap-1.5 text-[12px] text-[#667085]">
            <IndianRupee size={12} className="text-[#98A2B3]" />
            ₹{Number(project.budget).toLocaleString('en-IN', { maximumFractionDigits: 0 })} budget
          </span>
        )}
      </div>

      {/* Expand toggle */}
      {(project.timeEntries.length > 0 || project.expenses.length > 0) && (
        <>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full px-4 py-2.5 text-[12px] font-medium text-[#667085] hover:text-[#344054] hover:bg-[#F9FAFB] transition-colors text-left"
          >
            {open ? '▲ Hide details' : '▼ Show time & expenses'}
          </button>

          {open && (
            <div className="px-4 pb-4 space-y-4 border-t border-[#F2F4F7] pt-4">
              {project.timeEntries.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">Time Log</p>
                  <div className="space-y-0">
                    {project.timeEntries.map((e, idx) => (
                      <div
                        key={e.id}
                        className={cn(
                          'flex items-center justify-between gap-2 py-2',
                          idx < project.timeEntries.length - 1 && 'border-b border-[#F2F4F7]',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-[#344054] truncate">{e.description || 'Work session'}</p>
                          <p className="text-[11px] text-[#98A2B3]">
                            {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[12.5px] font-medium text-[#101828]">{(e.durationMins / 60).toFixed(1)}h</p>
                          {project.shareRateWithClient && e.hourlyRate && (
                            <p className="text-[11px] text-[#98A2B3]">₹{Number(e.hourlyRate).toLocaleString('en-IN')}/hr</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {project.expenses.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">Expenses</p>
                  <div className="space-y-0">
                    {project.expenses.map((e, idx) => (
                      <div
                        key={e.id}
                        className={cn(
                          'flex items-center justify-between gap-2 py-2',
                          idx < project.expenses.length - 1 && 'border-b border-[#F2F4F7]',
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-[#344054] truncate">{e.description}</p>
                          <p className="text-[11px] text-[#98A2B3]">
                            {e.category} · {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <p className="text-[12.5px] font-medium text-[#101828] shrink-0">
                          ₹{Number(e.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── PortalMeetingCard ────────────────────────────────────────────────────────

function PortalMeetingCard({ meeting }: { meeting: PortalMeeting }) {
  const date       = new Date(meeting.scheduledAt)
  const isUpcoming = meeting.status === 'SCHEDULED' && date >= new Date()
  const dateStr    = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr    = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const duration   = meeting.durationMins >= 60 ? `${meeting.durationMins / 60}h` : `${meeting.durationMins}m`

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#F4F6FB] border border-[#EAECF0] flex items-center justify-center shrink-0">
          <Video size={14} className="text-[#667085]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13.5px] font-semibold text-[#101828] truncate">{meeting.title}</p>
            <span className={cn(
              'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
              isUpcoming ? 'bg-[#EFF6FF] text-[#2563EB]'
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
            <span className="text-[11px] text-[#98A2B3] bg-[#F4F6FB] px-2 py-0.5 rounded-full">{duration}</span>
          </div>
          {meeting.agenda && (
            <p className="text-[12px] text-[#667085] mt-1.5 line-clamp-2">{meeting.agenda}</p>
          )}
        </div>
      </div>
      {isUpcoming && meeting.meetLink && (
        <a
          href={meeting.meetLink}
          target="_blank" rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[12.5px] font-semibold transition-colors"
        >
          <Video size={13} /> Join Meeting <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}
