import { useNavigate } from 'react-router-dom'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import QuickViewModal, { QVField } from '@/components/shared/QuickViewModal'

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    'bg-[#F2F4F7] dark:bg-[#21222D] text-[#344054] dark:text-[#8B92A8]',
  SENT:     'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]',
  OPENED:   'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
  VIEWED:   'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
  ACCEPTED: 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
  DECLINED: 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#B42318] dark:text-red-400',
}

export interface ProposalSnap {
  id: string
  title: string
  status: string
  totalAmount: string | number
  createdAt: string
  clientName?: string
  projectName?: string
}

interface Props {
  proposal: ProposalSnap | null
  onClose: () => void
}

export default function ProposalQuickView({ proposal, onClose }: Props) {
  const navigate = useNavigate()
  if (!proposal) return null

  const statusLabel = proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()

  return (
    <QuickViewModal
      open
      onClose={onClose}
      onEdit={() => { onClose(); navigate(`/proposals/${proposal.id}`) }}
      editLabel="Open Proposal"
      title={proposal.title}
      subtitle={proposal.clientName ?? proposal.projectName}
      statusBadge={
        <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0', STATUS_COLORS[proposal.status] ?? STATUS_COLORS['DRAFT'])}>
          {statusLabel}
        </span>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <QVField label="Total Value" value={formatCurrency(Number(proposal.totalAmount))} />
        <QVField label="Status" value={
          <span className={cn('text-[12px] font-semibold', STATUS_COLORS[proposal.status]?.split(' ').find(c => c.startsWith('text-')))}>
            {statusLabel}
          </span>
        } />
        <QVField label="Created" value={formatDate(proposal.createdAt)} />
        {proposal.clientName && <QVField label="Client" value={proposal.clientName} />}
        {proposal.projectName && <QVField label="Project" value={proposal.projectName} />}
      </dl>
    </QuickViewModal>
  )
}
