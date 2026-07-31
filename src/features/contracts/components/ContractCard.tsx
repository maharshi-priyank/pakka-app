import { ArrowUpRight, FileSignature, IndianRupee, CheckCircle2, Clock, Archive, Ban, LayoutTemplate } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Contract } from '../schemas/contract.schema'
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '../schemas/contract.schema'

interface Props {
  contract: Contract
  onClick:  (contract: Contract) => void
  onRemove?: (contract: Contract) => void
  onVoid?:   (contract: Contract) => void
  onSaveAsTemplate?: (contract: Contract) => void
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

export default function ContractCard({ contract, onClick, onRemove, onVoid, onSaveAsTemplate }: Props) {
  const clientName = contract.contact?.name ?? contract.client?.name ?? 'No client'
  const c = contract.content as Record<string, unknown>
  const totalAmount = c.totalAmount as number | undefined

  return (
    <div
      onClick={() => onClick(contract)}
      className={cn(
        'bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm cursor-pointer hover:shadow-md hover:border-[#D0D5DD] dark:hover:border-[#333649] transition-all duration-150',
        contract.archivedAt && 'opacity-60',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0',
            avatarColor(clientName),
          )}>
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-snug">{contract.title}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate leading-snug">{clientName}</p>
              {contract.project && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA] shrink-0">
                  {contract.project.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 group">
          {contract.archivedAt && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Archived
            </span>
          )}
          <span className={cn(STATUS_BADGE_CLASS[contract.status], 'text-[10px] px-1.5 py-0.5')}>
            {STATUS_LABELS[contract.status]}
          </span>
          {onSaveAsTemplate && (
            <button
              onClick={e => { e.stopPropagation(); onSaveAsTemplate(contract) }}
              title="Save as template"
              className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#EEF2FF] dark:hover:bg-[#1E2040] hover:text-[#6366F1] transition-all"
            >
              <LayoutTemplate size={11} strokeWidth={2.5} />
            </button>
          )}
          {onVoid && (contract.status === 'SENT' || contract.status === 'SIGNED') && (
            <button
              onClick={e => { e.stopPropagation(); onVoid(contract) }}
              className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-500 transition-all"
            >
              <Ban size={11} strokeWidth={2.5} />
            </button>
          )}
          {onRemove && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(contract) }}
              className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all"
            >
              <Archive size={11} strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onClick(contract) }}
            className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] hover:bg-[#EFF6FF] dark:hover:bg-[#1E2040] flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:text-[#2563EB] transition-colors"
          >
            <ArrowUpRight size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Total */}
      {totalAmount !== undefined && totalAmount > 0 && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Contract value</span>
          <span className="flex items-center gap-0.5 text-[13px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">
            <IndianRupee size={10} strokeWidth={3} />
            {totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      )}

      {/* Linked proposal */}
      {contract.proposal && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Proposal</span>
          <span className="text-[11.5px] font-medium text-[#344054] dark:text-[#C2C8D8] truncate max-w-[160px]">
            {contract.proposal.title}
          </span>
        </div>
      )}

      {/* Signed date */}
      {contract.signedAt && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Signed</span>
          <span className="flex items-center gap-1 text-[11.5px] font-semibold text-[#027A48] bg-[#ECFDF3] dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
            <CheckCircle2 size={9} strokeWidth={2.5} />
            {formatDate(contract.signedAt)}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#1A1B23] rounded-b-xl">
        <span className="text-[10px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(contract.createdAt)}</span>
        <span className="flex items-center gap-1 text-[10px] font-medium text-[#667085] dark:text-[#8B92A8]">
          {contract.status === 'SIGNED'
            ? <><CheckCircle2 size={8} strokeWidth={2} className="text-[#12B76A]" /> Signed</>
            : contract.status === 'SENT'
            ? <><Clock size={8} strokeWidth={2} /> Awaiting signature</>
            : <><FileSignature size={8} strokeWidth={2} /> {STATUS_LABELS[contract.status]}</>
          }
        </span>
      </div>
    </div>
  )
}

export function ContractCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-3.5 animate-pulse space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#F2F4F7] dark:bg-[#21222D]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-3/4" />
          <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-1/2" />
        </div>
        <div className="h-5 w-12 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full" />
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-16" />
        <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-20" />
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-12" />
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-24" />
      </div>
    </div>
  )
}
