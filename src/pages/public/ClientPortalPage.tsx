import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertTriangle, Video, CalendarDays, ExternalLink, FolderKanban,
  Clock, IndianRupee, Download, Lock, MessageSquare,
  Paperclip, FileArchive, FileImage, File as FileIconLucide,
  LayoutDashboard, ArrowLeft, Bell, ChevronRight, Megaphone,
  Receipt, FileSignature, FileText,
} from 'lucide-react'
import { usePortalThread, useSendPortalReply, useMarkPortalRead } from '@/features/messages/hooks/useMessages'
import { MessageBubble } from '@/features/messages/components/MessageBubble'
import { ReplyComposer } from '@/features/messages/components/ReplyComposer'
import { cn } from '@/lib/utils'
import {
  usePortalData,
  type PortalProposal, type PortalContract, type PortalInvoice,
  type PortalMeeting, type PortalProject, type PortalProjectUpdate,
} from '@/features/portal/hooks/usePortal'
import { usePortalAttachments, humanSize } from '@/features/attachments/useAttachments'
import type { PortalAttachment } from '@/features/attachments/types'
import { STAGE_LABELS, STAGE_OUTLINE_COLORS, type ContactStage } from '@/features/contacts/schemas/contact.schema'
import PortalProposalCard from '@/features/portal/components/PortalProposalCard'
import PortalContractCard from '@/features/portal/components/PortalContractCard'
import PortalInvoiceCard  from '@/features/portal/components/PortalInvoiceCard'

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab        = 'overview' | 'projects' | 'messages' | 'meetings'
type ProjectTab = 'updates' | 'proposals' | 'contracts' | 'invoices' | 'time'

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function portalTimeAgo(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#EEF2F7] rounded-lg', className)} />
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-[#EFF6FF] text-[#2563EB]',
  ON_HOLD:   'bg-[#FFFAEB] text-[#B54708]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')
}

// ─── Small shared components ──────────────────────────────────────────────────

function EmptyState({ icon: Icon, label, sub }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  sub?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#F1F5FD] flex items-center justify-center mb-3">
        <Icon size={20} className="text-[#B8C0D4]" />
      </div>
      <p className="text-[13.5px] font-semibold text-[#1E293B]">{label}</p>
      {sub && <p className="text-[12.5px] text-[#64748B] mt-1">{sub}</p>}
    </div>
  )
}

function SectionCard({ title, children, className }: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('bg-white rounded-xl border border-[#E4ECFC] overflow-hidden', className)}>
      {title && (
        <div className="px-5 py-3.5 border-b border-[#E4ECFC]">
          <h2 className="text-[13.5px] font-semibold text-[#0F172A]">{title}</h2>
        </div>
      )}
      {children}
    </div>
  )
}

function SubTabBar({ tabs, active, onChange }: {
  tabs: { key: ProjectTab; label: string; count?: number }[]
  active: ProjectTab
  onChange: (tab: ProjectTab) => void
}) {
  return (
    <div className="flex gap-0.5 bg-[#F1F5F9] p-1 rounded-xl overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-all',
            active === t.key
              ? 'bg-white text-[#0F172A] shadow-sm'
              : 'text-[#64748B] hover:text-[#1E293B]',
          )}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className={cn(
              'text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center',
              active === t.key ? 'bg-[#2563EB] text-white' : 'bg-[#E2E8F0] text-[#64748B]',
            )}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Portal Update Entry ──────────────────────────────────────────────────────

function PortalUpdateEntry({ update }: { update: PortalProjectUpdate }) {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[10px] font-bold text-[#2563EB] shrink-0 mt-0.5">
        {update.author.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[12px] font-semibold text-[#1E293B]">{update.author.name}</span>
          <span className="text-[11px] text-[#94A3B8]">{portalTimeAgo(update.createdAt)}</span>
        </div>
        <p className="text-[13px] text-[#475569] leading-relaxed whitespace-pre-wrap">{update.content}</p>
      </div>
    </div>
  )
}

// ─── Portal Meeting Card ──────────────────────────────────────────────────────

function PortalMeetingCard({ meeting }: { meeting: PortalMeeting }) {
  const date       = new Date(meeting.scheduledAt)
  const isUpcoming = meeting.status === 'SCHEDULED' && date >= new Date()
  const dateStr    = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr    = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const duration   = meeting.durationMins >= 60 ? `${meeting.durationMins / 60}h` : `${meeting.durationMins}m`

  return (
    <div className="bg-white rounded-xl border border-[#E4ECFC] p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#F1F5FD] flex items-center justify-center shrink-0">
          <Video size={15} className="text-[#2563EB]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold text-[#0F172A] truncate">{meeting.title}</p>
            <span className={cn(
              'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
              isUpcoming        ? 'bg-[#EFF6FF] text-[#2563EB]'
              : meeting.status === 'COMPLETED' ? 'bg-[#ECFDF3] text-[#027A48]'
              : 'bg-[#F2F4F7] text-[#667085]',
            )}>
              {isUpcoming ? 'Upcoming' : meeting.status === 'COMPLETED' ? 'Completed' : 'Scheduled'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-[12px] text-[#64748B]">
              <CalendarDays size={11} /> {dateStr} · {timeStr}
            </span>
            <span className="text-[11px] text-[#94A3B8] bg-[#F1F5FD] px-2 py-0.5 rounded-full">{duration}</span>
          </div>
          {meeting.agenda && (
            <p className="text-[12.5px] text-[#64748B] mt-1.5 line-clamp-2">{meeting.agenda}</p>
          )}
        </div>
      </div>
      {isUpcoming && meeting.meetLink && (
        <a
          href={meeting.meetLink}
          target="_blank" rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12.5px] font-semibold transition-colors"
        >
          <Video size={13} /> Join Meeting <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}

// ─── Portal Messages Panel ────────────────────────────────────────────────────

function PortalMessagesPanel({ token }: { token: string }) {
  const { data, isLoading } = usePortalThread(token)
  const sendReply = useSendPortalReply(token)
  const markRead  = useMarkPortalRead(token)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { markRead.mutate() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />

  const messages     = data?.messages ?? []
  const businessName = data?.businessName ?? 'Your service provider'

  return (
    <SectionCard title={`Messages from ${businessName}`}>
      <div className="px-4 py-4 flex flex-col gap-3 min-h-[180px]">
        {messages.length === 0 && (
          <p className="text-center text-[13px] text-[#94A3B8] py-6">No messages yet from {businessName}.</p>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isPortal clientName={businessName} />
        ))}
        <div ref={bottomRef} />
      </div>
      <ReplyComposer
        isPending={sendReply.isPending}
        placeholder={`Message ${businessName}…`}
        onSend={async body => { await sendReply.mutateAsync(body) }}
      />
    </SectionCard>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

interface OverviewTabProps {
  data:                   NonNullable<ReturnType<typeof usePortalData>['data']>
  activeProposals:        PortalProposal[]
  activeContracts:        PortalContract[]
  activeInvoices:         PortalInvoice[]
  upcomingMeetings:       PortalMeeting[]
  portalFiles:            PortalAttachment[]
  token:                  string
  onProposalStatusChange: (id: string, status: string) => void
  onContractStatusChange: (id: string, status: string) => void
  onInvoiceStatusChange:  (id: string, status: string) => void
  onOpenProject:          (id: string, tab?: ProjectTab) => void
}

function OverviewTab({
  data, activeProposals, activeContracts, activeInvoices,
  upcomingMeetings, portalFiles, token,
  onProposalStatusChange, onContractStatusChange, onInvoiceStatusChange,
  onOpenProject,
}: OverviewTabProps) {
  const { projects }    = data
  const freelancerName  = data.freelancer.businessName ?? 'your provider'
  const clientFirstName = data.client.name.split(' ')[0]
  const activeCount     = projects.filter(p => p.status === 'ACTIVE').length

  // Recent updates across all projects, newest first
  const recentUpdates = projects
    .flatMap(p => p.updates.map(u => ({ ...u, projectName: p.name, projectId: p.id })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  // Unlinked docs (no projectId) — show full cards in overview
  const unlinkedProposals = activeProposals.filter(p => !p.projectId && ['SENT', 'OPENED'].includes(p.status))
  const unlinkedContracts = activeContracts.filter(c => !c.projectId && c.status === 'SENT')
  const unlinkedInvoices  = activeInvoices.filter(i => !i.projectId && ['SENT', 'VIEWED', 'OVERDUE'].includes(i.status))

  // Linked pending docs — show as compact attention rows pointing into project
  const linkedProposals = activeProposals.filter(p => p.projectId && ['SENT', 'OPENED'].includes(p.status))
  const linkedContracts = activeContracts.filter(c => c.projectId && c.status === 'SENT')
  const linkedInvoices  = activeInvoices.filter(i => i.projectId && ['SENT', 'VIEWED', 'OVERDUE'].includes(i.status))

  const hasLinkedPending = linkedProposals.length > 0 || linkedContracts.length > 0 || linkedInvoices.length > 0
  const hasUnlinkedPending = unlinkedProposals.length > 0 || unlinkedContracts.length > 0 || unlinkedInvoices.length > 0

  return (
    <div className="space-y-4">

      {/* Welcome card */}
      <div className="bg-white rounded-xl border border-[#E4ECFC] px-5 py-5">
        <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Client Portal</p>
        <h1 className="text-[20px] font-bold text-[#0F172A]">Welcome, {clientFirstName}</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">
          Workspace with <span className="font-semibold text-[#1E293B]">{freelancerName}</span>
        </p>
        {(activeCount > 0 || upcomingMeetings.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {activeCount > 0 && (
              <button
                onClick={() => onOpenProject(projects.find(p => p.status === 'ACTIVE')?.id ?? projects[0]?.id ?? '')}
                className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#475569] bg-[#F8FAFC] border border-[#E4ECFC] px-3 py-1.5 rounded-lg hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              >
                <FolderKanban size={13} className="text-[#2563EB]" />
                {activeCount} active {activeCount === 1 ? 'project' : 'projects'}
              </button>
            )}
            {upcomingMeetings.length > 0 && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#475569] bg-[#F8FAFC] border border-[#E4ECFC] px-3 py-1.5 rounded-lg">
                <Video size={13} className="text-[#2563EB]" />
                {upcomingMeetings.length} upcoming {upcomingMeetings.length === 1 ? 'meeting' : 'meetings'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Linked pending items — compact rows with "Open in project" */}
      {hasLinkedPending && (
        <SectionCard>
          <div className="px-5 py-3.5 border-b border-[#E4ECFC] flex items-center gap-2">
            <Bell size={14} className="text-[#B45309]" />
            <h2 className="text-[13.5px] font-semibold text-[#0F172A]">Needs your attention</h2>
            <span className="ml-auto text-[11px] font-bold bg-[#FFFAEB] text-[#B45309] px-2 py-0.5 rounded-full">
              {linkedProposals.length + linkedContracts.length + linkedInvoices.length}
            </span>
          </div>
          <div className="divide-y divide-[#F8FAFC]">
            {linkedInvoices.map(i => (
              <div key={i.id} className="flex items-center gap-3 px-5 py-3">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  i.status === 'OVERDUE' ? 'bg-[#FEF3F2]' : 'bg-[#FFFAEB]',
                )}>
                  <Receipt size={14} className={i.status === 'OVERDUE' ? 'text-[#D92D20]' : 'text-[#B45309]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#1E293B] truncate">
                    {i.status === 'OVERDUE' ? '⚠ ' : ''}Invoice {i.invoiceNumber}
                    {' — '}₹{fmt(i.total)}
                  </p>
                  <p className="text-[11.5px] text-[#64748B]">
                    {i.status === 'OVERDUE' ? 'Overdue' : 'Awaiting payment'}
                  </p>
                </div>
                <button
                  onClick={() => onOpenProject(i.projectId!, 'invoices')}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#2563EB] hover:underline shrink-0"
                >
                  View <ChevronRight size={12} />
                </button>
              </div>
            ))}
            {linkedContracts.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center shrink-0">
                  <FileSignature size={14} className="text-[#16A34A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#1E293B] truncate">"{c.title}"</p>
                  <p className="text-[11.5px] text-[#64748B]">Awaiting your signature</p>
                </div>
                <button
                  onClick={() => onOpenProject(c.projectId!, 'contracts')}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#2563EB] hover:underline shrink-0"
                >
                  Sign <ChevronRight size={12} />
                </button>
              </div>
            ))}
            {linkedProposals.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-[#F0F9FF] flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-[#0369A1]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#1E293B] truncate">"{p.title}"</p>
                  <p className="text-[11.5px] text-[#64748B]">Awaiting your response</p>
                </div>
                <button
                  onClick={() => onOpenProject(p.projectId!, 'proposals')}
                  className="flex items-center gap-1 text-[12px] font-semibold text-[#2563EB] hover:underline shrink-0"
                >
                  Review <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Unlinked pending docs — full interactive cards */}
      {hasUnlinkedPending && (
        <SectionCard title="Documents awaiting action">
          <div className="px-4 py-4 space-y-3">
            {unlinkedInvoices.map(i => (
              <PortalInvoiceCard
                key={i.id} invoice={i} appUrl={APP_URL} portalToken={token}
                clientName={data.client.name} clientEmail={data.client.email ?? ''}
                freelancerName={data.freelancer.businessName ?? ''}
                onStatusChange={onInvoiceStatusChange}
              />
            ))}
            {unlinkedContracts.map(c => (
              <PortalContractCard key={c.id} contract={c} appUrl={APP_URL} onStatusChange={onContractStatusChange} />
            ))}
            {unlinkedProposals.map(p => (
              <PortalProposalCard key={p.id} proposal={p} appUrl={APP_URL} onStatusChange={onProposalStatusChange} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Recent updates across projects */}
      {recentUpdates.length > 0 && (
        <SectionCard title="Recent updates">
          <div className="px-5 py-4 space-y-5">
            {recentUpdates.map(u => (
              <div key={u.id}>
                <button
                  onClick={() => onOpenProject(u.projectId, 'updates')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] hover:underline mb-1.5"
                >
                  <FolderKanban size={10} />
                  {u.projectName}
                  <ChevronRight size={10} />
                </button>
                <PortalUpdateEntry update={u} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Upcoming meetings preview */}
      {upcomingMeetings.length > 0 && (
        <SectionCard title="Upcoming meetings">
          <div className="px-4 py-4 space-y-3">
            {upcomingMeetings.slice(0, 2).map(m => <PortalMeetingCard key={m.id} meeting={m} />)}
          </div>
        </SectionCard>
      )}

      {/* Shared files */}
      {portalFiles.length > 0 && (
        <SectionCard title={`Shared files (${portalFiles.length})`}>
          <div className="divide-y divide-[#F8FAFC]">
            {portalFiles.map((f: PortalAttachment) => {
              let icon = <FileIconLucide size={14} className="text-[#94A3B8] shrink-0" />
              if (f.mimeType.startsWith('image/'))  icon = <FileImage   size={14} className="text-[#94A3B8] shrink-0" />
              if (f.mimeType === 'application/pdf') icon = <FileText    size={14} className="text-[#D92D20] shrink-0" />
              if (f.mimeType.includes('zip') || f.mimeType.includes('tar') || f.mimeType.includes('rar'))
                                                    icon = <FileArchive size={14} className="text-[#F79009] shrink-0" />
              return (
                <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                  {icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-[#1E293B] truncate">{f.fileName}</p>
                    <p className="text-[11px] text-[#94A3B8]">
                      {humanSize(f.fileSize)}
                      {f.parentLabel && <> · <span className="text-[#64748B]">{f.parentLabel}</span></>}
                    </p>
                  </div>
                  {f.fileUrl ? (
                    <a
                      href={f.fileUrl} download={f.fileName}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-[12px] font-semibold hover:bg-[#1D4ED8] transition-colors shrink-0"
                    >
                      <Download size={12} strokeWidth={2.5} /> Download
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#94A3B8] shrink-0">
                      <Lock size={12} strokeWidth={2} /> Locked
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* Empty state */}
      {!hasLinkedPending && !hasUnlinkedPending && recentUpdates.length === 0 && upcomingMeetings.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          label="You're all caught up"
          sub="No pending items. Check Projects for your latest work."
        />
      )}
    </div>
  )
}

// ─── Project List ─────────────────────────────────────────────────────────────

function ProjectList({ projects, proposals, contracts, invoices, onOpenProject }: {
  projects:    PortalProject[]
  proposals:   PortalProposal[]
  contracts:   PortalContract[]
  invoices:    PortalInvoice[]
  onOpenProject: (id: string, tab?: ProjectTab) => void
}) {
  if (projects.length === 0) {
    return <EmptyState icon={FolderKanban} label="No projects yet" sub="Your projects will appear here once shared" />
  }

  return (
    <div className="space-y-3">
      {projects.map(p => {
        const totalHours    = p.timeEntries.reduce((s, e) => s + e.durationMins, 0) / 60
        const expenseTotal  = p.expenses.reduce((s, e) => s + Number(e.amount), 0)
        const projProposals = proposals.filter(pr => pr.projectId === p.id)
        const projContracts = contracts.filter(c  => c.projectId  === p.id)
        const projInvoices  = invoices.filter(i   => i.projectId  === p.id)
        const docCount      = projProposals.length + projContracts.length + projInvoices.length
        const pendingCount  = [
          ...projProposals.filter(pr => ['SENT', 'OPENED'].includes(pr.status)),
          ...projContracts.filter(c  => c.status === 'SENT'),
          ...projInvoices.filter(i   => ['SENT', 'VIEWED', 'OVERDUE'].includes(i.status)),
        ].length
        const statusBadge = STATUS_BADGE[p.status] ?? STATUS_BADGE['ACTIVE']

        return (
          <button
            key={p.id}
            onClick={() => onOpenProject(p.id)}
            className="w-full bg-white rounded-xl border border-[#E4ECFC] hover:border-[#BFDBFE] hover:shadow-sm transition-all text-left group"
          >
            <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F1F5FD] flex items-center justify-center shrink-0 group-hover:bg-[#DBEAFE] transition-colors">
                  <FolderKanban size={16} className="text-[#2563EB]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#0F172A] truncate group-hover:text-[#2563EB] transition-colors">
                    {p.name}
                  </p>
                  {(p.startDate || p.endDate) && (
                    <p className="text-[11.5px] text-[#94A3B8] mt-0.5 flex items-center gap-1">
                      <CalendarDays size={10} />
                      {p.startDate
                        ? new Date(p.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                      {' → '}
                      {p.endDate
                        ? new Date(p.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Ongoing'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pendingCount > 0 && (
                  <span className="text-[10.5px] font-bold bg-[#FFFAEB] text-[#B45309] px-2 py-0.5 rounded-full">
                    {pendingCount} pending
                  </span>
                )}
                <span className={cn('text-[10.5px] font-semibold px-2.5 py-1 rounded-full', statusBadge)}>
                  {statusLabel(p.status)}
                </span>
                <ChevronRight size={15} className="text-[#CBD5E1] group-hover:text-[#2563EB] transition-colors" />
              </div>
            </div>
            <div className="px-4 pb-3.5 flex flex-wrap gap-x-4 gap-y-1">
              {totalHours > 0 && (
                <span className="flex items-center gap-1 text-[12px] text-[#64748B]">
                  <Clock size={11} className="text-[#94A3B8]" />
                  {totalHours.toFixed(1)}h logged
                </span>
              )}
              {p.budget && (
                <span className="flex items-center gap-1 text-[12px] text-[#64748B]">
                  <IndianRupee size={11} className="text-[#94A3B8]" />
                  ₹{Number(p.budget).toLocaleString('en-IN', { maximumFractionDigits: 0 })} budget
                </span>
              )}
              {p.updates.length > 0 && (
                <span className="flex items-center gap-1 text-[12px] text-[#64748B]">
                  <Megaphone size={11} className="text-[#94A3B8]" />
                  {p.updates.length} {p.updates.length === 1 ? 'update' : 'updates'}
                </span>
              )}
              {docCount > 0 && (
                <span className="flex items-center gap-1 text-[12px] text-[#64748B]">
                  <Paperclip size={11} className="text-[#94A3B8]" />
                  {docCount} {docCount === 1 ? 'document' : 'documents'}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Project Detail ───────────────────────────────────────────────────────────

interface ProjectDetailProps {
  project:                PortalProject
  proposals:              PortalProposal[]
  contracts:              PortalContract[]
  invoices:               PortalInvoice[]
  contactStage?:          ContactStage
  token:                  string
  initialTab:             ProjectTab
  onProposalStatusChange: (id: string, status: string) => void
  onContractStatusChange: (id: string, status: string) => void
  onInvoiceStatusChange:  (id: string, status: string) => void
  onBack:                 () => void
}

function ProjectDetail({
  project, proposals, contracts, invoices, contactStage, token, initialTab,
  onProposalStatusChange, onContractStatusChange, onInvoiceStatusChange, onBack,
}: ProjectDetailProps) {
  const [pTab, setPTab] = useState<ProjectTab>(initialTab)

  // Re-sync initialTab when it changes (e.g. navigated from overview attention item)
  useEffect(() => { setPTab(initialTab) }, [initialTab])

  const projProposals = proposals.filter(p => p.projectId === project.id)
  const projContracts = contracts.filter(c => c.projectId === project.id)
  const projInvoices  = invoices.filter(i => i.projectId  === project.id)

  const totalMins   = project.timeEntries.reduce((s, e) => s + e.durationMins, 0)
  const totalHours  = totalMins / 60
  const billedValue = project.timeEntries.reduce((s, e) => {
    if (!e.hourlyRate) return s
    return s + (e.durationMins / 60) * Number(e.hourlyRate)
  }, 0)
  const expenseTotal = project.expenses.reduce((s, e) => s + Number(e.amount), 0)

  const statusBadge = STATUS_BADGE[project.status] ?? STATUS_BADGE['ACTIVE']

  const subTabs: { key: ProjectTab; label: string; count?: number }[] = [
    { key: 'updates',   label: 'Updates',      count: project.updates.length },
    { key: 'proposals', label: 'Proposals',    count: projProposals.length },
    { key: 'contracts', label: 'Contracts',    count: projContracts.length },
    { key: 'invoices',  label: 'Invoices',     count: projInvoices.length },
    { key: 'time',      label: 'Time & Expenses' },
  ]

  return (
    <div className="space-y-4">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          <ArrowLeft size={13} />
          Projects
        </button>
        <ChevronRight size={12} className="text-[#CBD5E1]" />
        <span className="text-[12.5px] font-semibold text-[#0F172A] truncate max-w-[200px]">{project.name}</span>
      </div>

      {/* Project header card */}
      <div className="bg-white rounded-xl border border-[#E4ECFC] px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#F1F5FD] flex items-center justify-center shrink-0">
              <FolderKanban size={18} className="text-[#2563EB]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[17px] font-bold text-[#0F172A] truncate">{project.name}</h1>
              {(project.startDate || project.endDate) && (
                <p className="text-[12px] text-[#94A3B8] mt-0.5 flex items-center gap-1">
                  <CalendarDays size={11} />
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
          <div className="flex items-center gap-1.5 shrink-0">
            {contactStage && (
              <span className={cn('text-[10.5px] font-semibold px-2.5 py-1 rounded-full', STAGE_OUTLINE_COLORS[contactStage])}>
                {STAGE_LABELS[contactStage]}
              </span>
            )}
            <span className={cn('text-[10.5px] font-semibold px-2.5 py-1 rounded-full', statusBadge)}>
              {statusLabel(project.status)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {totalHours > 0 && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-[#64748B]">
              <Clock size={12} className="text-[#94A3B8]" />
              {totalHours.toFixed(1)}h logged
            </span>
          )}
          {billedValue > 0 && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-[#64748B]">
              <IndianRupee size={12} className="text-[#94A3B8]" />
              ₹{billedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} time value
            </span>
          )}
          {expenseTotal > 0 && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-[#64748B]">
              <Receipt size={12} className="text-[#94A3B8]" />
              ₹{expenseTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} expenses
            </span>
          )}
          {project.budget && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-[#64748B]">
              <IndianRupee size={12} className="text-[#94A3B8]" />
              ₹{Number(project.budget).toLocaleString('en-IN', { maximumFractionDigits: 0 })} budget
            </span>
          )}
        </div>
      </div>

      {/* Sub-tab bar */}
      <SubTabBar tabs={subTabs} active={pTab} onChange={setPTab} />

      {/* Updates */}
      {pTab === 'updates' && (
        project.updates.length === 0
          ? <EmptyState icon={Megaphone} label="No updates yet" sub="Your team will post progress updates here" />
          : (
            <div className="space-y-3">
              {project.updates.map((u, idx) => (
                <div key={u.id} className={cn(
                  'relative flex gap-3',
                  idx < project.updates.length - 1 && 'pb-4',
                )}>
                  {idx < project.updates.length - 1 && (
                    <div className="absolute left-[13px] top-7 bottom-0 w-px bg-[#E4ECFC]" />
                  )}
                  <div className="relative z-10 w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[10px] font-bold text-[#2563EB] shrink-0 mt-0.5">
                    {u.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 bg-white rounded-xl border border-[#E4ECFC] px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[12px] font-semibold text-[#0F172A]">{u.author.name}</span>
                      <span className="text-[11px] text-[#94A3B8]">{portalTimeAgo(u.createdAt)}</span>
                    </div>
                    <p className="text-[13px] text-[#475569] leading-relaxed whitespace-pre-wrap">{u.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {/* Proposals */}
      {pTab === 'proposals' && (
        projProposals.length === 0
          ? <EmptyState icon={FileText} label="No proposals" sub="Proposals linked to this project will appear here" />
          : (
            <div className="space-y-3">
              {projProposals.map(p => (
                <PortalProposalCard key={p.id} proposal={p} appUrl={APP_URL} onStatusChange={onProposalStatusChange} />
              ))}
            </div>
          )
      )}

      {/* Contracts */}
      {pTab === 'contracts' && (
        projContracts.length === 0
          ? <EmptyState icon={FileSignature} label="No contracts" sub="Contracts linked to this project will appear here" />
          : (
            <div className="space-y-3">
              {projContracts.map(c => (
                <PortalContractCard key={c.id} contract={c} appUrl={APP_URL} onStatusChange={onContractStatusChange} />
              ))}
            </div>
          )
      )}

      {/* Invoices */}
      {pTab === 'invoices' && (
        projInvoices.length === 0
          ? <EmptyState icon={Receipt} label="No invoices" sub="Invoices linked to this project will appear here" />
          : (
            <div className="space-y-3">
              {projInvoices.map(i => (
                <PortalInvoiceCard
                  key={i.id} invoice={i} appUrl={APP_URL} portalToken={token}
                  clientName="" clientEmail="" freelancerName=""
                  onStatusChange={onInvoiceStatusChange}
                />
              ))}
            </div>
          )
      )}

      {/* Time & Expenses */}
      {pTab === 'time' && (
        project.timeEntries.length === 0 && project.expenses.length === 0
          ? <EmptyState icon={Clock} label="No time or expenses logged" sub="Logged time and expenses will appear here" />
          : (
            <div className="space-y-4">
              {project.timeEntries.length > 0 && (
                <SectionCard title="Time Log">
                  <div className="divide-y divide-[#F8FAFC]">
                    {project.timeEntries.map(e => (
                      <div key={e.id} className="flex items-center justify-between gap-2 px-5 py-3">
                        <div className="min-w-0">
                          <p className="text-[13px] text-[#1E293B] truncate">{e.description || 'Work session'}</p>
                          <p className="text-[11.5px] text-[#94A3B8]">
                            {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold text-[#0F172A]">{(e.durationMins / 60).toFixed(1)}h</p>
                          {project.shareRateWithClient && e.hourlyRate && (
                            <p className="text-[11.5px] text-[#94A3B8]">₹{Number(e.hourlyRate).toLocaleString('en-IN')}/hr</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 border-t border-[#E4ECFC] bg-[#F8FAFC] flex justify-between items-center">
                    <span className="text-[12.5px] font-semibold text-[#475569]">Total</span>
                    <span className="text-[13px] font-bold text-[#0F172A]">{totalHours.toFixed(1)}h</span>
                  </div>
                </SectionCard>
              )}
              {project.expenses.length > 0 && (
                <SectionCard title="Expenses">
                  <div className="divide-y divide-[#F8FAFC]">
                    {project.expenses.map(e => (
                      <div key={e.id} className="flex items-center justify-between gap-2 px-5 py-3">
                        <div className="min-w-0">
                          <p className="text-[13px] text-[#1E293B] truncate">{e.description}</p>
                          <p className="text-[11.5px] text-[#94A3B8]">
                            {e.category} · {new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <p className="text-[13px] font-semibold text-[#0F172A] shrink-0">
                          ₹{Number(e.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 border-t border-[#E4ECFC] bg-[#F8FAFC] flex justify-between items-center">
                    <span className="text-[12.5px] font-semibold text-[#475569]">Total</span>
                    <span className="text-[13px] font-bold text-[#0F172A]">₹{expenseTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </SectionCard>
              )}
            </div>
          )
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, isError } = usePortalData(token!)
  const { data: portalFiles = [] } = usePortalAttachments(token ?? '')

  const [tab,             setTab]             = useState<Tab>('overview')
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [projectTab,      setProjectTab]      = useState<ProjectTab>('updates')

  const [proposals, setProposals] = useState<PortalProposal[] | null>(null)
  const [contracts, setContracts] = useState<PortalContract[] | null>(null)
  const [invoices,  setInvoices]  = useState<PortalInvoice[]  | null>(null)

  const activeProposals = proposals ?? data?.proposals ?? []
  const activeContracts = contracts ?? data?.contracts ?? []
  const activeInvoices  = invoices  ?? data?.invoices  ?? []
  const activeMeetings  = data?.meetings ?? []
  const activeProjects  = data?.projects ?? []

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

  function openProject(id: string, tab: ProjectTab = 'updates') {
    setActiveProjectId(id)
    setProjectTab(tab)
    setTab('projects')
  }

  function closeProject() {
    setActiveProjectId(null)
  }

  useEffect(() => {
    if (tab !== 'projects') setActiveProjectId(null)
  }, [tab])

  const activeProject = activeProjects.find(p => p.id === activeProjectId) ?? null
  const freelancerName = data?.freelancer.businessName ?? 'ClearWork'
  const clientName     = data?.client.name ?? ''

  const NAV_ITEMS: { key: Tab; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: 'overview',  label: 'Overview',  Icon: LayoutDashboard },
    { key: 'projects',  label: 'Projects',  Icon: FolderKanban },
    { key: 'messages',  label: 'Messages',  Icon: MessageSquare },
    { key: 'meetings',  label: 'Meetings',  Icon: Video },
  ]

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E4ECFC] p-10 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3F2] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-[#D92D20]" />
          </div>
          <h1 className="text-[16px] font-bold text-[#0F172A] mb-1">Portal link invalid</h1>
          <p className="text-[13px] text-[#64748B]">
            This portal link is invalid or has expired. Contact the sender for a new link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F8FAFC] pb-20 md:pb-0">

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#E4ECFC] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isLoading ? (
              <Skeleton className="h-7 w-28 rounded-lg" />
            ) : data?.freelancer.logoUrl ? (
              <>
                <img
                  src={data.freelancer.logoUrl} alt={freelancerName}
                  className="h-7 w-auto max-w-[110px] rounded-lg object-contain shrink-0"
                />
                <span className="text-[13.5px] font-bold text-[#0F172A] truncate">{freelancerName}</span>
              </>
            ) : (
              <span className="text-[15px] font-bold text-[#0F172A] truncate">{freelancerName}</span>
            )}
          </div>
          {!isLoading && clientName && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[11px] font-bold text-[#2563EB]">
                {clientName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-[13px] font-medium text-[#475569] max-w-[140px] truncate">
                {clientName}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ─── Body ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6 items-start">

          {/* Sidebar — desktop only */}
          <aside className="hidden md:flex flex-col gap-1 w-48 shrink-0 sticky top-20">
            {NAV_ITEMS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all text-left',
                  tab === key
                    ? 'bg-[#EFF6FF] text-[#2563EB]'
                    : 'text-[#475569] hover:bg-[#F1F5FD] hover:text-[#1E293B]',
                )}
              >
                <Icon size={15} />
                {label}
                {key === 'meetings' && upcomingMeetings.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-[#2563EB] text-white rounded-full w-4 h-4 flex items-center justify-center">
                    {upcomingMeetings.length}
                  </span>
                )}
              </button>
            ))}

            {/* Client info section */}
            {!isLoading && data && (
              <div className="mt-5 pt-4 border-t border-[#E4ECFC]">
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">Account</p>
                <div className="px-1 space-y-0.5">
                  <p className="text-[12.5px] font-semibold text-[#0F172A]">{clientName}</p>
                  {data.client.email && (
                    <p className="text-[11.5px] text-[#64748B] truncate">{data.client.email}</p>
                  )}
                  {data.client.company && (
                    <p className="text-[11.5px] text-[#64748B]">{data.client.company}</p>
                  )}
                  {data.client.stage && (
                    <div className="pt-1">
                      <span className={cn('inline-flex text-[10.5px] font-semibold px-2.5 py-1 rounded-full', STAGE_OUTLINE_COLORS[data.client.stage])}>
                        {STAGE_LABELS[data.client.stage]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : (
              <>
                {tab === 'overview' && (
                  <OverviewTab
                    data={data!}
                    activeProposals={activeProposals}
                    activeContracts={activeContracts}
                    activeInvoices={activeInvoices}
                    upcomingMeetings={upcomingMeetings}
                    portalFiles={portalFiles}
                    token={token!}
                    onProposalStatusChange={handleProposalStatusChange}
                    onContractStatusChange={handleContractStatusChange}
                    onInvoiceStatusChange={handleInvoiceStatusChange}
                    onOpenProject={openProject}
                  />
                )}

                {tab === 'projects' && (
                  activeProject ? (
                    <ProjectDetail
                      project={activeProject}
                      proposals={activeProposals}
                      contracts={activeContracts}
                      invoices={activeInvoices}
                      contactStage={data?.client.stage}
                      token={token!}
                      initialTab={projectTab}
                      onProposalStatusChange={handleProposalStatusChange}
                      onContractStatusChange={handleContractStatusChange}
                      onInvoiceStatusChange={handleInvoiceStatusChange}
                      onBack={closeProject}
                    />
                  ) : (
                    <ProjectList
                      projects={activeProjects}
                      proposals={activeProposals}
                      contracts={activeContracts}
                      invoices={activeInvoices}
                      onOpenProject={openProject}
                    />
                  )
                )}

                {tab === 'messages' && token && (
                  <PortalMessagesPanel token={token} />
                )}

                {tab === 'meetings' && (
                  activeMeetings.length === 0
                    ? <EmptyState icon={Video} label="No meetings scheduled" sub="Your meetings will appear here" />
                    : (
                      <div className="space-y-3">
                        {activeMeetings.map(m => <PortalMeetingCard key={m.id} meeting={m} />)}
                      </div>
                    )
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E4ECFC] px-1 py-1.5 z-20 safe-area-inset-bottom">
        <div className="flex">
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors',
                tab === key ? 'text-[#2563EB]' : 'text-[#94A3B8]',
              )}
            >
              <Icon size={19} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
