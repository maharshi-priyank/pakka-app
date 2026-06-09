import { useNavigate } from 'react-router-dom'
import { cn, formatDate } from '@/lib/utils'
import QuickViewModal, { QVField } from '@/components/shared/QuickViewModal'

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-[#F2F4F7] dark:bg-[#21222D] text-[#344054] dark:text-[#8B92A8]',
  SENT:      'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]',
  SIGNED:    'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
  CANCELLED: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
  VIEWED:    'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
}

export interface ContractSnap {
  id: string
  title: string
  status: string
  sentAt?: string | null
  signedAt?: string | null
  createdAt?: string
  clientName?: string
  projectName?: string
}

interface Props {
  contract: ContractSnap | null
  onClose: () => void
}

export default function ContractQuickView({ contract, onClose }: Props) {
  const navigate = useNavigate()
  if (!contract) return null

  const isSigned = contract.status === 'SIGNED'

  return (
    <QuickViewModal
      open
      onClose={onClose}
      onEdit={() => { onClose(); navigate(`/contracts/${contract.id}`) }}
      editLabel="Open Contract"
      title={contract.title}
      subtitle={contract.clientName ?? contract.projectName}
      statusBadge={
        <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0', STATUS_COLORS[contract.status] ?? STATUS_COLORS['DRAFT'])}>
          {contract.status.charAt(0) + contract.status.slice(1).toLowerCase()}
        </span>
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        {contract.createdAt && <QVField label="Created" value={formatDate(contract.createdAt)} />}
        <QVField label="Sent to Client" value={contract.sentAt ? formatDate(contract.sentAt) : null} />
        <QVField label="Signed Date" value={
          isSigned && contract.signedAt
            ? <span className="text-emerald-600 dark:text-emerald-400">{formatDate(contract.signedAt)}</span>
            : null
        } />
        {contract.clientName && <QVField label="Client" value={contract.clientName} />}
        {contract.projectName && <QVField label="Project" value={contract.projectName} />}
      </dl>
    </QuickViewModal>
  )
}
