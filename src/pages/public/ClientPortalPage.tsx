import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, Video, CalendarDays, ExternalLink, FolderKanban,
  Clock, IndianRupee, Download, Lock, MessageSquare,
  Paperclip, FileArchive, FileImage, File as FileIconLucide,
  LayoutDashboard, ArrowLeft, Bell, ChevronRight, Megaphone,
  Receipt, FileSignature, FileText, Plus, CheckCircle2,
} from 'lucide-react'
import { usePortalThread, useSendPortalReply, useMarkPortalRead } from '@/features/messages/hooks/useMessages'
import { MessageBubble } from '@/features/messages/components/MessageBubble'
import { ReplyComposer } from '@/features/messages/components/ReplyComposer'
import { cn } from '@/lib/utils'
import {
  usePortalData,
  useRaiseChangeRequest,
  type PortalProposal, type PortalContract, type PortalInvoice,
  type PortalMeeting, type PortalProject, type PortalProjectUpdate,
} from '@/features/portal/hooks/usePortal'
import { usePortalAttachments, humanSize } from '@/features/attachments/useAttachments'
import type { PortalAttachment } from '@/features/attachments/types'
import { STAGE_LABELS, STAGE_OUTLINE_COLORS, type ContactStage } from '@/features/contacts/schemas/contact.schema'
import PortalProposalCard       from '@/features/portal/components/PortalProposalCard'
import PortalContractCard       from '@/features/portal/components/PortalContractCard'
import PortalInvoiceCard        from '@/features/portal/components/PortalInvoiceCard'
import PortalChangeRequestCard  from '@/features/portal/components/PortalChangeRequestCard'
import PortalApprovalCard       from '@/features/portal/components/PortalApprovalCard'

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab        = 'overview' | 'projects' | 'messages' | 'meetings'
type ProjectTab = 'updates' | 'proposals' | 'contracts' | 'invoices' | 'time' | 'approvals'

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

function StatTile({ icon: Icon, label, value, tone = 'default' }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  tone?: 'default' | 'warn' | 'good'
}) {
  const iconBg = tone === 'warn' ? 'bg-[#FFFAEB]' : tone === 'good' ? 'bg-[#F0FDF4]' : 'bg-[#F1F5FD]'
  const iconColor = tone === 'warn' ? 'text-[#B45309]' : tone === 'good' ? 'text-[#16A34A]' : 'text-[#2563EB]'
  return (
    <div className="bg-white rounded-xl border border-[#E4ECFC] px-4 py-3.5 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon size={16} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-[17px] font-bold text-[#0F172A] leading-tight truncate">{value}</p>
        <p className="text-[11.5px] text-[#64748B] truncate">{label}</p>
      </div>
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

// ─── Meetings Tab ──────────────────────────────────────────────────────────────

function MeetingsTab({ meetings }: { meetings: PortalMeeting[] }) {
  const now = new Date()
  const upcoming = meetings
    .filter(m => m.status === 'SCHEDULED' && new Date(m.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  const past = meetings
    .filter(m => !(m.status === 'SCHEDULED' && new Date(m.scheduledAt) >= now))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-[12.5px] font-semibold text-[#64748B] uppercase tracking-wide mb-2.5">
            Upcoming ({upcoming.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {upcoming.map(m => <PortalMeetingCard key={m.id} meeting={m} />)}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h2 className="text-[12.5px] font-semibold text-[#64748B] uppercase tracking-wide mb-2.5">
            Past ({past.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {past.map(m => <PortalMeetingCard key={m.id} meeting={m} />)}
          </div>
        </div>
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
    <div className="bg-white rounded-xl border border-[#E4ECFC] overflow-hidden flex flex-col h-[calc(100dvh-11.5rem)] min-h-[420px] max-h-[720px]">
      <div className="px-5 py-3.5 border-b border-[#E4ECFC] shrink-0">
        <h2 className="text-[13.5px] font-semibold text-[#0F172A]">Messages from {businessName}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-center text-[13px] text-[#94A3B8] py-6">No messages yet from {businessName}.</p>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} isPortal clientName={businessName} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0">
        <ReplyComposer
          isPending={sendReply.isPending}
          placeholder={`Message ${businessName}…`}
          onSend={async body => { await sendReply.mutateAsync(body) }}
        />
      </div>
    </div>
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
  const totalPending = linkedProposals.length + linkedContracts.length + linkedInvoices.length
    + unlinkedProposals.length + unlinkedContracts.length + unlinkedInvoices.length

  const amountDue = [...linkedInvoices, ...unlinkedInvoices]
    .reduce((s, i) => s + Number(i.total), 0)

  const nextMeeting = upcomingMeetings[0] ?? null
  const visibleFiles = portalFiles.slice(0, 5)

  return (
    <div className="space-y-5">

      {/* Welcome */}
      <div>
        <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Client Portal</p>
        <h1 className="text-[22px] font-bold text-[#0F172A]">Welcome, {clientFirstName}</h1>
        <p className="text-[13px] text-[#64748B] mt-0.5">
          Workspace with <span className="font-semibold text-[#1E293B]">{freelancerName}</span>
        </p>
      </div>

      {/* Stat row — glanceable status, no reading required */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={FolderKanban} label={activeCount === 1 ? 'Active project' : 'Active projects'} value={String(activeCount)} />
        <StatTile
          icon={Bell} label={totalPending === 1 ? 'Pending action' : 'Pending actions'} value={String(totalPending)}
          tone={totalPending > 0 ? 'warn' : 'good'}
        />
        <StatTile
          icon={IndianRupee} label="Amount due" value={amountDue > 0 ? `₹${fmt(amountDue)}` : '₹0'}
          tone={amountDue > 0 ? 'warn' : 'good'}
        />
        <StatTile
          icon={Video} label={nextMeeting ? 'Next meeting' : 'No meetings'}
          value={nextMeeting ? new Date(nextMeeting.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
        />
      </div>

      {/* Dashboard grid — priority feed (left, wider) + quick info (right, narrower) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: priority feed ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Needs your attention — linked (compact) + unlinked (full action cards) */}
          {(hasLinkedPending || hasUnlinkedPending) ? (
            <SectionCard>
              <div className="px-5 py-3.5 border-b border-[#E4ECFC] flex items-center gap-2">
                <Bell size={14} className="text-[#B45309]" />
                <h2 className="text-[13.5px] font-semibold text-[#0F172A]">Needs your attention</h2>
                <span className="ml-auto text-[11px] font-bold bg-[#FFFAEB] text-[#B45309] px-2 py-0.5 rounded-full">
                  {totalPending}
                </span>
              </div>

              {hasLinkedPending && (
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
              )}

              {/* Unlinked docs — no project to drill into, so the full action card lives right here */}
              {hasUnlinkedPending && (
                <div className={cn('px-4 py-4 space-y-3', hasLinkedPending && 'border-t border-[#E4ECFC] bg-[#F8FAFC]/60')}>
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
              )}
            </SectionCard>
          ) : (
            <div className="bg-white rounded-xl border border-[#E4ECFC] px-5 py-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-[#16A34A]" />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-[#0F172A]">You're all caught up</p>
                <p className="text-[12.5px] text-[#64748B]">Nothing needs your action right now.</p>
              </div>
            </div>
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
        </div>

        {/* ── Right: quick info sidebar ── */}
        <div className="space-y-5">

          {/* Next meeting only — full list lives in the Meetings tab */}
          {nextMeeting && (
            <SectionCard title="Next meeting">
              <div className="p-4">
                <PortalMeetingCard meeting={nextMeeting} />
              </div>
            </SectionCard>
          )}

          {/* Shared files — condensed, top 5 */}
          {portalFiles.length > 0 && (
            <SectionCard title={`Shared files (${portalFiles.length})`}>
              <div className="divide-y divide-[#F8FAFC]">
                {visibleFiles.map((f: PortalAttachment) => {
                  let icon = <FileIconLucide size={13} className="text-[#94A3B8] shrink-0" />
                  if (f.mimeType.startsWith('image/'))  icon = <FileImage   size={13} className="text-[#94A3B8] shrink-0" />
                  if (f.mimeType === 'application/pdf') icon = <FileText    size={13} className="text-[#D92D20] shrink-0" />
                  if (f.mimeType.includes('zip') || f.mimeType.includes('tar') || f.mimeType.includes('rar'))
                                                        icon = <FileArchive size={13} className="text-[#F79009] shrink-0" />
                  return (
                    <div key={f.id} className="flex items-center gap-2.5 px-4 py-2.5">
                      {icon}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-[#1E293B] truncate">{f.fileName}</p>
                        <p className="text-[10.5px] text-[#94A3B8]">{humanSize(f.fileSize)}</p>
                      </div>
                      {f.fileUrl ? (
                        <a
                          href={f.fileUrl} download={f.fileName}
                          className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#F1F5FD] text-[#2563EB] hover:bg-[#DBEAFE] transition-colors shrink-0"
                        >
                          <Download size={12} strokeWidth={2.5} />
                        </a>
                      ) : (
                        <Lock size={12} strokeWidth={2} className="text-[#94A3B8] shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
              {portalFiles.length > visibleFiles.length && (
                <div className="px-4 py-2.5 border-t border-[#E4ECFC] text-center">
                  <span className="text-[11.5px] text-[#94A3B8]">
                    +{portalFiles.length - visibleFiles.length} more in Projects
                  </span>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {projects.map(p => {
        const totalHours    = p.timeEntries.reduce((s, e) => s + e.durationMins, 0) / 60
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
  const queryClient = useQueryClient()
  const [pTab, setPTab] = useState<ProjectTab>(initialTab)

  // Raise Change Request form state
  const [showCRForm, setShowCRForm] = useState(false)
  const [crDesc,     setCrDesc]     = useState('')
  const [crError,    setCrError]    = useState('')

  const raiseChangeRequest = useRaiseChangeRequest(token, project.id)

  async function handleRaiseCR() {
    if (!crDesc.trim()) { setCrError('Please describe the change request.'); return }
    setCrError('')
    try {
      await raiseChangeRequest.mutateAsync(crDesc.trim())
      queryClient.invalidateQueries({ queryKey: ['portal', token] })
      setShowCRForm(false)
      setCrDesc('')
    } catch {
      setCrError('Failed to submit. Please try again.')
    }
  }

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

  const approvalsCount = (project.changeRequests?.length ?? 0) + (project.approvalRequests?.length ?? 0)

  const subTabs: { key: ProjectTab; label: string; count?: number }[] = [
    { key: 'updates',   label: 'Updates',      count: project.updates.length },
    { key: 'proposals', label: 'Proposals',    count: projProposals.length },
    { key: 'contracts', label: 'Contracts',    count: projContracts.length },
    { key: 'invoices',  label: 'Invoices',     count: projInvoices.length },
    { key: 'time',      label: 'Time & Expenses' },
    { key: 'approvals', label: 'Approvals',    count: approvalsCount },
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
            <div className={cn(
              project.timeEntries.length > 0 && project.expenses.length > 0
                ? 'grid grid-cols-1 md:grid-cols-2 gap-4 items-start'
                : 'space-y-4',
            )}>
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

      {/* Approvals */}
      {pTab === 'approvals' && (
        <div className="space-y-4">

          {/* Raise Change Request button / form */}
          {project.status !== 'COMPLETED' && (
            !showCRForm ? (
              <button
                onClick={() => setShowCRForm(true)}
                style={{ minHeight: '44px' }}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-dashed border-[#CBD5E1] text-[13px] font-medium text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
              >
                <Plus size={14} /> Raise Change Request
              </button>
            ) : (
              <div className="bg-white rounded-xl border border-[#EAECF0] p-4 space-y-3">
                <p className="text-[13px] font-semibold text-[#344054]">New Change Request</p>
                <textarea
                  value={crDesc}
                  onChange={e => { setCrDesc(e.target.value); setCrError('') }}
                  placeholder="Describe the change you need…"
                  rows={3}
                  autoFocus
                  className="w-full px-3 py-2 text-[13px] text-[#344054] border border-[#EAECF0] rounded-lg focus:outline-none focus:border-[#667085] resize-none"
                />
                {crError && (
                  <p className="text-[12px] text-[#D92D20]" role="alert">{crError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleRaiseCR}
                    disabled={raiseChangeRequest.isPending || !crDesc.trim()}
                    style={{ minHeight: '44px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
                  >
                    {raiseChangeRequest.isPending ? 'Submitting…' : 'Submit Request'}
                  </button>
                  <button
                    onClick={() => { setShowCRForm(false); setCrDesc(''); setCrError('') }}
                    style={{ minHeight: '44px' }}
                    className="px-4 py-2 rounded-lg border border-[#EAECF0] text-[13px] text-[#667085] hover:text-[#344054] font-medium bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
          )}

          {/* Change Requests */}
          {(project.changeRequests?.length ?? 0) > 0 && (
            <div className="space-y-3">
              {project.changeRequests!.map(cr => (
                <PortalChangeRequestCard key={cr.id} changeRequest={cr} token={token} />
              ))}
            </div>
          )}

          {/* Project Sign-off — latest AR only */}
          {(project.approvalRequests?.length ?? 0) > 0 && (() => {
            const latestAr = project.approvalRequests![0]
            const review   = project.reviews?.[0] ?? null
            return (
              <PortalApprovalCard
                key={latestAr.id}
                approvalRequest={latestAr}
                token={token}
                review={review}
              />
            )
          })()}

          {/* Empty state */}
          {(project.changeRequests?.length ?? 0) === 0 &&
           (project.approvalRequests?.length ?? 0) === 0 &&
           !showCRForm && (
            <EmptyState
              icon={FileText}
              label="No approvals yet"
              sub="Change requests and sign-off requests will appear here"
            />
          )}

        </div>
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
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
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8 items-start">

          {/* Sidebar — desktop only */}
          <aside className="hidden md:flex flex-col gap-1 w-52 shrink-0 sticky top-20">
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
                    <div className="max-w-3xl">
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
                    </div>
                  ) : (
                    // List view — no width cap, so project cards can lay out in a grid
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
                  <div className="max-w-3xl">
                    <PortalMessagesPanel token={token} />
                  </div>
                )}

                {tab === 'meetings' && (
                  activeMeetings.length === 0
                    ? <EmptyState icon={Video} label="No meetings scheduled" sub="Your meetings will appear here" />
                    : <MeetingsTab meetings={activeMeetings} />
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
