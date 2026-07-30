import { ArrowUpRight, IndianRupee, CalendarDays, Eye, FileSignature, LayoutTemplate, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Proposal } from '../schemas/proposal.schema'
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '../schemas/proposal.schema'

interface Props {
  proposal:             Proposal
  onClick:              (proposal: Proposal) => void
  onConvertToContract?: (proposal: Proposal) => void
  onSaveAsTemplate?:    (proposal: Proposal) => void
  onRemove?:            (proposal: Proposal) => void
}

const AVATAR_COLORS = [
  'bg-[#EEF4FF] text-[#3538CD]',
  'bg-[#ECFDF3] text-[#027A48]',
  'bg-[#FFFAEB] text-[#B54708]',
  'bg-[#FEF3F2] text-[#B42318]',
  'bg-[#F4F3FF] text-[#5925DC]',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isExpiringSoon(iso: string) {
  const daysLeft = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  return daysLeft >= 0 && daysLeft <= 7
}

export default function ProposalCard({ proposal, onClick, onConvertToContract, onSaveAsTemplate, onRemove }: Props) {
  const clientName = proposal.contact?.name ?? proposal.client?.name ?? proposal.lead?.name ?? 'No client'
  const openCount  = proposal._count?.opens ?? proposal.opens?.length ?? 0
  const expiring   = proposal.validUntil && isExpiringSoon(proposal.validUntil)
  const showOpens  = proposal.status === 'SENT' || proposal.status === 'OPENED'
  const showContract = proposal.status === 'ACCEPTED' && !!onConvertToContract

  return (
    <div
      onClick={() => onClick(proposal)}
      className={cn(
        'group bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm cursor-pointer hover:shadow-md hover:border-[#C8D0DC] dark:hover:border-[#333649] transition-all duration-150 flex flex-col',
        proposal.archivedAt && 'opacity-60',
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-3.5">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0',
          avatarColor(clientName),
        )}>
          {clientName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-snug">{proposal.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] truncate">{clientName}</p>
            {proposal.project && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA] shrink-0">
                {proposal.project.name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {proposal.archivedAt && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Archived
            </span>
          )}
          <span className={cn(STATUS_BADGE_CLASS[proposal.status], 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full')}>
            {STATUS_LABELS[proposal.status]}
          </span>
          {onRemove && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(proposal) }}
              className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all"
            >
              <Archive size={11} strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onClick(proposal) }}
            className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#EFF6FF] dark:hover:bg-[#1E2040] hover:text-[#2563EB] transition-all"
          >
            <ArrowUpRight size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Amount ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Total</span>
        <span className="flex items-center gap-0.5 text-[14px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">
          <IndianRupee size={10} strokeWidth={3} />
          {Number(proposal.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* ── Meta row ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A] min-h-[38px]">
        {proposal.validUntil ? (
          <span className={cn(
            'flex items-center gap-1 text-[11px] font-medium',
            expiring ? 'text-[#D92D20]' : 'text-[#667085] dark:text-[#8B92A8]',
          )}>
            <CalendarDays size={10} strokeWidth={2} />
            {formatDate(proposal.validUntil)}
            {expiring && <span className="text-[9.5px] font-bold bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] px-1.5 py-0.5 rounded-full ml-0.5">Expiring</span>}
          </span>
        ) : (
          <span />
        )}
        {showOpens && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#667085] dark:text-[#8B92A8]">
            <Eye size={10} strokeWidth={2} />
            {openCount} {openCount === 1 ? 'open' : 'opens'}
          </span>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#1A1B23] rounded-b-xl mt-auto">
        <span className="text-[10.5px] text-[#B0B8C4] dark:text-[#545C74]">{formatDate(proposal.createdAt)}</span>
        <div className="flex items-center gap-1">
          {onSaveAsTemplate && (
            <button
              onClick={e => { e.stopPropagation(); onSaveAsTemplate(proposal) }}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#6366F1] dark:text-[#818CF8] hover:bg-[#EEF2FF] dark:hover:bg-[#1E2040] px-2 py-1 rounded-lg transition-colors"
            >
              <LayoutTemplate size={10} strokeWidth={2.5} />
              Template
            </button>
          )}
          {showContract && (
            <button
              onClick={e => { e.stopPropagation(); onConvertToContract!(proposal) }}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#027A48] hover:bg-[#ECFDF3] dark:hover:bg-emerald-950/40 px-2 py-1 rounded-lg transition-colors"
            >
              <FileSignature size={10} strokeWidth={2.5} />
              Contract
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ProposalCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full w-3/4" />
          <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full w-1/2" />
        </div>
        <div className="h-5 w-14 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full" />
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between items-center">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full w-8" />
        <div className="h-4 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full w-24" />
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between items-center">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full w-20" />
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full w-12" />
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between items-center">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full w-16" />
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full w-20" />
      </div>
    </div>
  )
}
