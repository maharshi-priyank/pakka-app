import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowUpRight, IndianRupee, CalendarDays, Tag, FilePlus, UserCheck, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead } from '../schemas/lead.schema'

interface Props {
  lead:                Lead
  onClick:             (lead: Lead) => void
  onNewProposal?:      (lead: Lead) => void
  onConvertToClient?:  (lead: Lead) => void
  convertingLeadId?:   string | null
}

const AVATAR_COLORS = [
  'bg-[#EEF4FF] text-[#3538CD]',
  'bg-[#ECFDF3] text-[#027A48]',
  'bg-[#FFFAEB] text-[#B54708]',
  'bg-[#FEF3F2] text-[#B42318]',
  'bg-[#F4F3FF] text-[#5925DC]',
]

const SOURCE_LABELS: Record<string, string> = {
  instagram:    'Instagram',
  referral:     'Referral',
  website:      'Website',
  linkedin:     'LinkedIn',
  cold_outreach:'Cold Outreach',
  other:        'Other',
}

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function relativeDay(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 0)   return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`
  return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400)return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function LeadCard({ lead, onClick, onNewProposal, onConvertToClient, convertingLeadId }: Props) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
    zIndex:     isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(lead)}
      className={cn(
        'bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm cursor-pointer select-none',
        'hover:shadow-md hover:border-[#D0D5DD] dark:hover:border-[#333649] transition-all duration-150',
        isDragging && 'shadow-xl ring-2 ring-[#2563EB]/20 rotate-1',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0',
            avatarColor(lead.name),
          )}>
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-snug">{lead.name}</p>
            {lead.company && (
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate leading-snug">{lead.company}</p>
            )}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick(lead) }}
          className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] hover:bg-[#EFF6FF] dark:hover:bg-[#1E2040] flex items-center justify-center shrink-0 text-[#98A2B3] dark:text-[#545C74] hover:text-[#2563EB] transition-colors mt-0.5"
        >
          <ArrowUpRight size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* Divider rows — always rendered for uniform card height */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Service</span>
        {lead.service
          ? <span className="text-[11.5px] font-medium text-[#344054] dark:text-[#C2C8D8] text-right truncate">{lead.service}</span>
          : <span className="text-[11px] text-[#D0D5DD] dark:text-[#333649] italic">Not set</span>
        }
      </div>

      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Budget</span>
        {lead.budget
          ? <span className="flex items-center gap-0.5 text-[13px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">
              <IndianRupee size={10} strokeWidth={3} />
              {Number(lead.budget).toLocaleString('en-IN')}
            </span>
          : <span className="text-[11px] text-[#D0D5DD] dark:text-[#333649] italic">Not set</span>
        }
      </div>

      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Follow-up</span>
        {lead.followUpAt
          ? <span className="flex items-center gap-1 text-[11.5px] font-semibold text-[#D92D20] bg-[#FEF3F2] dark:bg-red-950/40 px-1.5 py-0.5 rounded-md">
              <CalendarDays size={9} strokeWidth={2.5} />
              {relativeDay(lead.followUpAt)}
            </span>
          : <span className="text-[11px] text-[#D0D5DD] dark:text-[#333649] italic">Not set</span>
        }
      </div>

      {/* Action CTAs */}
      {(onNewProposal || onConvertToClient) && (
        <div className="px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A] flex gap-2">
          {onNewProposal && (
            <button
              onClick={e => { e.stopPropagation(); onNewProposal(lead) }}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[#2563EB] dark:text-[#818CF8] bg-[#EFF6FF] dark:bg-[#1E2040] hover:bg-[#DBEAFE] dark:hover:bg-[#252A50] rounded-lg py-2 transition-colors"
            >
              <FilePlus size={12} strokeWidth={2.5} />
              Proposal
            </button>
          )}
          {onConvertToClient && (
            lead.clientId ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[#027A48] bg-[#ECFDF3] dark:bg-emerald-950/40 rounded-lg py-2">
                <Building2 size={12} strokeWidth={2.5} />
                Client
              </div>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onConvertToClient(lead) }}
                disabled={convertingLeadId === lead.id}
                className="flex-1 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] bg-[#F2F4F7] dark:bg-[#21222D] hover:bg-[#E4E7EC] dark:hover:bg-[#2D2F3D] rounded-lg py-2 transition-colors disabled:opacity-50"
              >
                <UserCheck size={12} strokeWidth={2.5} />
                {convertingLeadId === lead.id ? 'Converting…' : 'To Client'}
              </button>
            )
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#1A1B23] rounded-b-xl">
        <span className="text-[10px] text-[#98A2B3] dark:text-[#545C74]">
          Active {timeAgo(lead.lastActivityAt)}
        </span>
        {lead.source && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-[#667085] dark:text-[#8B92A8] bg-white dark:bg-[#21222D] border border-[#EAECF0] dark:border-[#26283A] px-1.5 py-0.5 rounded-md">
            <Tag size={8} strokeWidth={2} />
            {SOURCE_LABELS[lead.source] ?? lead.source}
          </span>
        )}
      </div>
    </div>
  )
}

export function LeadCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-3.5 animate-pulse space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#F2F4F7] dark:bg-[#21222D]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-3/4" />
          <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-1/2" />
        </div>
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-12" />
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-20" />
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-10" />
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-16" />
      </div>
    </div>
  )
}
